'use client';

import { io, Socket } from 'socket.io-client';

let _socket: Socket | null = null;

/**
 * Returns the singleton Socket.IO client instance.
 * Connects to the same origin (custom server handles both Next.js + Socket.IO).
 */
export function getSocket(): Socket {
  if (!_socket) {
    _socket = io({
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
  }
  return _socket;
}

export function disconnectSocket() {
  _socket?.disconnect();
  _socket = null;
}
