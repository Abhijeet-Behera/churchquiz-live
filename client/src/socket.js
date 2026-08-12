import { io } from 'socket.io-client';

// Centralized backend Socket.IO connection URL.
// The socket itself stays public because Player connections are public.
// Host security is enforced by sending a Clerk token with each host:* event.

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_SERVER_URL ||
  'http://localhost:3000';

export const socket = io(
  SOCKET_URL,
  {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000
  }
);