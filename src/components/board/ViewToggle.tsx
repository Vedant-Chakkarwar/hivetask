'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { LayoutGrid, List, Calendar } from 'lucide-react';

export type ViewType = 'board' | 'list' | 'calendar';

interface ViewToggleProps {
  currentView: ViewType;
}

export function ViewToggle({ currentView }: ViewToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setView(view: ViewType) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', view);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const views: { key: ViewType; icon: React.ReactNode; label: string }[] = [
    { key: 'board', icon: <LayoutGrid size={14} />, label: 'Board' },
    { key: 'list', icon: <List size={14} />, label: 'List' },
    { key: 'calendar', icon: <Calendar size={14} />, label: 'Calendar' },
  ];

  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
      {views.map(({ key, icon, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => setView(key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            currentView === key
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {icon}
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
