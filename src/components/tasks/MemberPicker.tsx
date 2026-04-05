'use client';

import { useState, useRef, useEffect } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { User } from '@/types';
import { Check, UserX } from 'lucide-react';

interface MemberPickerProps {
  members: User[];
  value: string | null;
  onChange: (userId: string | null) => void;
  disabled?: boolean;
}

export function MemberPicker({ members, value, onChange, disabled }: MemberPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const current = members.find((m) => m.id === value) ?? null;
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

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 hover:bg-gray-50 rounded-button px-2 py-1.5 transition-colors disabled:opacity-50"
        style={{ borderRadius: '8px' }}
      >
        {current ? (
          <>
            <Avatar name={current.name} avatarUrl={current.avatarUrl} color={current.color} size="sm" />
            <span className="text-sm text-gray-700">{current.name}</span>
          </>
        ) : (
          <>
            <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
              <span className="text-gray-400 text-xs">+</span>
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
            {filtered.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => { onChange(member.id); setOpen(false); setSearch(''); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-honey-50 transition-colors text-left"
              >
                <Avatar name={member.name} avatarUrl={member.avatarUrl} color={member.color} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{member.name}</p>
                  <p className="text-xs text-gray-400 truncate">{member.email}</p>
                </div>
                {value === member.id && <Check size={14} className="text-honey-500 flex-shrink-0" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-3">No members found</p>
            )}
          </div>
          {value && (
            <div className="border-t border-gray-100 py-1">
              <button
                type="button"
                onClick={() => { onChange(null); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-500 transition-colors text-sm"
              >
                <UserX size={14} />
                Remove Assignee
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
