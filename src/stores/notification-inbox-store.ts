import { create } from "zustand";

export interface IncomingNotification {
  id: string;
  sender: string;
  jid: string;
  message: string;
  timestamp: string;
  read: boolean;
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

interface NotificationInboxStore {
  notifications: IncomingNotification[];
  unreadCount: number;
  addNotification: (n: Omit<IncomingNotification, "id" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  getTimeAgo: (ts: string) => string;
}

export const useNotificationInbox = create<NotificationInboxStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (n) =>
    set((s) => {
      const notification: IncomingNotification = {
        ...n,
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        read: false,
      };
      const updated = [notification, ...s.notifications].slice(0, 50); // keep last 50
      return { notifications: updated, unreadCount: updated.filter((x) => !x.read).length };
    }),
  markAsRead: (id) =>
    set((s) => {
      const updated = s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      return { notifications: updated, unreadCount: updated.filter((x) => !x.read).length };
    }),
  markAllAsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
  getTimeAgo: (ts) => timeAgo(ts),
}));
