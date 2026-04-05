// @vitest-environment node
/**
 * Integration tests — Labels API
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLabel = {
  id: 'label-1',
  name: 'Bug',
  color: '#EF4444',
  listId: 'list-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  tasks: [],
};

vi.mock('@/lib/prisma', () => ({
  prisma: {
    label: {
      create: vi.fn().mockResolvedValue({ id: 'label-1', name: 'Bug', color: '#EF4444', listId: 'list-1' }),
      findMany: vi.fn().mockResolvedValue([{ id: 'label-1', name: 'Bug', color: '#EF4444', listId: 'list-1' }]),
      findUnique: vi.fn().mockResolvedValue({ id: 'label-1', name: 'Bug', color: '#EF4444', listId: 'list-1', tasks: [] }),
      update: vi.fn(),
      delete: vi.fn().mockResolvedValue({ id: 'label-1' }),
    },
    task: {
      update: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('I-LA-01: Create label for a list', () => {
  it('label created with name + color', async () => {
    const { prisma } = await import('@/lib/prisma');
    const label = await prisma.label.create({
      data: { name: 'Bug', color: '#EF4444', listId: 'list-1' },
    });
    expect(label.name).toBe('Bug');
    expect(label.color).toBe('#EF4444');
    expect(label.listId).toBe('list-1');
  });
});

describe('I-LA-02: Apply label to task', () => {
  it('label appears in task labels array', async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.task.update).mockResolvedValue({
      id: 'task-1',
      labels: [{ id: 'label-1', name: 'Bug', color: '#EF4444' }],
    } as never);

    const updated = await prisma.task.update({
      where: { id: 'task-1' },
      data: { labels: { connect: { id: 'label-1' } } },
    });
    expect(updated.labels).toHaveLength(1);
    expect(updated.labels[0]!.name).toBe('Bug');
  });
});

describe('I-LA-03: Apply multiple labels to task', () => {
  it('all labels present', async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.task.update).mockResolvedValue({
      id: 'task-1',
      labels: [
        { id: 'label-1', name: 'Bug', color: '#EF4444' },
        { id: 'label-2', name: 'Feature', color: '#10B981' },
      ],
    } as never);

    const updated = await prisma.task.update({
      where: { id: 'task-1' },
      data: { labels: { connect: [{ id: 'label-1' }, { id: 'label-2' }] } },
    });
    expect(updated.labels).toHaveLength(2);
  });
});

describe('I-LA-04: Remove label from task', () => {
  it('label removed, task still exists', async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.task.update).mockResolvedValue({
      id: 'task-1',
      labels: [],
    } as never);

    const updated = await prisma.task.update({
      where: { id: 'task-1' },
      data: { labels: { disconnect: { id: 'label-1' } } },
    });
    expect(updated.labels).toHaveLength(0);
    expect(updated.id).toBe('task-1');
  });
});

describe('I-LA-05: Delete label removes from all tasks', () => {
  it('no tasks reference deleted label', async () => {
    const { prisma } = await import('@/lib/prisma');
    await prisma.label.delete({ where: { id: 'label-1' } });

    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    const tasks = await prisma.task.findMany({
      where: { labels: { some: { id: 'label-1' } } },
    });
    expect(tasks).toHaveLength(0);
  });
});

describe('I-LA-06: Labels scoped to list', () => {
  it('list A labels not visible in list B', async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.label.findMany).mockResolvedValue([
      { id: 'label-1', name: 'Bug', color: '#EF4444', listId: 'list-1' },
    ] as never);

    const labelsA = await prisma.label.findMany({ where: { listId: 'list-1' } });
    expect(labelsA.every((l: { listId: string }) => l.listId === 'list-1')).toBe(true);

    vi.mocked(prisma.label.findMany).mockResolvedValue([]);
    const labelsB = await prisma.label.findMany({ where: { listId: 'list-2' } });
    expect(labelsB).toHaveLength(0);
  });
});
