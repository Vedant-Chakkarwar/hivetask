import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/middleware';

const createListSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#F59E0B'),
  icon: z.string().max(10).optional(),
  keyShares: z
    .array(
      z.object({
        userId: z.string().uuid(),
        encryptedLEK: z.string(),
        iv: z.string(),
        senderUserId: z.string().uuid(),
      }),
    )
    .optional(),
});

export const GET = withAuth(async (_req: NextRequest, { userId }) => {
  const lists = await prisma.taskList.findMany({
    where: {
      members: { some: { id: userId } },
    },
    include: {
      members: {
        select: { id: true, name: true, avatarUrl: true, color: true },
      },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const result = lists.map((list) => ({
    id: list.id,
    name: list.name,
    description: list.description,
    color: list.color,
    icon: list.icon,
    createdById: list.createdById,
    members: list.members,
    taskCount: list._count.tasks,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
  }));

  return NextResponse.json(result);
});

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = createListSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const { name, description, color, icon, keyShares } = parsed.data;

  const list = await prisma.taskList.create({
    data: {
      name,
      description,
      color,
      icon,
      createdById: userId,
      members: { connect: [{ id: userId }] },
      columns: {
        create: [
          { name: 'To Do', position: 0 },
          { name: 'In Progress', position: 1 },
          { name: 'Done', position: 2 },
        ],
      },
    },
    include: {
      columns: { orderBy: { position: 'asc' } },
      members: { select: { id: true, name: true, avatarUrl: true, color: true } },
    },
  });

  // Store encrypted LEK shares for each member
  if (keyShares?.length) {
    await prisma.listKeyShare.createMany({
      data: keyShares.map((ks) => ({
        listId: list.id,
        userId: ks.userId,
        encryptedLEK: ks.encryptedLEK,
        iv: ks.iv,
        senderUserId: ks.senderUserId,
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json(list, { status: 201 });
});
