import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, applyNewToken, unauthorized } from '@/lib/middleware';

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) return unauthorized();
  const { userId, newAccessToken } = auth;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

  const assignedFilter = { assignees: { some: { userId } } };

  const [
    totalAssigned,
    completedToday,
    overdueTasks,
    dueTodayTasks,
    dueThisWeekTasks,
    recentlyAssigned,
    myLists,
    recentNotifications,
  ] = await Promise.all([
    prisma.task.count({
      where: { ...assignedFilter, status: { not: 'DONE' } },
    }),
    prisma.task.count({
      where: {
        ...assignedFilter,
        status: 'DONE',
        updatedAt: { gte: startOfToday },
      },
    }),
    prisma.task.findMany({
      where: {
        ...assignedFilter,
        status: { not: 'DONE' },
        dueDate: { lt: startOfToday, not: null },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
      include: {
        list: { select: { id: true, name: true, color: true, icon: true } },
        assignees: {
          include: { user: { select: { id: true, name: true, avatarUrl: true, color: true } } },
        },
        labels: true,
        subtasks: true,
      },
    }),
    prisma.task.findMany({
      where: {
        ...assignedFilter,
        status: { not: 'DONE' },
        dueDate: { gte: startOfToday, lt: endOfToday },
      },
      orderBy: { dueDate: 'asc' },
      include: {
        list: { select: { id: true, name: true, color: true, icon: true } },
        assignees: {
          include: { user: { select: { id: true, name: true, avatarUrl: true, color: true } } },
        },
        labels: true,
        subtasks: true,
      },
    }),
    prisma.task.findMany({
      where: {
        ...assignedFilter,
        status: { not: 'DONE' },
        dueDate: { gte: endOfToday, lt: endOfWeek },
      },
      orderBy: { dueDate: 'asc' },
      include: {
        list: { select: { id: true, name: true, color: true, icon: true } },
        assignees: {
          include: { user: { select: { id: true, name: true, avatarUrl: true, color: true } } },
        },
        labels: true,
        subtasks: true,
      },
    }),
    prisma.task.findMany({
      where: assignedFilter,
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        list: { select: { id: true, name: true, color: true, icon: true } },
        assignees: {
          include: { user: { select: { id: true, name: true, avatarUrl: true, color: true } } },
        },
        labels: true,
        subtasks: true,
      },
    }),
    prisma.taskList.findMany({
      where: { members: { some: { id: userId } } },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        icon: true,
        createdById: true,
        _count: { select: { tasks: true } },
        members: { select: { id: true, name: true, avatarUrl: true, color: true } },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        actor: { select: { id: true, name: true, avatarUrl: true, color: true } },
      },
    }),
  ]);

  const overdueCount = await prisma.task.count({
    where: {
      ...assignedFilter,
      status: { not: 'DONE' },
      dueDate: { lt: startOfToday, not: null },
    },
  });
  const dueSoonCount = await prisma.task.count({
    where: {
      ...assignedFilter,
      status: { not: 'DONE' },
      dueDate: { gte: startOfToday, lt: endOfWeek, not: null },
    },
  });

  const activityFeed = recentNotifications.map((n) => ({
    id: n.id,
    message: n.message,
    actor: n.actor,
    taskId: n.taskId,
    createdAt: n.createdAt,
  }));

  const listsWithCount = myLists.map((l) => ({
    id: l.id,
    name: l.name,
    description: l.description,
    color: l.color,
    icon: l.icon,
    createdById: l.createdById,
    members: l.members,
    taskCount: l._count.tasks,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  }));

  return applyNewToken(
    NextResponse.json({
      summary: {
        totalAssigned,
        completedToday,
        overdueCount,
        dueSoonCount,
      },
      overdueTasks,
      dueTodayTasks,
      dueThisWeekTasks,
      recentlyAssigned,
      myLists: listsWithCount,
      activityFeed,
    }),
    newAccessToken,
  );
}
