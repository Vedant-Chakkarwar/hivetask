'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ListTodo, Search, Bell, User } from 'lucide-react';
import { useNotificationStore } from '@/stores/notificationStore';

const navItems = [
  { href: '/', label: 'Home', icon: LayoutDashboard, showBadge: false },
  { href: '/lists', label: 'Lists', icon: ListTodo, showBadge: false },
  { href: '/search', label: 'Search', icon: Search, showBadge: false },
  { href: '/notifications', label: 'Alerts', icon: Bell, showBadge: true },
  { href: '/profile', label: 'Profile', icon: User, showBadge: false },
];

export function BottomNav() {
  const pathname = usePathname();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <nav
      className="md:hidden flex-shrink-0 bg-white border-t border-gray-100 flex items-center"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {navItems.map(({ href, label, icon: Icon, showBadge }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
              isActive ? 'text-honey-600' : 'text-gray-400'
            }`}
          >
            <span className="relative">
              <Icon size={20} />
              {showBadge && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
