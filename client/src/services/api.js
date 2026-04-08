import axios from 'axios';

// Dev: Vite proxy handles /api → localhost:5000
// Prod: set VITE_API_URL=https://your-render-url.onrender.com/api in Vercel env vars
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 8000,
});

export const getBookings = () =>
  api.get('/bookings').then((r) => r.data);

export const createBooking = (data) =>
  api.post('/bookings', data).then((r) => r.data);

export const updateBooking = (id, data) =>
  api.put(`/bookings/${id}`, data).then((r) => r.data);

export const deleteBooking = (id) =>
  api.delete(`/bookings/${id}`).then((r) => r.data);

export const checkConflict = (params) =>
  api.get('/bookings/conflict-check', { params }).then((r) => r.data);
