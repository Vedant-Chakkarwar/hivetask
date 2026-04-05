'use client';

import { useState } from 'react';
import { Subtask } from '@/types';
import { Trash2 } from 'lucide-react';

interface SubtaskListProps {
  subtasks: Subtask[];
  taskId: string;
  onToggle: (subtaskId: string, completed: boolean) => Promise<void>;
  onDelete: (subtaskId: string) => Promise<void>;
  onAdd: (title: string) => Promise<void>;
}

export function SubtaskList({ subtasks, onToggle, onDelete, onAdd }: SubtaskListProps) {
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const completed = subtasks.filter((s) => s.completed).length;
  const total = subtasks.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  async function handleAdd() {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      await onAdd(newTitle.trim());
      setNewTitle('');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">
          Checklist{' '}
          {total > 0 && (
            <span className="font-normal text-gray-400">
              {completed}/{total} complete
            </span>
          )}
        </span>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, backgroundColor: '#F59E0B' }}
          />
        </div>
      )}

      {/* Subtask items */}
      <div className="space-y-1.5">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className="flex items-center gap-2.5 group py-1 px-1 rounded hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={subtask.completed}
              onChange={() => onToggle(subtask.id, !subtask.completed)}
              className="w-4 h-4 rounded accent-amber-500 cursor-pointer flex-shrink-0"
            />
            <span
              className={`flex-1 text-sm ${
                subtask.completed ? 'line-through text-gray-400' : 'text-gray-700'
              }`}
            >
              {subtask.title}
            </span>
            <button
              type="button"
              onClick={() => onDelete(subtask.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all flex-shrink-0"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Add subtask */}
      <div className="mt-2 flex items-center gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !adding && handleAdd()}
          placeholder="Add a subtask..."
          disabled={adding}
          className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-honey-500 focus:border-transparent disabled:opacity-50"
          style={{ borderRadius: '8px' }}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newTitle.trim() || adding}
          className="px-3 py-1.5 text-sm font-medium text-white rounded-button disabled:opacity-40 transition-opacity"
          style={{ backgroundColor: '#F59E0B', borderRadius: '8px' }}
        >
          Add
        </button>
      </div>
    </div>
  );
}
