'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ListTodo, Search, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  userName: string;
  userColor: string;
  userAvatarUrl?: string | null;
}

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/lists', label: 'My Lists', icon: ListTodo },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/notifications', label: 'Notifications', icon: Bell },
];

export function Sidebar({ userName, userColor, userAvatarUrl }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const initials = userName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside
      className={`hidden md:flex flex-col h-full bg-white border-r border-gray-100 transition-all duration-200 flex-shrink-0 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-2.5 px-4 py-4 border-b border-gray-100 ${collapsed ? 'justify-center' : ''}`}>
        <span className="text-2xl select-none flex-shrink-0">🐝</span>
        {!collapsed && (
          <span className="font-bold text-gray-800 text-base tracking-tight">HiveTask</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-button text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-honey-100 text-honey-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              } ${collapsed ? 'justify-center' : ''}`}
              style={{ borderRadius: '8px' }}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      {/* User + Collapse */}
      <div className="px-2 py-3 border-t border-gray-100 space-y-1">
        <div className={`flex items-center gap-2 px-3 py-2 ${collapsed ? 'justify-center' : ''}`}>
          {userAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userAvatarUrl} alt={userName} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
              style={{ backgroundColor: userColor }}
            >
              {initials}
            </div>
          )}
          {!collapsed && (
            <span className="text-sm text-gray-700 font-medium truncate">{userName}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-button transition-colors ${collapsed ? 'justify-center' : ''}`}
          style={{ borderRadius: '8px' }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          {!collapsed && 'Collapse'}
        </button>
      </div>
    </aside>
  );
}
