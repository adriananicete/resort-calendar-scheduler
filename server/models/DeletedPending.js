import mongoose from 'mongoose';

// Audit snapshot of pending bookings that expired before the GHL payment
// webhook arrived. Gives the webhook a recovery path for "ghost payments":
// the customer paid past the 60-minute window, so the pending was cleaned up,
// but the money still arrives. If the slot is still free, the webhook can
// rebuild the booking from this record instead of forcing a manual refund.
//
// Auto-expires after 48h — long enough to cover any realistic GHL delay, short
// enough that the collection stays small.
const deletedPendingSchema = new mongoose.Schema({
  originalBookingId: { type: String, required: true },
  guestName: String,
  contactNumber: String,
  email: { type: String, lowercase: true, trim: true },
  tourType: String,
  checkIn: Date,
  checkOut: Date,
  roomUnit: String,
  adults: Number,
  children: Number,
  amount: Number,
  paymentType: String,
  specialRequest: String,
  originalCreatedAt: Date,
  deletedAt: { type: Date, default: Date.now },
});

deletedPendingSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 48 * 3600 });
deletedPendingSchema.index({ originalBookingId: 1 });
deletedPendingSchema.index({ email: 1, deletedAt: -1 });

export default mongoose.model('DeletedPending', deletedPendingSchema);
