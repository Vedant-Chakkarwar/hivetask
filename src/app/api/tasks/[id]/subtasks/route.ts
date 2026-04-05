import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser, applyNewToken, unauthorized } from '@/lib/middleware';
import { getIO } from '@/lib/socket-server';

const createSubtaskSchema = z.object({
  title: z.string().min(1).max(500),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id: taskId } = await params;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      list: { include: { members: { select: { id: true } } } },
      subtasks: { orderBy: { position: 'desc' }, take: 1 },
    },
  });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  if (!task.list.members.some((m) => m.id === userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = createSubtaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const maxPosition = task.subtasks[0]?.position ?? -1;

  const subtask = await prisma.subtask.create({
    data: {
      title: parsed.data.title,
      taskId,
      position: maxPosition + 1,
    },
  });

  getIO()?.to(`list:${task.listId}`).emit('subtask:created', { taskId, subtask, actorId: userId });

  return applyNewToken(NextResponse.json(subtask, { status: 201 }), newAccessToken);
}
