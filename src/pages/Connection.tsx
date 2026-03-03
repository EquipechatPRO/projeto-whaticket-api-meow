import { useState, useEffect, useRef } from "react";
import { useConnectionStore, defaultConnectionFields, type WhatsAppConnection } from "@/stores/connection-store";
import { useFlowStore } from "@/stores/flow-store";
import { api } from "@/services/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Wifi, WifiOff, QrCode, RefreshCw, Plus, X, Trash2, Edit2,
  Send, ArrowDownLeft, Copy, RotateCcw, Loader2, Webhook, Bot,
  MessageSquare, GitBranch, Clock,
} from "lucide-react";

const generateToken = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

type EditTab = "geral" | "integracoes" | "mensagens" | "chatbot" | "fluxo" | "horarios";

const WEBHOOK_EVENT_OPTIONS = [
  "message.received", "message.sent", "message.delivered", "message.read",
  "contact.created", "contact.updated", "chat.opened", "chat.closed",
  "group.joined", "group.left", "status.changed",
];

// ─── Toggle Component ───────────────────────────────────────
function Toggle({ enabled, onToggle, label }: { enabled: boolean; onToggle: () => void; label?: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        onClick={onToggle}
        className={cn("w-10 h-5 rounded-full relative transition-colors cursor-pointer shrink-0", enabled ? "bg-primary" : "bg-muted")}
      >
        <div className={cn("w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all", enabled ? "left-5" : "left-0.5")} />
      </div>
      {label && <span className="text-sm text-foreground">{label}</span>}
    </label>
  );
}

