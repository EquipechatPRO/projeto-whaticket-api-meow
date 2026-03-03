/**
 * API Service - Whatsmeow REST API
 * 
 * Conecta o frontend ao backend Go + whatsmeow.
 * Em modo mock (USE_MOCK=true), simula todas as respostas.
 */

import { useConnectionStore } from "@/stores/connection-store";

const USE_MOCK = true; // Mude para false ao conectar backend real

function getBaseUrl(): string {
  return useConnectionStore.getState().baseUrl;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (USE_MOCK) return mockResponse<T>(endpoint, options);

  const url = `${getBaseUrl()}${endpoint}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API Error: ${res.status} ${res.statusText}`);
  return res.json();
}

// ─── API ────────────────────────────────────────────────────
export const api = {
  // Sessão
  getQRCode: () => request<{ qrcode: string; status: string }>("/api/qrcode"),
  getStatus: () => request<{ connected: boolean; phone: string; name: string }>("/api/status"),
  disconnect: () => request<{ success: boolean }>("/api/disconnect", { method: "POST" }),
  reconnect: () => request<{ success: boolean }>("/api/reconnect", { method: "POST" }),

  // Mensagens
  sendText: (jid: string, text: string) =>
    request<{ id: string }>("/api/send/text", { method: "POST", body: JSON.stringify({ jid, text }) }),
  sendImage: (jid: string, imageUrl: string, caption?: string) =>
    request<{ id: string }>("/api/send/image", { method: "POST", body: JSON.stringify({ jid, image_url: imageUrl, caption }) }),
  sendDocument: (jid: string, documentUrl: string, filename: string) =>
    request<{ id: string }>("/api/send/document", { method: "POST", body: JSON.stringify({ jid, document_url: documentUrl, filename }) }),
  sendAudio: (jid: string, audioUrl: string) =>
    request<{ id: string }>("/api/send/audio", { method: "POST", body: JSON.stringify({ jid, audio_url: audioUrl }) }),
  sendVideo: (jid: string, videoUrl: string, caption?: string) =>
    request<{ id: string }>("/api/send/video", { method: "POST", body: JSON.stringify({ jid, video_url: videoUrl, caption }) }),
  sendLocation: (jid: string, lat: number, lng: number, name?: string) =>
    request<{ id: string }>("/api/send/location", { method: "POST", body: JSON.stringify({ jid, latitude: lat, longitude: lng, name }) }),
  sendContact: (jid: string, contactJid: string) =>
    request<{ id: string }>("/api/send/contact", { method: "POST", body: JSON.stringify({ jid, contact_jid: contactJid }) }),
  sendReaction: (jid: string, messageId: string, emoji: string) =>
    request<{ success: boolean }>("/api/send/reaction", { method: "POST", body: JSON.stringify({ jid, message_id: messageId, emoji }) }),

  // Chats / Contatos
  getChats: () => request<Chat[]>("/api/chats"),
  getMessages: (jid: string, limit?: number) =>
    request<Message[]>(`/api/messages/${encodeURIComponent(jid)}?limit=${limit || 50}`),
  getContacts: () => request<Contact[]>("/api/contacts"),
  getContactInfo: (jid: string) => request<Contact>(`/api/contacts/${encodeURIComponent(jid)}`),
  checkNumber: (phone: string) =>
    request<{ exists: boolean; jid: string }>("/api/check-number", { method: "POST", body: JSON.stringify({ phone }) }),

  // Grupos
  getGroups: () => request<Group[]>("/api/groups"),
  getGroupInfo: (jid: string) => request<Group>(`/api/groups/${encodeURIComponent(jid)}`),

  // Webhooks
  setWebhook: (url: string, events: string[]) =>
    request<{ success: boolean }>("/api/webhook", { method: "POST", body: JSON.stringify({ url, events }) }),
  getWebhook: () => request<{ url: string; events: string[] }>("/api/webhook"),

  // Perfil / Presença
  getProfilePic: (jid: string) => request<{ url: string }>(`/api/profile-pic/${encodeURIComponent(jid)}`),
  setPresence: (jid: string, presence: "composing" | "paused" | "available" | "unavailable") =>
    request<{ success: boolean }>("/api/presence", { method: "POST", body: JSON.stringify({ jid, presence }) }),
  markRead: (jid: string, messageIds: string[]) =>
    request<{ success: boolean }>("/api/mark-read", { method: "POST", body: JSON.stringify({ jid, message_ids: messageIds }) }),
  deleteMessage: (jid: string, messageId: string) =>
    request<{ success: boolean }>("/api/messages/delete", { method: "POST", body: JSON.stringify({ jid, message_id: messageId }) }),

  // Estatísticas
  getStats: () => request<DashboardStats>("/api/stats"),

  // Filas de atendimento (gerenciado no frontend)
  transferChat: (jid: string, toUser: string) =>
    request<{ success: boolean }>("/api/transfer", { method: "POST", body: JSON.stringify({ jid, to_user: toUser }) }),
  closeChat: (jid: string) =>
    request<{ success: boolean }>("/api/close", { method: "POST", body: JSON.stringify({ jid }) }),
};

