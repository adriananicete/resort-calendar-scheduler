import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Booking from '../models/Booking.js';

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set.');
  process.exit(1);
}

try {
  await mongoose.connect(uri);
  const result = await Booking.deleteMany({});
  console.log(`Deleted ${result.deletedCount} booking(s).`);
} catch (err) {
  console.error('Reset failed:', err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
