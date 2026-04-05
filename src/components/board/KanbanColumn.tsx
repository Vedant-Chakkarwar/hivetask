'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Column, Task } from '@/types';
import { ColumnHeader } from './ColumnHeader';
import { SortableTaskCard } from './SortableTaskCard';

interface KanbanColumnProps {
  column: Column;
  onTaskClick: (task: Task) => void;
  onTaskCreate: (columnId: string, title: string) => Promise<void>;
  onColumnRename: (columnId: string, name: string) => Promise<void>;
  onColumnChangeColor: (columnId: string, color: string) => Promise<void>;
  onColumnDelete: (columnId: string) => Promise<void>;
  onOpenTaskForm: (columnId: string) => void;
}

export function KanbanColumn({
  column,
  onTaskClick,
  onTaskCreate,
  onColumnRename,
  onColumnChangeColor,
  onColumnDelete,
  onOpenTaskForm,
}: KanbanColumnProps) {
  const [quickTitle, setQuickTitle] = useState('');
  const [showQuick, setShowQuick] = useState(false);
  const [adding, setAdding] = useState(false);

  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const taskIds = column.tasks.map((t) => t.id);

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
    <div className="w-full md:flex-shrink-0 md:w-72 flex flex-col md:max-h-[calc(100vh-200px)]">
      <ColumnHeader
        column={column}
        taskCount={column.tasks.length}
        onAddTask={() => setShowQuick(true)}
        onRename={(name) => onColumnRename(column.id, name)}
        onChangeColor={(color) => onColumnChangeColor(column.id, color)}
        onDelete={() => onColumnDelete(column.id)}
      />

      {showQuick && (
        <div className="mb-2">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleQuickAdd();
              if (e.key === 'Escape') {
                setQuickTitle('');
                setShowQuick(false);
              }
            }}
            onBlur={() => {
              if (!quickTitle.trim()) setShowQuick(false);
            }}
            placeholder="Task title, then Enter..."
            disabled={adding}
            autoFocus
            className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white shadow-sm"
          />
        </div>
      )}

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex-1 space-y-2 min-h-[60px] p-1 rounded-xl transition-colors overflow-y-auto ${
            isOver ? 'bg-amber-50 ring-2 ring-amber-200 ring-inset' : ''
          }`}
        >
          {column.tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))}

          {column.tasks.length === 0 && !showQuick && (
            <div className="flex items-center justify-center h-16 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400">
              Drop tasks here
            </div>
          )}
        </div>
      </SortableContext>

      {!showQuick && (
        <button
          type="button"
          onClick={() => onOpenTaskForm(column.id)}
          className="mt-2 w-full py-2 text-sm text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg border border-dashed border-gray-200 hover:border-amber-300 transition-all"
        >
          + Add task
        </button>
      )}
    </div>
  );
}
