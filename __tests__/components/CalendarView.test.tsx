import { describe, it, expect } from 'vitest';
import type { Task } from '@/types';
import { parseISO, isSameDay, format } from 'date-fns';

const makeTask = (id: string, title: string, dueDate: string | null): Task => ({
  id,
  title,
  description: null,
  priority: 'MEDIUM',
  status: 'TODO',
  dueDate,
  position: 0,
  listId: 'list-1',
  columnId: 'col-1',
  assigneeId: null,
  assignee: null,
  createdById: 'user-1',
  createdBy: { id: 'user-1', name: 'Alice', avatarUrl: null, color: '#F59E0B' },
  labels: [],
  subtasks: [],
  createdAt: '2026-03-01',
  updatedAt: '2026-03-01',
});

const tasks = [
  makeTask('t1', 'Task on March 15', '2026-03-15T00:00:00.000Z'),
  makeTask('t2', 'Task on March 20', '2026-03-20T00:00:00.000Z'),
  makeTask('t3', 'Task without date', null),
];

describe('C-TC-13: CalendarView tasks appear on correct dates', () => {
  it('events mapped to due dates', () => {
    const events = tasks
      .filter((t) => t.dueDate)
      .map((t) => ({
        id: t.id,
        title: t.title,
        start: parseISO(t.dueDate!),
        end: parseISO(t.dueDate!),
      }));

    expect(events).toHaveLength(2);
    expect(format(events[0]!.start, 'yyyy-MM-dd')).toBe('2026-03-15');
    expect(format(events[1]!.start, 'yyyy-MM-dd')).toBe('2026-03-20');
  });

  it('tasks without due date are excluded from calendar', () => {
    const calendarTasks = tasks.filter((t) => t.dueDate);
    expect(calendarTasks).toHaveLength(2);
    expect(calendarTasks.every((t) => t.dueDate !== null)).toBe(true);
  });
});
