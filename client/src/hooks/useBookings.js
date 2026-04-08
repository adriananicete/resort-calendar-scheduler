import { useState, useEffect } from 'react';
import { getBookings } from '../services/api';
import socket from '../socket/socket';

export function useBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getBookings()
      .then((data) => setBookings(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    socket.on('booking:created', (booking) => {
      setBookings((prev) => [...prev, booking]);
    });

    socket.on('booking:updated', (updated) => {
      setBookings((prev) =>
        prev.map((b) => (b._id === updated._id ? updated : b))
      );
    });

    socket.on('booking:deleted', ({ id }) => {
      setBookings((prev) => prev.filter((b) => b._id !== id));
    });

    return () => {
      socket.off('booking:created');
      socket.off('booking:updated');
      socket.off('booking:deleted');
    };
  }, []);

  return { bookings, loading, error };
}
