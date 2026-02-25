import { create } from 'zustand';

export type NotificationType = 'new_deal' | 'flash_deal' | 'expiring' | 'claim' | 'system';

export interface Notification {
  notifId: string;
  type: NotificationType;
  title: string;
  message: string;
  dealId?: string;
  category?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  setUnreadCount: (count: number) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const { api } = await import('./api');
      const res = await api.get<Notification[]>('/api/notifications');
      const notifications = Array.isArray(res) ? res : [];
      set({
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  markAllRead: async () => {
    try {
      const { api } = await import('./api');
      await api.put('/api/notifications/read', {});
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch {
      // Optimistic update still applied
    }
  },

  deleteNotification: async (id: string) => {
    try {
      const { api } = await import('./api');
      await api.delete(`/api/notifications/${id}`);
    } catch {
      // Continue with optimistic removal
    }
    set((state) => {
      const updated = state.notifications.filter((n) => n.notifId !== id);
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });
  },

  setUnreadCount: (count) => set({ unreadCount: count }),
  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));
