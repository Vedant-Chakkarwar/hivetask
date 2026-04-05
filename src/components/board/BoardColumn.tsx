'use client';

import { useState } from 'react';
import { Column, Task } from '@/types';
import { TaskCard } from '@/components/tasks/TaskCard';
import { ColumnHeader } from './ColumnHeader';

interface BoardColumnProps {
  column: Column;
  onTaskClick: (task: Task) => void;
  onTaskCreate: (columnId: string, title: string) => Promise<void>;
  onColumnRename: (columnId: string, name: string) => Promise<void>;
  onColumnChangeColor: (columnId: string, color: string) => Promise<void>;
  onColumnDelete: (columnId: string) => Promise<void>;
  onOpenTaskForm: (columnId: string) => void;
}

export function BoardColumn({
  column,
  onTaskClick,
  onTaskCreate,
  onColumnRename,
  onColumnChangeColor,
  onColumnDelete,
  onOpenTaskForm,
}: BoardColumnProps) {
  const [quickTitle, setQuickTitle] = useState('');
  const [showQuick, setShowQuick] = useState(false);
  const [adding, setAdding] = useState(false);

  async function handleQuickAdd() {
    if (!quickTitle.trim()) {
      setShowQuick(false);
      return;
    }
    setAdding(true);
    try {
      await onTaskCreate(column.id, quickTitle.trim());
      setQuickTitle('');
      setShowQuick(false);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="flex-shrink-0 w-72 flex flex-col">
      <ColumnHeader
        column={column}
        taskCount={column.tasks.length}
        onAddTask={() => setShowQuick(true)}
        onRename={(name) => onColumnRename(column.id, name)}
        onChangeColor={(color) => onColumnChangeColor(column.id, color)}
        onDelete={() => onColumnDelete(column.id)}
      />

      {/* Quick-add input */}
      {showQuick && (
        <div className="mb-2">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleQuickAdd();
              if (e.key === 'Escape') { setQuickTitle(''); setShowQuick(false); }
            }}
            onBlur={() => { if (!quickTitle.trim()) setShowQuick(false); }}
            placeholder="Task title, then Enter..."
            disabled={adding}
            autoFocus
            className="w-full px-3 py-2 text-sm border border-honey-300 rounded-button focus:outline-none focus:ring-2 focus:ring-honey-500 bg-white shadow-sm"
            style={{ borderRadius: '8px' }}
          />
        </div>
      )}

      {/* Task cards */}
      <div className="flex-1 space-y-2 min-h-[40px]">
        {column.tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
        ))}

        {column.tasks.length === 0 && !showQuick && (
          <div className="flex items-center justify-center h-20 border-2 border-dashed border-gray-200 rounded-card text-sm text-gray-400"
            style={{ borderRadius: '12px' }}>
            No tasks yet
          </div>
        )}
      </div>

      {/* Add task button */}
      {!showQuick && (
        <button
          type="button"
          onClick={() => onOpenTaskForm(column.id)}
          className="mt-2 w-full py-2 text-sm text-gray-400 hover:text-honey-600 hover:bg-honey-50 rounded-button border border-dashed border-gray-200 hover:border-honey-300 transition-all"
          style={{ borderRadius: '8px' }}
        >
          + Add task
        </button>
      )}
    </div>
  );
}
