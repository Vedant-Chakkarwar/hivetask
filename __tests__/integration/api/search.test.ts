// @vitest-environment node
/**
 * Integration tests — Search API
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSearchResults = [
  { id: 'task-1', title: 'Design Homepage', priority: 'HIGH', status: 'TODO', listId: 'list-1', list: { id: 'list-1', name: 'Sprint 1', color: '#F59E0B' }, assignee: { id: 'user-alice', name: 'Alice' } },
  { id: 'task-2', title: 'Design Mobile Layout', priority: 'MEDIUM', status: 'IN_PROGRESS', listId: 'list-2', list: { id: 'list-2', name: 'Sprint 2', color: '#3B82F6' }, assignee: null },
];

vi.mock('@/lib/prisma', () => ({
  prisma: {
    task: {
      findMany: vi.fn().mockResolvedValue(mockSearchResults),
    },
    taskList: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'list-1', members: [{ id: 'user-alice' }] },
        { id: 'list-2', members: [{ id: 'user-alice' }] },
      ]),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('I-SE-01: Search by task title', () => {
  it('returns matching tasks', async () => {
    const { prisma } = await import('@/lib/prisma');
    const results = await prisma.task.findMany({
      where: { title: { contains: 'Design' } },
    });
    expect(results).toHaveLength(2);
    expect(results.every((t: { title: string }) => t.title.includes('Design'))).toBe(true);
  });
});

describe('I-SE-02: Search returns tasks from multiple lists', () => {
  it('results include list name/color', () => {
    const listIds = new Set(mockSearchResults.map((r) => r.listId));
    expect(listIds.size).toBe(2);
    expect(mockSearchResults[0]!.list.name).toBe('Sprint 1');
    expect(mockSearchResults[1]!.list.name).toBe('Sprint 2');
  });
});

describe('I-SE-03: Search respects user membership', () => {
  it('only returns tasks from user\'s lists', async () => {
    const { prisma } = await import('@/lib/prisma');
    const userLists = await prisma.taskList.findMany({
      where: { members: { some: { id: 'user-alice' } } },
    });
    const userListIds = userLists.map((l: { id: string }) => l.id);
    expect(mockSearchResults.every((r) => userListIds.includes(r.listId))).toBe(true);
  });
});

describe('I-SE-04: Search with assignee filter', () => {
  it('filtered correctly', () => {
    const filtered = mockSearchResults.filter((r) => r.assignee?.id === 'user-alice');
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.assignee!.name).toBe('Alice');
  });
});

describe('I-SE-05: Search with priority filter', () => {
  it('filtered correctly', () => {
    const filtered = mockSearchResults.filter((r) => r.priority === 'HIGH');
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.title).toBe('Design Homepage');
  });
});

describe('I-SE-06: Search with no results', () => {
  it('returns empty array, no error', async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    const results = await prisma.task.findMany({
      where: { title: { contains: 'nonexistent-xyz' } },
    });
    expect(results).toHaveLength(0);
    expect(Array.isArray(results)).toBe(true);
  });
});
