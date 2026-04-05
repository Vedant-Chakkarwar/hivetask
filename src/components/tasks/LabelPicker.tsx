'use client';

import { useState, useRef, useEffect } from 'react';
import { Label } from '@/types';
import { LabelChip } from './LabelChip';
import { Check, Plus, Tag } from 'lucide-react';

const LABEL_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
  '#6366F1', '#84CC16',
];

interface LabelPickerProps {
  labels: Label[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreateLabel: (name: string, color: string) => Promise<Label>;
  listId: string;
}

export function LabelPicker({ labels, selectedIds, onChange, onCreateLabel }: LabelPickerProps) {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(LABEL_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await onCreateLabel(newName.trim(), newColor);
      setNewName('');
      setNewColor(LABEL_COLORS[0]);
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 px-2 py-1 rounded-button transition-colors"
        style={{ borderRadius: '8px' }}
      >
        <Tag size={14} />
        Add label
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 w-64 bg-white rounded-card shadow-card-hover z-50 border border-gray-100 overflow-hidden"
          style={{ borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
        >
          <div className="max-h-52 overflow-y-auto py-1">
            {labels.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-3">No labels yet</p>
            )}
            {labels.map((label) => {
              const selected = selectedIds.includes(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => toggle(label.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                >
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                  <span className="flex-1 text-sm text-gray-700">{label.name}</span>
                  {selected && <Check size={14} className="text-honey-500 flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {!showCreate ? (
            <div className="border-t border-gray-100 py-1">
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-honey-50 text-honey-600 transition-colors text-sm"
              >
                <Plus size={14} />
                Create new label
              </button>
            </div>
          ) : (
            <div className="border-t border-gray-100 p-3 space-y-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Label name"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-honey-500"
                style={{ borderRadius: '8px' }}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <div className="flex flex-wrap gap-1">
                {LABEL_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      outline: newColor === c ? `2px solid ${c}` : 'none',
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!newName.trim() || creating}
                  className="flex-1 py-1.5 text-sm font-medium text-white rounded-button disabled:opacity-50"
                  style={{ backgroundColor: '#F59E0B', borderRadius: '8px' }}
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-button"
                  style={{ borderRadius: '8px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
