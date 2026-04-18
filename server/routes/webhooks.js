import { Router } from 'express';
import Booking from '../models/Booking.js';

const router = Router();

// POST /api/webhooks/gohighlevel — payment confirmation from GoHighLevel
router.post('/gohighlevel', async (req, res) => {
  try {
    // Verify shared secret if configured
    const secret = process.env.GHL_WEBHOOK_SECRET;
    if (secret) {
      const provided = req.body.secret || req.headers['x-ghl-signature'];
      if (provided !== secret) {
        console.warn('Webhook rejected: invalid secret');
        return res.status(401).json({ message: 'Unauthorized' });
      }
    }

    const { email, payment_status, bookingId } = req.body;

    if (payment_status !== 'paid') {
      // Return 200 to prevent GHL retries — just log and ignore
      console.warn('Webhook ignored: status not paid', req.body);
      return res.json({ received: true, matched: false });
    }

    if (!bookingId && !email) {
      console.warn('Webhook ignored: no bookingId or email', req.body);
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

    if (!booking) {
      console.warn(`Webhook: no pending booking for bookingId=${bookingId}, email=${email}`);
      return res.json({ received: true, matched: false });
    }

    // Confirm the booking and clear the expiry
    booking.status = 'confirmed';
    booking.expiresAt = null;
    await booking.save();

    // Broadcast update to all connected clients
    req.io.emit('booking:updated', booking);

    console.log(`Booking ${booking.bookingId} confirmed via GHL webhook`);
    res.json({ received: true, matched: true, bookingId: booking.bookingId });
  } catch (err) {
    console.error('Webhook error:', err.message);
    // Always return 200 to prevent GHL retry loops
    res.json({ received: true, error: true });
  }
});

export default router;
