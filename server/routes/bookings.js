import { Router } from 'express';
import Booking from '../models/Booking.js';
import { findConflicts } from '../utils/conflictCheck.js';
import { generateBookingId } from '../utils/generateBookingId.js';
import {
  bookingValidationRules,
  conflictCheckRules,
  handleValidationErrors,
} from '../middleware/validateBooking.js';

const router = Router();

// GET /api/bookings/conflict-check — live form validation (must be before /:id route)
router.get(
  '/conflict-check',
  conflictCheckRules,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { roomUnit, checkIn, checkOut, excludeId } = req.query;
      const conflicts = await findConflicts({ roomUnit, checkIn, checkOut, excludeId });
      res.json({ hasConflict: conflicts.length > 0, conflicts });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// GET /api/bookings/status/:bookingId — check booking payment status
router.get('/status/:bookingId', async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.bookingId })
      .select('bookingId status guestName');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found or expired' });
    }
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/bookings — fetch all bookings
router.get('/', async (_req, res) => {
  try {
    const bookings = await Booking.find({ status: { $ne: 'expired' } }).sort({ checkIn: 1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/bookings — create booking
router.post(
  '/',
  bookingValidationRules,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { roomUnit, checkIn, checkOut } = req.body;

      const conflicts = await findConflicts({ roomUnit, checkIn, checkOut });
      if (conflicts.length > 0) {
        return res.status(409).json({
          message: 'Double booking detected. This room is already reserved for the selected dates.',
          conflicts,
        });
      }

      const bookingId = await generateBookingId();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      const booking = new Booking({
        ...req.body,
        bookingId,
        status: 'pending',
        expiresAt,
      });
      const saved = await booking.save();

      req.io.emit('booking:created', saved);
      res.status(201).json(saved);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// PUT /api/bookings/:id — update booking
router.put(
  '/:id',
  bookingValidationRules,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { roomUnit, checkIn, checkOut } = req.body;

      const conflicts = await findConflicts({ roomUnit, checkIn, checkOut, excludeId: id });
      if (conflicts.length > 0) {
        return res.status(409).json({
          message: 'Double booking detected. This room is already reserved for the selected dates.',
          conflicts,
        });
      }

      const updated = await Booking.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
      });

      if (!updated) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      req.io.emit('booking:updated', updated);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// DELETE /api/bookings/:id — delete booking
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Booking.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    req.io.emit('booking:deleted', { id });
    res.json({ message: 'Booking deleted successfully', id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
