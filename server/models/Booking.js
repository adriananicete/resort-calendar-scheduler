import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for fast conflict queries
bookingSchema.index({ roomUnit: 1, checkIn: 1, checkOut: 1 });

export default mongoose.model('Booking', bookingSchema);
