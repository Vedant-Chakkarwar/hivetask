'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { TaskList, Task, Column } from '@/types';
import { ListItem } from './ListItem';
import { ChevronDown, ChevronRight, ArrowUpDown, LayoutList } from 'lucide-react';

type SortKey = 'position' | 'priority' | 'dueDate' | 'assignee' | 'createdAt';
type SortOrder = 'asc' | 'desc';

const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };

interface ListViewProps {
  list: TaskList;
  onTaskClick: (task: Task) => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<Task>;
  onRefresh?: () => Promise<void>;
  currentUserId?: string;
}

export function ListView({ list, onTaskClick, onTaskUpdate, onRefresh, currentUserId }: ListViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sortKey = (searchParams.get('sort') as SortKey) ?? 'position';
  const sortOrder = (searchParams.get('order') as SortOrder) ?? 'asc';
  const [compact, setCompact] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function setSortParam(key: SortKey, order: SortOrder) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', key);
    params.set('order', order);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortParam(key, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortParam(key, 'asc');
    }
  }

  function toggleCollapse(columnId: string) {
    setCollapsed((prev) => ({ ...prev, [columnId]: !prev[columnId] }));
  }

  async function handleToggleDone(taskId: string, done: boolean) {
    // Use per-user completion endpoint instead of direct status update
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: done }),
      });
      if (res.ok && onRefresh) {
        await onRefresh();
      }
    } catch {
      // fallback: no-op on error
    }
  }

  function sortTasks(tasks: Task[]): Task[] {
    return [...tasks].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'priority':
          cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
          break;
        case 'dueDate': {
          const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          cmp = aDate - bDate;
          break;
        }
        case 'assignee':
          cmp = (a.assignees[0]?.user.name ?? '').localeCompare(b.assignees[0]?.user.name ?? '');
          break;
        case 'createdAt':
          cmp = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        default:
          cmp = a.position - b.position;
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });
  }

  const sortedColumns = useMemo(
    () => [...list.columns].sort((a, b) => a.position - b.position),
    [list.columns]
  );

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'position', label: 'Manual order' },
    { key: 'priority', label: 'Priority' },
    { key: 'dueDate', label: 'Due date' },
    { key: 'assignee', label: 'Assignee' },
    { key: 'createdAt', label: 'Created date' },
  ];

  return (
    <div className="p-6 max-w-4xl">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <select
            value={sortKey}
            onChange={(e) => setSortParam(e.target.value as SortKey, sortOrder)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {sortOptions.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSortParam(sortKey, sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-2 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
            title="Toggle sort direction"
          >
            <ArrowUpDown size={13} />
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setCompact((c) => !c)}
          className={`flex items-center gap-1.5 text-sm px-2.5 py-1.5 border rounded-lg transition-colors ${
            compact
              ? 'bg-amber-100 text-amber-700 border-amber-200'
              : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
          }`}
          title="Toggle compact mode"
        >
          <LayoutList size={13} />
          Compact
        </button>
      </div>

      {/* Column groups */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        {sortedColumns.map((column, colIndex) => {
          const tasks = sortTasks(column.tasks);
          const isCollapsed = collapsed[column.id];
          const accentColor = column.color ?? '#9CA3AF';

          return (
            <div key={column.id} className={colIndex > 0 ? 'border-t border-gray-100' : ''}>
              {/* Column header */}
              <button
                type="button"
                onClick={() => toggleCollapse(column.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: accentColor }}
                />
                <span className="font-semibold text-sm text-gray-700">{column.name}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                  {tasks.length}
                </span>
                <div className="ml-auto text-gray-400">
                  {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                </div>
              </button>

              {/* Tasks */}
              {!isCollapsed && tasks.length > 0 && (
                <div className="border-t border-gray-50">
                  {tasks.map((task) => (
                    <ListItem
                      key={task.id}
                      task={task}
                      onClick={() => onTaskClick(task)}
                      onToggleDone={handleToggleDone}
                      compact={compact}
                      currentUserId={currentUserId}
                    />
                  ))}
                </div>
              )}

              {!isCollapsed && tasks.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-400 border-t border-gray-50">
                  No tasks in this column
                </div>
              )}
            </div>
          );
        })}

        {sortedColumns.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-400">
            <p className="text-4xl mb-2">📋</p>
            <p className="font-medium">No columns yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
