'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import type { Task, Column, Label, Subtask } from '@/types';

export interface SocketHandlers {
  onTaskCreated?: (task: Task) => void;
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
  onTaskMoved?: (data: { taskId: string; fromColumnId: string; toColumnId: string; newPosition: number }) => void;
  onTasksReordered?: (data: { columnId: string; tasks: Array<{ id: string; position: number }> }) => void;
  onSubtaskCreated?: (data: { taskId: string; subtask: Subtask }) => void;
  onSubtaskToggled?: (data: { taskId: string; subtaskId: string; completed: boolean }) => void;
  onSubtaskDeleted?: (data: { taskId: string; subtaskId: string }) => void;
  onColumnCreated?: (column: Column & { tasks: Task[] }) => void;
  onColumnUpdated?: (column: Partial<Column> & { id: string }) => void;
  onColumnDeleted?: (columnId: string) => void;
  onLabelCreated?: (label: Label) => void;
  onLabelUpdated?: (label: Label) => void;
  onLabelDeleted?: (labelId: string) => void;
}

export function useSocket(
  listId: string | null,
  currentUserId: string | null,
  handlers: SocketHandlers,
) {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const deduplicate = useCallback(
    (actorId: string | undefined, cb: () => void) => {
      if (actorId && actorId === currentUserId) return; // already applied optimistically
      cb();
    },
    [currentUserId],
  );

  useEffect(() => {
    const socket = getSocket();
    setIsConnected(socket.connected);

    if (listId) {
      socket.emit('join:list', listId);
    }

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    const onPresenceCurrent = ({ onlineUserIds }: { onlineUserIds: string[] }) => {
      setOnlineUsers(onlineUserIds);
    };
    const onPresenceOnline = ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => prev.includes(userId) ? prev : [...prev, userId]);
    };
    const onPresenceOffline = ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    };

    const onTaskCreated = ({ task, actorId }: { task: Task; actorId?: string }) => {
      deduplicate(actorId, () => handlersRef.current.onTaskCreated?.(task));
    };
    const onTaskUpdated = ({ task, actorId }: { task: Task; actorId?: string }) => {
      deduplicate(actorId, () => handlersRef.current.onTaskUpdated?.(task));
    };
    const onTaskDeleted = ({ taskId, actorId }: { taskId: string; actorId?: string }) => {
      deduplicate(actorId, () => handlersRef.current.onTaskDeleted?.(taskId));
    };
    const onTaskMoved = (data: { taskId: string; fromColumnId: string; toColumnId: string; newPosition: number; actorId?: string }) => {
      deduplicate(data.actorId, () => handlersRef.current.onTaskMoved?.(data));
    };
    const onTasksReordered = (data: { columnId: string; tasks: Array<{ id: string; position: number }>; actorId?: string }) => {
      deduplicate(data.actorId, () => handlersRef.current.onTasksReordered?.(data));
    };
    const onSubtaskCreated = (data: { taskId: string; subtask: Subtask; actorId?: string }) => {
      deduplicate(data.actorId, () => handlersRef.current.onSubtaskCreated?.(data));
    };
    const onSubtaskToggled = (data: { taskId: string; subtaskId: string; completed: boolean; actorId?: string }) => {
      deduplicate(data.actorId, () => handlersRef.current.onSubtaskToggled?.(data));
    };
    const onSubtaskDeleted = (data: { taskId: string; subtaskId: string; actorId?: string }) => {
      deduplicate(data.actorId, () => handlersRef.current.onSubtaskDeleted?.(data));
    };
    const onColumnCreated = ({ column, actorId }: { column: Column & { tasks: Task[] }; actorId?: string }) => {
      deduplicate(actorId, () => handlersRef.current.onColumnCreated?.(column));
    };
    const onColumnUpdated = ({ column, actorId }: { column: Partial<Column> & { id: string }; actorId?: string }) => {
      deduplicate(actorId, () => handlersRef.current.onColumnUpdated?.(column));
    };
    const onColumnDeleted = ({ columnId, actorId }: { columnId: string; actorId?: string }) => {
      deduplicate(actorId, () => handlersRef.current.onColumnDeleted?.(columnId));
    };
    const onLabelCreated = ({ label, actorId }: { label: Label; actorId?: string }) => {
      deduplicate(actorId, () => handlersRef.current.onLabelCreated?.(label));
    };
    const onLabelUpdated = ({ label, actorId }: { label: Label; actorId?: string }) => {
      deduplicate(actorId, () => handlersRef.current.onLabelUpdated?.(label));
    };
    const onLabelDeleted = ({ labelId, actorId }: { labelId: string; actorId?: string }) => {
      deduplicate(actorId, () => handlersRef.current.onLabelDeleted?.(labelId));
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('presence:current', onPresenceCurrent);
    socket.on('presence:online', onPresenceOnline);
    socket.on('presence:offline', onPresenceOffline);
    socket.on('task:created', onTaskCreated);
    socket.on('task:updated', onTaskUpdated);
    socket.on('task:deleted', onTaskDeleted);
    socket.on('task:moved', onTaskMoved);
    socket.on('tasks:reordered', onTasksReordered);
    socket.on('subtask:created', onSubtaskCreated);
    socket.on('subtask:toggled', onSubtaskToggled);
    socket.on('subtask:deleted', onSubtaskDeleted);
    socket.on('column:created', onColumnCreated);
    socket.on('column:updated', onColumnUpdated);
    socket.on('column:deleted', onColumnDeleted);
    socket.on('label:created', onLabelCreated);
    socket.on('label:updated', onLabelUpdated);
    socket.on('label:deleted', onLabelDeleted);

    return () => {
      if (listId) {
        socket.emit('leave:list', listId);
      }
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('presence:current', onPresenceCurrent);
      socket.off('presence:online', onPresenceOnline);
      socket.off('presence:offline', onPresenceOffline);
      socket.off('task:created', onTaskCreated);
      socket.off('task:updated', onTaskUpdated);
      socket.off('task:deleted', onTaskDeleted);
      socket.off('task:moved', onTaskMoved);
      socket.off('tasks:reordered', onTasksReordered);
      socket.off('subtask:created', onSubtaskCreated);
      socket.off('subtask:toggled', onSubtaskToggled);
      socket.off('subtask:deleted', onSubtaskDeleted);
      socket.off('column:created', onColumnCreated);
      socket.off('column:updated', onColumnUpdated);
      socket.off('column:deleted', onColumnDeleted);
      socket.off('label:created', onLabelCreated);
      socket.off('label:updated', onLabelUpdated);
      socket.off('label:deleted', onLabelDeleted);
      setOnlineUsers([]);
    };
  }, [listId, currentUserId, deduplicate]);

  return { isConnected, onlineUsers };
}
