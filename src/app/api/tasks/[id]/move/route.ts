import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser, applyNewToken, unauthorized } from '@/lib/middleware';
import { getIO } from '@/lib/socket-server';
import { TASK_INCLUDE } from '@/lib/taskIncludes';

const moveSchema = z.object({
  columnId: z.string().uuid(),
  position: z.number().int().min(0),
});

function getStatusFromColumnName(name: string): 'TODO' | 'IN_PROGRESS' | 'DONE' {
  const lower = name.toLowerCase();
  if (lower.includes('progress')) return 'IN_PROGRESS';
  if (lower.includes('done') || lower.includes('complete') || lower.includes('finish')) return 'DONE';
  return 'TODO';
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id: taskId } = await params;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { list: { include: { members: { select: { id: true } } } } },
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

  const parsed = moveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const { columnId, position } = parsed.data;

  const column = await prisma.column.findFirst({ where: { id: columnId, listId: task.listId } });
  if (!column) return NextResponse.json({ error: 'Column not found in this list' }, { status: 404 });

  const status = getStatusFromColumnName(column.name);

  // Block drag to Done column unless ALL assignees have marked complete
  if (status === 'DONE') {
    const assignees = await prisma.taskAssignee.findMany({ where: { taskId } });
    if (assignees.length > 0 && !assignees.every((a) => a.completed)) {
      return NextResponse.json(
        { error: 'All assignees must mark their completion before moving to Done' },
        { status: 400 },
      );
    }
  }

  // When leaving Done column, reset all assignee completions
  let assigneeUpdate = {};
  if (status === 'DONE') {
    assigneeUpdate = { assignees: { updateMany: { where: { taskId }, data: { completed: true } } } };
  } else if (task.status === 'DONE') {
    assigneeUpdate = { assignees: { updateMany: { where: { taskId }, data: { completed: false } } } };
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { columnId, position, status, ...assigneeUpdate },
    include: TASK_INCLUDE,
  });

  getIO()?.to(`list:${task.listId}`).emit('task:moved', {
    taskId,
    fromColumnId: task.columnId,
    toColumnId: columnId,
    newPosition: position,
    actorId: userId,
  });

  return applyNewToken(NextResponse.json(updated), newAccessToken);
}
