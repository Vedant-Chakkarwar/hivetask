'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { User, Label, TaskFilters } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { X } from 'lucide-react';

interface FilterBarProps {
  filters: TaskFilters;
  listMembers: User[];
  listLabels: Label[];
  totalCount: number;
  filteredCount: number;
}

const PRIORITIES = [
  { value: 'HIGH', label: '🔴 High' },
  { value: 'MEDIUM', label: '🟡 Medium' },
  { value: 'LOW', label: '🟢 Low' },
] as const;

const STATUSES = [
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'DONE', label: 'Done' },
] as const;

const DUE_OPTIONS = [
  { value: 'overdue', label: '⚠️ Overdue' },
  { value: 'today', label: '📅 Today' },
  { value: 'week', label: '📆 This Week' },
  { value: 'month', label: '🗓️ This Month' },
  { value: 'none', label: 'No Date' },
] as const;

export function FilterBar({ filters, listMembers, listLabels, totalCount, filteredCount }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  function toggleAssignee(userId: string) {
    const next = filters.assignees.includes(userId)
      ? filters.assignees.filter((id) => id !== userId)
      : [...filters.assignees, userId];
    updateParams({ assignee: next.join(',') || null });
  }

  function togglePriority(p: 'LOW' | 'MEDIUM' | 'HIGH') {
    const next = filters.priorities.includes(p)
      ? filters.priorities.filter((x) => x !== p)
      : [...filters.priorities, p];
    updateParams({ priority: next.join(',') || null });
  }

  function toggleLabel(labelId: string) {
    const next = filters.labelIds.includes(labelId)
      ? filters.labelIds.filter((id) => id !== labelId)
      : [...filters.labelIds, labelId];
    updateParams({ label: next.join(',') || null });
  }

  function toggleStatus(s: 'TODO' | 'IN_PROGRESS' | 'DONE') {
    const next = filters.statuses.includes(s)
      ? filters.statuses.filter((x) => x !== s)
      : [...filters.statuses, s];
    updateParams({ status: next.join(',') || null });
  }

  function setDue(val: string | null) {
    updateParams({ due: filters.dueDate === val ? null : val });
  }

  function clearAll() {
    updateParams({ assignee: null, priority: null, label: null, due: null, status: null });
  }

  const hasFilters =
    filters.assignees.length > 0 ||
    filters.priorities.length > 0 ||
    filters.labelIds.length > 0 ||
    filters.dueDate !== null ||
    filters.statuses.length > 0;

  if (!hasFilters) return null;

  return (
    <div className="px-4 py-2 bg-white border-b border-gray-100 flex flex-wrap gap-1.5 items-center">
      {/* Task count */}
      <span className="text-xs text-gray-500 font-medium mr-1">
        Showing {filteredCount} of {totalCount}
      </span>

      {/* Active filter chips */}
      {filters.assignees.map((uid) => {
        const m = listMembers.find((x) => x.id === uid);
        if (!m) return null;
        return (
          <span
            key={uid}
            className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-chip font-medium"
            style={{ borderRadius: '6px' }}
          >
            <Avatar name={m.name} avatarUrl={m.avatarUrl} color={m.color} size="xs" />
            {m.name}
            <button type="button" onClick={() => toggleAssignee(uid)} className="hover:text-blue-900">
              <X size={10} />
            </button>
          </span>
        );
      })}

      {filters.priorities.map((p) => (
        <span
          key={p}
          className="flex items-center gap-1 bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded-chip font-medium"
          style={{ borderRadius: '6px' }}
        >
          {PRIORITIES.find((x) => x.value === p)?.label}
          <button type="button" onClick={() => togglePriority(p)} className="hover:text-amber-900">
            <X size={10} />
          </button>
        </span>
      ))}

      {filters.labelIds.map((lid) => {
        const label = listLabels.find((x) => x.id === lid);
        if (!label) return null;
        return (
          <span
            key={lid}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-chip font-medium text-white"
            style={{ borderRadius: '6px', backgroundColor: label.color }}
          >
            {label.name}
            <button type="button" onClick={() => toggleLabel(lid)} className="opacity-80 hover:opacity-100">
              <X size={10} />
            </button>
          </span>
        );
      })}

      {filters.dueDate && (
        <span
          className="flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded-chip font-medium"
          style={{ borderRadius: '6px' }}
        >
          {DUE_OPTIONS.find((x) => x.value === filters.dueDate)?.label ?? filters.dueDate}
          <button type="button" onClick={() => setDue(null)} className="hover:text-purple-900">
            <X size={10} />
          </button>
        </span>
      )}

      {filters.statuses.map((s) => (
        <span
          key={s}
          className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-chip font-medium"
          style={{ borderRadius: '6px' }}
        >
          {STATUSES.find((x) => x.value === s)?.label}
          <button type="button" onClick={() => toggleStatus(s)} className="hover:text-gray-800">
            <X size={10} />
          </button>
        </span>
      ))}

      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="text-xs text-gray-400 hover:text-gray-600 underline ml-1"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

// Also export a hook to parse filters from URL params
export function parseFiltersFromParams(searchParams: URLSearchParams): TaskFilters {
  return {
    assignees: searchParams.get('assignee')?.split(',').filter(Boolean) ?? [],
    priorities: (searchParams.get('priority')?.split(',').filter(Boolean) ?? []) as ('LOW' | 'MEDIUM' | 'HIGH')[],
    labelIds: searchParams.get('label')?.split(',').filter(Boolean) ?? [],
    dueDate: (searchParams.get('due') as TaskFilters['dueDate']) ?? null,
    statuses: (searchParams.get('status')?.split(',').filter(Boolean) ?? []) as ('TODO' | 'IN_PROGRESS' | 'DONE')[],
  };
}

// Filter helper: compute filtered list
import type { Task, Column, TaskList } from '@/types';
import { isAfter, isBefore, startOfDay, addDays, parseISO } from 'date-fns';

export function applyFiltersToTasks(tasks: Task[], filters: TaskFilters): Task[] {
  if (
    filters.assignees.length === 0 &&
    filters.priorities.length === 0 &&
    filters.labelIds.length === 0 &&
    filters.dueDate === null &&
    filters.statuses.length === 0
  ) {
    return tasks;
  }

  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 7);
  const nextMonth = addDays(today, 30);

  return tasks.filter((task) => {
    if (filters.assignees.length > 0) {
      const taskAssigneeIds = task.assignees.map((a) => a.userId);
      const match = filters.assignees.some((id) => taskAssigneeIds.includes(id)) ||
        (filters.assignees.includes('unassigned') && task.assignees.length === 0);
      if (!match) return false;
    }
    if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) return false;
    if (filters.labelIds.length > 0) {
      const taskLabelIds = task.labels.map((l) => l.id);
      if (!filters.labelIds.some((lid) => taskLabelIds.includes(lid))) return false;
    }
    if (filters.statuses.length > 0 && !filters.statuses.includes(task.status)) return false;
    if (filters.dueDate !== null) {
      if (!task.dueDate) return filters.dueDate === 'none';
      const due = parseISO(task.dueDate);
      if (filters.dueDate === 'overdue') return isBefore(due, today);
      if (filters.dueDate === 'today') return !isBefore(due, today) && isBefore(due, tomorrow);
      if (filters.dueDate === 'week') return !isBefore(due, tomorrow) && isBefore(due, nextWeek);
      if (filters.dueDate === 'month') return !isBefore(due, nextWeek) && isBefore(due, nextMonth);
      if (filters.dueDate === 'none') return false;
    }
    return true;
  });
}

