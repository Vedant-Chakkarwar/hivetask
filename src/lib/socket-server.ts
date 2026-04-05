import type { Server } from 'socket.io';

/**
 * Returns the Socket.IO server instance set by the custom server (server/index.ts).
 * Returns null if called outside the custom server context (e.g., during build).
 */
export function getIO(): Server | null {
  return (global as typeof global & { __io?: Server }).__io ?? null;
}
