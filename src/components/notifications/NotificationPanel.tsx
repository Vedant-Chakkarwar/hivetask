'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Check, CheckCheck, Bell } from 'lucide-react';
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
  ASSIGNED: 'assigned',
  COMMENTED: 'comment',
  DUE_SOON: 'due soon',
  MENTIONED: 'mention',
};

interface NotificationPanelProps {
  onClose: () => void;
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const router = useRouter();
  const { notifications, hasMore, cursor, markAsRead, markAllAsRead, appendNotifications } =
    useNotificationStore();

  const handleMarkAllRead = useCallback(async () => {
    await fetch('/api/notifications/read', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    markAllAsRead();
  }, [markAllAsRead]);

  const handleClickNotification = useCallback(
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
        // Navigate to the task — tasks are on list boards
        router.push(`/lists`);
      }
      onClose();
    },
    [markAsRead, router, onClose],
  );

  const handleLoadMore = useCallback(async () => {
    if (!cursor) return;
    const res = await fetch(`/api/notifications?cursor=${cursor}`);
    if (!res.ok) return;
    const data = await res.json();
    appendNotifications(data.notifications, data.nextCursor, data.hasMore);
  }, [cursor, appendNotifications]);

  const unread = notifications.filter((n) => !n.read);

  return (
    <div
      className="fixed right-2 top-14 w-[calc(100vw-1rem)] sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 flex flex-col max-h-[480px]"
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <h3 className="font-semibold text-gray-800 text-sm">Notifications</h3>
        {unread.length > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors"
          >
            <CheckCheck size={13} />
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <span className="text-3xl mb-2">🎉</span>
            <p className="text-sm font-medium text-gray-700">No notifications yet</p>
            <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
          </div>
        ) : (
          <>
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleClickNotification(notification)}
                className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors relative border-b border-gray-50 last:border-0"
              >
                {/* Unread dot */}
                {!notification.read && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                )}

                {/* Actor avatar + type dot */}
                <div className="relative flex-shrink-0 mt-0.5">
                  {notification.actor ? (
                    <Avatar
                      name={notification.actor.name}
                      avatarUrl={notification.actor.avatarUrl}
                      color={notification.actor.color}
                      size="sm"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                      <Bell size={12} className="text-gray-400" />
                    </div>
                  )}
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                    style={{ backgroundColor: TYPE_COLORS[notification.type] }}
                    title={TYPE_LABELS[notification.type]}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs text-gray-700 leading-snug"
                    style={{ fontWeight: notification.read ? 400 : 500 }}
                  >
                    {notification.message}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </div>

                {/* Read checkmark */}
                {notification.read && (
                  <Check size={12} className="text-gray-300 flex-shrink-0 mt-1" />
                )}
              </button>
            ))}

            {hasMore && (
              <button
                type="button"
                onClick={handleLoadMore}
                className="w-full py-2.5 text-xs text-amber-600 hover:text-amber-700 font-medium text-center transition-colors border-t border-gray-100"
              >
                Load more
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
