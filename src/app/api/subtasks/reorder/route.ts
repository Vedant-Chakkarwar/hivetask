import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/middleware';

const reorderSchema = z.object({
  subtasks: z.array(z.object({ id: z.string().uuid(), position: z.number().int().min(0) })).min(1),
});

export const PUT = withAuth(async (req: NextRequest, { userId }) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const { subtasks } = parsed.data;
  const firstId = subtasks[0]?.id;
  if (!firstId) return NextResponse.json({ error: 'No subtasks provided' }, { status: 400 });

  const subtask = await prisma.subtask.findUnique({
    where: { id: firstId },
    include: {
      task: { include: { list: { include: { members: { select: { id: true } } } } } },
    },
  });
  if (!subtask) return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  if (!subtask.task.list.members.some((m) => m.id === userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.$transaction(
    subtasks.map(({ id, position }) => prisma.subtask.update({ where: { id }, data: { position } })),
  );

  return NextResponse.json({ success: true });
});
