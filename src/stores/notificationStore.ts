import { create } from 'zustand';
import type { Notification } from '@/types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  cursor: string | null; // for pagination
  hasMore: boolean;

  setNotifications: (notifications: Notification[], cursor: string | null, hasMore: boolean) => void;
  prependNotification: (notification: Notification) => void;
  appendNotifications: (notifications: Notification[], cursor: string | null, hasMore: boolean) => void;
  markAsRead: (notificationIds: string[]) => void;
  markAllAsRead: () => void;
  setUnreadCount: (count: number) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  cursor: null,
  hasMore: false,

  setNotifications: (notifications, cursor, hasMore) =>
    set({
      notifications,
      cursor,
      hasMore,
      unreadCount: notifications.filter((n) => !n.read).length,
    }),

  prependNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.read ? 0 : 1),
    })),

  appendNotifications: (notifications, cursor, hasMore) =>
    set((state) => ({
      notifications: [...state.notifications, ...notifications],
      cursor,
      hasMore,
    })),

  markAsRead: (notificationIds) =>
    set((state) => {
      const idSet = new Set(notificationIds);
      const updated = state.notifications.map((n) =>
        idSet.has(n.id) ? { ...n, read: true } : n,
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    }),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  setUnreadCount: (count) => set({ unreadCount: count }),
}));
