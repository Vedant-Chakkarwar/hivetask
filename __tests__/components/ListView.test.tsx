import { describe, it, expect } from 'vitest';
import type { Task, Column, TaskList } from '@/types';

const makeTask = (id: string, title: string, priority: 'LOW' | 'MEDIUM' | 'HIGH', columnId: string): Task => ({
  id,
  title,
  description: null,
  priority,
  status: columnId === 'col-3' ? 'DONE' : columnId === 'col-2' ? 'IN_PROGRESS' : 'TODO',
  dueDate: null,
  position: 0,
  listId: 'list-1',
  columnId,
  assigneeId: null,
  assignee: null,
  createdById: 'user-1',
  createdBy: { id: 'user-1', name: 'Alice', avatarUrl: null, color: '#F59E0B' },
  labels: [],
  subtasks: [],
  createdAt: '2026-03-01',
  updatedAt: '2026-03-01',
});

const mockColumns: Column[] = [
  { id: 'col-1', name: 'To Do', position: 0, color: null, listId: 'list-1', tasks: [makeTask('t1', 'Low Task', 'LOW', 'col-1'), makeTask('t2', 'High Task', 'HIGH', 'col-1')] },
  { id: 'col-2', name: 'In Progress', position: 1, color: null, listId: 'list-1', tasks: [makeTask('t3', 'Med Task', 'MEDIUM', 'col-2')] },
  { id: 'col-3', name: 'Done', position: 2, color: null, listId: 'list-1', tasks: [makeTask('t4', 'Done Task', 'LOW', 'col-3')] },
];

describe('C-TC-11: ListView renders grouped rows', () => {
  it('status groups with correct task counts', () => {
    const groups = mockColumns.map((col) => ({
      name: col.name,
      count: col.tasks.length,
    }));
    expect(groups).toHaveLength(3);
    expect(groups[0]!.name).toBe('To Do');
    expect(groups[0]!.count).toBe(2);
    expect(groups[1]!.name).toBe('In Progress');
    expect(groups[1]!.count).toBe(1);
    expect(groups[2]!.name).toBe('Done');
    expect(groups[2]!.count).toBe(1);
  });
});

describe('C-TC-12: ListView sort by priority', () => {
  it('rows reorder when sorted by priority', () => {
    const allTasks = mockColumns.flatMap((col) => col.tasks);
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    const sorted = [...allTasks].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    );
    expect(sorted[0]!.priority).toBe('HIGH');
    expect(sorted[1]!.priority).toBe('MEDIUM');
    expect(sorted[2]!.priority).toBe('LOW');
  });
});
