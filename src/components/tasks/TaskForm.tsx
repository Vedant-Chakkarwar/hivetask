'use client';

import { useState } from 'react';
import { User, Label } from '@/types';
import { X } from 'lucide-react';
import { MultiMemberPicker } from './MultiMemberPicker';

interface TaskFormProps {
  listId: string;
  columnId?: string;
  members: User[];
  labels: Label[];
  onSubmit: (data: {
    title: string;
    description?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    assigneeIds?: string[];
    dueDate?: string | null;
    labelIds?: string[];
    columnId?: string;
  }) => Promise<void>;
  onClose: () => void;
}

export function TaskForm({ members, labels, columnId, onSubmit, onClose }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assigneeIds: assigneeIds.length > 0 ? assigneeIds : undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        labelIds: selectedLabelIds,
        columnId,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const priorities = [
    { value: 'HIGH' as const, label: '🔴 High' },
    { value: 'MEDIUM' as const, label: '🟡 Medium' },
    { value: 'LOW' as const, label: '🟢 Low' },
  ];

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-card w-full max-w-lg shadow-2xl"
        style={{ borderRadius: '12px' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Create Task</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-button"
            style={{ borderRadius: '8px' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title *"
              required
              autoFocus
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-honey-500 focus:border-transparent"
              style={{ borderRadius: '8px' }}
            />
          </div>

          {/* Description */}
          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button resize-none focus:outline-none focus:ring-2 focus:ring-honey-500 focus:border-transparent placeholder-gray-400"
              style={{ borderRadius: '8px' }}
            />
          </div>

          {/* Priority + Due Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-honey-500 bg-white"
                style={{ borderRadius: '8px' }}
              >
                {priorities.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-honey-500"
                style={{ borderRadius: '8px' }}
              />
            </div>
          </div>

          {/* Assignees */}
          {members.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Assignees</label>
              <MultiMemberPicker
                members={members}
                value={assigneeIds}
                onChange={setAssigneeIds}
              />
            </div>
          )}

          {/* Labels */}
          {labels.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Labels</label>
              <div className="flex flex-wrap gap-1.5">
                {labels.map((label) => {
                  const selected = selectedLabelIds.includes(label.id);
                  return (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() =>
                        setSelectedLabelIds((prev) =>
                          selected ? prev.filter((id) => id !== label.id) : [...prev, label.id],
                        )
                      }
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-chip text-xs font-medium border-2 transition-all ${
                        selected ? 'border-current' : 'border-transparent opacity-60'
                      }`}
                      style={{
                        backgroundColor: label.color + '20',
                        color: label.color,
                        borderRadius: '6px',
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      {label.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={!title.trim() || submitting}
              className="flex-1 py-2.5 text-sm font-semibold text-white rounded-button disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: '#F59E0B', borderRadius: '8px' }}
            >
              {submitting ? 'Creating...' : 'Create Task'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-button hover:bg-gray-50 transition-colors"
              style={{ borderRadius: '8px' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
