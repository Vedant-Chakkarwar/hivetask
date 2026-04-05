import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser, applyNewToken, unauthorized } from '@/lib/middleware';
import { getIO } from '@/lib/socket-server';
import { createNotification } from '@/lib/notifications';
import { TASK_INCLUDE } from '@/lib/taskIncludes';

const updateTaskSchema = z.object({
  title: z.string().min(1).max(2000).optional(),
  description: z.string().max(20000).nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  assigneeIds: z.array(z.string().uuid()).max(20).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  columnId: z.string().uuid().nullable().optional(),
  labelIds: z.array(z.string().uuid()).optional(),
});

async function getTaskWithAccess(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      list: { include: { members: { select: { id: true } } } },
      assignees: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true, color: true } },
        },
      },
      createdBy: { select: { id: true, name: true, avatarUrl: true, color: true } },
      labels: true,
      subtasks: { orderBy: { position: 'asc' } },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { id: true, name: true, avatarUrl: true, color: true } } },
      },
      attachments: {
        orderBy: { createdAt: 'desc' },
        include: { uploadedBy: { select: { id: true, name: true, avatarUrl: true, color: true } } },
      },
    },
  });
  if (!task) return { task: null, isMember: false };
  const isMember = task.list.members.some((m) => m.id === userId);
  return { task, isMember };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id } = await params;

  const { task, isMember } = await getTaskWithAccess(id, userId);
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return applyNewToken(NextResponse.json(task), newAccessToken);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id } = await params;

  const { task, isMember } = await getTaskWithAccess(id, userId);
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const { labelIds, dueDate, assigneeIds, ...rest } = parsed.data;

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...rest,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
      labels: labelIds !== undefined ? { set: labelIds.map((lid) => ({ id: lid })) } : undefined,
      assignees: assigneeIds !== undefined
        ? { deleteMany: {}, create: assigneeIds.map((uid) => ({ userId: uid })) }
        : undefined,
    },
    include: TASK_INCLUDE,
  });

  getIO()?.to(`list:${task.listId}`).emit('task:updated', { task: updated, actorId: userId });

  if (assigneeIds) {
    const oldIds = task.assignees.map((a) => a.userId);
    const newlyAdded = assigneeIds.filter((uid) => !oldIds.includes(uid) && uid !== userId);
    for (const uid of newlyAdded) {
      await createNotification({
        type: 'ASSIGNED',
        message: `You were assigned to "${updated.title}"`,
        userId: uid,
        taskId: id,
        actorId: userId,
      });
    }
  }

  return applyNewToken(NextResponse.json(updated), newAccessToken);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id } = await params;

  const { task, isMember } = await getTaskWithAccess(id, userId);
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (task.createdById !== userId && !task.assignees.some((a) => a.userId === userId)) {
    return NextResponse.json({ error: 'Only the task creator or an assignee can delete this task' }, { status: 403 });
  }

  const listId = task.listId;
  await prisma.task.delete({ where: { id } });
  getIO()?.to(`list:${listId}`).emit('task:deleted', { taskId: id, actorId: userId });
  return applyNewToken(NextResponse.json({ success: true }), newAccessToken);
}
