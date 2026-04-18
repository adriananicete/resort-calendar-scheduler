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
    enum: ['pending', 'confirmed', 'expired'],
    default: 'confirmed',
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
// Partial filter limits uniqueness to active bookings; 'expired' docs (legacy, rare)
// are exempt so a stale record can't block a legitimate new booking.
bookingSchema.index(
  { roomUnit: 1, checkIn: 1, checkOut: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } },
  }
);

// TTL index — auto-delete pending bookings after expiresAt
bookingSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { status: 'pending' } }
);

// Fast lookup for webhook email matching
bookingSchema.index({ email: 1, status: 1 });

export default mongoose.model('Booking', bookingSchema);
