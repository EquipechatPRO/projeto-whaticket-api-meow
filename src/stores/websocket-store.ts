import { create } from "zustand";
import {
  wsService,
  WsEvent,
  WsMessageNewData,
  WsChatUpdateData,
  WsPresenceData,
} from "@/services/websocket";
import type { Message, Chat } from "@/services/api";

interface PresenceInfo {
  presence: "composing" | "paused" | "available" | "unavailable";
  lastSeen?: string;
}

interface WebSocketStore {
  connected: boolean;
  /** New messages arriving in real-time, grouped by jid */
  incomingMessages: Record<string, Message[]>;
  /** Chat metadata updates (unread, last message) */
  chatUpdates: Record<string, Partial<Chat>>;
  /** Contact presence (typing, online, etc.) */
  presences: Record<string, PresenceInfo>;

  // Actions
  startListening: () => () => void;
  clearMessagesForJid: (jid: string) => void;
  getNewMessagesForJid: (jid: string) => Message[];
}

export const useWebSocketStore = create<WebSocketStore>((set, get) => ({
  connected: false,
  incomingMessages: {},
  chatUpdates: {},
  presences: {},

  startListening: () => {
    wsService.connect();

    const unsubscribe = wsService.subscribe((event: WsEvent) => {
      switch (event.event) {
        case "connection:status": {
          const data = event.data as { connected: boolean };
          set({ connected: data.connected });
          break;
        }

        case "message:new": {
          const msg = event.data as WsMessageNewData;
          const newMessage: Message = {
            id: msg.id,
            jid: msg.jid,
            fromMe: msg.fromMe,
            text: msg.text,
            timestamp: msg.timestamp,
            type: msg.type,
            mediaUrl: msg.mediaUrl,
            caption: msg.caption,
            senderName: msg.senderName || msg.pushName,
          };

          set((state) => {
            const existing = state.incomingMessages[msg.jid] || [];
            // Avoid duplicates
            if (existing.some((m) => m.id === msg.id)) return state;
            return {
              incomingMessages: {
                ...state.incomingMessages,
                [msg.jid]: [...existing, newMessage],
              },
            };
          });
          break;
        }

        case "chat:update": {
          const data = event.data as WsChatUpdateData;
          set((state) => ({
            chatUpdates: {
              ...state.chatUpdates,
              [data.jid]: {
                lastMessage: data.lastMessage,
                lastMessageTime: data.lastMessageTime,
                unreadCount: data.unreadCount,
              },
            },
          }));
          break;
        }

        case "presence:update": {
          const data = event.data as WsPresenceData;
          set((state) => ({
            presences: {
              ...state.presences,
              [data.jid]: {
                presence: data.presence,
                lastSeen: data.lastSeen,
              },
            },
          }));
          break;
        }

        default:
          break;
      }
    });

    return () => {
      unsubscribe();
      wsService.disconnect();
    };
  },

  clearMessagesForJid: (jid: string) => {
    set((state) => {
      const { [jid]: _, ...rest } = state.incomingMessages;
      return { incomingMessages: rest };
    });
  },

  getNewMessagesForJid: (jid: string) => {
    return get().incomingMessages[jid] || [];
  },
}));
