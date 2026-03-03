import { useState, useRef, useEffect, useCallback } from "react";
import { Chat, Message, api } from "@/services/api";
import ContactPanel from "@/components/ContactPanel";
import { QuickReplyList, QuickReply } from "@/components/QuickReplies";
import ContactPickerModal from "@/components/modals/ContactPickerModal";
import LocationModal from "@/components/modals/LocationModal";
import PollModal from "@/components/modals/PollModal";
import EventModal from "@/components/modals/EventModal";
import PaymentModal from "@/components/modals/PaymentModal";
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
  AlertTriangle,
  Image,
  Mic,
  MicOff,
  FileAudio,
  FileText,
  Play,
  PauseCircle,
  Download,
  Camera,
  Video,
  Contact,
  BarChart3,
  CalendarDays,
  Sticker,
  Zap,
  DollarSign,
  CreditCard,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  chat: Chat;
  messages: Message[];
  onMessageSent: () => void;
  onReturn?: (jid: string) => void;
  onPause?: (jid: string) => void;
  onFinish?: (jid: string) => void;
  onTransfer?: (jid: string) => void;
  onDelete?: (jid: string) => void;
  onBack?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

type ConfirmAction = "return" | "pause" | "finish" | "transfer" | "delete" | null;

export default function ChatWindow({
  chat,
  messages,
  onMessageSent,
  onReturn,
  onPause,
  onFinish,
  onTransfer,
  onDelete,
  onBack,
  hasMore,
  loadingMore,
  onLoadMore,
}: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [transferTo, setTransferTo] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showContactPanel, setShowContactPanel] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);
  const [imageCaption, setImageCaption] = useState("");
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplyFilter, setQuickReplyFilter] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval>>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [docPreview, setDocPreview] = useState<{ file: File; name: string } | null>(null);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [stickerInputRef] = useState(() => ({ current: null as HTMLInputElement | null }));
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLenRef = useRef(0);

  // Scroll to bottom only on new messages (not when loading older)
  useEffect(() => {
    if (messages.length > prevMessagesLenRef.current) {
      const addedAtTop = prevMessagesLenRef.current > 0 && messages.length - prevMessagesLenRef.current > 1;
      if (!addedAtTop) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
    prevMessagesLenRef.current = messages.length;
  }, [messages]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!hasMore || !onLoadMore) return;
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          onLoadMore();
        }
      },
      { root: scrollContainerRef.current, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      clearInterval(recordingTimerRef.current);
      mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    if (file.size > 16 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 16MB");
      return;
    }
    setImagePreview({ file, url: URL.createObjectURL(file) });
    setShowAttachMenu(false);
  };

  const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) {
      toast.error("Documento deve ter no máximo 16MB");
      return;
    }
    setDocPreview({ file, name: file.name });
    setShowAttachMenu(false);
  };

  const handleSendDoc = async () => {
    if (!docPreview) return;
    setSending(true);
    try {
      const fakeUrl = URL.createObjectURL(docPreview.file);
      await api.sendDocument(chat.jid, fakeUrl, docPreview.name);
      setDocPreview(null);
      onMessageSent();
      toast.success("Documento enviado");
    } catch {
      toast.error("Erro ao enviar documento");
    } finally {
      setSending(false);
    }
  };

  const handleSendImage = async () => {
    if (!imagePreview) return;
    setSending(true);
    try {
      // In real implementation, upload file first then send URL
      const fakeUrl = URL.createObjectURL(imagePreview.file);
      await api.sendImage(chat.jid, fakeUrl, imageCaption || undefined);
      setImagePreview(null);
      setImageCaption("");
      onMessageSent();
      toast.success("Imagem enviada");
    } catch {
      toast.error("Erro ao enviar imagem");
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(recordingTimerRef.current);
        setRecordingTime(0);

        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size < 500) return; // too short

        setSending(true);
        try {
          const fakeUrl = URL.createObjectURL(blob);
          await api.sendAudio(chat.jid, fakeUrl);
          onMessageSent();
          toast.success("Áudio enviado");
        } catch {
          toast.error("Erro ao enviar áudio");
        } finally {
          setSending(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch {
      toast.error("Não foi possível acessar o microfone");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const cancelRecording = () => {
    mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current = null;
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
  };

  const formatRecTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const executeAction = async () => {
    setActionLoading(true);
    try {
      switch (confirmAction) {
        case "return":
          onReturn?.(chat.jid);
          toast.success(`Atendimento de ${chat.name} retornado à fila`);
          break;
        case "pause":
          onPause?.(chat.jid);
          toast.success(`Atendimento de ${chat.name} pausado`);
          break;
        case "finish":
          onFinish?.(chat.jid);
          toast.success(`Atendimento de ${chat.name} finalizado`);
          break;
        case "transfer":
          if (!transferTo.trim()) {
            toast.error("Selecione para quem transferir");
            setActionLoading(false);
            return;
          }
          onTransfer?.(chat.jid);
          toast.success(`Atendimento transferido para ${transferTo}`);
          break;
        case "delete":
          onDelete?.(chat.jid);
          toast.success(`Atendimento de ${chat.name} excluído`);
          break;
      }
    } catch {
      toast.error("Erro ao executar ação");
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
      setTransferTo("");
    }
  };

  const chatId = chat.jid.replace("@s.whatsapp.net", "").replace("@g.us", "").slice(-5);

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

  const actionConfigs: Record<string, { action: ConfirmAction; title: string; desc: string; color: string }> = {
    RETORNAR: { action: "return", title: "Retornar à fila", desc: `Deseja retornar o atendimento de "${chat.name}" para a fila de espera?`, color: "bg-foreground/10" },
    PAUSAR: { action: "pause", title: "Pausar atendimento", desc: `Deseja pausar o atendimento de "${chat.name}"? O contato será movido para a aba Pausados.`, color: "bg-warning/10" },
    FINALIZAR: { action: "finish", title: "Finalizar atendimento", desc: `Deseja finalizar o atendimento de "${chat.name}"? O contato será movido para Resolvidos.`, color: "bg-destructive/10" },
    TRANSFERIR: { action: "transfer", title: "Transferir atendimento", desc: `Selecione o atendente ou fila para transferir o atendimento de "${chat.name}".`, color: "bg-info/10" },
    EXCLUIR: { action: "delete", title: "Excluir atendimento", desc: `Tem certeza que deseja EXCLUIR o atendimento de "${chat.name}"? Esta ação não pode ser desfeita.`, color: "bg-destructive" },
  };

  const actionButtons = [
    { label: "RETORNAR", icon: RotateCcw, variant: "bg-foreground/10 text-foreground hover:bg-foreground/20" },
    { label: "PAUSAR", icon: Pause, variant: "bg-warning/10 text-warning hover:bg-warning/20" },
    { label: "FINALIZAR", icon: CheckCircle, variant: "bg-destructive/10 text-destructive hover:bg-destructive/20" },
    { label: "TRANSFERIR", icon: ArrowLeftRight, variant: "bg-info/10 text-info hover:bg-info/20" },
    { label: "EXCLUIR", icon: Trash2, variant: "bg-destructive text-destructive-foreground hover:bg-destructive/90" },
  ];

  return (
    <div className="flex h-full">
    <div className="flex flex-col flex-1 min-w-0 relative">
      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", 
                confirmAction === "delete" ? "bg-destructive/20" : "bg-warning/20"
              )}>
                <AlertTriangle className={cn("w-5 h-5", 
                  confirmAction === "delete" ? "text-destructive" : "text-warning"
                )} />
              </div>
              <h3 className="font-bold text-foreground text-base">
                {actionConfigs[confirmAction === "return" ? "RETORNAR" : confirmAction === "pause" ? "PAUSAR" : confirmAction === "finish" ? "FINALIZAR" : confirmAction === "transfer" ? "TRANSFERIR" : "EXCLUIR"]?.title}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              {actionConfigs[confirmAction === "return" ? "RETORNAR" : confirmAction === "pause" ? "PAUSAR" : confirmAction === "finish" ? "FINALIZAR" : confirmAction === "transfer" ? "TRANSFERIR" : "EXCLUIR"]?.desc}
            </p>

            {confirmAction === "transfer" && (
              <select
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground mb-4 outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Selecione...</option>
                <option value="Atendente 1">Atendente 1</option>
                <option value="Atendente 2">Atendente 2</option>
                <option value="Fila Suporte">Fila Suporte</option>
                <option value="Fila Vendas">Fila Vendas</option>
              </select>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setConfirmAction(null); setTransferTo(""); }}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={executeAction}
                disabled={actionLoading}
                className={cn(
                  "px-4 py-2 text-sm font-bold rounded-lg transition-colors",
                  confirmAction === "delete"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                  actionLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                {actionLoading ? "Processando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowContactPanel(!showContactPanel)}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded hover:bg-accent transition-colors",
                showContactPanel ? "text-primary bg-primary/10" : "text-muted-foreground"
              )}
            >
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
                onClick={() => setConfirmAction(actionConfigs[btn.label].action)}
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
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-1 bg-chat-bg scrollbar-thin">
        {/* Sentinel for infinite scroll */}
        <div ref={topSentinelRef} className="h-1" />
        {loadingMore && (
          <div className="flex justify-center py-3">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {groupedMessages.map((group) => (
          <div key={group.date}>
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
                    "max-w-[65%] rounded-lg text-sm shadow-sm relative overflow-hidden",
                    msg.fromMe
                      ? "bg-chat-sent text-foreground rounded-tr-none"
                      : "bg-chat-received text-foreground rounded-tl-none",
                    msg.type === "image" ? "p-1" : "px-3 py-2"
                  )}
                >
                  {!msg.fromMe && msg.senderName && (
                    <p className={cn("text-[11px] font-semibold text-primary mb-0.5", msg.type === "image" && "px-2 pt-1")}>
                      {msg.senderName}
                    </p>
                  )}

                  {/* Image message */}
                  {msg.type === "image" && msg.mediaUrl && (
                    <div className="mb-1">
                      <img
                        src={msg.mediaUrl}
                        alt="Imagem"
                        className="rounded-md max-h-[280px] w-full object-cover cursor-pointer"
                        onClick={() => window.open(msg.mediaUrl, "_blank")}
                      />
                      {msg.caption && (
                        <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed px-2 pt-1">{msg.caption}</p>
                      )}
                    </div>
                  )}

                  {/* Audio message */}
                  {msg.type === "audio" && msg.mediaUrl && (
                    <div className="flex items-center gap-2 min-w-[200px]">
                      <FileAudio className="w-4 h-4 text-primary shrink-0" />
                      <audio controls className="h-8 flex-1 [&::-webkit-media-controls-panel]:bg-transparent">
                        <source src={msg.mediaUrl} />
                      </audio>
                    </div>
                  )}

                  {/* Document message */}
                  {msg.type === "document" && msg.mediaUrl && (
                    <div
                      className="flex items-center gap-3 min-w-[200px] p-1 cursor-pointer hover:opacity-80"
                      onClick={() => window.open(msg.mediaUrl, "_blank")}
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{msg.caption || "Documento"}</p>
                        <p className="text-[10px] text-muted-foreground">Clique para abrir</p>
                      </div>
                      <Download className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  )}

                  {(msg.type === "text" || (!msg.type && !msg.mediaUrl)) && (
                    <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">{msg.text}</p>
                  )}

                  <div className={cn("flex items-center gap-1 mt-1", msg.fromMe ? "justify-end" : "justify-start", msg.type === "image" && "px-2 pb-1")}>
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

      {/* Image Preview */}
      {imagePreview && (
        <div className="border-t border-border bg-card px-4 py-3">
          <div className="relative inline-block">
            <img src={imagePreview.url} alt="Preview" className="max-h-[200px] rounded-lg object-contain" />
            <button
              onClick={() => { setImagePreview(null); setImageCaption(""); }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={imageCaption}
              onChange={(e) => setImageCaption(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendImage()}
              placeholder="Adicionar legenda..."
              className="flex-1 bg-secondary rounded-lg px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={handleSendImage}
              disabled={sending}
              className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Document Preview */}
      {docPreview && !imagePreview && (
        <div className="border-t border-border bg-card px-4 py-3">
          <div className="flex items-center gap-3 bg-secondary rounded-lg p-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{docPreview.name}</p>
              <p className="text-[11px] text-muted-foreground">{(docPreview.file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button
              onClick={() => setDocPreview(null)}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSendDoc}
              disabled={sending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Enviar documento
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      {!imagePreview && !docPreview && (
        <div className="border-t border-border bg-card px-4 py-3">
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleImageSelect} />
          <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar" className="hidden" onChange={handleDocSelect} />
          <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleImageSelect} />

          {isRecording ? (
            <div className="flex items-center gap-3">
              <button
                onClick={cancelRecording}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-destructive"
                title="Cancelar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="flex-1 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
                <span className="text-sm font-mono text-foreground">{formatRecTime(recordingTime)}</span>
                <span className="text-xs text-muted-foreground">Gravando áudio...</span>
              </div>
              <button
                onClick={stopRecording}
                className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                title="Enviar áudio"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 relative">
              <button
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors",
                  showAttachMenu ? "text-primary bg-primary/10" : "text-muted-foreground"
                )}
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Attach menu */}
              {showAttachMenu && (
                <div className="absolute bottom-12 left-0 bg-card border border-border rounded-xl shadow-xl p-1.5 z-10 w-[200px]">
                  <button
                    onClick={() => { setShowAttachMenu(false); docInputRef.current?.click(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    <FileText className="w-4 h-4 text-violet-500" />
                    Documento
                  </button>
                  <button
                    onClick={() => { setShowAttachMenu(false); fileInputRef.current?.click(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    <Image className="w-4 h-4 text-blue-500" />
                    Fotos e vídeos
                  </button>
                  <button
                    onClick={() => { setShowAttachMenu(false); videoInputRef.current?.click(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    <Camera className="w-4 h-4 text-pink-500" />
                    Câmera
                  </button>
                  <button
                    onClick={() => { setShowAttachMenu(false); startRecording(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    <Mic className="w-4 h-4 text-orange-500" />
                    Áudio
                  </button>
                  <button
                    onClick={() => { setShowAttachMenu(false); setShowContactPicker(true); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    <Contact className="w-4 h-4 text-sky-500" />
                    Contato
                  </button>
                  <button
                    onClick={() => { setShowAttachMenu(false); setShowPollModal(true); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    <BarChart3 className="w-4 h-4 text-green-500" />
                    Enquete
                  </button>
                  <button
                    onClick={() => { setShowAttachMenu(false); setShowEventModal(true); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    <CalendarDays className="w-4 h-4 text-amber-500" />
                    Evento
                  </button>
                  <button
                    onClick={() => {
                      setShowAttachMenu(false);
                      toast.info("Envie uma imagem para converter em figurinha. Funcionalidade requer backend real.");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    <Sticker className="w-4 h-4 text-teal-500" />
                    Nova figurinha
                  </button>
                  <button
                    onClick={() => { setShowAttachMenu(false); setShowPixModal(true); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    Pix
                  </button>
                  <button
                    onClick={() => { setShowAttachMenu(false); setShowLocationModal(true); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-indigo-500" />
                    Localização
                  </button>
                  <button
                    onClick={() => {
                      setShowAttachMenu(false);
                      setText("/");
                      setShowQuickReplies(true);
                      setQuickReplyFilter("");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Resposta rápida
                  </button>
                  <button
                    onClick={() => { setShowAttachMenu(false); setShowChargeModal(true); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    <CreditCard className="w-4 h-4 text-rose-500" />
                    Cobrar
                  </button>
                </div>
              )}

              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground">
                <Smile className="w-4 h-4" />
              </button>
              <div className="flex-1 relative">
                {showQuickReplies && (
                  <QuickReplyList
                    filter={quickReplyFilter}
                    onSelect={(r: QuickReply) => {
                      setText(r.text);
                      setShowQuickReplies(false);
                      setQuickReplyFilter("");
                    }}
                    onClose={() => { setShowQuickReplies(false); setQuickReplyFilter(""); }}
                  />
                )}
                <input
                  type="text"
                  value={text}
                  onChange={(e) => {
                    const v = e.target.value;
                    setText(v);
                    if (v.startsWith("/")) {
                      setShowQuickReplies(true);
                      setQuickReplyFilter(v.slice(1));
                    } else {
                      setShowQuickReplies(false);
                      setQuickReplyFilter("");
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape" && showQuickReplies) {
                      setShowQuickReplies(false);
                      setQuickReplyFilter("");
                      return;
                    }
                    if (e.key === "Enter" && !e.shiftKey && !showQuickReplies) handleSend();
                  }}
                  placeholder="Digite / para respostas rápidas..."
                  className="w-full bg-secondary rounded-lg px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              {text.trim() ? (
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="w-10 h-10 rounded-lg flex items-center justify-center bg-secondary text-muted-foreground hover:bg-accent transition-colors"
                  title="Gravar áudio"
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>

      <ContactPanel
        chat={chat}
        open={showContactPanel}
        onClose={() => setShowContactPanel(false)}
      />

      <ContactPickerModal
        open={showContactPicker}
        onClose={() => setShowContactPicker(false)}
        onSend={async (contactJid, contactName) => {
          try {
            await api.sendContact(chat.jid, contactJid);
            onMessageSent();
            toast.success(`Contato "${contactName}" enviado`);
          } catch { toast.error("Erro ao enviar contato"); }
        }}
      />

      <LocationModal
        open={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSend={async (lat, lng, name) => {
          try {
            await api.sendLocation(chat.jid, lat, lng, name);
            onMessageSent();
            toast.success("Localização enviada");
          } catch { toast.error("Erro ao enviar localização"); }
        }}
      />

      <PollModal
        open={showPollModal}
        onClose={() => setShowPollModal(false)}
        onSend={async (question, options) => {
          try {
            await api.sendText(chat.jid, `📊 *Enquete: ${question}*\n\n${options.map((o, i) => `${i + 1}. ${o}`).join("\n")}\n\n_Responda com o número da opção_`);
            onMessageSent();
            toast.success("Enquete enviada");
          } catch { toast.error("Erro ao enviar enquete"); }
        }}
      />

      <EventModal
        open={showEventModal}
        onClose={() => setShowEventModal(false)}
        onSend={async (name, date, time, description) => {
          const msg = `📅 *Evento: ${name}*\n🗓️ Data: ${date}${time ? ` às ${time}` : ""}${description ? `\n📝 ${description}` : ""}`;
          try {
            await api.sendText(chat.jid, msg);
            onMessageSent();
            toast.success("Evento enviado");
          } catch { toast.error("Erro ao enviar evento"); }
        }}
      />

      <PaymentModal
        open={showPixModal}
        title="Enviar Pix"
        onClose={() => setShowPixModal(false)}
        onSend={async (amount, description, pixKey) => {
          const msg = `💰 *Pagamento via Pix*\n\n💵 Valor: R$ ${amount}${pixKey ? `\n🔑 Chave: ${pixKey}` : ""}${description ? `\n📝 ${description}` : ""}\n\n_Envie o comprovante após o pagamento_`;
          try {
            await api.sendText(chat.jid, msg);
            onMessageSent();
            toast.success("Dados Pix enviados");
          } catch { toast.error("Erro ao enviar Pix"); }
        }}
      />

      <PaymentModal
        open={showChargeModal}
        title="Criar Cobrança"
        onClose={() => setShowChargeModal(false)}
        onSend={async (amount, description) => {
          const msg = `💳 *Cobrança*\n\n💵 Valor: R$ ${amount}${description ? `\n📝 ${description}` : ""}\n\n_Aguardamos a confirmação do pagamento_`;
          try {
            await api.sendText(chat.jid, msg);
            onMessageSent();
            toast.success("Cobrança enviada");
          } catch { toast.error("Erro ao enviar cobrança"); }
        }}
      />
    </div>
  );
}
