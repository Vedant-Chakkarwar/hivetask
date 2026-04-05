import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/middleware';
import { getIO } from '@/lib/socket-server';

const reorderSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int().min(0),
      columnId: z.string().uuid(),
    }),
  ).min(1),
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

  const { tasks } = parsed.data;
  const firstTaskId = tasks[0]?.id;
  if (!firstTaskId) return NextResponse.json({ error: 'No tasks provided' }, { status: 400 });

  // Check membership
  const task = await prisma.task.findUnique({
    where: { id: firstTaskId },
    include: { list: { include: { members: { select: { id: true } } } } },
  });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  if (!task.list.members.some((m) => m.id === userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.$transaction(
    tasks.map(({ id, position, columnId }) =>
      prisma.task.update({ where: { id }, data: { position, columnId } }),
    ),
  );

  // Emit reorder events grouped by column
  const io = getIO();
  if (io) {
    const byColumn = new Map<string, Array<{ id: string; position: number }>>();
    for (const { id, position, columnId } of tasks) {
      if (!byColumn.has(columnId)) byColumn.set(columnId, []);
      byColumn.get(columnId)!.push({ id, position });
    }
    for (const [columnId, columnTasks] of byColumn) {
      io.to(`list:${task.listId}`).emit('tasks:reordered', { columnId, tasks: columnTasks, actorId: userId });
    }
  }

  return NextResponse.json({ success: true });
});
