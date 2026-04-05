import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser, applyNewToken, unauthorized } from '@/lib/middleware';
import { getIO } from '@/lib/socket-server';
import { TASK_INCLUDE } from '@/lib/taskIncludes';

const completeSchema = z.object({
  completed: z.boolean(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id: taskId } = await params;

  // Verify task exists and user is a member of the list
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      list: { include: { members: { select: { id: true } } } },
      assignees: true,
    },
  });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  if (!task.list.members.some((m) => m.id === userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Only assigned users can toggle their own completion
  const myAssignment = task.assignees.find((a) => a.userId === userId);
  if (!myAssignment) {
    return NextResponse.json({ error: 'You are not assigned to this task' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = completeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { completed } = parsed.data;

  // Update only current user's completion
  await prisma.taskAssignee.update({
    where: { id: myAssignment.id },
    data: { completed },
  });

  // Derive task status from aggregate assignee completion
  const allAssignees = await prisma.taskAssignee.findMany({ where: { taskId } });
  const allCompleted = allAssignees.every((a) => (a.id === myAssignment.id ? completed : a.completed));
  const anyCompleted = completed || allAssignees.some((a) => a.id !== myAssignment.id && a.completed);

  let derivedStatus: 'TODO' | 'IN_PROGRESS' | 'DONE';
  if (allCompleted && allAssignees.length > 0) {
    derivedStatus = 'DONE';
  } else if (anyCompleted) {
    derivedStatus = 'IN_PROGRESS';
  } else {
    derivedStatus = 'TODO';
  }

  // If all assignees complete, auto-move to Done column (if one exists)
  let columnUpdate = {};
  if (derivedStatus === 'DONE') {
    const doneColumn = await prisma.column.findFirst({
      where: {
        listId: task.listId,
        OR: [
          { name: { contains: 'done', mode: 'insensitive' } },
          { name: { contains: 'complete', mode: 'insensitive' } },
          { name: { contains: 'finish', mode: 'insensitive' } },
        ],
      },
    });
    if (doneColumn && task.columnId !== doneColumn.id) {
      columnUpdate = { columnId: doneColumn.id, position: 0 };
    }
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { status: derivedStatus, ...columnUpdate },
    include: TASK_INCLUDE,
  });

  const io = getIO();
  if (io) {
    if (columnUpdate && 'columnId' in columnUpdate) {
      io.to(`list:${task.listId}`).emit('task:moved', {
        taskId,
        fromColumnId: task.columnId,
        toColumnId: (columnUpdate as { columnId: string }).columnId,
        newPosition: 0,
        actorId: userId,
      });
    }
    io.to(`list:${task.listId}`).emit('task:updated', { task: updated, actorId: userId });
  }

  return applyNewToken(NextResponse.json(updated), newAccessToken);
}
