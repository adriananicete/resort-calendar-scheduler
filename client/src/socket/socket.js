import { io } from 'socket.io-client';

// Singleton — import this anywhere, only one connection is made
const socket = io('http://localhost:5000', {
  autoConnect: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default socket;
