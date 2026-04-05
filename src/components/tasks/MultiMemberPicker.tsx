'use client';

import { useState, useRef, useEffect } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { User } from '@/types';
import { Check, UserX, Users } from 'lucide-react';

interface MultiMemberPickerProps {
  members: User[];
  value: string[];
  onChange: (userIds: string[]) => void;
  disabled?: boolean;
}

export function MultiMemberPicker({ members, value, onChange, disabled }: MultiMemberPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = members.filter((m) => value.includes(m.id));
  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function toggle(userId: string) {
    if (value.includes(userId)) {
      onChange(value.filter((id) => id !== userId));
    } else {
      onChange([...value, userId]);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 hover:bg-gray-50 rounded-button px-2 py-1.5 transition-colors disabled:opacity-50"
        style={{ borderRadius: '8px' }}
      >
        {selected.length > 0 ? (
          <>
            <div className="flex -space-x-1.5">
              {selected.slice(0, 3).map((m) => (
                <Avatar key={m.id} name={m.name} avatarUrl={m.avatarUrl} color={m.color} size="sm" />
              ))}
            </div>
            <span className="text-sm text-gray-700">
              {selected.length === 1 ? selected[0].name : `${selected.length} assigned`}
            </span>
          </>
        ) : (
          <>
            <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
              <Users size={12} className="text-gray-400" />
            </div>
            <span className="text-sm text-gray-400">Unassigned</span>
          </>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 w-64 bg-white rounded-card shadow-card-hover z-50 border border-gray-100 overflow-hidden"
          style={{ borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
        >
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-honey-500"
              style={{ borderRadius: '8px' }}
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.map((member) => {
              const isSelected = value.includes(member.id);
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggle(member.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-honey-50 transition-colors text-left ${
                    isSelected ? 'bg-honey-50/50' : ''
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-honey-500 border-honey-500' : 'border-gray-300'
                  }`}>
                    {isSelected && <Check size={10} className="text-white" />}
                  </div>
                  <Avatar name={member.name} avatarUrl={member.avatarUrl} color={member.color} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{member.name}</p>
                    <p className="text-xs text-gray-400 truncate">{member.email}</p>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-3">No members found</p>
            )}
          </div>
          {value.length > 0 && (
            <div className="border-t border-gray-100 py-1">
              <button
                type="button"
                onClick={() => { onChange([]); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-500 transition-colors text-sm"
              >
                <UserX size={14} />
                Remove All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
