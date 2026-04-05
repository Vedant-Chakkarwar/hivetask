'use client';

import { Task } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { PriorityBadge } from './PriorityBadge';
import { LabelChip } from './LabelChip';
import { format, parseISO, isPast } from 'date-fns';
import { CalendarDays, CheckSquare } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const totalSubtasks = task.subtasks.length;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const isOverdue =
    task.dueDate &&
    isPast(parseISO(task.dueDate)) &&
    task.status !== 'DONE';

  const visibleLabels = task.labels.slice(0, 3);
  const extraLabels = task.labels.length - 3;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-card p-3 cursor-pointer hover:shadow-card-hover transition-all duration-200 group border border-gray-100 hover:border-honey-200"
      style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
    >
      {/* Labels */}
      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {visibleLabels.map((label) => (
            <LabelChip key={label.id} label={label} size="sm" />
          ))}
          {extraLabels > 0 && (
            <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded-chip" style={{ borderRadius: '6px' }}>
              +{extraLabels}
            </span>
          )}
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-medium text-gray-800 leading-snug mb-2 group-hover:text-gray-900 line-clamp-2">
        {task.title}
      </p>

      {/* Subtask progress */}
      {totalSubtasks > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckSquare size={12} className="text-gray-400" />
            <span className="text-xs text-gray-500">
              {completedSubtasks}/{totalSubtasks}
            </span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${subtaskProgress}%`, backgroundColor: '#F59E0B' }}
            />
          </div>
        </div>
      )}

      {/* Assignee completion progress */}
      {task.assignees.length > 1 && (
        <div className="mb-2">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs text-gray-500">
              {task.assignees.filter((a) => a.completed).length}/{task.assignees.length} done
            </span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(task.assignees.filter((a) => a.completed).length / task.assignees.length) * 100}%`,
                backgroundColor: task.assignees.every((a) => a.completed) ? '#10B981' : '#3B82F6',
              }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 mt-2">
        <div className="flex items-center gap-1.5">
          <PriorityBadge priority={task.priority} size="sm" />
          {task.dueDate && (
            <span
              className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-chip ${
                isOverdue
                  ? 'text-red-600 bg-red-50'
                  : 'text-gray-500 bg-gray-50'
              }`}
              style={{ borderRadius: '6px' }}
            >
              <CalendarDays size={10} />
              {format(parseISO(task.dueDate), 'MMM d')}
            </span>
          )}
        </div>
        {task.assignees.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1">
              {task.assignees.slice(0, 3).map((a) => (
                <div key={a.id} className="relative">
                  <Avatar
                    name={a.user.name}
                    avatarUrl={a.user.avatarUrl}
                    color={a.user.color}
                    size="xs"
                  />
                  {a.completed && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white flex items-center justify-center">
                      <svg viewBox="0 0 16 16" className="w-1.5 h-1.5" fill="none">
                        <path d="M13 4L6 11L3 8" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
              {task.assignees.length > 3 && (
                <span className="w-5 h-5 rounded-full bg-gray-200 text-[9px] font-bold text-gray-600 flex items-center justify-center">
                  +{task.assignees.length - 3}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