export function applyFiltersToList(list: TaskList, filters: TaskFilters): TaskList {
  return {
    ...list,
    columns: list.columns.map((col: Column) => ({
      ...col,
      tasks: applyFiltersToTasks(col.tasks, filters),
    })),
  };
}

// FilterControls — rendered above the board
export function FilterControls({ filters, listMembers, listLabels }: {
  filters: TaskFilters;
  listMembers: User[];
  listLabels: Label[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  function toggleAssignee(userId: string) {
    const next = filters.assignees.includes(userId)
      ? filters.assignees.filter((id) => id !== userId)
      : [...filters.assignees, userId];
    updateParams({ assignee: next.join(',') || null });
  }

  function togglePriority(p: 'LOW' | 'MEDIUM' | 'HIGH') {
    const next = filters.priorities.includes(p)
      ? filters.priorities.filter((x) => x !== p)
      : [...filters.priorities, p];
    updateParams({ priority: next.join(',') || null });
  }

  function toggleLabel(labelId: string) {
    const next = filters.labelIds.includes(labelId)
      ? filters.labelIds.filter((id) => id !== labelId)
      : [...filters.labelIds, labelId];
    updateParams({ label: next.join(',') || null });
  }

  function toggleStatus(s: 'TODO' | 'IN_PROGRESS' | 'DONE') {
    const next = filters.statuses.includes(s)
      ? filters.statuses.filter((x) => x !== s)
      : [...filters.statuses, s];
    updateParams({ status: next.join(',') || null });
  }

  function setDue(val: string) {
    updateParams({ due: filters.dueDate === val ? null : val });
  }

  return (
    <div className="flex flex-wrap gap-2 items-center px-1">
      {/* Assignee */}
      <div className="flex items-center gap-1">
        {listMembers.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => toggleAssignee(m.id)}
            title={m.name}
            className={`rounded-full border-2 transition-all ${
              filters.assignees.includes(m.id) ? 'border-honey-500 scale-110' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <Avatar name={m.name} avatarUrl={m.avatarUrl} color={m.color} size="sm" />
          </button>
        ))}
      </div>

      {/* Priority */}
      <div className="flex items-center gap-1">
        {PRIORITIES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => togglePriority(value)}
            className={`text-xs px-2 py-1 rounded-chip font-medium transition-colors ${
              filters.priorities.includes(value)
                ? 'bg-honey-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={{ borderRadius: '6px' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Status */}
      <div className="flex items-center gap-1">
        {STATUSES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => toggleStatus(value)}
            className={`text-xs px-2 py-1 rounded-chip font-medium transition-colors ${
              filters.statuses.includes(value)
                ? 'bg-honey-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={{ borderRadius: '6px' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Due date */}
      <div className="flex items-center gap-1">
        {DUE_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setDue(value)}
            className={`text-xs px-2 py-1 rounded-chip font-medium transition-colors ${
              filters.dueDate === value
                ? 'bg-honey-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={{ borderRadius: '6px' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Labels */}
      {listLabels.length > 0 && (
        <div className="flex items-center gap-1">
          {listLabels.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => toggleLabel(l.id)}
              className={`text-xs px-2 py-1 rounded-chip font-medium transition-all ${
                filters.labelIds.includes(l.id) ? 'ring-2 ring-gray-400 scale-105' : 'opacity-70 hover:opacity-100'
              }`}
              style={{ borderRadius: '6px', backgroundColor: l.color, color: '#fff' }}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
