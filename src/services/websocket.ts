/**
 * WebSocket Service - Whatsmeow real-time events
 *
 * Connects to the whatsmeow Go backend via WebSocket to receive
 * messages, status updates, and presence changes in real time.
 *
 * Events expected from server:
 * - message:new        → new incoming/outgoing message
 * - message:update     → message status update (delivered, read)
 * - message:delete     → message deleted
 * - chat:update        → chat metadata changed (unread count, last message)
 * - presence:update    → contact online/offline/typing
 * - connection:status  → session connected/disconnected
 */

import { useConnectionStore } from "@/stores/connection-store";

export type WsEventType =
  | "message:new"
  | "message:update"
  | "message:delete"
  | "chat:update"
  | "presence:update"
  | "connection:status";

export interface WsEvent<T = unknown> {
  event: WsEventType;
  data: T;
}

export interface WsMessageNewData {
  id: string;
  jid: string;
  fromMe: boolean;
  text: string;
  timestamp: string;
  type: "text" | "image" | "audio" | "video" | "document" | "location" | "contact" | "sticker";
  mediaUrl?: string;
  caption?: string;
  senderName?: string;
  pushName?: string;
}

export interface WsChatUpdateData {
  jid: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export interface WsPresenceData {
  jid: string;
  presence: "composing" | "paused" | "available" | "unavailable";
  lastSeen?: string;
}

export interface WsConnectionData {
  connected: boolean;
  phone?: string;
  name?: string;
}

type EventCallback = (event: WsEvent) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Set<EventCallback> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20;
  private baseDelay = 1000;
  private _isConnected = false;
  private _intentionalClose = false;

  get isConnected() {
    return this._isConnected;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this._intentionalClose = false;
    const httpUrl = useConnectionStore.getState().baseUrl;
    const wsUrl = httpUrl.replace(/^http/, "ws") + "/ws";

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("[WS] Connected to", wsUrl);
        this._isConnected = true;
        this.reconnectAttempts = 0;
        this.emit({ event: "connection:status", data: { connected: true } });
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed: WsEvent = JSON.parse(event.data);
          this.emit(parsed);
        } catch (err) {
          console.warn("[WS] Failed to parse message:", event.data);
        }
      };

      this.ws.onclose = (event) => {
        console.log("[WS] Disconnected:", event.code, event.reason);
        this._isConnected = false;
        this.emit({ event: "connection:status", data: { connected: false } });

        if (!this._intentionalClose) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error("[WS] Error:", error);
      };
    } catch (err) {
      console.error("[WS] Failed to create WebSocket:", err);
      this.scheduleReconnect();
    }
  }

  disconnect() {
    this._intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }
    this._isConnected = false;
    this.reconnectAttempts = 0;
  }

  subscribe(callback: EventCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private emit(event: WsEvent) {
    this.listeners.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.error("[WS] Listener error:", err);
      }
    });
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn("[WS] Max reconnect attempts reached");
      return;
    }

    const delay = Math.min(this.baseDelay * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }
}

export const wsService = new WebSocketService();
