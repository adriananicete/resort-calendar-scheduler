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

    const { email, payment_status } = req.body;

    if (!email || payment_status !== 'paid') {
      // Return 200 to prevent GHL retries — just log and ignore
      console.warn('Webhook ignored: missing email or status not paid', req.body);
      return res.json({ received: true, matched: false });
    }

    // Find the most recent pending booking for this email
    const booking = await Booking.findOne({
      email: email.toLowerCase().trim(),
      status: 'pending',
    }).sort({ createdAt: -1 });

    if (!booking) {
      console.warn(`Webhook: no pending booking found for ${email}`);
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
