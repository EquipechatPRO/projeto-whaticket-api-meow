import { useEffect, useRef, useCallback, useState } from "react";
import { useConnectionStore } from "@/stores/connection-store";
import { Message } from "@/services/api";
import { toast } from "sonner";

export interface WSEvent {
  type: "message" | "chat_update" | "status" | "receipt" | "presence" | "typing";
  data: any;
}

interface UseWebSocketOptions {
  onMessage?: (msg: Message) => void;
  onChatUpdate?: (data: { jid: string; name: string; lastMessage: string; lastMessageTime: string; isGroup: boolean }) => void;
  onStatus?: (data: { connected: boolean; phone?: string; name?: string }) => void;
  onTyping?: (data: { jid: string; from: string; state: "composing" | "paused" }) => void;
  onReceipt?: (data: { jid: string; messageIds: string[]; type: string }) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const [isConnected, setIsConnected] = useState(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const connect = useCallback(() => {
    const baseUrl = useConnectionStore.getState().baseUrl;
    if (!baseUrl) return;

    // Convert http(s) to ws(s)
    const wsUrl = baseUrl.replace(/^http/, "ws") + "/ws";

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log("📡 WebSocket conectado:", wsUrl);
      };

      ws.onmessage = (event) => {
        try {
          const evt: WSEvent = JSON.parse(event.data);
          switch (evt.type) {
            case "message":
              optionsRef.current.onMessage?.(evt.data);
              break;
            case "chat_update":
              optionsRef.current.onChatUpdate?.(evt.data);
              break;
            case "status":
              optionsRef.current.onStatus?.(evt.data);
              break;
            case "typing":
              optionsRef.current.onTyping?.(evt.data);
              break;
            case "receipt":
              optionsRef.current.onReceipt?.(evt.data);
              break;
          }
        } catch (e) {
          console.error("WS parse error:", e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log("📡 WebSocket desconectado, reconectando em 3s...");
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        ws.close();
      };
    } catch (e) {
      console.error("WebSocket connection failed:", e);
      reconnectTimer.current = setTimeout(connect, 5000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { isConnected };
}
