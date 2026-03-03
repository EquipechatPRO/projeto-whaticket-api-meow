import { useState } from "react";
import { Chat } from "@/services/api";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare, X, ArrowLeftRight } from "lucide-react";

interface Props {
  chats: Chat[];
  selectedJid: string | null;
  onSelect: (jid: string) => void;
}

export default function ConversationList({ chats, selectedJid, onSelect }: Props) {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {chats.map((chat) => (
        <button
          key={chat.jid}
          onClick={() => onSelect(chat.jid)}
          className={cn(
            "flex items-start gap-3 p-3 text-left hover:bg-accent/50 transition-colors border-b border-border",
            selectedJid === chat.jid && "bg-accent"
          )}
        >
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-whatsapp-light flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-primary">
              {chat.name.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm text-foreground truncate">
                {chat.name}
              </span>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">
                {formatDistanceToNow(new Date(chat.lastMessageTime), {
                  addSuffix: false,
                  locale: ptBR,
                })}
              </span>
            </div>

            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {chat.lastMessage}
            </p>

            {/* Tags */}
            {chat.tags && chat.tags.length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {chat.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium uppercase"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Unread badge + actions */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            {chat.unreadCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                {chat.unreadCount}
              </span>
            )}
            <div className="flex gap-0.5">
              <span
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground"
                title="Transferir"
                onClick={(e) => { e.stopPropagation(); }}
              >
                <ArrowLeftRight className="w-3 h-3" />
              </span>
              <span
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                title="Encerrar"
                onClick={(e) => { e.stopPropagation(); }}
              >
                <X className="w-3 h-3" />
              </span>
            </div>
          </div>
        </button>
      ))}

      {chats.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
          <MessageSquare className="w-10 h-10 mb-2 opacity-40" />
          <p className="text-sm">Nenhuma conversa</p>
        </div>
      )}
    </div>
  );
}
