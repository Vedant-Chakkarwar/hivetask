import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/middleware';

const readSchema = z.union([
  z.object({ all: z.literal(true) }),
  z.object({ notificationIds: z.array(z.string()).min(1) }),
]);

export const PUT = withAuth(async (req: NextRequest, { userId }) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = readSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Provide either { all: true } or { notificationIds: [...] }' }, { status: 400 });
  }

  if ('all' in parsed.data) {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  } else {
    // Only mark notifications that belong to this user
    await prisma.notification.updateMany({
      where: { id: { in: parsed.data.notificationIds }, userId },
      data: { read: true },
    });
  }

  return NextResponse.json({ success: true });
});
