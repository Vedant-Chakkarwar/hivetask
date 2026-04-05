import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskCard } from '@/components/tasks/TaskCard';
import type { Task } from '@/types';

// Mock child components
vi.mock('@/components/ui/Avatar', () => ({
  Avatar: ({ name }: { name: string }) => <div data-testid="avatar">{name}</div>,
}));
vi.mock('@/components/tasks/PriorityBadge', () => ({
  PriorityBadge: ({ priority }: { priority: string }) => <span data-testid="priority-badge">{priority}</span>,
}));
vi.mock('@/components/tasks/LabelChip', () => ({
  LabelChip: ({ label }: { label: { name: string } }) => <span data-testid="label-chip">{label.name}</span>,
}));

const baseTask: Task = {
  id: 'task-1',
  title: 'Design Homepage',
  description: null,
  priority: 'HIGH',
  status: 'TODO',
  dueDate: '2026-06-15T00:00:00.000Z',
  position: 0,
  listId: 'list-1',
  columnId: 'col-1',
  assigneeId: 'user-1',
  assignee: { id: 'user-1', name: 'Alice', avatarUrl: null, color: '#F59E0B' },
  createdById: 'user-1',
  createdBy: { id: 'user-1', name: 'Alice', avatarUrl: null, color: '#F59E0B' },
  labels: [
    { id: 'l1', name: 'Bug', color: '#EF4444', listId: 'list-1' },
    { id: 'l2', name: 'Feature', color: '#10B981', listId: 'list-1' },
  ],
  subtasks: [
    { id: 's1', title: 'Step 1', completed: true, position: 0, taskId: 'task-1' },
    { id: 's2', title: 'Step 2', completed: true, position: 1, taskId: 'task-1' },
    { id: 's3', title: 'Step 3', completed: true, position: 2, taskId: 'task-1' },
    { id: 's4', title: 'Step 4', completed: false, position: 3, taskId: 'task-1' },
    { id: 's5', title: 'Step 5', completed: false, position: 4, taskId: 'task-1' },
  ],
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
};

describe('C-TC-01: TaskCard renders title, assignee, priority, due date, labels', () => {
  it('all elements visible', () => {
    render(<TaskCard task={baseTask} onClick={() => {}} />);
    expect(screen.getByText('Design Homepage')).toBeInTheDocument();
    expect(screen.getByTestId('avatar')).toBeInTheDocument();
    expect(screen.getByTestId('priority-badge')).toBeInTheDocument();
    expect(screen.getByText('Jun 15')).toBeInTheDocument();
    expect(screen.getAllByTestId('label-chip')).toHaveLength(2);
  });
});

describe('C-TC-02: TaskCard overdue task shows red styling', () => {
  it('due date renders with red class when overdue', () => {
    const overdueTask: Task = {
      ...baseTask,
      dueDate: '2024-01-01T00:00:00.000Z', // past date
      status: 'TODO',
    };
    const { container } = render(<TaskCard task={overdueTask} onClick={() => {}} />);
    const dateSpan = container.querySelector('.text-red-600');
    expect(dateSpan).toBeTruthy();
  });
});

describe('C-TC-03: TaskCard subtask progress bar shows correct percentage', () => {
  it('"3/5" renders 60% bar', () => {
    render(<TaskCard task={baseTask} onClick={() => {}} />);
    expect(screen.getByText('3/5')).toBeInTheDocument();
    // Check progress bar width
    const { container } = render(<TaskCard task={baseTask} onClick={() => {}} />);
    const progressBar = container.querySelector('[style*="width: 60%"]');
    expect(progressBar).toBeTruthy();
  });
});
