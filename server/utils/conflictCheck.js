import Booking from '../models/Booking.js';

/**
 * Find bookings that overlap with the given room + time range.
 * Two intervals overlap when: existing.checkIn < newCheckOut AND existing.checkOut > newCheckIn
 *
 * @param {string} roomUnit - room name to check
 * @param {string|Date} checkIn - requested check-in datetime
 * @param {string|Date} checkOut - requested check-out datetime
 * @param {string|null} excludeId - booking _id to exclude (for update operations)
 * @returns {Promise<Array>} array of conflicting bookings
 */
export async function findConflicts({ roomUnit, checkIn, checkOut, excludeId = null }) {
  const query = {
    roomUnit,
    checkIn: { $lt: new Date(checkOut) },
    checkOut: { $gt: new Date(checkIn) },
    status: { $ne: 'expired' },
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return await Booking.find(query).select(
    'guestName checkIn checkOut roomUnit tourType'
  );
}
