import Booking from '../models/Booking.js';

/**
 * Generate a human-readable booking ID in format BK-YYYYMMDD-NNN.
 * Queries today's bookings to determine the next sequence number.
 */
export async function generateBookingId() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;
  const prefix = `BK-${dateStr}-`;

  // Find the highest sequence number for today's prefix to avoid
  // duplicate IDs when expired/deleted bookings lower the count
  const last = await Booking.findOne({ bookingId: { $regex: `^${prefix}` } })
    .sort({ bookingId: -1 })
    .select('bookingId')
    .lean();

  let nextSeq = 1;
  if (last) {
    const lastSeq = parseInt(last.bookingId.split('-').pop(), 10);
    nextSeq = lastSeq + 1;
  }

  const seq = String(nextSeq).padStart(3, '0');
  return `${prefix}${seq}`;
}
