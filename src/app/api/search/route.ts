import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, applyNewToken, unauthorized } from '@/lib/middleware';

export async function GET(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const assigneeParam = searchParams.get('assignee') ?? '';
  const priorityParam = searchParams.get('priority') ?? '';
  const labelParam = searchParams.get('label') ?? '';
  const dueParam = searchParams.get('due') ?? '';
  const statusParam = searchParams.get('status') ?? '';
  const listIdParam = searchParams.get('listId') ?? '';

  const userLists = await prisma.taskList.findMany({
    where: { members: { some: { id: userId } } },
    select: { id: true },
  });
  const listIds = userLists.map((l) => l.id);
  if (listIds.length === 0) {
    return applyNewToken(NextResponse.json([]), newAccessToken);
  }

  const filterListIds = listIdParam ? [listIdParam].filter((id) => listIds.includes(id)) : listIds;
  const assigneeIds = assigneeParam ? assigneeParam.split(',').filter(Boolean) : undefined;
  const priorities = priorityParam ? priorityParam.split(',').filter(Boolean) as ('LOW' | 'MEDIUM' | 'HIGH')[] : undefined;
  const labelIds = labelParam ? labelParam.split(',').filter(Boolean) : undefined;
  const statuses = statusParam ? statusParam.split(',').filter(Boolean) as ('TODO' | 'IN_PROGRESS' | 'DONE')[] : undefined;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);
  const endOfMonth = new Date(startOfToday.getTime() + 30 * 24 * 60 * 60 * 1000);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dueDateFilter: any =
    dueParam === 'overdue' ? { lt: startOfToday } :
    dueParam === 'today' ? { gte: startOfToday, lt: endOfToday } :
    dueParam === 'week' ? { gte: endOfToday, lt: endOfWeek } :
    dueParam === 'month' ? { gte: endOfWeek, lt: endOfMonth } :
    dueParam === 'none' ? null :
    undefined;

  const tasks = await prisma.task.findMany({
    where: {
      listId: { in: filterListIds },
      ...(q ? {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      } : {}),
      ...(assigneeIds ? { assignees: { some: { userId: { in: assigneeIds } } } } : {}),
      ...(priorities ? { priority: { in: priorities } } : {}),
      ...(labelIds ? { labels: { some: { id: { in: labelIds } } } } : {}),
      ...(dueParam === 'none' ? { dueDate: null } : dueDateFilter !== undefined ? { dueDate: dueDateFilter } : {}),
      ...(statuses ? { status: { in: statuses } } : {}),
    },
    include: {
      list: { select: { id: true, name: true, color: true, icon: true } },
      column: { select: { id: true, name: true } },
      assignees: {
        include: { user: { select: { id: true, name: true, avatarUrl: true, color: true } } },
      },
      labels: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  return applyNewToken(NextResponse.json(tasks), newAccessToken);
}
