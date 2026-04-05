'use client';

import { useState, useEffect, useRef } from 'react';
import { Task, User, Label, Subtask, Comment, Attachment } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { DatePicker } from '@/components/ui/DatePicker';
import { PrioritySelector } from './PriorityBadge';
import { LabelChip } from './LabelChip';
import { LabelPicker } from './LabelPicker';
import { MultiMemberPicker } from './MultiMemberPicker';
import { SubtaskList } from './SubtaskList';
import { AttachmentList } from './AttachmentList';
import { CommentThread } from './CommentThread';
import { X, Trash2, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getSocket } from '@/lib/socket';

interface TaskDetailProps {
  task: Task;
  listMembers: User[];
  listLabels: Label[];
  currentUserId: string | null;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<Task>;
  onDelete: (taskId: string) => Promise<void>;
  onCreateLabel: (name: string, color: string) => Promise<Label>;
  onRefresh?: () => Promise<void>;
}

export function TaskDetail({
  task: initialTask,
  listMembers,
  listLabels: initialLabels,
  currentUserId,
  onClose,
  onUpdate,
  onDelete,
  onCreateLabel,
  onRefresh,
}: TaskDetailProps) {
  const [task, setTask] = useState<Task>(initialTask);
  const [labels, setLabels] = useState<Label[]>(initialLabels);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const [descValue, setDescValue] = useState(task.description ?? '');
  const [deleting, setDeleting] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const titleRef = useRef<HTMLInputElement>(null);

  // Fetch full task (with comments + attachments) on open
  useEffect(() => {
    let cancelled = false;
    async function fetchFull() {
      setLoadingDetail(true);
      try {
        const res = await fetch(`/api/tasks/${initialTask.id}`);
        if (res.ok && !cancelled) {
          const full: Task = await res.json();
          setTask(full);
          setTitleValue(full.title);
          setDescValue(full.description ?? '');
          setComments(full.comments ?? []);
          setAttachments(full.attachments ?? []);
        }
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    }
    fetchFull();
    return () => { cancelled = true; };
  }, [initialTask.id]);

  // Sync core fields when parent task changes (real-time update from board)
  useEffect(() => {
    setTask((prev) => ({ ...prev, ...initialTask }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTask.updatedAt]);

  useEffect(() => {
    setLabels(initialLabels);
  }, [initialLabels]);

  // Socket listeners for real-time comments + attachments
  useEffect(() => {
    const socket = getSocket();
    const taskId = initialTask.id;

    const onCommentAdded = ({ comment, taskId: tid, actorId }: { comment: Comment; taskId: string; actorId?: string }) => {
      if (tid !== taskId) return;
      if (actorId && actorId === currentUserId) return;
      setComments((prev) => {
        if (prev.some((c) => c.id === comment.id)) return prev;
        return [...prev, comment];
      });
    };
    const onCommentUpdated = ({ comment, taskId: tid }: { comment: Comment; taskId: string }) => {
      if (tid !== taskId) return;
      setComments((prev) => prev.map((c) => (c.id === comment.id ? comment : c)));
    };
    const onCommentDeleted = ({ commentId, taskId: tid }: { commentId: string; taskId: string }) => {
      if (tid !== taskId) return;
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    };
    const onAttachmentAdded = ({ attachment, taskId: tid, actorId }: { attachment: Attachment; taskId: string; actorId?: string }) => {
      if (tid !== taskId) return;
      if (actorId && actorId === currentUserId) return;
      setAttachments((prev) => {
        if (prev.some((a) => a.id === attachment.id)) return prev;
        return [attachment, ...prev];
      });
    };
    const onAttachmentDeleted = ({ attachmentId, taskId: tid }: { attachmentId: string; taskId: string }) => {
      if (tid !== taskId) return;
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    };

    socket.on('comment:added', onCommentAdded);
    socket.on('comment:updated', onCommentUpdated);
    socket.on('comment:deleted', onCommentDeleted);
    socket.on('attachment:added', onAttachmentAdded);
    socket.on('attachment:deleted', onAttachmentDeleted);

    return () => {
      socket.off('comment:added', onCommentAdded);
      socket.off('comment:updated', onCommentUpdated);
      socket.off('comment:deleted', onCommentDeleted);
      socket.off('attachment:added', onAttachmentAdded);
      socket.off('attachment:deleted', onAttachmentDeleted);
    };
  }, [initialTask.id, currentUserId]);

  async function update(updates: Partial<Task>) {
    try {
      const updated = await onUpdate(task.id, updates);
      setTask(updated);
    } catch (e) {
      console.error('Failed to update task', e);
    }
  }

  async function handleTitleSave() {
    if (titleValue.trim() && titleValue !== task.title) {
      await update({ title: titleValue.trim() } as Partial<Task>);
    } else {
      setTitleValue(task.title);
    }
    setEditingTitle(false);
  }

  async function handleDescBlur() {
    if (descValue !== (task.description ?? '')) {
      await update({ description: descValue || null } as Partial<Task>);
    }
  }

  async function handlePriorityChange(priority: 'LOW' | 'MEDIUM' | 'HIGH') {
    await update({ priority } as Partial<Task>);
  }

  async function handleAssigneesChange(assigneeIds: string[]) {
    await update({ assigneeIds } as unknown as Partial<Task>);
  }

  async function handleMyCompletionToggle() {
    try {
      const myAssignment = task.assignees.find((a) => a.userId === currentUserId);
      if (!myAssignment) return;
      const res = await fetch(`/api/tasks/${task.id}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !myAssignment.completed }),
      });
      if (res.ok) {
        const updated: Task = await res.json();
        setTask(updated);
        // Refresh the board so cards/columns stay in sync
        if (onRefresh) await onRefresh();
      }
    } catch (e) {
      console.error('Failed to toggle completion', e);
    }
  }

  async function handleDueDateChange(dueDate: string | null) {
    await update({ dueDate } as Partial<Task>);
  }

  async function handleLabelToggle(ids: string[]) {
    await update({ labelIds: ids } as unknown as Partial<Task>);
    const newLabels = labels.filter((l) => ids.includes(l.id));
    setTask((t) => ({ ...t, labels: newLabels }));
  }

  async function handleSubtaskToggle(subtaskId: string, completed: boolean) {
    const res = await fetch(`/api/subtasks/${subtaskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed }),
    });
    if (res.ok) {
      setTask((t) => ({
        ...t,
        subtasks: t.subtasks.map((s) => (s.id === subtaskId ? { ...s, completed } : s)),
      }));
    }
  }

  async function handleSubtaskDelete(subtaskId: string) {
    const res = await fetch(`/api/subtasks/${subtaskId}`, { method: 'DELETE' });
    if (res.ok) {
      setTask((t) => ({ ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) }));
    }
  }

  async function handleSubtaskAdd(title: string) {
    const res = await fetch(`/api/tasks/${task.id}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      const subtask: Subtask = await res.json();
      setTask((t) => ({ ...t, subtasks: [...t.subtasks, subtask] }));
    }
  }

  async function handleCreateLabel(name: string, color: string) {
    const label = await onCreateLabel(name, color);
    setLabels((prev) => [...prev, label]);
    return label;
  }

  async function handleDelete() {
    if (!confirm('Delete this task? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await onDelete(task.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  const selectedLabelIds = task.labels.map((l) => l.id);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40 md:bg-transparent" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full w-full md:w-[520px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden"
        style={{ boxShadow: '-4px 0 24px rgba(0,0,0,0.12)' }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                ref={titleRef}
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') titleRef.current?.blur();
                  if (e.key === 'Escape') {
                    setTitleValue(task.title);
                    setEditingTitle(false);
                  }
                }}
                className="w-full text-lg font-semibold text-gray-800 bg-gray-50 border border-honey-300 rounded-button px-2 py-1 focus:outline-none focus:ring-2 focus:ring-honey-500"
                style={{ borderRadius: '8px' }}
                autoFocus
              />
            ) : (
              <h2
                className="text-lg font-semibold text-gray-800 cursor-pointer hover:text-honey-600 transition-colors leading-tight"
                onClick={() => setEditingTitle(true)}
                title="Click to edit"
              >
                {task.title}
              </h2>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-chip" style={{ borderRadius: '6px' }}>
                {task.status.replace('_', ' ')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-button transition-colors"
              title="Delete task"
              style={{ borderRadius: '8px' }}
            >
              <Trash2 size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-button transition-colors"
              style={{ borderRadius: '8px' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Assignees */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Assignees
            </label>
            <MultiMemberPicker
              members={listMembers}
              value={task.assignees.map((a) => a.userId)}
              onChange={handleAssigneesChange}
            />
            {/* Per-user completion toggle */}
            {task.assignees.some((a) => a.userId === currentUserId) && (
              <button
                type="button"
                onClick={handleMyCompletionToggle}
                className={`mt-2 flex items-center gap-2 text-sm px-3 py-1.5 rounded-button transition-colors ${
                  task.assignees.find((a) => a.userId === currentUserId)?.completed
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
                style={{ borderRadius: '8px' }}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                  task.assignees.find((a) => a.userId === currentUserId)?.completed
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-gray-300'
                }`}>
                  {task.assignees.find((a) => a.userId === currentUserId)?.completed && (
                    <svg viewBox="0 0 16 16" fill="white" className="w-full h-full">
                      <path d="M13.5 3.5L6 11 2.5 7.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                {task.assignees.find((a) => a.userId === currentUserId)?.completed
                  ? 'Marked as done (you)'
                  : 'Mark as done (you)'}
              </button>
            )}
            {/* Completion status of all assignees */}
            {task.assignees.length > 0 && (
              <div className="mt-2 space-y-1">
                {task.assignees.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-xs text-gray-500">
                    <div className={`w-2.5 h-2.5 rounded-full ${a.completed ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    <span>{a.user.name}</span>
                    <span className="text-gray-400">{a.completed ? 'Done' : 'Pending'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Due Date
            </label>
            <DatePicker value={task.dueDate} onChange={handleDueDateChange} />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Priority
            </label>
            <PrioritySelector value={task.priority} onChange={handlePriorityChange} />
          </div>

          {/* Labels */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Labels
            </label>
            <div className="flex flex-wrap gap-1.5 items-center">
              {task.labels.map((label) => (
                <LabelChip
                  key={label.id}
                  label={label}
                  onRemove={() => handleLabelToggle(selectedLabelIds.filter((id) => id !== label.id))}
                />
              ))}
              <LabelPicker
                labels={labels}
                selectedIds={selectedLabelIds}
                onChange={handleLabelToggle}
                onCreateLabel={handleCreateLabel}
                listId={task.listId}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              value={descValue}
              onChange={(e) => setDescValue(e.target.value)}
              onBlur={handleDescBlur}
              placeholder="Add a description..."
              rows={4}
              className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-button px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-honey-500 focus:border-transparent placeholder-gray-400"
              style={{ borderRadius: '8px' }}
            />
          </div>

          {/* Subtasks */}
          <div>
            <SubtaskList
              subtasks={task.subtasks}
              taskId={task.id}
              onToggle={handleSubtaskToggle}
              onDelete={handleSubtaskDelete}
              onAdd={handleSubtaskAdd}
            />
          </div>

          {/* Attachments */}
          {loadingDetail ? (
            <div className="h-20 bg-gray-50 rounded-card animate-pulse" style={{ borderRadius: '12px' }} />
          ) : (
            <AttachmentList
              taskId={task.id}
              attachments={attachments}
              currentUserId={currentUserId}
              taskCreatorId={task.createdById}
              onAdd={(a) => setAttachments((prev) => [a, ...prev])}
              onRemove={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
            />
          )}

          {/* Comments */}
          {loadingDetail ? (
            <div className="h-32 bg-gray-50 rounded-card animate-pulse" style={{ borderRadius: '12px' }} />
          ) : (
            <CommentThread
              taskId={task.id}
              comments={comments}
              currentUserId={currentUserId}
              taskCreatorId={task.createdById}
              listMembers={listMembers}
              onAdd={(c) => setComments((prev) => [...prev, c])}
              onUpdate={(c) => setComments((prev) => prev.map((x) => (x.id === c.id ? c : x)))}
              onRemove={(id) => setComments((prev) => prev.filter((c) => c.id !== id))}
            />
          )}
        </div>

        {/* Activity footer */}
        <div className="border-t border-gray-100 px-5 py-3 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock size={11} />
            <Avatar
              name={task.createdBy.name}
              avatarUrl={task.createdBy.avatarUrl}
              color={task.createdBy.color}
              size="xs"
            />
            <span>
              Created by {task.createdBy.name} on{' '}
              {format(parseISO(task.createdAt), 'MMM d, yyyy')}
              {task.updatedAt !== task.createdAt && (
                <> · Updated {format(parseISO(task.updatedAt), 'MMM d')}</>
              )}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
