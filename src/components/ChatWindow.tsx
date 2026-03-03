import { useState, useRef, useEffect } from "react";
import { Chat, Message, api } from "@/services/api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Volume2,
  RotateCcw,
  Pause,
  CheckCircle,
  ArrowLeftRight,
  Trash2,
  Search,
  X,
  Info,
  ChevronLeft,
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

  const chatId = chat.jid.replace("@s.whatsapp.net", "").replace("@g.us", "").slice(-5);

  // Group messages by date
  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  messages.forEach((msg) => {
    const date = format(new Date(msg.timestamp), "dd/MM/yyyy");
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === date) {
      last.msgs.push(msg);
    } else {
      groupedMessages.push({ date, msgs: [msg] });
    }
  });

  const actionButtons = [
    { label: "RETORNAR", icon: RotateCcw, variant: "bg-foreground/10 text-foreground hover:bg-foreground/20" },
    { label: "PAUSAR", icon: Pause, variant: "bg-warning/10 text-warning hover:bg-warning/20" },
    { label: "FINALIZAR", icon: CheckCircle, variant: "bg-destructive/10 text-destructive hover:bg-destructive/20" },
    { label: "TRANSFERIR", icon: ArrowLeftRight, variant: "bg-info/10 text-info hover:bg-info/20" },
    { label: "EXCLUIR", icon: Trash2, variant: "bg-destructive text-destructive-foreground hover:bg-destructive/90" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground">
              <Info className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              <span className="text-sm font-semibold text-muted-foreground">
                {chat.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">
                {chat.name} - 00001 #{chatId}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Atribuído à: {chat.assignedTo || chat.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground">
              <Volume2 className="w-4 h-4" />
            </button>
            {actionButtons.map((btn) => (
              <button
                key={btn.label}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold transition-colors",
                  btn.variant
                )}
              >
                <btn.icon className="w-3 h-3" />
                {btn.label}
              </button>
            ))}
            <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground">
              <Search className="w-4 h-4" />
            </button>
            <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tags */}
        {chat.tags && chat.tags.length > 0 && (
          <div className="flex gap-1.5 mt-2 ml-[72px]">
            {chat.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold flex items-center gap-1"
              >
                {tag}
                <X className="w-2.5 h-2.5 cursor-pointer hover:text-destructive" />
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-chat-bg scrollbar-thin">
        {groupedMessages.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex items-center justify-center my-3">
              <span className="text-[11px] bg-card text-muted-foreground px-3 py-1 rounded-md shadow-sm font-medium">
                {group.date}
              </span>
            </div>
            {group.msgs.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex mb-1", msg.fromMe ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[65%] px-3 py-2 rounded-lg text-sm shadow-sm relative",
                    msg.fromMe
                      ? "bg-chat-sent text-foreground rounded-tr-none"
                      : "bg-chat-received text-foreground rounded-tl-none"
                  )}
                >
                  {!msg.fromMe && msg.senderName && (
                    <p className="text-[11px] font-semibold text-primary mb-0.5">
                      {msg.senderName}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">{msg.text}</p>
                  <div className={cn("flex items-center gap-1 mt-1", msg.fromMe ? "justify-end" : "justify-start")}>
                    <span className="text-[10px] text-foreground/50">
                      {format(new Date(msg.timestamp), "HH:mm")}
                    </span>
                    {msg.fromMe && (
                      <span className="text-info text-[10px]">✓✓</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