// ─── Types ──────────────────────────────────────────────────
export interface Chat {
  jid: string;
  name: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isGroup: boolean;
  avatar?: string;
  tags?: string[];
  status?: "attending" | "waiting" | "closed" | "paused" | "resolved";
  assignedTo?: string;
  queue?: string;
}

export interface Message {
  id: string;
  jid: string;
  fromMe: boolean;
  text: string;
  timestamp: string;
  type: "text" | "image" | "audio" | "video" | "document" | "location" | "contact" | "sticker";
  mediaUrl?: string;
  caption?: string;
  quotedMessage?: { id: string; text: string };
  senderName?: string;
}

export interface Contact {
  jid: string;
  name: string;
  pushName: string;
  phone: string;
  avatar?: string;
}

export interface DashboardStats {
  totalMessages: number;
  sentToday: number;
  receivedToday: number;
  sentWeek: number;
  receivedWeek: number;
  totalChats: number;
  totalGroups: number;
  avgResponseTimeMs: number;
  avgResponseTime: string;
  hourlyVolume: { hour: string; enviadas: number; recebidas: number }[];
  dailyVolume: { date: string; day: string; enviadas: number; recebidas: number; total: number }[];
  responseSamples: number;
  timestamp: string;
}

export interface Group {
  jid: string;
  name: string;
  description: string;
  participants: { jid: string; isAdmin: boolean }[];
  avatar?: string;
}

// ─── Mock Data ──────────────────────────────────────────────
const MOCK_CHATS: Chat[] = [
  { jid: "5511999887766@s.whatsapp.net", name: "Maria Silva", lastMessage: "Olá, preciso de ajuda com meu pedido", lastMessageTime: new Date(Date.now() - 120000).toISOString(), unreadCount: 3, isGroup: false, tags: ["SUPORTE"], status: "attending", assignedTo: "João", queue: "Suporte" },
  { jid: "5511988776655@s.whatsapp.net", name: "Carlos Oliveira", lastMessage: "Qual o prazo de entrega?", lastMessageTime: new Date(Date.now() - 300000).toISOString(), unreadCount: 1, isGroup: false, tags: ["VENDAS"], status: "waiting", queue: "Vendas" },
  { jid: "5511977665544@s.whatsapp.net", name: "Ana Costa", lastMessage: "Obrigada pelo atendimento!", lastMessageTime: new Date(Date.now() - 600000).toISOString(), unreadCount: 0, isGroup: false, status: "attending", assignedTo: "Maria", queue: "Suporte" },
  { jid: "5511966554433@s.whatsapp.net", name: "Pedro Santos", lastMessage: "Vocês trabalham com atacado?", lastMessageTime: new Date(Date.now() - 900000).toISOString(), unreadCount: 2, isGroup: false, tags: ["ATACADO"], status: "waiting", queue: "Vendas" },
  { jid: "5511955443322@s.whatsapp.net", name: "Juliana Lima", lastMessage: "Meu produto chegou com defeito", lastMessageTime: new Date(Date.now() - 1200000).toISOString(), unreadCount: 4, isGroup: false, tags: ["URGENTE"], status: "waiting", queue: "Suporte" },
  { jid: "120363041234567890@g.us", name: "Equipe Vendas", lastMessage: "Reunião às 15h", lastMessageTime: new Date(Date.now() - 1800000).toISOString(), unreadCount: 5, isGroup: true },
  { jid: "120363041234567891@g.us", name: "Suporte Técnico", lastMessage: "Caso #4521 resolvido", lastMessageTime: new Date(Date.now() - 3600000).toISOString(), unreadCount: 0, isGroup: true },
];

