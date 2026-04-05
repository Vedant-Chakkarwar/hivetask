import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser, applyNewToken, unauthorized } from '@/lib/middleware';
import { getIO } from '@/lib/socket-server';
import { createNotification } from '@/lib/notifications';
import { Prisma } from '@prisma/client';
import { TASK_INCLUDE } from '@/lib/taskIncludes';

const createTaskSchema = z.object({
  title: z.string().min(1).max(2000),
  description: z.string().max(20000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  columnId: z.string().uuid().optional(),
  assigneeIds: z.array(z.string().uuid()).max(20).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  labelIds: z.array(z.string().uuid()).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id: listId } = await params;

  const list = await prisma.taskList.findUnique({
    where: { id: listId },
    include: { members: { select: { id: true } } },
  });
  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });
  if (!list.members.some((m) => m.id === userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const assigneeParam = url.searchParams.get('assignee');
  const priorityParam = url.searchParams.get('priority');
  const labelParam = url.searchParams.get('label');
  const statusParam = url.searchParams.get('status');
  const dueDateParam = url.searchParams.get('dueDate');
  const sortParam = url.searchParams.get('sort') ?? 'position';
  const orderParam = (url.searchParams.get('order') ?? 'asc') as 'asc' | 'desc';

  const where: Prisma.TaskWhereInput = { listId };
  if (assigneeParam) where.assignees = { some: { userId: assigneeParam } };
  if (priorityParam && ['LOW', 'MEDIUM', 'HIGH'].includes(priorityParam)) {
    where.priority = priorityParam as 'LOW' | 'MEDIUM' | 'HIGH';
  }
  if (statusParam && ['TODO', 'IN_PROGRESS', 'DONE'].includes(statusParam)) {
    where.status = statusParam as 'TODO' | 'IN_PROGRESS' | 'DONE';
  }
  if (labelParam) {
    where.labels = { some: { id: labelParam } };
  }
  if (dueDateParam === 'overdue') {
    where.dueDate = { lt: new Date() };
    where.status = { not: 'DONE' };
  } else if (dueDateParam === 'today') {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    where.dueDate = { gte: start, lte: end };
  } else if (dueDateParam === 'week') {
    const start = new Date();
    const end = new Date(); end.setDate(end.getDate() + 7);
    where.dueDate = { gte: start, lte: end };
  }

  const validSorts: Record<string, Prisma.TaskOrderByWithRelationInput> = {
    position: { position: orderParam },
    priority: { priority: orderParam },
    dueDate: { dueDate: orderParam },
    createdAt: { createdAt: orderParam },
  };
  const orderBy = validSorts[sortParam] ?? { position: 'asc' };

  const tasks = await prisma.task.findMany({
    where,
    orderBy,
    include: TASK_INCLUDE,
  });

  return applyNewToken(NextResponse.json(tasks), newAccessToken);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;
  const { id: listId } = await params;

  const list = await prisma.taskList.findUnique({
    where: { id: listId },
    include: {
      members: { select: { id: true } },
      columns: { orderBy: { position: 'asc' }, take: 1 },
    },
  });
  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });
  if (!list.members.some((m) => m.id === userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const { title, description, priority, columnId, assigneeIds, dueDate, labelIds } = parsed.data;

  const targetColumnId = columnId ?? list.columns[0]?.id;
  if (!targetColumnId) return NextResponse.json({ error: 'No columns available' }, { status: 400 });

  const lastTask = await prisma.task.findFirst({
    where: { columnId: targetColumnId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });
  const position = (lastTask?.position ?? -1) + 1;

  const task = await prisma.task.create({
    data: {
      title,
      description,
      priority: priority ?? 'MEDIUM',
      listId,
      columnId: targetColumnId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdById: userId,
      position,
      labels: labelIds?.length ? { connect: labelIds.map((id) => ({ id })) } : undefined,
      assignees: assigneeIds?.length
        ? { create: assigneeIds.map((uid) => ({ userId: uid })) }
        : undefined,
    },
    include: TASK_INCLUDE,
  });

  getIO()?.to(`list:${listId}`).emit('task:created', { task, actorId: userId });

  if (assigneeIds?.length) {
    for (const assigneeId of assigneeIds) {
      if (assigneeId !== userId) {
        await createNotification({
          type: 'ASSIGNED',
          message: `You were assigned to "${title}"`,
          userId: assigneeId,
          taskId: task.id,
          actorId: userId,
        });
      }
    }
  }

  return applyNewToken(NextResponse.json(task, { status: 201 }), newAccessToken);
}
