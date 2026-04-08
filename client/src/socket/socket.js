import { io } from 'socket.io-client';

// Dev: localhost:5000 | Prod: set VITE_SOCKET_URL in Vercel env vars
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'],
});

export default socket;
