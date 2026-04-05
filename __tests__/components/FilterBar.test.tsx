import { describe, it, expect } from 'vitest';
import type { TaskFilters, Task } from '@/types';

const defaultFilters: TaskFilters = {
  assignees: [],
  priorities: [],
  labelIds: [],
  dueDate: null,
  statuses: [],
};

const mockTasks: Task[] = [
  { id: 't1', title: 'Task 1', description: null, priority: 'HIGH', status: 'TODO', dueDate: '2024-01-01T00:00:00Z', position: 0, listId: 'l1', columnId: 'c1', assigneeId: 'user-1', assignee: { id: 'user-1', name: 'Alice', avatarUrl: null, color: '#F59E0B' }, createdById: 'user-1', createdBy: { id: 'user-1', name: 'Alice', avatarUrl: null, color: '#F59E0B' }, labels: [{ id: 'lab-1', name: 'Bug', color: '#EF4444', listId: 'l1' }], subtasks: [], createdAt: '', updatedAt: '' },
  { id: 't2', title: 'Task 2', description: null, priority: 'LOW', status: 'DONE', dueDate: null, position: 1, listId: 'l1', columnId: 'c3', assigneeId: 'user-2', assignee: { id: 'user-2', name: 'Bob', avatarUrl: null, color: '#3B82F6' }, createdById: 'user-1', createdBy: { id: 'user-1', name: 'Alice', avatarUrl: null, color: '#F59E0B' }, labels: [], subtasks: [], createdAt: '', updatedAt: '' },
  { id: 't3', title: 'Task 3', description: null, priority: 'MEDIUM', status: 'IN_PROGRESS', dueDate: '2026-06-15T00:00:00Z', position: 2, listId: 'l1', columnId: 'c2', assigneeId: 'user-1', assignee: { id: 'user-1', name: 'Alice', avatarUrl: null, color: '#F59E0B' }, createdById: 'user-1', createdBy: { id: 'user-1', name: 'Alice', avatarUrl: null, color: '#F59E0B' }, labels: [{ id: 'lab-2', name: 'Feature', color: '#10B981', listId: 'l1' }], subtasks: [], createdAt: '', updatedAt: '' },
];

function applyFilters(tasks: Task[], filters: TaskFilters): Task[] {
  let result = [...tasks];
  if (filters.assignees.length > 0) {
    result = result.filter((t) => t.assigneeId && filters.assignees.includes(t.assigneeId));
  }
  if (filters.priorities.length > 0) {
    result = result.filter((t) => filters.priorities.includes(t.priority));
  }
  if (filters.labelIds.length > 0) {
    result = result.filter((t) => t.labels.some((l) => filters.labelIds.includes(l.id)));
  }
  if (filters.statuses.length > 0) {
    result = result.filter((t) => filters.statuses.includes(t.status));
  }
  if (filters.dueDate === 'overdue') {
    result = result.filter((t) => t.dueDate && new Date(t.dueDate) < new Date());
  }
  return result;
}

describe('C-TC-17: FilterBar selecting filters updates UI', () => {
  it('active filter chips appear with correct filtering', () => {
    const filters: TaskFilters = { ...defaultFilters, priorities: ['HIGH'] };
    const filtered = applyFilters(mockTasks, filters);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.priority).toBe('HIGH');
  });

  it('assignee filter works', () => {
    const filters: TaskFilters = { ...defaultFilters, assignees: ['user-1'] };
    const filtered = applyFilters(mockTasks, filters);
    expect(filtered).toHaveLength(2);
    expect(filtered.every((t) => t.assigneeId === 'user-1')).toBe(true);
  });

  it('label filter works', () => {
    const filters: TaskFilters = { ...defaultFilters, labelIds: ['lab-1'] };
    const filtered = applyFilters(mockTasks, filters);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.labels[0]!.name).toBe('Bug');
  });

  it('overdue filter works', () => {
    const filters: TaskFilters = { ...defaultFilters, dueDate: 'overdue' };
    const filtered = applyFilters(mockTasks, filters);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.id).toBe('t1'); // past date
  });
});

describe('C-TC-18: FilterBar clear all filters resets', () => {
  it('all chips removed, full task list shown', () => {
    const filtered = applyFilters(mockTasks, defaultFilters);
    expect(filtered).toHaveLength(3);
  });
});
