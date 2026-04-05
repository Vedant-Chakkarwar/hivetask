'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Bell, CheckCheck, User as UserIcon } from 'lucide-react';
import { useNotificationStore } from '@/stores/notificationStore';
import { Avatar } from '@/components/ui/Avatar';
import type { Notification } from '@/types';

const TYPE_COLORS: Record<Notification['type'], string> = {
  ASSIGNED: '#F59E0B',
  COMMENTED: '#3B82F6',
  DUE_SOON: '#EF4444',
  MENTIONED: '#8B5CF6',
};

const TYPE_LABELS: Record<Notification['type'], string> = {
  ASSIGNED: 'Assigned',
  COMMENTED: 'Comment',
  DUE_SOON: 'Due Soon',
  MENTIONED: 'Mention',
};

export default function NotificationsPage() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    hasMore,
    cursor,
    setNotifications,
    appendNotifications,
    markAsRead,
    markAllAsRead,
    setUnreadCount,
  } = useNotificationStore();

  // Fetch notifications on mount
  useEffect(() => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications, data.nextCursor, data.hasMore);
        setUnreadCount(data.unreadCount);
      })
      .catch(() => {});
  }, [setNotifications, setUnreadCount]);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || !cursor) return;
    const res = await fetch(`/api/notifications?cursor=${cursor}`);
    const data = await res.json();
    appendNotifications(data.notifications, data.nextCursor, data.hasMore);
  }, [hasMore, cursor, appendNotifications]);

  const handleMarkAllRead = useCallback(async () => {
    await fetch('/api/notifications/read', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    markAllAsRead();
  }, [markAllAsRead]);

  const handleClick = useCallback(
    async (notification: Notification) => {
      if (!notification.read) {
        await fetch('/api/notifications/read', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationIds: [notification.id] }),
        });
        markAsRead([notification.id]);
      }
      if (notification.taskId) {
        router.push('/lists');
      }
    },
    [markAsRead, router],
  );

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell size={22} className="text-honey-500" />
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-danger text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 text-sm text-honey-600 font-medium hover:text-honey-700 transition-colors"
          >
            <CheckCheck size={16} />
            Mark all read
          </button>
        )}
      </div>

      {/* Empty state */}
      {notifications.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🎉</div>
          <p className="font-medium text-gray-600">All caught up!</p>
          <p className="text-sm mt-1">No new notifications.</p>
        </div>
      )}

      {/* Notification list */}
      <div className="space-y-2">
        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => handleClick(n)}
            className={`w-full text-left flex items-start gap-3 p-3 rounded-card border transition-all duration-200 hover:shadow-card ${
              n.read
                ? 'bg-white border-gray-100'
                : 'bg-honey-50 border-honey-200'
            }`}
            style={{ borderRadius: '12px' }}
          >
            {/* Avatar or icon */}
            <div className="flex-shrink-0 mt-0.5">
              {n.actor ? (
                <Avatar
                  name={n.actor.name}
                  color={n.actor.color}
                  avatarUrl={n.actor.avatarUrl}
                  size="sm"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <UserIcon size={14} className="text-gray-500" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: TYPE_COLORS[n.type] + '20',
                    color: TYPE_COLORS[n.type],
                  }}
                >
                  {TYPE_LABELS[n.type]}
                </span>
                {!n.read && (
                  <span className="w-2 h-2 rounded-full bg-honey-500 flex-shrink-0" />
                )}
              </div>
              <p className="text-sm text-gray-800 leading-snug">{n.message}</p>
              <p className="text-xs text-gray-400 mt-1">
                {formatDistanceToNow(parseISO(n.createdAt), { addSuffix: true })}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={handleLoadMore}
            className="text-sm text-honey-600 font-medium hover:text-honey-700 transition-colors"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
