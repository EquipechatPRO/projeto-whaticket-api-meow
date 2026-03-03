/**
 * API Service - Whatsmeow (Go backend)
 *
 * Endpoints baseados na API REST whatsmeow.
 * Altere USE_MOCK para false ao conectar ao backend real.
 */

import { useConnectionStore } from "@/stores/connection-store";

const USE_MOCK = true;

function getBaseUrl(): string {
  return useConnectionStore.getState().baseUrl;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (USE_MOCK) {
    return mockResponse<T>(endpoint, options);
  }

  const url = `${getBaseUrl()}${endpoint}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// ─── Session / QR Code ────────────────────────────────────
export const api = {
  // Gerar QR Code para conectar sessão
  getQRCode: () => request<{ qrcode: string; status: string }>("/api/qrcode"),

  // Status da sessão
  getStatus: () =>
    request<{ connected: boolean; phone: string; name: string }>("/api/status"),

  // Desconectar sessão
  disconnect: () => request<{ success: boolean }>("/api/disconnect", { method: "POST" }),

  // Reconectar sessão
  reconnect: () => request<{ success: boolean }>("/api/reconnect", { method: "POST" }),

  // ─── Mensagens ────────────────────────────────────────────
  // Enviar mensagem de texto
  sendText: (jid: string, text: string) =>
    request<{ id: string }>("/api/send/text", {
      method: "POST",
      body: JSON.stringify({ jid, text }),
    }),

  // Enviar imagem
  sendImage: (jid: string, imageUrl: string, caption?: string) =>
    request<{ id: string }>("/api/send/image", {
      method: "POST",
      body: JSON.stringify({ jid, image_url: imageUrl, caption }),
    }),

  // Enviar documento
  sendDocument: (jid: string, documentUrl: string, filename: string) =>
    request<{ id: string }>("/api/send/document", {
      method: "POST",
      body: JSON.stringify({ jid, document_url: documentUrl, filename }),
    }),

  // Enviar áudio
  sendAudio: (jid: string, audioUrl: string) =>
    request<{ id: string }>("/api/send/audio", {
      method: "POST",
      body: JSON.stringify({ jid, audio_url: audioUrl }),
    }),

  // Enviar vídeo
  sendVideo: (jid: string, videoUrl: string, caption?: string) =>
    request<{ id: string }>("/api/send/video", {
      method: "POST",
      body: JSON.stringify({ jid, video_url: videoUrl, caption }),
    }),

  // Enviar localização
  sendLocation: (jid: string, lat: number, lng: number, name?: string) =>
    request<{ id: string }>("/api/send/location", {
      method: "POST",
      body: JSON.stringify({ jid, latitude: lat, longitude: lng, name }),
    }),

  // Enviar contato (vCard)
  sendContact: (jid: string, contactJid: string) =>
    request<{ id: string }>("/api/send/contact", {
      method: "POST",
      body: JSON.stringify({ jid, contact_jid: contactJid }),
    }),

  // Enviar reação
  sendReaction: (jid: string, messageId: string, emoji: string) =>
    request<{ success: boolean }>("/api/send/reaction", {
      method: "POST",
      body: JSON.stringify({ jid, message_id: messageId, emoji }),
    }),

  // ─── Chats / Contatos ─────────────────────────────────────
  // Listar chats
  getChats: () => request<Chat[]>("/api/chats"),

  // Listar mensagens de um chat
  getMessages: (jid: string, limit?: number) =>
    request<Message[]>(`/api/messages/${encodeURIComponent(jid)}?limit=${limit || 50}`),

  // Listar contatos
  getContacts: () => request<Contact[]>("/api/contacts"),

  // Buscar info de contato
  getContactInfo: (jid: string) =>
    request<Contact>(`/api/contacts/${encodeURIComponent(jid)}`),

  // Verificar se número existe no WhatsApp
  checkNumber: (phone: string) =>
    request<{ exists: boolean; jid: string }>("/api/check-number", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),

  // ─── Grupos ───────────────────────────────────────────────
  getGroups: () => request<Group[]>("/api/groups"),

  getGroupInfo: (jid: string) =>
    request<Group>(`/api/groups/${encodeURIComponent(jid)}`),

  // ─── Webhooks ─────────────────────────────────────────────
  setWebhook: (url: string, events: string[]) =>
    request<{ success: boolean }>("/api/webhook", {
      method: "POST",
      body: JSON.stringify({ url, events }),
    }),

  getWebhook: () =>
    request<{ url: string; events: string[] }>("/api/webhook"),

  // ─── Perfil ───────────────────────────────────────────────
  getProfilePic: (jid: string) =>
    request<{ url: string }>(`/api/profile-pic/${encodeURIComponent(jid)}`),

  setProfilePic: (imageUrl: string) =>
    request<{ success: boolean }>("/api/profile-pic", {
      method: "PUT",
      body: JSON.stringify({ image_url: imageUrl }),
    }),

  setStatus: (status: string) =>
    request<{ success: boolean }>("/api/profile-status", {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),

  // ─── Presença ─────────────────────────────────────────────
  setPresence: (jid: string, presence: "composing" | "paused" | "available" | "unavailable") =>
    request<{ success: boolean }>("/api/presence", {
      method: "POST",
      body: JSON.stringify({ jid, presence }),
    }),

  // ─── Mensagens: ações ─────────────────────────────────────
  markRead: (jid: string, messageIds: string[]) =>
    request<{ success: boolean }>("/api/mark-read", {
      method: "POST",
      body: JSON.stringify({ jid, message_ids: messageIds }),
    }),

  deleteMessage: (jid: string, messageId: string) =>
    request<{ success: boolean }>("/api/messages/delete", {
      method: "POST",
      body: JSON.stringify({ jid, message_id: messageId }),
    }),

  // ─── Newsletter / Canais ──────────────────────────────────
  getNewsletters: () => request<any[]>("/api/newsletters"),
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
  status?: "attending" | "waiting" | "closed";
  assignedTo?: string;
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

export interface Group {
  jid: string;
  name: string;
  description: string;
  participants: { jid: string; isAdmin: boolean }[];
  avatar?: string;
}

// ─── Mock Data ──────────────────────────────────────────────
const MOCK_CHATS: Chat[] = [
  {
    jid: "5511999887766@s.whatsapp.net",
    name: "Maria Silva",
    lastMessage: "Olá, preciso de ajuda com meu pedido",
    lastMessageTime: new Date(Date.now() - 120000).toISOString(),
    unreadCount: 3,
    isGroup: false,
    tags: ["SUPORTE", "URGENTE"],
    status: "attending",
    assignedTo: "João",
  },
  {
    jid: "5511988776655@s.whatsapp.net",
    name: "Carlos Oliveira",
    lastMessage: "Qual o prazo de entrega?",
    lastMessageTime: new Date(Date.now() - 300000).toISOString(),
    unreadCount: 1,
    isGroup: false,
    tags: ["VENDAS"],
    status: "waiting",
  },
  {
    jid: "5511977665544@s.whatsapp.net",
    name: "Ana Costa",
    lastMessage: "Obrigada pelo atendimento!",
    lastMessageTime: new Date(Date.now() - 600000).toISOString(),
    unreadCount: 0,
    isGroup: false,
    tags: ["FINALIZADO"],
    status: "attending",
    assignedTo: "Maria",
  },
  {
    jid: "5511966554433@s.whatsapp.net",
    name: "Pedro Santos",
    lastMessage: "Vocês trabalham com atacado?",
    lastMessageTime: new Date(Date.now() - 900000).toISOString(),
    unreadCount: 2,
    isGroup: false,
    tags: ["VENDAS", "ATACADO"],
    status: "waiting",
  },
  {
    jid: "120363041234567890@g.us",
    name: "Equipe Vendas",
    lastMessage: "Reunião às 15h",
    lastMessageTime: new Date(Date.now() - 1800000).toISOString(),
    unreadCount: 5,
    isGroup: true,
    tags: ["INTERNO"],
    status: "attending",
  },
];

const MOCK_MESSAGES: Message[] = [
  {
    id: "msg1",
    jid: "5511999887766@s.whatsapp.net",
    fromMe: false,
    text: "Olá, preciso de ajuda com meu pedido #4521",
    timestamp: new Date(Date.now() - 300000).toISOString(),
    type: "text",
    senderName: "Maria Silva",
  },
  {
    id: "msg2",
    jid: "5511999887766@s.whatsapp.net",
    fromMe: true,
    text: "Olá Maria! Claro, vou verificar o status do seu pedido.",
    timestamp: new Date(Date.now() - 240000).toISOString(),
    type: "text",
  },
  {
    id: "msg3",
    jid: "5511999887766@s.whatsapp.net",
    fromMe: false,
    text: "O pedido era para chegar ontem mas ainda não recebi",
    timestamp: new Date(Date.now() - 180000).toISOString(),
    type: "text",
    senderName: "Maria Silva",
  },
  {
    id: "msg4",
    jid: "5511999887766@s.whatsapp.net",
    fromMe: true,
    text: "Entendo sua preocupação. Vou rastrear agora mesmo. Um momento, por favor.",
    timestamp: new Date(Date.now() - 120000).toISOString(),
    type: "text",
  },
];

async function mockResponse<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  await new Promise((r) => setTimeout(r, 300));

  if (endpoint === "/api/qrcode") {
    return { qrcode: "MOCK_QR_DATA_" + Date.now(), status: "waiting_scan" } as T;
  }
  if (endpoint === "/api/status") {
    return { connected: true, phone: "+55 11 99988-7766", name: "Empresa XYZ" } as T;
  }
  if (endpoint === "/api/chats") {
    return MOCK_CHATS as T;
  }
  if (endpoint.startsWith("/api/messages/")) {
    return MOCK_MESSAGES as T;
  }
  if (endpoint === "/api/contacts") {
    return MOCK_CHATS.filter((c) => !c.isGroup).map((c) => ({
      jid: c.jid,
      name: c.name,
      pushName: c.name,
      phone: c.jid.replace("@s.whatsapp.net", ""),
    })) as T;
  }
  if (endpoint === "/api/groups") {
    return MOCK_CHATS.filter((c) => c.isGroup).map((c) => ({
      jid: c.jid,
      name: c.name,
      description: "Grupo de trabalho",
      participants: [],
    })) as T;
  }
  if (endpoint.includes("/api/send/")) {
    return { id: "mock_msg_" + Date.now() } as T;
  }
  if (endpoint === "/api/disconnect" || endpoint === "/api/reconnect") {
    return { success: true } as T;
  }
  if (endpoint === "/api/webhook") {
    if (options.method === "POST") return { success: true } as T;
    return { url: "", events: [] } as T;
  }
  if (endpoint === "/api/check-number") {
    return { exists: true, jid: "mock@s.whatsapp.net" } as T;
  }

  return {} as T;
}

export default api;
