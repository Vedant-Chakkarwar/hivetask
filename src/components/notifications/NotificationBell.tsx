'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { useNotificationStore } from '@/stores/notificationStore';
import type { Notification } from '@/types';
import { NotificationPanel } from './NotificationPanel';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { unreadCount, setNotifications, prependNotification, setUnreadCount } =
    useNotificationStore();

  // Initial load
  useEffect(() => {
    async function fetchInitial() {
      const res = await fetch('/api/notifications?limit=20');
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications, data.nextCursor, data.hasMore);
      setUnreadCount(data.unreadCount);
    }
    fetchInitial();
  }, [setNotifications, setUnreadCount]);

  // Real-time new notifications
  useEffect(() => {
    const socket = getSocket();
    const onNewNotification = ({ notification }: { notification: Notification }) => {
      prependNotification(notification);
    };
    socket.on('notification:new', onNewNotification);
    return () => { socket.off('notification:new', onNewNotification); };
  }, [prependNotification]);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors relative"
        style={{ borderRadius: '8px' }}
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5"
            aria-hidden
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div ref={panelRef}>
          <NotificationPanel onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
