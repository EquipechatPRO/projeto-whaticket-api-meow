import { create } from "zustand";

export interface WhatsAppConnection {
  id: string;
  name: string;
  phone: string;
  status: "connected" | "disconnected" | "connecting";
  baseUrl: string;
  color: string;
  provider: "baileys" | "whatsmeow";
  isDefault: boolean;
  allowGroups: boolean;
  groupTicketMode: "disabled" | "enabled";
  importMessages: boolean;
  token: string;
  queueId?: string;
  queueRedirectMinutes: number;
  messagesSent: number;
  messagesReceived: number;
  updatedAt: string;
  // Integrações
  webhookUrl: string;
  webhookEvents: string[];
  typebotEnabled: boolean;
  typebotUrl: string;
  n8nEnabled: boolean;
  n8nUrl: string;
  // Mensagens
  greetingMessage: string;
  greetingEnabled: boolean;
  awayMessage: string;
  awayEnabled: boolean;
  closingMessage: string;
  closingEnabled: boolean;
  transferMessage: string;
  transferEnabled: boolean;
  // Chatbot
  chatbotEnabled: boolean;
  chatbotType: "none" | "keyword" | "openai" | "dialogflow";
  chatbotApiKey: string;
  chatbotPrompt: string;
  chatbotMaxTokens: number;
  // Fluxo Padrão
  defaultFlowId: string;
  outOfHoursFlowId: string;
}

interface ConnectionStore {
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  connections: WhatsAppConnection[];
  addConnection: (conn: Omit<WhatsAppConnection, "id">) => void;
  updateConnection: (id: string, data: Partial<WhatsAppConnection>) => void;
  removeConnection: (id: string) => void;
}

const generateToken = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

const defaultConnectionFields = {
  color: "#25D366",
  provider: "baileys" as const,
  isDefault: false,
  allowGroups: false,
  groupTicketMode: "disabled" as const,
  importMessages: false,
  token: generateToken(),
  queueRedirectMinutes: 0,
  messagesSent: 0,
  messagesReceived: 0,
  updatedAt: new Date().toLocaleString("pt-BR"),
  webhookUrl: "",
  webhookEvents: [],
  typebotEnabled: false,
  typebotUrl: "",
  n8nEnabled: false,
  n8nUrl: "",
  greetingMessage: "",
  greetingEnabled: false,
  awayMessage: "",
  awayEnabled: false,
  closingMessage: "",
  closingEnabled: false,
  transferMessage: "",
  transferEnabled: false,
  chatbotEnabled: false,
  chatbotType: "none" as const,
  chatbotApiKey: "",
  chatbotPrompt: "",
  chatbotMaxTokens: 500,
  defaultFlowId: "",
  outOfHoursFlowId: "",
};

export const useConnectionStore = create<ConnectionStore>((set) => ({
  baseUrl: localStorage.getItem("api_base_url") || "http://localhost:8080",
  setBaseUrl: (url: string) => {
    localStorage.setItem("api_base_url", url);
    set({ baseUrl: url });
  },
  connections: [
    {
      ...defaultConnectionFields,
      id: "conn-1", name: "atendimento", phone: "+55 11 99999-0001", status: "disconnected",
      baseUrl: "http://localhost:8080", color: "#1f96d4",
      token: "jWGs2QjinJhPDMFH78HPO8rd8ji36C",
      allowGroups: true, messagesSent: 1596, messagesReceived: 2794,
      updatedAt: "03/03/26 09:17",
      greetingEnabled: true, greetingMessage: "Olá! 👋 Bem-vindo ao nosso atendimento.",
    },
    {
      ...defaultConnectionFields,
      id: "conn-2", name: "Suporte", phone: "+55 11 99999-0002", status: "connected",
      baseUrl: "http://localhost:8081",
      isDefault: true, queueRedirectMinutes: 5,
      messagesSent: 832, messagesReceived: 1204,
      updatedAt: "03/03/26 10:45",
    },
  ],
  addConnection: (conn) =>
    set((s) => ({ connections: [...s.connections, { ...conn, id: `conn-${Date.now()}` }] })),
  updateConnection: (id, data) =>
    set((s) => ({ connections: s.connections.map((c) => (c.id === id ? { ...c, ...data } : c)) })),
  removeConnection: (id) =>
    set((s) => ({ connections: s.connections.filter((c) => c.id !== id) })),
}));

export { defaultConnectionFields };