const MOCK_MESSAGES: Message[] = [
  { id: "msg1", jid: "5511999887766@s.whatsapp.net", fromMe: false, text: "Olá, preciso de ajuda com meu pedido #4521", timestamp: new Date(Date.now() - 300000).toISOString(), type: "text", senderName: "Maria Silva" },
  { id: "msg2", jid: "5511999887766@s.whatsapp.net", fromMe: true, text: "Olá Maria! Claro, vou verificar o status do seu pedido.", timestamp: new Date(Date.now() - 240000).toISOString(), type: "text" },
  { id: "msg3", jid: "5511999887766@s.whatsapp.net", fromMe: false, text: "O pedido era para chegar ontem mas ainda não recebi", timestamp: new Date(Date.now() - 180000).toISOString(), type: "text", senderName: "Maria Silva" },
  { id: "msg4", jid: "5511999887766@s.whatsapp.net", fromMe: true, text: "Entendo sua preocupação. Vou rastrear agora mesmo. Um momento, por favor.", timestamp: new Date(Date.now() - 120000).toISOString(), type: "text" },
  { id: "msg5", jid: "5511999887766@s.whatsapp.net", fromMe: true, text: "Encontrei! Seu pedido está com a transportadora e será entregue hoje até as 18h.", timestamp: new Date(Date.now() - 60000).toISOString(), type: "text" },
];

async function mockResponse<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  await new Promise((r) => setTimeout(r, 200));
  if (endpoint === "/api/qrcode") return { qrcode: "MOCK_QR_" + Date.now(), status: "waiting_scan" } as T;
  if (endpoint === "/api/status") return { connected: true, phone: "+55 11 99988-7766", name: "Empresa XYZ" } as T;
  if (endpoint === "/api/chats") return MOCK_CHATS as T;
  if (endpoint.startsWith("/api/messages/")) return MOCK_MESSAGES as T;
  if (endpoint === "/api/contacts") return MOCK_CHATS.filter(c => !c.isGroup).map(c => ({ jid: c.jid, name: c.name, pushName: c.name, phone: c.jid.replace("@s.whatsapp.net", "") })) as T;
  if (endpoint === "/api/groups") return MOCK_CHATS.filter(c => c.isGroup).map(c => ({ jid: c.jid, name: c.name, description: "Grupo de trabalho", participants: [] })) as T;
  if (endpoint.includes("/api/send/")) return { id: "mock_" + Date.now() } as T;
  if (endpoint === "/api/disconnect" || endpoint === "/api/reconnect") return { success: true } as T;
  if (endpoint === "/api/transfer" || endpoint === "/api/close") return { success: true } as T;
  if (endpoint === "/api/webhook") return options.method === "POST" ? { success: true } as T : { url: "", events: [] } as T;
  if (endpoint === "/api/check-number") return { exists: true, jid: "mock@s.whatsapp.net" } as T;
  return {} as T;
}

export default api;
