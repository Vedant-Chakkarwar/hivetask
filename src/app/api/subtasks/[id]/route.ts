import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser, applyNewToken, unauthorized } from '@/lib/middleware';
import { getIO } from '@/lib/socket-server';

const updateSubtaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  completed: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

async function getSubtaskWithAccess(subtaskId: string, userId: string) {
  const subtask = await prisma.subtask.findUnique({
    where: { id: subtaskId },
    include: {
      task: { include: { list: { include: { members: { select: { id: true } } } } } },
    },
  });
  if (!subtask) return { subtask: null, allowed: false };
  const allowed = subtask.task.list.members.some((m) => m.id === userId);
  return { subtask, allowed };
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id } = await params;

  const { subtask, allowed } = await getSubtaskWithAccess(id, userId);
  if (!subtask) return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = updateSubtaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const updated = await prisma.subtask.update({ where: { id }, data: parsed.data });
  const listId = subtask.task.listId;

  if (parsed.data.completed !== undefined) {
    getIO()?.to(`list:${listId}`).emit('subtask:toggled', {
      taskId: subtask.taskId,
      subtaskId: id,
      completed: updated.completed,
      actorId: userId,
    });
  }

  return applyNewToken(NextResponse.json(updated), newAccessToken);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id } = await params;

  const { subtask, allowed } = await getSubtaskWithAccess(id, userId);
  if (!subtask) return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const listId = subtask.task.listId;
  const taskId = subtask.taskId;
  await prisma.subtask.delete({ where: { id } });
  getIO()?.to(`list:${listId}`).emit('subtask:deleted', { taskId, subtaskId: id, actorId: userId });
  return applyNewToken(NextResponse.json({ success: true }), newAccessToken);
}
