import { useState, useEffect, useRef } from "react";
import { Chat, api } from "@/services/api";
import { cn } from "@/lib/utils";
import {
  X,
  Phone,
  Mail,
  MapPin,
  Tag,
  MessageSquare,
  Clock,
  User,
  Shield,
  Edit3,
  Copy,
  ExternalLink,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  chat: Chat;
  open: boolean;
  onClose: () => void;
}

export default function ContactPanel({ chat, open, onClose }: Props) {
  const [notes, setNotes] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [profilePic, setProfilePic] = useState("");

  const phone = chat.jid.replace("@s.whatsapp.net", "").replace("@g.us", "");

  useEffect(() => {
    if (open && !chat.isGroup) {
      api.getProfilePic(chat.jid).then((res) => {
        if (res.url) setProfilePic(res.url);
      }).catch(() => {});
    }
  }, [open, chat.jid, chat.isGroup]);

  const copyPhone = () => {
    navigator.clipboard.writeText(phone);
    toast.success("Número copiado!");
  };

  if (!open) return null;

  const infoItems = [
    { icon: Phone, label: "Telefone", value: `+${phone}`, action: copyPhone, actionIcon: Copy },
    { icon: MessageSquare, label: "Fila", value: chat.queue || "Geral" },
    { icon: User, label: "Atendente", value: chat.assignedTo || "Não atribuído" },
    { icon: Shield, label: "Status", value: chat.status === "attending" ? "Em atendimento" : chat.status === "waiting" ? "Aguardando" : chat.status === "paused" ? "Pausado" : chat.status === "resolved" ? "Resolvido" : "Fechado" },
    { icon: CalendarDays, label: "Última msg", value: chat.lastMessageTime ? new Date(chat.lastMessageTime).toLocaleString("pt-BR") : "—" },
  ];

  return (
    <div className="w-[320px] border-l border-border bg-card flex flex-col h-full shrink-0 animate-in slide-in-from-right-5 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-bold text-sm text-foreground">Detalhes do Contato</h3>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Avatar & Name */}
        <div className="flex flex-col items-center py-6 px-4 border-b border-border">
          {profilePic ? (
            <img
              src={profilePic}
              alt={chat.name}
              className="w-20 h-20 rounded-full object-cover mb-3 ring-2 ring-primary/20"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-3 ring-2 ring-primary/20">
              <span className="text-2xl font-bold text-primary">
                {chat.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <h4 className="font-bold text-foreground text-base">{chat.name}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">+{phone}</p>
          {chat.isGroup && (
            <span className="mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-info/10 text-info">
              GRUPO
            </span>
          )}
        </div>

        {/* Info Items */}
        <div className="px-4 py-3 border-b border-border space-y-3">
          {infoItems.map((item) => (
            <div key={item.label} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {item.label}
                </p>
                <p className="text-xs text-foreground font-medium truncate">{item.value}</p>
              </div>
              {item.action && (
                <button
                  onClick={item.action}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground transition-colors mt-1"
                >
                  {item.actionIcon && <item.actionIcon className="w-3 h-3" />}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Tags */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3 h-3" />
              Tags
            </p>
            <button className="text-[10px] text-primary font-semibold hover:underline">
              + Adicionar
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {chat.tags && chat.tags.length > 0 ? (
              chat.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-bold flex items-center gap-1"
                >
                  {tag}
                  <X className="w-2.5 h-2.5 cursor-pointer hover:text-destructive" />
                </span>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma tag</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Edit3 className="w-3 h-3" />
              Anotações
            </p>
            <button
              onClick={() => setEditingNotes(!editingNotes)}
              className="text-[10px] text-primary font-semibold hover:underline"
            >
              {editingNotes ? "Salvar" : "Editar"}
            </button>
          </div>
          {editingNotes ? (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione notas sobre este contato..."
              rows={4}
              className="w-full bg-secondary rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring border border-border resize-none"
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              {notes || "Nenhuma anotação. Clique em Editar para adicionar."}
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-3 space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Ações Rápidas
          </p>
          <button
            onClick={() => window.open(`https://wa.me/${phone}`, "_blank")}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-accent text-sm text-foreground font-medium transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            Abrir no WhatsApp Web
          </button>
          <button
            onClick={copyPhone}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-accent text-sm text-foreground font-medium transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            Copiar Número
          </button>
        </div>
      </div>
    </div>
  );
}
