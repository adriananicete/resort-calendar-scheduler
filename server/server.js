import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bookingRoutes from './routes/bookings.js';
import webhookRoutes from './routes/webhooks.js';
import Booking from './models/Booking.js';

dotenv.config();

// Fail fast if webhook secret is missing in production; warn loudly in dev.
// Prevents an unauthenticated webhook endpoint from silently accepting any payload.
if (!process.env.GHL_WEBHOOK_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: GHL_WEBHOOK_SECRET is required in production.');
    process.exit(1);
  }
  console.warn(
    '\u26a0\ufe0f  GHL_WEBHOOK_SECRET is not set. Webhook will reject all requests with 401.'
  );
}

// Support comma-separated origins: e.g. "https://app.vercel.app,http://localhost:5173"
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

const app = express();
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Attach socket.io instance to every request so routes can emit events
app.use((req, _res, next) => {
  req.io = io;
  next();
});

app.use('/api/bookings', bookingRoutes);
app.use('/api/webhooks', webhookRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`Client disconnected: ${socket.id}`));
});

// Clean up expired pending bookings every 5 minutes
// (TTL index handles deletion, but this emits socket events so clients update)
function startPendingCleanup() {
  setInterval(async () => {
    try {
      const expired = await Booking.find({
        status: 'pending',
        expiresAt: { $lte: new Date() },
      }).select('_id bookingId');

      for (const doc of expired) {
        await Booking.findByIdAndDelete(doc._id);
        io.emit('booking:deleted', { id: doc._id });
      }

      if (expired.length > 0) {
        console.log(`Cleaned up ${expired.length} expired pending booking(s)`);
      }
    } catch (err) {
      console.error('Pending cleanup error:', err.message);
    }
  }, 5 * 60 * 1000);
}

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected');
    // Reconcile indexes with the schema — required when promoting the
    // {roomUnit, checkIn, checkOut} index from non-unique to unique.
    await Booking.syncIndexes();
    startPendingCleanup();
    httpServer.listen(process.env.PORT, () =>
      console.log(`Server running on port ${process.env.PORT}`)
    );
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
