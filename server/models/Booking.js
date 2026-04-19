import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    unique: true,
    sparse: true,
  },
  guestName: {
    type: String,
    required: true,
    trim: true,
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  tourType: {
    type: String,
    enum: ['day', 'night', 'overnight'],
    required: true,
  },
  checkIn: {
    type: Date,
    required: true,
  },
  checkOut: {
    type: Date,
    required: true,
  },
  roomUnit: {
    type: String,
    enum: ['Kubo A', 'Kubo B', 'Kubo C', 'Kubo D', 'Villa 1', 'Villa 2'],
    required: true,
  },
  adults: {
    type: Number,
    required: true,
    min: 1,
  },
  children: {
    type: Number,
    default: 0,
    min: 0,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentType: {
    type: String,
    enum: ['downpayment', 'full'],
    required: true,
  },
  specialRequest: {
    type: String,
    default: '',
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed'],
    default: 'pending',
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Unique compound index — race-proof defense against double-booking.
// Partial filter keeps uniqueness scoped to the two valid statuses; any legacy
// doc with a stale status (pre-enum-cleanup) is exempt and can't block a new
// booking.
bookingSchema.index(
  { roomUnit: 1, checkIn: 1, checkOut: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } },
  }
);

// Fast lookup for cleanup-loop and webhook email matching.
// Pending-booking expiry is handled by the cleanup interval in server.js, not
// by a MongoDB TTL: the interval first copies each expiring booking into the
// DeletedPending audit collection so late-arriving webhooks can still recover.
bookingSchema.index({ status: 1, expiresAt: 1 });
bookingSchema.index({ email: 1, status: 1 });

export default mongoose.model('Booking', bookingSchema);
