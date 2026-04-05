'use client';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md';
  interactive?: boolean;
  onClick?: () => void;
}

const config: Record<Priority, { label: string; dot: string; bg: string; text: string }> = {
  HIGH: { label: 'High', dot: '🔴', bg: 'bg-red-50', text: 'text-red-600' },
  MEDIUM: { label: 'Medium', dot: '🟡', bg: 'bg-amber-50', text: 'text-amber-600' },
  LOW: { label: 'Low', dot: '🟢', bg: 'bg-emerald-50', text: 'text-emerald-600' },
};

export function PriorityBadge({ priority, size = 'sm', interactive, onClick }: PriorityBadgeProps) {
  const { label, dot, bg, text } = config[priority];
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-chip font-medium ${sizeClass} ${bg} ${text} ${interactive ? 'cursor-pointer hover:opacity-80' : ''}`}
      style={{ borderRadius: '6px' }}
      onClick={onClick}
    >
      <span style={{ fontSize: size === 'sm' ? 10 : 12 }}>{dot}</span>
      {label}
    </span>
  );
}

interface PrioritySelectorProps {
  value: Priority;
  onChange: (p: Priority) => void;
}

export function PrioritySelector({ value, onChange }: PrioritySelectorProps) {
  const priorities: Priority[] = ['HIGH', 'MEDIUM', 'LOW'];

  return (
    <div className="flex items-center gap-2">
      {priorities.map((p) => {
        const { label, dot, bg, text } = config[p];
        const isActive = value === p;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-button text-sm font-medium transition-all border-2 ${
              isActive
                ? `${bg} ${text} border-current`
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
            style={{ borderRadius: '8px' }}
          >
            <span style={{ fontSize: 12 }}>{dot}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
}
