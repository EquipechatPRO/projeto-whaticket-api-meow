import { useState, useRef, useEffect } from "react";
import { Chat, Message, api } from "@/services/api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  chat: Chat;
  messages: Message[];
  onMessageSent: () => void;
}

export default function ChatWindow({ chat, messages, onMessageSent }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await api.sendText(chat.jid, text.trim());
      setText("");
      onMessageSent();
    } catch {
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-whatsapp-light flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {chat.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">{chat.name}</h3>
              <p className="text-xs text-muted-foreground">
                {chat.jid.replace("@s.whatsapp.net", "").replace("@g.us", "")}
                {chat.assignedTo && (
                  <span className="ml-2 text-primary">• Atribuído à: {chat.assignedTo}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground">
              <Phone className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tags */}
        {chat.tags && chat.tags.length > 0 && (
          <div className="flex gap-1 mt-2">
            {chat.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold uppercase"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-chat-bg">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex", msg.fromMe ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[70%] px-3 py-2 rounded-lg text-sm shadow-sm",
                msg.fromMe
                  ? "bg-chat-sent text-foreground rounded-br-none"
                  : "bg-chat-received text-foreground rounded-bl-none"
              )}
            >
              {!msg.fromMe && msg.senderName && (
                <p className="text-xs font-semibold text-primary mb-0.5">
                  {msg.senderName}
                </p>
              )}
              <p className="whitespace-pre-wrap break-words">{msg.text}</p>
              <p
                className={cn(
                  "text-[10px] mt-1",
                  msg.fromMe ? "text-right text-foreground/60" : "text-foreground/50"
                )}
              >
                {format(new Date(msg.timestamp), "HH:mm")}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground">
            <Paperclip className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground">
            <Smile className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Digite uma mensagem..."
            className="flex-1 bg-secondary rounded-lg px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
              text.trim()
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-secondary text-muted-foreground"
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