// ─── Tab: Integrações ───────────────────────────────────────
function TabIntegracoes({ form, setForm }: { form: Partial<WhatsAppConnection>; setForm: React.Dispatch<React.SetStateAction<Partial<WhatsAppConnection>>> }) {
  const toggleEvent = (evt: string) => {
    const current = form.webhookEvents || [];
    const next = current.includes(evt) ? current.filter(e => e !== evt) : [...current, evt];
    setForm(f => ({ ...f, webhookEvents: next }));
  };

  return (
    <div className="space-y-6">
      {/* Webhook */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Webhook className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Webhook</h3>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground block mb-1">URL do Webhook</label>
          <input
            type="url"
            value={form.webhookUrl || ""}
            onChange={(e) => setForm(f => ({ ...f, webhookUrl: e.target.value }))}
            placeholder="https://seu-servidor.com/webhook"
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground block mb-2">Eventos</label>
          <div className="flex flex-wrap gap-2">
            {WEBHOOK_EVENT_OPTIONS.map(evt => (
              <button
                key={evt}
                onClick={() => toggleEvent(evt)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors",
                  (form.webhookEvents || []).includes(evt)
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {evt}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Typebot */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-purple-500" />
            <h3 className="text-sm font-bold text-foreground">Typebot</h3>
          </div>
          <Toggle
            enabled={!!form.typebotEnabled}
            onToggle={() => setForm(f => ({ ...f, typebotEnabled: !f.typebotEnabled }))}
          />
        </div>
        {form.typebotEnabled && (
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">URL do Typebot</label>
            <input
              type="url"
              value={form.typebotUrl || ""}
              onChange={(e) => setForm(f => ({ ...f, typebotUrl: e.target.value }))}
              placeholder="https://typebot.io/api/v1/..."
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        )}
      </div>

      <div className="border-t border-border" />

      {/* n8n */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold text-foreground">n8n / Make</h3>
          </div>
          <Toggle
            enabled={!!form.n8nEnabled}
            onToggle={() => setForm(f => ({ ...f, n8nEnabled: !f.n8nEnabled }))}
          />
        </div>
        {form.n8nEnabled && (
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">URL do Webhook n8n</label>
            <input
              type="url"
              value={form.n8nUrl || ""}
              onChange={(e) => setForm(f => ({ ...f, n8nUrl: e.target.value }))}
              placeholder="https://n8n.exemplo.com/webhook/..."
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Mensagens ─────────────────────────────────────────
function TabMensagens({ form, setForm }: { form: Partial<WhatsAppConnection>; setForm: React.Dispatch<React.SetStateAction<Partial<WhatsAppConnection>>> }) {
  const messages = [
    { key: "greeting", label: "Mensagem de Saudação", desc: "Enviada quando um contato inicia uma conversa", enabled: !!form.greetingEnabled, text: form.greetingMessage || "", enabledKey: "greetingEnabled" as const, textKey: "greetingMessage" as const },
    { key: "away", label: "Mensagem de Ausência", desc: "Enviada fora do horário de atendimento", enabled: !!form.awayEnabled, text: form.awayMessage || "", enabledKey: "awayEnabled" as const, textKey: "awayMessage" as const },
    { key: "closing", label: "Mensagem de Encerramento", desc: "Enviada quando um atendimento é finalizado", enabled: !!form.closingEnabled, text: form.closingMessage || "", enabledKey: "closingEnabled" as const, textKey: "closingMessage" as const },
    { key: "transfer", label: "Mensagem de Transferência", desc: "Enviada quando o contato é transferido para outro atendente/fila", enabled: !!form.transferEnabled, text: form.transferMessage || "", enabledKey: "transferEnabled" as const, textKey: "transferMessage" as const },
  ];

  return (
    <div className="space-y-5">
      {messages.map(msg => (
        <div key={msg.key} className="bg-secondary/50 rounded-xl p-4 space-y-3 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">{msg.label}</h3>
              <p className="text-[11px] text-muted-foreground">{msg.desc}</p>
            </div>
            <Toggle
              enabled={msg.enabled}
              onToggle={() => setForm(f => ({ ...f, [msg.enabledKey]: !f[msg.enabledKey] }))}
            />
          </div>
          {msg.enabled && (
            <textarea
              value={msg.text}
              onChange={(e) => setForm(f => ({ ...f, [msg.textKey]: e.target.value }))}
              placeholder={`Digite a ${msg.label.toLowerCase()}...`}
              rows={3}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          )}
        </div>
      ))}

      <div className="p-3 bg-blue-500/10 rounded-lg">
        <p className="text-[11px] text-blue-700 dark:text-blue-400">
          💡 Use <code className="bg-blue-500/10 px-1 rounded">{`{{nome}}`}</code> para inserir o nome do contato e <code className="bg-blue-500/10 px-1 rounded">{`{{protocolo}}`}</code> para o número do protocolo.
        </p>
      </div>
    </div>
  );
}

// ─── Tab: Chatbot ───────────────────────────────────────────
function TabChatbot({ form, setForm }: { form: Partial<WhatsAppConnection>; setForm: React.Dispatch<React.SetStateAction<Partial<WhatsAppConnection>>> }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-sm font-bold text-foreground">Chatbot</h3>
            <p className="text-[11px] text-muted-foreground">Respostas automáticas com IA ou palavras-chave</p>
          </div>
        </div>
        <Toggle
          enabled={!!form.chatbotEnabled}
          onToggle={() => setForm(f => ({ ...f, chatbotEnabled: !f.chatbotEnabled }))}
        />
      </div>

      {form.chatbotEnabled && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Tipo de Chatbot</label>
            <select
              value={form.chatbotType || "none"}
              onChange={(e) => setForm(f => ({ ...f, chatbotType: e.target.value as any }))}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
            >
              <option value="none">Nenhum</option>
              <option value="keyword">Palavras-chave</option>
              <option value="openai">OpenAI (GPT)</option>
              <option value="dialogflow">Dialogflow</option>
            </select>
          </div>

          {(form.chatbotType === "openai" || form.chatbotType === "dialogflow") && (
            <>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">API Key</label>
                <input
                  type="password"
                  value={form.chatbotApiKey || ""}
                  onChange={(e) => setForm(f => ({ ...f, chatbotApiKey: e.target.value }))}
                  placeholder={form.chatbotType === "openai" ? "sk-..." : "Chave do Dialogflow"}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {form.chatbotType === "openai" && (
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Prompt do Sistema</label>
                    <textarea
                      value={form.chatbotPrompt || ""}
                      onChange={(e) => setForm(f => ({ ...f, chatbotPrompt: e.target.value }))}
                      placeholder="Você é um assistente de atendimento ao cliente da empresa X. Responda de forma educada e objetiva..."
                      rows={4}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Máx. Tokens: <span className="text-primary font-bold">{form.chatbotMaxTokens || 500}</span>
                    </label>
                    <input
                      type="range"
                      min={100}
                      max={4000}
                      step={100}
                      value={form.chatbotMaxTokens || 500}
                      onChange={(e) => setForm(f => ({ ...f, chatbotMaxTokens: parseInt(e.target.value) }))}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>100</span><span>Curto</span><span>Médio</span><span>Longo</span><span>4000</span>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {form.chatbotType === "keyword" && (
            <div className="p-3 bg-amber-500/10 rounded-lg">
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                ⚡ No modo palavras-chave, as respostas são definidas nos fluxos. Configure o fluxo padrão na aba "Fluxo Padrão".
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Fluxo Padrão ─────────────────────────────────────
function TabFluxo({ form, setForm }: { form: Partial<WhatsAppConnection>; setForm: React.Dispatch<React.SetStateAction<Partial<WhatsAppConnection>>> }) {
  const { flows } = useFlowStore();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="w-5 h-5 text-primary" />
        <div>
          <h3 className="text-sm font-bold text-foreground">Fluxos Padrão</h3>
          <p className="text-[11px] text-muted-foreground">Defina os fluxos automáticos para esta conexão</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-secondary/50 rounded-xl p-4 space-y-3 border border-border">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Fluxo Principal</h4>
            <p className="text-[11px] text-muted-foreground">Executado quando um contato envia a primeira mensagem</p>
          </div>
          <select
            value={form.defaultFlowId || ""}
            onChange={(e) => setForm(f => ({ ...f, defaultFlowId: e.target.value }))}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
          >
            <option value="">Nenhum fluxo selecionado</option>
            {flows.map(flow => (
              <option key={flow.id} value={flow.id}>
                {flow.isActive ? "🟢" : "⚪"} {flow.name} — {flow.description}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-secondary/50 rounded-xl p-4 space-y-3 border border-border">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Fluxo Fora do Horário</h4>
            <p className="text-[11px] text-muted-foreground">Executado fora do horário de atendimento configurado</p>
          </div>
          <select
            value={form.outOfHoursFlowId || ""}
            onChange={(e) => setForm(f => ({ ...f, outOfHoursFlowId: e.target.value }))}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
          >
            <option value="">Nenhum fluxo selecionado</option>
            {flows.map(flow => (
              <option key={flow.id} value={flow.id}>
                {flow.isActive ? "🟢" : "⚪"} {flow.name} — {flow.description}
              </option>
            ))}
          </select>
        </div>
      </div>

      {flows.length === 0 && (
        <div className="p-3 bg-amber-500/10 rounded-lg">
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            ⚠️ Nenhum fluxo cadastrado. Crie fluxos na página <strong>Construtor de Fluxos</strong> para vincular aqui.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Horários de Atendimento ──────────────────────────
const DAY_LABELS: Record<string, string> = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo",
};
const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function TabHorarios({ form, setForm }: { form: Partial<WhatsAppConnection>; setForm: React.Dispatch<React.SetStateAction<Partial<WhatsAppConnection>>> }) {
  const hours = form.businessHours || {};

  const updateDay = (day: string, field: string, value: any) => {
    setForm(f => ({
      ...f,
      businessHours: {
        ...f.businessHours,
        [day]: { ...(f.businessHours?.[day] || { enabled: false, start: "08:00", end: "18:00" }), [field]: value },
      },
    }));
  };

  const applyToAll = (day: string) => {
    const src = hours[day];
    if (!src) return;
    const updated: typeof hours = {};
    DAY_ORDER.forEach(d => { updated[d] = { ...src }; });
    setForm(f => ({ ...f, businessHours: updated }));
    toast.success("Horário aplicado a todos os dias");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-sm font-bold text-foreground">Horários de Atendimento</h3>
            <p className="text-[11px] text-muted-foreground">Defina quando o atendimento está disponível. Fora destes horários, a mensagem de ausência será ativada.</p>
          </div>
        </div>
        <Toggle
          enabled={!!form.businessHoursEnabled}
          onToggle={() => setForm(f => ({ ...f, businessHoursEnabled: !f.businessHoursEnabled }))}
        />
      </div>

      {form.businessHoursEnabled && (
        <div className="space-y-2">
          {DAY_ORDER.map(day => {
            const d = hours[day] || { enabled: false, start: "08:00", end: "18:00" };
            return (
              <div key={day} className={cn(
                "flex items-center gap-3 rounded-xl p-3 border transition-colors",
                d.enabled ? "bg-secondary/50 border-border" : "bg-muted/30 border-transparent"
              )}>
                <div className="w-7">
                  <input
                    type="checkbox"
                    checked={d.enabled}
                    onChange={() => updateDay(day, "enabled", !d.enabled)}
                    className="w-4 h-4 accent-primary cursor-pointer"
                  />
                </div>
                <span className={cn("text-sm font-medium w-32", d.enabled ? "text-foreground" : "text-muted-foreground")}>
                  {DAY_LABELS[day]}
                </span>
                {d.enabled ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={d.start}
                      onChange={(e) => updateDay(day, "start", e.target.value)}
                      className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                    />
                    <span className="text-muted-foreground text-xs">até</span>
                    <input
                      type="time"
                      value={d.end}
                      onChange={(e) => updateDay(day, "end", e.target.value)}
                      className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                    />
                    <button
                      onClick={() => applyToAll(day)}
                      className="ml-auto text-[10px] text-primary hover:underline whitespace-nowrap"
                      title="Aplicar este horário a todos os dias"
                    >
                      Aplicar a todos
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">Fechado</span>
                )}
              </div>
            );
          })}

          <div className="p-3 bg-blue-500/10 rounded-lg mt-3">
            <p className="text-[11px] text-blue-700 dark:text-blue-400">
              💡 Fora dos horários configurados, a <strong>Mensagem de Ausência</strong> será enviada automaticamente e o <strong>Fluxo Fora do Horário</strong> será executado (se configurados).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════
export default function Connection() {
  const { connections, addConnection, updateConnection, removeConnection } = useConnectionStore();
  const [editConn, setEditConn] = useState<WhatsAppConnection | null>(null);
  const [editTab, setEditTab] = useState<EditTab>("geral");
  const [confirmDelete, setConfirmDelete] = useState<WhatsAppConnection | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [qrConnId, setQrConnId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const qrIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<WhatsAppConnection>>({});

  useEffect(() => {
    return () => { if (qrIntervalRef.current) clearInterval(qrIntervalRef.current); };
  }, []);

  const openEdit = (conn: WhatsAppConnection) => {
    setEditConn(conn);
    setEditForm({ ...conn });
    setEditTab("geral");
  };

  const saveEdit = () => {
    if (!editConn) return;
    updateConnection(editConn.id, { ...editForm, updatedAt: new Date().toLocaleString("pt-BR") });
    toast.success("Conexão atualizada!");
    setEditConn(null);
  };

  const handleCreate = () => {
    if (!createName.trim()) { toast.error("Informe o nome da conexão"); return; }
    addConnection({
      ...defaultConnectionFields,
      name: createName,
      phone: "",
      status: "disconnected",
      baseUrl: "http://localhost:8080",
      token: generateToken(),
    });
    toast.success(`Conexão "${createName}" criada!`);
    setShowCreate(false);
    setCreateName("");
  };

  const handleDelete = (conn: WhatsAppConnection) => {
    removeConnection(conn.id);
    toast.success(`Conexão "${conn.name}" removida`);
    setConfirmDelete(null);
  };

  const copyToken = (token: string) => { navigator.clipboard.writeText(token); toast.success("Token copiado!"); };

  const refreshToken = (connId: string) => {
    const newToken = generateToken();
    updateConnection(connId, { token: newToken });
    toast.success("Token regenerado!");
    if (editConn?.id === connId) setEditForm(f => ({ ...f, token: newToken }));
  };

  // ─── QR Code ──────────────────────────────────────
  const handleNewQR = async (conn: WhatsAppConnection) => {
    setQrConnId(conn.id);
    setQrCode(null);
    setQrLoading(true);
    try {
      const res = await api.getConnQRCode(conn.baseUrl);
      setQrCode(res.qrcode);
      updateConnection(conn.id, { status: "connecting" });
      toast.success("QR Code gerado! Escaneie com seu WhatsApp.");
      if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
      qrIntervalRef.current = setInterval(async () => {
        try {
          const s = await api.getConnStatus(conn.baseUrl);
          if (s.connected) {
            updateConnection(conn.id, { status: "connected", phone: s.phone, updatedAt: new Date().toLocaleString("pt-BR") });
            toast.success(`"${conn.name}" conectado!`);
            setQrConnId(null); setQrCode(null);
            if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
          }
        } catch { /* keep polling */ }
      }, 5000);
    } catch { toast.error("Erro ao gerar QR Code."); } finally { setQrLoading(false); }
  };

  const closeQR = () => { setQrConnId(null); setQrCode(null); if (qrIntervalRef.current) clearInterval(qrIntervalRef.current); };

  const handleCheckStatus = async (conn: WhatsAppConnection) => {
    setStatusLoading(conn.id);
    try {
      const res = await api.getConnStatus(conn.baseUrl);
      updateConnection(conn.id, { status: res.connected ? "connected" : "disconnected", phone: res.phone || conn.phone, updatedAt: new Date().toLocaleString("pt-BR") });
      toast.success(res.connected ? `"${conn.name}" está conectado` : `"${conn.name}" está desconectado`);
    } catch {
      updateConnection(conn.id, { status: "disconnected", updatedAt: new Date().toLocaleString("pt-BR") });
      toast.error("Servidor indisponível");
    } finally { setStatusLoading(null); }
  };

  const handleReconnect = async (conn: WhatsAppConnection) => {
    setStatusLoading(conn.id);
    try {
      await api.reconnectConn(conn.baseUrl);
      updateConnection(conn.id, { status: "connecting", updatedAt: new Date().toLocaleString("pt-BR") });
      toast.success("Tentando reconectar...");
      setTimeout(() => handleCheckStatus(conn), 3000);
    } catch { toast.error("Erro ao reconectar"); setStatusLoading(null); }
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wifi className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            Conexões
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{connections.length} conexões</span>
          </h1>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Nova Conexão
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {connections.map((conn) => (
          <div key={conn.id} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-1" style={{ backgroundColor: conn.color }} />
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#25D366]/10 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#25D366]">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground truncate">{conn.name}</h3>
                  {conn.phone && <p className="text-[11px] text-muted-foreground">{conn.phone}</p>}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 capitalize">{conn.provider}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold",
                  conn.status === "connected" ? "bg-primary/10 text-primary" : conn.status === "connecting" ? "bg-amber-500/10 text-amber-600" : "bg-destructive/10 text-destructive"
                )}>
                  {conn.status === "connected" ? "Conectado" : conn.status === "connecting" ? "Conectando..." : "Desconectado"}
                </span>
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: conn.color }} />
              </div>

              <div className="flex items-center gap-6 py-2">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-lg font-bold text-foreground">{conn.messagesSent.toLocaleString()}</p>
                    <p className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Enviadas</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowDownLeft className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-lg font-bold text-foreground">{conn.messagesReceived.toLocaleString()}</p>
                    <p className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Recebidas</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => conn.status === "disconnected" ? handleReconnect(conn) : handleCheckStatus(conn)}
                  disabled={statusLoading === conn.id}
                  className="flex-1 py-2 rounded-lg text-xs font-medium border border-border hover:bg-accent text-foreground transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {statusLoading === conn.id ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Verificando...</> : <><RefreshCw className="w-3.5 h-3.5" /> Tentar novamente</>}
                </button>
                <button
                  onClick={() => handleNewQR(conn)}
                  disabled={qrLoading && qrConnId === conn.id}
                  className="flex-1 py-2 rounded-lg text-xs font-bold border-2 border-primary text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {qrLoading && qrConnId === conn.id ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando...</> : <><QrCode className="w-3.5 h-3.5" /> Novo QR CODE</>}
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-[11px] text-muted-foreground">Atualizado: {conn.updatedAt}</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("w-2 h-2 rounded-full", conn.status === "connected" ? "bg-primary" : conn.status === "connecting" ? "bg-amber-500 animate-pulse" : "bg-muted-foreground/30")} />
                    <span className="text-[10px] text-muted-foreground">{conn.status === "connected" ? "Ativo" : conn.status === "connecting" ? "Aguardando" : "Inativo"}</span>
                  </div>
                  <button onClick={() => openEdit(conn)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent text-amber-500"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setConfirmDelete(conn)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {connections.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
            <WifiOff className="w-16 h-16 mb-4 opacity-20" />
            <h2 className="text-lg font-medium">Nenhuma conexão</h2>
            <p className="text-sm mt-1">Crie sua primeira conexão WhatsApp</p>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {qrConnId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeQR}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><QrCode className="w-5 h-5 text-primary" /> QR Code</h2>
              <button onClick={closeQR} className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Escaneie o QR Code com o WhatsApp: <strong>{connections.find(c => c.id === qrConnId)?.name}</strong></p>
            <div className="bg-white rounded-xl p-6 flex items-center justify-center mb-4">
              {qrLoading ? (
                <div className="w-48 h-48 flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>
              ) : qrCode ? (
                <div className="text-center">
                  <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-primary/30"><QrCode className="w-24 h-24 text-primary/40" /></div>
                  <p className="text-[10px] text-muted-foreground mt-2 font-mono">{qrCode.substring(0, 20)}...</p>
                </div>
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-muted-foreground text-sm">Erro ao gerar QR</div>
              )}
            </div>
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg mb-4">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <p className="text-[11px] text-amber-700 dark:text-amber-400">Aguardando escaneamento...</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { const c = connections.find(c => c.id === qrConnId); if (c) handleNewQR(c); }} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" /> Gerar novo
              </button>
              <button onClick={closeQR} className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">Nova Conexão</h2>
              <button onClick={() => setShowCreate(false)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Nome da conexão *</label>
              <input type="text" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Ex: atendimento" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring" autoFocus />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent">Cancelar</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90">Criar</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editConn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditConn(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h2 className="text-lg font-bold text-foreground">Editar Conexão</h2>
              <button onClick={() => setEditConn(null)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex border-b border-border px-6 gap-1 overflow-x-auto">
              {([
                { key: "geral", label: "Geral" },
                { key: "integracoes", label: "Integrações" },
                { key: "mensagens", label: "Mensagens" },
                { key: "chatbot", label: "Chatbot" },
                { key: "fluxo", label: "Fluxo Padrão" },
                { key: "horarios", label: "Horários" },
              ] as { key: EditTab; label: string }[]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setEditTab(tab.key)}
                  className={cn(
                    "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap",
                    editTab === tab.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {editTab === "geral" && (
                <div className="space-y-5">
                  <button className="w-full py-3 rounded-lg bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors">Adicionar Imagem</button>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Nome</label>
                      <input type="text" value={editForm.name || ""} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring" />
                    </div>
                    <div className="w-36">
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Cor</label>
                      <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2">
                        <div className="w-5 h-5 rounded" style={{ backgroundColor: editForm.color || "#25D366" }} />
                        <input type="text" value={editForm.color || ""} onChange={(e) => setEditForm(f => ({ ...f, color: e.target.value }))} className="flex-1 bg-transparent text-sm text-foreground outline-none font-mono w-16" />
                        <input type="color" value={editForm.color || "#25D366"} onChange={(e) => setEditForm(f => ({ ...f, color: e.target.value }))} className="w-5 h-5 cursor-pointer border-none bg-transparent" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <Toggle enabled={!!editForm.isDefault} onToggle={() => setEditForm(f => ({ ...f, isDefault: !f.isDefault }))} label="Padrão" />
                    <Toggle enabled={!!editForm.allowGroups} onToggle={() => setEditForm(f => ({ ...f, allowGroups: !f.allowGroups }))} label="Permitir grupos" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Tratar grupos como ticket</label>
                    <select value={editForm.groupTicketMode || "disabled"} onChange={(e) => setEditForm(f => ({ ...f, groupTicketMode: e.target.value as any }))} className="w-48 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none">
                      <option value="disabled">Desabilitado</option>
                      <option value="enabled">Habilitado</option>
                    </select>
                  </div>
                  <div className="bg-secondary rounded-lg p-4">
                    <Toggle enabled={!!editForm.importMessages} onToggle={() => setEditForm(f => ({ ...f, importMessages: !f.importMessages }))} label="Importar mensagens do aparelho" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Token para integração externa</label>
                    <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2">
                      <input type="text" value={editForm.token || ""} readOnly className="flex-1 bg-transparent text-sm text-foreground outline-none font-mono" />
                      <button onClick={() => refreshToken(editConn.id)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground" title="Regenerar"><RotateCcw className="w-3.5 h-3.5" /></button>
                      <button onClick={() => copyToken(editForm.token || "")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground" title="Copiar"><Copy className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground mb-1">Redirecionamento de Fila</h4>
                    <p className="text-xs text-muted-foreground mb-3">Selecione uma fila para os contatos que não possuem fila serem redirecionados</p>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Fila</label>
                        <select value={editForm.queueId || ""} onChange={(e) => setEditForm(f => ({ ...f, queueId: e.target.value || undefined }))} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none">
                          <option value=""></option>
                          <option value="1">Suporte</option>
                          <option value="2">Vendas</option>
                          <option value="3">Financeiro</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Tempo em minutos</label>
                        <input type="number" value={editForm.queueRedirectMinutes ?? 0} onChange={(e) => setEditForm(f => ({ ...f, queueRedirectMinutes: parseInt(e.target.value) || 0 }))} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {editTab === "integracoes" && <TabIntegracoes form={editForm} setForm={setEditForm} />}
              {editTab === "mensagens" && <TabMensagens form={editForm} setForm={setEditForm} />}
              {editTab === "chatbot" && <TabChatbot form={editForm} setForm={setEditForm} />}
              {editTab === "fluxo" && <TabFluxo form={editForm} setForm={setEditForm} />}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <button onClick={() => setEditConn(null)} className="px-4 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg font-medium">Cancelar</button>
              <button onClick={saveEdit} className="px-5 py-2 bg-foreground text-background rounded-lg text-sm font-bold hover:opacity-90 transition-opacity">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setConfirmDelete(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-2">Excluir conexão</h2>
            <p className="text-sm text-muted-foreground mb-6">Tem certeza que deseja excluir <strong>"{confirmDelete.name}"</strong>?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-bold hover:bg-destructive/90">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
