import { create } from "zustand";

export interface WhatsAppConnection {
  id: string;
  name: string;
  phone: string;
  status: "connected" | "disconnected" | "connecting";
  baseUrl: string;
}

interface ConnectionStore {
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  connections: WhatsAppConnection[];
  addConnection: (conn: Omit<WhatsAppConnection, "id">) => void;
  updateConnection: (id: string, data: Partial<WhatsAppConnection>) => void;
  removeConnection: (id: string) => void;
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  baseUrl: localStorage.getItem("api_base_url") || "http://localhost:8080",
  setBaseUrl: (url: string) => {
    localStorage.setItem("api_base_url", url);
    set({ baseUrl: url });
  },
  connections: [
    { id: "conn-1", name: "Número Principal", phone: "+55 11 99999-0001", status: "connected", baseUrl: "http://localhost:8080" },
    { id: "conn-2", name: "Suporte", phone: "+55 11 99999-0002", status: "connected", baseUrl: "http://localhost:8081" },
    { id: "conn-3", name: "Vendas", phone: "+55 11 99999-0003", status: "disconnected", baseUrl: "http://localhost:8082" },
  ],
  addConnection: (conn) =>
    set((s) => ({ connections: [...s.connections, { ...conn, id: `conn-${Date.now()}` }] })),
  updateConnection: (id, data) =>
    set((s) => ({ connections: s.connections.map((c) => (c.id === id ? { ...c, ...data } : c)) })),
  removeConnection: (id) =>
    set((s) => ({ connections: s.connections.filter((c) => c.id !== id) })),
}));
