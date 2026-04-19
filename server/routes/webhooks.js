import { Router } from 'express';
import Booking from '../models/Booking.js';
import DeletedPending from '../models/DeletedPending.js';
import { findConflicts } from '../utils/conflictCheck.js';
import { sendUnmatchedPaymentAlert } from '../utils/sendAdminAlert.js';

const router = Router();

// Strips the shared secret and any unknown fields before logging — the raw
// req.body contains GHL_WEBHOOK_SECRET on legitimate calls, which must never
// hit logs.
function safeLogFields(body) {
  return {
    bookingId: body?.bookingId,
    email: body?.email,
    payment_status: body?.payment_status,
  };
}

// Look in the audit collection for a booking that was cleaned up before the
// webhook arrived. Prefer bookingId (typo-proof); fall back to the most recent
// deleted pending for the given email.
async function findAuditMatch({ bookingId, email }) {
  if (bookingId) {
    const byId = await DeletedPending.findOne({
      originalBookingId: String(bookingId).trim(),
    });
    if (byId) return byId;
  }
  if (email) {
    return DeletedPending.findOne({
      email: String(email).toLowerCase().trim(),
    }).sort({ deletedAt: -1 });
  }
  return null;
}

// Rebuild a booking from an audit snapshot. Only called after verifying the
// slot is still free. Reuses the original bookingId so the customer's receipt
// and our DB stay in sync.
async function restoreFromAudit(auditHit, io) {
  const restored = new Booking({
    bookingId: auditHit.originalBookingId,
    guestName: auditHit.guestName,
    contactNumber: auditHit.contactNumber,
    email: auditHit.email,
    tourType: auditHit.tourType,
    checkIn: auditHit.checkIn,
    checkOut: auditHit.checkOut,
    roomUnit: auditHit.roomUnit,
    adults: auditHit.adults,
    children: auditHit.children,
    amount: auditHit.amount,
    paymentType: auditHit.paymentType,
    specialRequest: auditHit.specialRequest,
    status: 'confirmed',
    expiresAt: null,
  });
  await restored.save();
  await DeletedPending.deleteOne({ _id: auditHit._id });
  io.emit('booking:created', restored);
  return restored;
}

// POST /api/webhooks/gohighlevel — payment confirmation from GoHighLevel
router.post('/gohighlevel', async (req, res) => {
  try {
    // Shared-secret auth is mandatory. If the env var is missing, reject every request
    // rather than fall through to an open endpoint. Startup guard in server.js already
    // refuses to boot in production without the secret.
    const secret = process.env.GHL_WEBHOOK_SECRET;
    if (!secret) {
      console.warn('Webhook rejected: GHL_WEBHOOK_SECRET not configured');
      return res.status(401).json({ message: 'Webhook not configured' });
    }
    const provided = req.body.secret || req.headers['x-ghl-signature'];
    if (provided !== secret) {
      console.warn('Webhook rejected: invalid secret');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { email, payment_status, bookingId } = req.body;

    if (payment_status !== 'paid') {
      // Return 200 to prevent GHL retries — just log and ignore
      console.warn('Webhook ignored: status not paid', safeLogFields(req.body));
      return res.json({ received: true, matched: false });
    }

    if (!bookingId && !email) {
      console.warn('Webhook ignored: no bookingId or email', safeLogFields(req.body));
      sendUnmatchedPaymentAlert({
        payload: req.body,
        reason: 'webhook payload had neither bookingId nor email',
      });
      return res.json({ received: true, matched: false });
    }

    // Prefer bookingId (system-generated, typo-proof); fall back to email
    let booking = null;
    if (bookingId) {
      booking = await Booking.findOne({
        bookingId: String(bookingId).trim(),
        status: 'pending',
      });
    }
    if (!booking && email) {
      booking = await Booking.findOne({
        email: String(email).toLowerCase().trim(),
        status: 'pending',
      }).sort({ createdAt: -1 });
    }

    if (booking) {
      booking.status = 'confirmed';
      booking.expiresAt = null;
      await booking.save();
      req.io.emit('booking:updated', booking);
      console.log(`Booking ${booking.bookingId} confirmed via GHL webhook`);
      return res.json({ received: true, matched: true, bookingId: booking.bookingId });
    }

    // No pending match. Before declaring this a ghost payment, check whether
    // GHL is replaying a webhook for a booking we already confirmed — returning
    // matched:false in that case would falsely alert the admin.
    if (bookingId) {
      const alreadyConfirmed = await Booking.findOne({
        bookingId: String(bookingId).trim(),
        status: 'confirmed',
      });
      if (alreadyConfirmed) {
        console.log(
          `Webhook idempotent no-op: ${alreadyConfirmed.bookingId} already confirmed`
        );
        return res.json({
          received: true,
          matched: true,
          already_confirmed: true,
          bookingId: alreadyConfirmed.bookingId,
        });
      }
    }

    // Ghost-payment recovery: the pending booking was cleaned up before the
    // webhook arrived. Look in the audit collection.
    const auditHit = await findAuditMatch({ bookingId, email });

    if (!auditHit) {
      console.warn(
        `Webhook: no pending or audit match for bookingId=${bookingId}, email=${email}`
      );
      sendUnmatchedPaymentAlert({
        payload: req.body,
        reason: 'no pending booking and no audit record — ghost payment from unknown source',
      });
      return res.json({ received: true, matched: false });
    }

    // Audit hit. Only restore if the slot is still available — a new booking
    // may have grabbed it in the meantime, in which case automatic recovery
    // would create a double-booking.
    const conflicts = await findConflicts({
      roomUnit: auditHit.roomUnit,
      checkIn: auditHit.checkIn,
      checkOut: auditHit.checkOut,
    });

    if (conflicts.length > 0) {
      console.warn(
        `Recovery blocked: slot taken since deletion of ${auditHit.originalBookingId}`
      );
      sendUnmatchedPaymentAlert({
        payload: req.body,
        reason:
          'audit record found but the slot was re-booked after deletion — manual refund or reschedule required',
        auditHit,
      });
      return res.json({
        received: true,
        matched: false,
        recovery_blocked: true,
        originalBookingId: auditHit.originalBookingId,
      });
    }

    // Slot is free → rebuild the booking as confirmed.
    try {
      const restored = await restoreFromAudit(auditHit, req.io);
      console.log(`Recovered ghost payment: ${restored.bookingId}`);
      return res.json({
        received: true,
        matched: true,
        recovered: true,
        bookingId: restored.bookingId,
      });
    } catch (restoreErr) {
      // E11000 here almost certainly means a concurrent webhook already
      // restored this record. Treat as success so GHL doesn't retry.
      if (restoreErr.code === 11000) {
        console.log(
          `Recovery race: ${auditHit.originalBookingId} already restored by a concurrent webhook`
        );
        return res.json({
          received: true,
          matched: true,
          already_recovered: true,
          bookingId: auditHit.originalBookingId,
        });
      }
      console.error('Recovery save failed:', restoreErr.message);
      sendUnmatchedPaymentAlert({
        payload: req.body,
        reason: `audit record found but restore failed: ${restoreErr.message}`,
        auditHit,
      });
      return res.json({ received: true, matched: false, recovery_failed: true });
    }
  } catch (err) {
    console.error('Webhook error:', err.message);
    // Always return 200 to prevent GHL retry loops
    res.json({ received: true, error: true });
  }
});

export default router;
