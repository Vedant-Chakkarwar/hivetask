import { createServer } from 'node:http';
import { parse } from 'node:url';
import next from 'next';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT ?? '3000', 10);

// Inline JWT verification — avoids importing from src/lib/auth.ts which uses next/headers
function verifyAccessToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; type: string };
    if (payload.type !== 'access') return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

function parseCookieToken(cookieHeader?: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

const app = next({ dev, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${port}`,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Make io accessible to Next.js API routes via global
  (global as typeof global & { __io?: Server }).__io = io;

  // Presence tracking: userId -> Set<socketId>
  const presence = new Map<string, Set<string>>();

  // Auth middleware — verify JWT from cookie or auth token
  io.use((socket, next) => {
    const token =
      socket.handshake.auth.token ||
      parseCookieToken(socket.handshake.headers.cookie);
    if (!token) return next(new Error('Authentication error'));
    const payload = verifyAccessToken(token);
    if (!payload) return next(new Error('Authentication error'));
    socket.data.userId = payload.userId;
    next();
  });

  io.on('connection', (socket) => {
    const userId: string = socket.data.userId;

    // Track presence
    if (!presence.has(userId)) presence.set(userId, new Set());
    presence.get(userId)!.add(socket.id);

    // Join personal notification room
    socket.join(`user:${userId}`);

    socket.on('join:list', (listId: string) => {
      socket.join(`list:${listId}`);
      // Send current online users to the joining client
      const onlineUserIds = getOnlineUsersInRoom(`list:${listId}`);
      socket.emit('presence:current', { onlineUserIds });
      // Notify others that this user is online
      socket.to(`list:${listId}`).emit('presence:online', { userId });
    });

    socket.on('leave:list', (listId: string) => {
      socket.leave(`list:${listId}`);
      socket.to(`list:${listId}`).emit('presence:offline', { userId });
    });

    socket.on('disconnect', () => {
      const sockets = presence.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          presence.delete(userId);
          // Notify all list rooms that this user went offline
          for (const room of socket.rooms) {
            if (room.startsWith('list:')) {
              io.to(room).emit('presence:offline', { userId });
            }
          }
        }
      }
    });
  });

  function getOnlineUsersInRoom(room: string): string[] {
    const userIds = new Set<string>();
    const roomSockets = io.sockets.adapter.rooms.get(room);
    if (!roomSockets) return [];
    for (const socketId of roomSockets) {
      const s = io.sockets.sockets.get(socketId);
      if (s?.data.userId) userIds.add(s.data.userId);
    }
    return Array.from(userIds);
  }

  // Start due-date notification checker
  startDueDateChecker(io);

  httpServer.listen(port, () => {
    console.log(`> HiveTask ready on http://localhost:${port}`);
  });
});

async function startDueDateChecker(io: Server) {
  // Inline Prisma client — avoid importing from src/lib which isn't available in standalone build
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  async function checkDueDates() {
    try {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const tasks = await prisma.task.findMany({
        where: {
          dueDate: { gte: now, lte: in24h },
          status: { not: 'DONE' },
          assignees: { some: {} },
        },
        select: {
          id: true,
          title: true,
          assignees: { select: { userId: true } },
        },
      });

      for (const task of tasks) {
        for (const assignee of task.assignees) {
          // Skip if we already sent a DUE_SOON notification today
          const existing = await prisma.notification.findFirst({
            where: {
              taskId: task.id,
              type: 'DUE_SOON',
              userId: assignee.userId,
              createdAt: { gte: startOfDay },
            },
          });
          if (existing) continue;

          const notification = await prisma.notification.create({
            data: {
              type: 'DUE_SOON',
              message: `"${task.title}" is due in less than 24 hours`,
              userId: assignee.userId,
              taskId: task.id,
              actorId: assignee.userId,
            },
            include: {
              actor: { select: { id: true, name: true, avatarUrl: true, color: true } },
            },
          });

          io.to(`user:${assignee.userId}`).emit('notification:new', { notification });
        }
      }
    } catch (error) {
      console.error('[DueDateChecker] Error:', error);
    }
  }

  // Initial run after 10s, then every hour
  setTimeout(() => {
    checkDueDates();
    setInterval(checkDueDates, 60 * 60 * 1000);
  }, 10_000);
}
