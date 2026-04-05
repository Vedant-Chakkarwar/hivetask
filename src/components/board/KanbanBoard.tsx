'use client';

import { useState, useRef, useId } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
  UniqueIdentifier,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Column, Task, TaskList } from '@/types';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from '@/components/tasks/TaskCard';
import { Plus } from 'lucide-react';

interface KanbanBoardProps {
  list: TaskList;
  onTaskClick: (task: Task) => void;
  onTaskCreate: (columnId: string, title: string) => Promise<void>;
  onTaskFormOpen: (columnId: string) => void;
  onColumnRename: (columnId: string, name: string) => Promise<void>;
  onColumnChangeColor: (columnId: string, color: string) => Promise<void>;
  onColumnDelete: (columnId: string) => Promise<void>;
  onAddColumn: (name: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function KanbanBoard({
  list,
  onTaskClick,
  onTaskCreate,
  onTaskFormOpen,
  onColumnRename,
  onColumnChangeColor,
  onColumnDelete,
  onAddColumn,
  onRefresh,
}: KanbanBoardProps) {
  const [columns, setColumns] = useState<Column[]>(() =>
    [...list.columns].sort((a, b) => a.position - b.position)
  );
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  // Snapshot before drag starts — used to revert on failure
  const prevColumnsRef = useRef<Column[]>([]);
  const dndId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 500, tolerance: 10 } })
  );

  function findColumnForItem(id: UniqueIdentifier): Column | undefined {
    // Direct column match
    const col = columns.find((c) => c.id === id);
    if (col) return col;
    // Task match → find its column
    return columns.find((c) => c.tasks.some((t) => t.id === id));
  }

  function findTaskById(id: UniqueIdentifier): Task | undefined {
    return columns.flatMap((c) => c.tasks).find((t) => t.id === id);
  }

  // ─── Drag handlers ───────────────────────────────────────────────────────────

  function onDragStart({ active }: DragStartEvent) {
    // Save snapshot for potential revert
    prevColumnsRef.current = columns.map((col) => ({
      ...col,
      tasks: [...col.tasks],
    }));
    setActiveTask(findTaskById(active.id) ?? null);
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || active.id === over.id) return;

    const activeCol = findColumnForItem(active.id);
    const overCol = findColumnForItem(over.id);

    if (!activeCol || !overCol || activeCol.id === overCol.id) return;

    // Move task from activeCol to overCol (cross-column visual update)
    setColumns((cols) => {
      const task = activeCol.tasks.find((t) => t.id === active.id);
      if (!task) return cols;

      const overTaskIndex = overCol.tasks.findIndex((t) => t.id === over.id);
      const insertIndex = overTaskIndex >= 0 ? overTaskIndex : overCol.tasks.length;

      return cols.map((col) => {
        if (col.id === activeCol.id) {
          return { ...col, tasks: col.tasks.filter((t) => t.id !== active.id) };
        }
        if (col.id === overCol.id) {
          const newTasks = [...col.tasks];
          newTasks.splice(insertIndex, 0, { ...task, columnId: col.id });
          return { ...col, tasks: newTasks };
        }
        return col;
      });
    });
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    setActiveTask(null);

    // Nothing to do / cancelled
    if (!over || active.id === over.id) {
      setColumns(prevColumnsRef.current);
      return;
    }

    // Find ORIGINAL column from the pre-drag snapshot
    const originalCol = prevColumnsRef.current.find((c) =>
      c.tasks.some((t) => t.id === active.id)
    );
    // Find CURRENT target column from up-to-date state
    const targetCol = findColumnForItem(over.id);

    if (!originalCol || !targetCol) return;

    const isSameColumn = originalCol.id === targetCol.id;

    if (isSameColumn) {
      // Within-column reorder (onDragOver didn't touch this)
      const currentCol = columns.find((c) => c.id === originalCol.id)!;
      const activeIndex = currentCol.tasks.findIndex((t) => t.id === active.id);
      const overIndex = currentCol.tasks.findIndex((t) => t.id === over.id);

      if (activeIndex < 0 || activeIndex === overIndex) return;

      const safeOverIndex = overIndex >= 0 ? overIndex : currentCol.tasks.length - 1;
      const newTasks = arrayMove(currentCol.tasks, activeIndex, safeOverIndex);

      const updatedColumns = columns.map((col) =>
        col.id === currentCol.id ? { ...col, tasks: newTasks } : col
      );
      setColumns(updatedColumns);

      try {
        const res = await fetch('/api/tasks/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tasks: newTasks.map((t, i) => ({
              id: t.id,
              position: i,
              columnId: currentCol.id,
            })),
          }),
        });
        if (!res.ok) throw new Error('Reorder failed');
        await onRefresh();
      } catch {
        setColumns(prevColumnsRef.current);
      }
    } else {
      // Cross-column move — visual state already updated by onDragOver
      const position = targetCol.tasks.findIndex((t) => t.id === active.id);

      try {
        const res = await fetch(`/api/tasks/${active.id}/move`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ columnId: targetCol.id, position }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.error) alert(data.error);
          throw new Error('Move failed');
        }
        await onRefresh();
      } catch {
        setColumns(prevColumnsRef.current);
      }
    }
  }

  // ─── Add column ──────────────────────────────────────────────────────────────

  async function handleAddColumn() {
    if (!newColumnName.trim()) return;
    await onAddColumn(newColumnName.trim());
    setNewColumnName('');
    setAddingColumn(false);
  }

  // Sync local columns when parent refreshes (e.g. after API mutations)
  // Using a key prop on KanbanBoard in the parent handles this automatically.

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="flex flex-col gap-4 p-3 overflow-y-auto h-full md:flex-row md:gap-4 md:p-6 md:overflow-x-auto md:overflow-y-hidden md:items-start">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            onTaskClick={onTaskClick}
            onTaskCreate={onTaskCreate}
            onColumnRename={onColumnRename}
            onColumnChangeColor={onColumnChangeColor}
            onColumnDelete={onColumnDelete}
            onOpenTaskForm={onTaskFormOpen}
          />
        ))}

        {/* Add column */}
        <div className="w-full md:flex-shrink-0 md:w-72">
          {addingColumn ? (
            <div className="bg-white rounded-xl p-3 shadow-md">
              <input
                type="text"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddColumn();
                  if (e.key === 'Escape') {
                    setNewColumnName('');
                    setAddingColumn(false);
                  }
                }}
                placeholder="Column name..."
                autoFocus
                className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 mb-2"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddColumn}
                  disabled={!newColumnName.trim()}
                  className="flex-1 py-1.5 text-sm font-medium text-white rounded-lg disabled:opacity-40"
                  style={{ backgroundColor: '#F59E0B' }}
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewColumnName('');
                    setAddingColumn(false);
                  }}
                  className="px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingColumn(true)}
              className="w-full py-3 flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-amber-600 bg-white/60 hover:bg-white border border-dashed border-gray-300 hover:border-amber-300 rounded-xl transition-all"
            >
              <Plus size={16} />
              Add Column
            </button>
          )}
        </div>
      </div>

      {/* Drag overlay — ghost card that follows cursor */}
      <DragOverlay>
        {activeTask && (
          <div style={{ transform: 'rotate(3deg)', opacity: 0.92, cursor: 'grabbing' }}>
            <TaskCard task={activeTask} onClick={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
