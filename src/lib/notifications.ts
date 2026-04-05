import { prisma } from '@/lib/prisma';
import { getIO } from '@/lib/socket-server';

type NotificationType = 'ASSIGNED' | 'COMMENTED' | 'DUE_SOON' | 'MENTIONED';

export async function createNotification({
  type,
  userId,
  actorId,
  taskId,
  message,
}: {
  type: NotificationType;
  userId: string;
  actorId: string;
  taskId?: string;
  message: string;
}) {
  const notification = await prisma.notification.create({
    data: {
      type,
      message,
      userId,
      taskId,
      actorId,
      read: false,
    },
    include: {
      actor: { select: { id: true, name: true, avatarUrl: true, color: true } },
    },
  });

  // Emit real-time event to recipient's personal room
  getIO()?.to(`user:${userId}`).emit('notification:new', { notification });

  return notification;
}
