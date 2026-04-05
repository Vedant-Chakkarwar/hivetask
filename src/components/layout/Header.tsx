'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar } from '@/components/ui/Avatar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { SearchBar } from '@/components/layout/SearchBar';
import { disconnectSocket } from '@/lib/socket';
import { useState } from 'react';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      disconnectSocket();
      setUser(null);
      router.push('/login');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center px-3 md:px-4 gap-2 md:gap-3 flex-shrink-0">
      {/* Logo + app name */}
      <Link href="/" className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-xl leading-none select-none">🐝</span>
        <span className="font-bold text-gray-800 text-sm md:text-base tracking-tight">HiveTask</span>
      </Link>

      {title && (
        <h1 className="font-semibold text-gray-800 text-sm md:text-base truncate max-w-[120px] md:max-w-[200px]">{title}</h1>
      )}

      {/* Center: Search bar */}
      <div className="flex-1 min-w-0">
        <SearchBar />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <NotificationBell />

        {user && (
          <div className="flex items-center gap-2 ml-1">
            <Avatar
              name={user.name}
              avatarUrl={user.avatarUrl}
              color={user.color}
              size="sm"
            />
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-button transition-colors disabled:opacity-50"
              style={{ borderRadius: '8px' }}
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
