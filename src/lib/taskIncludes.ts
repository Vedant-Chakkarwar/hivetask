import { Prisma } from '@prisma/client';

/** Shared Prisma include for Task queries — keeps assignees shape consistent everywhere. */
export const TASK_INCLUDE = {
  assignees: {
    include: {
      user: { select: { id: true, name: true, avatarUrl: true, color: true } },
    },
    orderBy: { assignedAt: 'asc' as Prisma.SortOrder },
  },
  createdBy: { select: { id: true, name: true, avatarUrl: true, color: true } },
  labels: true,
  subtasks: { orderBy: { position: 'asc' as Prisma.SortOrder } },
} satisfies Prisma.TaskInclude;
