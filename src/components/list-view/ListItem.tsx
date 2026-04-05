'use client';

import { Task } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { LabelChip } from '@/components/tasks/LabelChip';
import { PriorityBadge } from '@/components/tasks/PriorityBadge';
import { format, parseISO, isPast } from 'date-fns';
import { CalendarDays, CheckSquare } from 'lucide-react';

interface ListItemProps {
  task: Task;
  onClick: () => void;
  onToggleDone?: (taskId: string, done: boolean) => void;
  compact?: boolean;
  currentUserId?: string;
}

export function ListItem({ task, onClick, onToggleDone, compact = false, currentUserId }: ListItemProps) {
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const totalSubtasks = task.subtasks.length;

  const isOverdue =
    task.dueDate && isPast(parseISO(task.dueDate)) && task.status !== 'DONE';

  const myAssignment = currentUserId
    ? task.assignees.find((a) => a.userId === currentUserId)
    : undefined;
  // Personal completion: if user is assigned, use their completion state; otherwise fall back to task status
  const isMyDone = myAssignment ? myAssignment.completed : task.status === 'DONE';
  const isDone = task.status === 'DONE';

  function handleCheckboxClick(e: React.MouseEvent) {
    e.stopPropagation();
    onToggleDone?.(task.id, !isMyDone);
  }

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors group ${
        isDone ? 'opacity-60' : ''
      }`}
    >
      {/* Checkbox — reflects current user's personal completion */}
      <button
        type="button"
        onClick={handleCheckboxClick}
        className={`flex-shrink-0 w-4 h-4 rounded border-2 transition-colors ${
          isMyDone
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-gray-300 hover:border-amber-400'
        }`}
        title={isMyDone ? 'Mark incomplete (you)' : 'Mark complete (you)'}
      >
        {isMyDone && (
          <svg viewBox="0 0 16 16" fill="white" className="w-full h-full">
            <path d="M13.5 3.5L6 11 2.5 7.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Priority */}
      <PriorityBadge priority={task.priority} size="sm" />

      {/* Title */}
      <span
        className={`flex-1 text-sm text-gray-800 truncate group-hover:text-gray-900 ${
          isDone ? 'line-through text-gray-400' : ''
        }`}
      >
        {task.title}
      </span>

      {/* Labels (hidden in compact mode) */}
      {!compact && task.labels.length > 0 && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {task.labels.slice(0, 3).map((label) => (
            <LabelChip key={label.id} label={label} size="sm" />
          ))}
          {task.labels.length > 3 && (
            <span className="text-xs text-gray-400">+{task.labels.length - 3}</span>
          )}
        </div>
      )}

      {/* Subtask progress (hidden in compact mode) */}
      {!compact && totalSubtasks > 0 && (
        <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
          <CheckSquare size={12} />
          <span>{completedSubtasks}/{totalSubtasks}</span>
        </div>
      )}

      {/* Due date */}
      {task.dueDate && (
        <span
          className={`flex items-center gap-1 text-xs flex-shrink-0 px-1.5 py-0.5 rounded-md ${
            isOverdue
              ? 'text-red-600 bg-red-50'
              : 'text-gray-500 bg-gray-50'
          }`}
        >
          <CalendarDays size={11} />
          {format(parseISO(task.dueDate), 'MMM d')}
        </span>
      )}

      {/* Assignees */}
      {task.assignees.length > 0 && (
        <div className="flex -space-x-1 flex-shrink-0">
          {task.assignees.slice(0, 3).map((a) => (
            <Avatar
              key={a.id}
              name={a.user.name}
              avatarUrl={a.user.avatarUrl}
              color={a.user.color}
              size="xs"
            />
          ))}
          {task.assignees.length > 3 && (
            <span className="w-5 h-5 rounded-full bg-gray-200 text-[9px] font-bold text-gray-600 flex items-center justify-center">
              +{task.assignees.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
