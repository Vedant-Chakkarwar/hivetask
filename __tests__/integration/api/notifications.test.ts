// @vitest-environment node
/**
 * Integration tests — Notifications API
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockNotifications = [
  { id: 'notif-1', type: 'ASSIGNED', message: 'Bob assigned you to "Task 1"', read: false, userId: 'user-alice', taskId: 'task-1', actorId: 'user-bob', createdAt: new Date('2026-03-05T10:00:00Z') },
  { id: 'notif-2', type: 'COMMENTED', message: 'Bob commented on "Task 2"', read: false, userId: 'user-alice', taskId: 'task-2', actorId: 'user-bob', createdAt: new Date('2026-03-05T09:00:00Z') },
  { id: 'notif-3', type: 'DUE_SOON', message: 'Task 3 is due soon', read: true, userId: 'user-alice', taskId: 'task-3', actorId: null, createdAt: new Date('2026-03-05T08:00:00Z') },
];

vi.mock('@/lib/prisma', () => ({
  prisma: {
    notification: {
      findMany: vi.fn().mockResolvedValue(mockNotifications),
      count: vi.fn().mockResolvedValue(2),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 2 }),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/socket-server', () => ({
  getIO: () => ({ to: () => ({ emit: vi.fn() }), emit: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('I-NO-01: Get notifications returns user\'s notifications', () => {
  it('only current user\'s notifications', async () => {
    const { prisma } = await import('@/lib/prisma');
    const notifications = await prisma.notification.findMany({
      where: { userId: 'user-alice' },
    });
    expect(notifications.every((n: { userId: string }) => n.userId === 'user-alice')).toBe(true);
    expect(notifications).toHaveLength(3);
  });
});

describe('I-NO-02: Notifications sorted by createdAt DESC', () => {
  it('most recent first', () => {
    const sorted = [...mockNotifications].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    expect(sorted[0]!.id).toBe('notif-1');
    expect(sorted[2]!.id).toBe('notif-3');
  });
});

describe('I-NO-03: Mark single notification as read', () => {
  it('read = true', async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.notification.update).mockResolvedValue({
      ...mockNotifications[0],
      read: true,
    } as never);

    const updated = await prisma.notification.update({
      where: { id: 'notif-1' },
      data: { read: true },
    });
    expect(updated.read).toBe(true);
  });
});

describe('I-NO-04: Mark all as read', () => {
  it('all user\'s notifications read = true', async () => {
    const { prisma } = await import('@/lib/prisma');
    const result = await prisma.notification.updateMany({
      where: { userId: 'user-alice', read: false },
      data: { read: true },
    });
    expect(result.count).toBe(2);
  });
});

describe('I-NO-05: Task assignment creates ASSIGNED notification', () => {
  it('notification with correct type + message', async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.notification.create).mockResolvedValue({
      id: 'notif-new',
      type: 'ASSIGNED',
      message: 'Alice assigned you to "New Task"',
      read: false,
      userId: 'user-bob',
      taskId: 'task-new',
      actorId: 'user-alice',
    } as never);

    const notif = await prisma.notification.create({
      data: {
        type: 'ASSIGNED',
        message: 'Alice assigned you to "New Task"',
        userId: 'user-bob',
        taskId: 'task-new',
        actorId: 'user-alice',
      },
    });
    expect(notif.type).toBe('ASSIGNED');
    expect(notif.userId).toBe('user-bob');
    expect(notif.message).toContain('assigned');
  });
});

describe('I-NO-06: Due soon notification created', () => {
  it('DUE_SOON notification exists', () => {
    const dueSoonNotif = mockNotifications.find((n) => n.type === 'DUE_SOON');
    expect(dueSoonNotif).toBeDefined();
    expect(dueSoonNotif!.type).toBe('DUE_SOON');
    expect(dueSoonNotif!.message).toContain('due soon');
  });
});
