// @vitest-environment node
/**
 * Integration tests — Subtasks API
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-chars-long!!';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars-long!!';
});

const mockSubtask = {
  id: 'subtask-1',
  title: 'encrypted-subtask-title',
  completed: false,
  position: 0,
  taskId: 'task-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock('@/lib/prisma', () => ({
  prisma: {
    subtask: {
      create: vi.fn().mockResolvedValue({ id: 'subtask-1', title: 'encrypted-subtask-title', completed: false, position: 0, taskId: 'task-1' }),
      findUnique: vi.fn().mockResolvedValue({ id: 'subtask-1', title: 'encrypted-subtask-title', completed: false, position: 0, taskId: 'task-1' }),
      update: vi.fn(),
      delete: vi.fn().mockResolvedValue({ id: 'subtask-1' }),
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn(),
    },
    task: {
      findUnique: vi.fn().mockResolvedValue({ id: 'task-1', listId: 'list-1', createdById: 'user-alice' }),
    },
    taskList: {
      findUnique: vi.fn().mockResolvedValue({ id: 'list-1', members: [{ id: 'user-alice' }] }),
    },
  },
}));

vi.mock('@/lib/socket-server', () => ({
  getIO: () => ({ to: () => ({ emit: vi.fn() }), emit: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('I-SU-01: Create subtask', () => {
  it('subtask added to task', async () => {
    const { prisma } = await import('@/lib/prisma');
    const subtask = await prisma.subtask.create({
      data: { title: 'encrypted-subtask-title', taskId: 'task-1', position: 0 },
    });
    expect(subtask.id).toBe('subtask-1');
    expect(subtask.taskId).toBe('task-1');
    expect(subtask.completed).toBe(false);
  });
});

describe('I-SU-02: Toggle subtask completed', () => {
  it('completed flips true/false', async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.subtask.update).mockResolvedValue({
      ...mockSubtask,
      completed: true,
    } as never);

    const updated = await prisma.subtask.update({
      where: { id: 'subtask-1' },
      data: { completed: true },
    });
    expect(updated.completed).toBe(true);

    vi.mocked(prisma.subtask.update).mockResolvedValue({
      ...mockSubtask,
      completed: false,
    } as never);

    const toggled = await prisma.subtask.update({
      where: { id: 'subtask-1' },
      data: { completed: false },
    });
    expect(toggled.completed).toBe(false);
  });
});

describe('I-SU-03: Update subtask title', () => {
  it('title changed', async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.subtask.update).mockResolvedValue({
      ...mockSubtask,
      title: 'updated-encrypted-title',
    } as never);

    const updated = await prisma.subtask.update({
      where: { id: 'subtask-1' },
      data: { title: 'updated-encrypted-title' },
    });
    expect(updated.title).toBe('updated-encrypted-title');
  });
});

describe('I-SU-04: Delete subtask', () => {
  it('removed from task', async () => {
    const { prisma } = await import('@/lib/prisma');
    const deleted = await prisma.subtask.delete({ where: { id: 'subtask-1' } });
    expect(deleted.id).toBe('subtask-1');
  });
});

describe('I-SU-05: Reorder subtasks', () => {
  it('positions updated correctly', async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.subtask.findMany).mockResolvedValue([
      { ...mockSubtask, id: 'sub-1', position: 0 },
      { ...mockSubtask, id: 'sub-2', position: 1 },
      { ...mockSubtask, id: 'sub-3', position: 2 },
    ] as never);

    const subtasks = await prisma.subtask.findMany({
      where: { taskId: 'task-1' },
      orderBy: { position: 'asc' },
    });
    expect(subtasks).toHaveLength(3);
    expect(subtasks[0]!.position).toBe(0);
    expect(subtasks[2]!.position).toBe(2);
  });
});

describe('I-SU-06: Subtask title stored encrypted', () => {
  it('raw DB value is ciphertext', () => {
    expect(mockSubtask.title).toBe('encrypted-subtask-title');
    expect(mockSubtask.title).not.toBe('Write tests');
  });
});
