import { useState } from "react";
import { api, Chat } from "@/services/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  X,
  Phone,
  User,
  MessageSquare,
  Tag,
  Search,
  Loader2,
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (chat: Chat) => void;
}

export default function NewChatModal({ open, onClose, onCreated }: Props) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [queue, setQueue] = useState("suporte");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [numberValid, setNumberValid] = useState<boolean | null>(null);
  const [resolvedJid, setResolvedJid] = useState("");

  if (!open) return null;

  const cleanPhone = phone.replace(/\D/g, "");

  const checkNumber = async () => {
    if (cleanPhone.length < 10) {
      toast.error("Digite um número válido com DDD");
      return;
    }
    setChecking(true);
    try {
      const res = await api.checkNumber(cleanPhone);
      setNumberValid(res.exists);
      if (res.exists) {
        setResolvedJid(res.jid);
        toast.success("Número encontrado no WhatsApp!");
      } else {
        toast.error("Número não encontrado no WhatsApp");
      }
    } catch {
      toast.error("Erro ao verificar número");
    } finally {
      setChecking(false);
    }
  };

  const handleCreate = async () => {
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error("Informe um número válido");
      return;
    }

    setLoading(true);
    try {
      const jid = resolvedJid || `${cleanPhone}@s.whatsapp.net`;

      // Send initial message if provided
      if (message.trim()) {
        await api.sendText(jid, message.trim());
      }

      const newChat: Chat = {
        jid,
        name: name.trim() || cleanPhone,
        lastMessage: message.trim() || "Novo atendimento",
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        isGroup: false,
        status: "attending",
        queue,
        tags: tags
          .split(",")
          .map((t) => t.trim().toUpperCase())
          .filter(Boolean),
        assignedTo: "Você",
      };

      onCreated(newChat);
      toast.success("Atendimento criado com sucesso!");
      resetForm();
      onClose();
    } catch {
      toast.error("Erro ao criar atendimento");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPhone("");
    setName("");
    setMessage("");
    setQueue("suporte");
    setTags("");
    setNumberValid(null);
    setResolvedJid("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground text-base">Novo Atendimento</h2>
          </div>
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Phone */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              Número do WhatsApp *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setNumberValid(null); }}
                placeholder="5511999887766"
                className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring border border-border"
              />
              <button
                onClick={checkNumber}
                disabled={checking || cleanPhone.length < 10}
                className={cn(
                  "px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5",
                  cleanPhone.length >= 10
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                )}
              >
                {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Verificar
              </button>
            </div>
            {numberValid !== null && (
              <p className={cn("text-[11px] mt-1 font-medium", numberValid ? "text-green-500" : "text-destructive")}>
                {numberValid ? "✓ Número válido no WhatsApp" : "✗ Número não encontrado"}
              </p>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Nome do contato
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do cliente (opcional)"
              className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring border border-border"
            />
          </div>

          {/* Queue */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Fila / Setor
            </label>
            <select
              value={queue}
              onChange={(e) => setQueue(e.target.value)}
              className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground border border-border outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="suporte">Suporte</option>
              <option value="vendas">Vendas</option>
              <option value="financeiro">Financeiro</option>
              <option value="geral">Geral</option>
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              Tags (separadas por vírgula)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="URGENTE, VIP, NOVO"
              className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring border border-border"
            />
            {tags && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {tags.split(",").map((t, i) => t.trim() && (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                    {t.trim().toUpperCase()}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Initial Message */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Mensagem inicial (opcional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Olá! Como posso ajudar?"
              rows={3}
              className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring border border-border resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border bg-muted/30">
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || cleanPhone.length < 10}
            className={cn(
              "px-5 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2",
              cleanPhone.length >= 10
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-secondary text-muted-foreground cursor-not-allowed",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Criar Atendimento
          </button>
        </div>
      </div>
    </div>
  );
}
