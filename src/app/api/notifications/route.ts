import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/middleware';

const PAGE_SIZE = 20;

export const GET = withAuth(async (req: NextRequest, { userId }) => {
  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get('unread') === 'true';
  const cursor = url.searchParams.get('cursor');

  const where = {
    userId,
    ...(unreadOnly ? { read: false } : {}),
  };

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      actor: { select: { id: true, name: true, avatarUrl: true, color: true } },
    },
  });

  const hasMore = notifications.length > PAGE_SIZE;
  const items = hasMore ? notifications.slice(0, PAGE_SIZE) : notifications;
  const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

  // Include unread count in response
  const unreadCount = await prisma.notification.count({ where: { userId, read: false } });

  return NextResponse.json({
    notifications: items,
    nextCursor,
    hasMore,
    unreadCount,
  });
});
