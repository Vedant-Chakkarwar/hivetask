'use client';

import { useRef } from 'react';
import { Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface DatePickerProps {
  value: string | null;
  onChange: (date: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DatePicker({ value, onChange, placeholder = 'Set due date', disabled }: DatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayValue = value ? format(parseISO(value), 'MMM d, yyyy') : '';
  const inputValue = value ? value.slice(0, 10) : '';
  const isOverdue = value && new Date(value) < new Date() && !value.startsWith(new Date().toISOString().slice(0, 10));

  return (
    <div className="flex items-center gap-2">
      <Calendar size={14} className={isOverdue ? 'text-red-500' : 'text-gray-400'} />

      {/* Hidden native date input */}
      <input
        ref={inputRef}
        type="date"
        value={inputValue}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
      />

      {/* Clickable label that opens the native picker */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.showPicker?.() ?? inputRef.current?.click()}
        className={`text-sm hover:underline focus:outline-none ${
          isOverdue ? 'text-red-500 font-medium' : value ? 'text-gray-700' : 'text-gray-400'
        }`}
      >
        {displayValue || placeholder}
        {isOverdue && ' (Overdue)'}
      </button>

      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-gray-400 hover:text-gray-600 text-xs"
          title="Clear date"
        >
          ✕
        </button>
      )}
    </div>
  );
}
