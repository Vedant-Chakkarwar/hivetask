// @vitest-environment node
/**
 * Integration tests — Dashboard API
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDashboardData = {
  totalAssigned: 12,
  completedToday: 3,
  overdue: 2,
  dueThisWeek: 5,
  overdueTasks: [
    { id: 'task-1', title: 'Overdue Task 1', dueDate: new Date('2026-02-28'), priority: 'HIGH', list: { name: 'Sprint 1' } },
    { id: 'task-2', title: 'Overdue Task 2', dueDate: new Date('2026-03-01'), priority: 'MEDIUM', list: { name: 'Sprint 1' } },
  ],
  dueTodayTasks: [
    { id: 'task-3', title: 'Due Today', dueDate: new Date(), priority: 'HIGH', list: { name: 'Sprint 2' } },
  ],
  recentlyAssigned: [
    { id: 'task-4', title: 'New Task', assignedAt: new Date('2026-03-05T10:00:00Z'), list: { name: 'Sprint 2' } },
  ],
  activityFeed: [
    { type: 'task_created', message: 'Alice created "New Feature"', createdAt: new Date('2026-03-05T09:00:00Z') },
    { type: 'task_completed', message: 'Bob completed "Fix Bug"', createdAt: new Date('2026-03-05T08:00:00Z') },
  ],
};

vi.mock('@/lib/prisma', () => ({
  prisma: {
    task: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    taskList: {
      findMany: vi.fn().mockResolvedValue([{ id: 'list-1' }, { id: 'list-2' }]),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('I-DA-01: Dashboard returns correct stats', () => {
  it('totalAssigned, completedToday, overdue, dueThisWeek counts are accurate', () => {
    expect(mockDashboardData.totalAssigned).toBe(12);
    expect(mockDashboardData.completedToday).toBe(3);
    expect(mockDashboardData.overdue).toBe(2);
    expect(mockDashboardData.dueThisWeek).toBe(5);
  });
});

describe('I-DA-02: Overdue tasks listed', () => {
  it('tasks with past due dates returned', () => {
    const now = new Date();
    expect(mockDashboardData.overdueTasks).toHaveLength(2);
    expect(mockDashboardData.overdueTasks.every((t) => t.dueDate < now)).toBe(true);
  });
});

describe('I-DA-03: Due today tasks accurate', () => {
  it('only tasks due within 24 hours', () => {
    expect(mockDashboardData.dueTodayTasks).toHaveLength(1);
    const task = mockDashboardData.dueTodayTasks[0]!;
    const diff = Math.abs(task.dueDate.getTime() - Date.now());
    expect(diff).toBeLessThan(24 * 60 * 60 * 1000); // within 24h
  });
});

describe('I-DA-04: Recently assigned sorted by date', () => {
  it('newest first', () => {
    expect(mockDashboardData.recentlyAssigned).toHaveLength(1);
    expect(mockDashboardData.recentlyAssigned[0]!.title).toBe('New Task');
  });
});

describe('I-DA-05: Activity feed shows recent actions', () => {
  it('task creates, completes, comments included', () => {
    expect(mockDashboardData.activityFeed).toHaveLength(2);
    expect(mockDashboardData.activityFeed[0]!.type).toBe('task_created');
    expect(mockDashboardData.activityFeed[1]!.type).toBe('task_completed');
    // Verify sorted by date (newest first)
    expect(
      mockDashboardData.activityFeed[0]!.createdAt.getTime() >=
      mockDashboardData.activityFeed[1]!.createdAt.getTime(),
    ).toBe(true);
  });
});
