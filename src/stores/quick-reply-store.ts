import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface QuickReply {
  id: string;
  shortcut: string;
  title: string;
  text: string;
  category: string;
}

const DEFAULT_REPLIES: QuickReply[] = [
  { id: "1", shortcut: "ola", title: "Saudação", text: "Olá! 👋 Seja bem-vindo(a)! Como posso ajudá-lo(a) hoje?", category: "Geral" },
  { id: "2", shortcut: "aguarde", title: "Aguardar", text: "Por favor, aguarde um momento enquanto verifico essa informação para você.", category: "Geral" },
  { id: "3", shortcut: "obrigado", title: "Agradecimento", text: "Agradecemos o seu contato! Se precisar de algo mais, estamos à disposição. 😊", category: "Geral" },
  { id: "4", shortcut: "horario", title: "Horário", text: "Nosso horário de atendimento é de segunda a sexta, das 8h às 18h.", category: "Informações" },
  { id: "5", shortcut: "prazo", title: "Prazo entrega", text: "O prazo de entrega é de 3 a 7 dias úteis após a confirmação do pagamento.", category: "Vendas" },
  { id: "6", shortcut: "pix", title: "Dados PIX", text: "Segue nossa chave PIX para pagamento:\n📧 pagamentos@empresa.com\nApós o pagamento, envie o comprovante aqui neste chat.", category: "Vendas" },
  { id: "7", shortcut: "encerrar", title: "Encerramento", text: "Foi um prazer atendê-lo(a)! Caso precise de mais alguma coisa, não hesite em nos procurar. Tenha um ótimo dia! 🙏", category: "Geral" },
  { id: "8", shortcut: "transferir", title: "Transferência", text: "Vou transferir seu atendimento para o setor responsável. Em instantes você será atendido(a).", category: "Geral" },
];

interface QuickReplyStore {
  replies: QuickReply[];
  addReply: (reply: Omit<QuickReply, "id">) => void;
  updateReply: (id: string, data: Partial<Omit<QuickReply, "id">>) => void;
  deleteReply: (id: string) => void;
  getCategories: () => string[];
}

export const useQuickReplyStore = create<QuickReplyStore>()(
  persist(
    (set, get) => ({
      replies: DEFAULT_REPLIES,
      addReply: (reply) =>
        set((s) => ({
          replies: [...s.replies, { ...reply, id: crypto.randomUUID() }],
        })),
      updateReply: (id, data) =>
        set((s) => ({
          replies: s.replies.map((r) => (r.id === id ? { ...r, ...data } : r)),
        })),
      deleteReply: (id) =>
        set((s) => ({ replies: s.replies.filter((r) => r.id !== id) })),
      getCategories: () => [...new Set(get().replies.map((r) => r.category))],
    }),
    { name: "quick-replies-storage" }
  )
);
