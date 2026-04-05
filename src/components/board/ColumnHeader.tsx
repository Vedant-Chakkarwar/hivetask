'use client';

import { useState, useRef, useEffect } from 'react';
import { Column } from '@/types';
import { MoreHorizontal, Plus, Pencil, Palette, Trash2 } from 'lucide-react';

const COLUMN_COLORS = [
  '#94A3B8', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#EF4444', '#EC4899', '#F97316',
];

interface ColumnHeaderProps {
  column: Column;
  taskCount: number;
  onAddTask: () => void;
  onRename: (name: string) => Promise<void>;
  onChangeColor: (color: string) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function ColumnHeader({
  column,
  taskCount,
  onAddTask,
  onRename,
  onChangeColor,
  onDelete,
}: ColumnHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(column.name);
  const [colorPicking, setColorPicking] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setColorPicking(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleRenameSave() {
    if (nameValue.trim() && nameValue !== column.name) {
      await onRename(nameValue.trim());
    } else {
      setNameValue(column.name);
    }
    setRenaming(false);
  }

  const barColor = column.color ?? '#E5E7EB';

  return (
    <div className="flex items-center gap-2 mb-3 group">
      {/* Color bar + name */}
      <div
        className="w-1 h-5 rounded-full flex-shrink-0"
        style={{ backgroundColor: barColor }}
      />

      {renaming ? (
        <input
          ref={inputRef}
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          onBlur={handleRenameSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') inputRef.current?.blur();
            if (e.key === 'Escape') { setNameValue(column.name); setRenaming(false); }
          }}
          className="flex-1 text-sm font-semibold text-gray-700 bg-gray-100 border border-honey-300 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-honey-500"
          autoFocus
        />
      ) : (
        <h3 className="flex-1 text-sm font-semibold text-gray-700 truncate">
          {column.name}
        </h3>
      )}

      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
        {taskCount}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onAddTask}
          className="p-1 text-gray-400 hover:text-honey-600 hover:bg-honey-50 rounded transition-colors"
          title="Add task"
        >
          <Plus size={15} />
        </button>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <MoreHorizontal size={15} />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-44 bg-white rounded-card shadow-card-hover z-20 border border-gray-100 py-1 overflow-hidden"
              style={{ borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
            >
              {!colorPicking ? (
                <>
                  <button
                    type="button"
                    onClick={() => { setRenaming(true); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Pencil size={13} /> Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => setColorPicking(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Palette size={13} /> Change Color
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    type="button"
                    onClick={() => { onDelete(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={13} /> Delete Column
                  </button>
                </>
              ) : (
                <div className="p-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">Choose color</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {COLUMN_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => { onChangeColor(c); setMenuOpen(false); setColorPicking(false); }}
                        className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                        style={{
                          backgroundColor: c,
                          outline: column.color === c ? `2px solid ${c}` : 'none',
                          outlineOffset: 2,
                        }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setColorPicking(false)}
                    className="mt-2 text-xs text-gray-400 hover:text-gray-600"
                  >
                    ← Back
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
