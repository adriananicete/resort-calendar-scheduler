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
    const bookings = await Booking.find().sort({ checkIn: 1 });
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

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

      // Retry on bookingId collision — two concurrent POSTs within the same
      // millisecond can compute the same BK-YYYYMMDD-NNN sequence and race on
      // the unique index. Regenerate and retry up to 3 times before giving up.
      // Any other error (including the compound-index E11000 for real double
      // bookings) bubbles to the outer catch unchanged.
      const MAX_ATTEMPTS = 3;
      let saved = null;
      let lastIdCollision = null;

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
          const bookingId = await generateBookingId();
          const booking = new Booking({
            ...req.body,
            bookingId,
            status: 'pending',
            expiresAt,
          });
          saved = await booking.save();
          break;
        } catch (err) {
          if (err.code === 11000 && err.keyPattern?.bookingId) {
            lastIdCollision = err;
            continue;
          }
          throw err;
        }
      }

      if (!saved) {
        console.error('generateBookingId retries exhausted:', lastIdCollision?.message);
        return res.status(503).json({
          message: 'Could not generate a booking ID. Please try again.',
        });
      }

      req.io.emit('booking:created', saved);
      res.status(201).json(saved);
    } catch (err) {
      // Duplicate key on the unique (roomUnit, checkIn, checkOut) index —
      // a concurrent POST won the race. Return 409 the same way the pre-check does.
      if (err.code === 11000) {
        return res.status(409).json({
          message: 'Double booking detected. This room is already reserved for the selected dates.',
        });
      }
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
      if (err.code === 11000) {
        return res.status(409).json({
          message: 'Double booking detected. This room is already reserved for the selected dates.',
        });
      }
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
