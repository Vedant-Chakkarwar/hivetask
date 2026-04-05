'use client';

import { useState, useRef } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { useSwipe } from '@/hooks/useSwipe';
import { Task } from '@/types';
import { TaskCard } from './TaskCard';

interface SwipeableTaskCardProps {
  task: Task;
  onClick: () => void;
  onComplete?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
}

export function SwipeableTaskCard({ task, onClick, onComplete, onDelete }: SwipeableTaskCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isRemoving, setIsRemoving] = useState(false);
  const startX = useRef<number | null>(null);

  const REVEAL_THRESHOLD = 60;
  const ACTION_THRESHOLD = 120;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    // Clamp to [-160, 160]
    setSwipeOffset(Math.max(-160, Math.min(160, dx)));
  };

  const handleTouchEnd = () => {
    if (swipeOffset > ACTION_THRESHOLD && onComplete) {
      setIsRemoving(true);
      setTimeout(() => onComplete(task.id), 250);
    } else if (swipeOffset < -ACTION_THRESHOLD && onDelete) {
      if (window.confirm(`Delete "${task.title}"?`)) {
        setIsRemoving(true);
        setTimeout(() => onDelete(task.id), 250);
      } else {
        setSwipeOffset(0);
      }
    } else {
      setSwipeOffset(0);
    }
    startX.current = null;
  };

  const showComplete = swipeOffset > REVEAL_THRESHOLD;
  const showDelete = swipeOffset < -REVEAL_THRESHOLD;

  return (
    <div
      className={`relative overflow-hidden rounded-card transition-opacity duration-250 ${isRemoving ? 'opacity-0' : 'opacity-100'}`}
      style={{ borderRadius: '12px' }}
    >
      {/* Complete action (green, left side) */}
      <div
        className={`absolute inset-y-0 left-0 flex items-center justify-start pl-4 bg-success text-white transition-opacity duration-150 ${showComplete ? 'opacity-100' : 'opacity-0'}`}
        style={{ width: `${Math.max(0, swipeOffset)}px` }}
      >
        <Check size={20} strokeWidth={2.5} />
        <span className="ml-1 text-sm font-semibold">Done</span>
      </div>

      {/* Delete action (red, right side) */}
      <div
        className={`absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-danger text-white transition-opacity duration-150 ${showDelete ? 'opacity-100' : 'opacity-0'}`}
        style={{ width: `${Math.max(0, -swipeOffset)}px` }}
      >
        <span className="mr-1 text-sm font-semibold">Delete</span>
        <Trash2 size={18} strokeWidth={2.5} />
      </div>

      {/* Card content */}
      <div
        style={{ transform: `translateX(${swipeOffset}px)`, transition: startX.current ? 'none' : 'transform 200ms ease' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <TaskCard task={task} onClick={onClick} />
      </div>
    </div>
  );
}
