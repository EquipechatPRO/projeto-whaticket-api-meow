import { useState } from "react";
import { useConnectionStore } from "@/stores/connection-store";
import api from "@/services/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, QrCode, RefreshCw, Settings, Check, Copy } from "lucide-react";

const ENDPOINTS = [
  { method: "GET", path: "/api/qrcode", desc: "Gerar QR Code" },
  { method: "GET", path: "/api/status", desc: "Status da sessão" },
  { method: "POST", path: "/api/disconnect", desc: "Desconectar" },
  { method: "POST", path: "/api/reconnect", desc: "Reconectar" },
  { method: "POST", path: "/api/send/text", desc: "Enviar texto" },
  { method: "POST", path: "/api/send/image", desc: "Enviar imagem" },
  { method: "POST", path: "/api/send/document", desc: "Enviar documento" },
  { method: "POST", path: "/api/send/audio", desc: "Enviar áudio" },
  { method: "POST", path: "/api/send/video", desc: "Enviar vídeo" },
  { method: "POST", path: "/api/send/location", desc: "Enviar localização" },
  { method: "POST", path: "/api/send/contact", desc: "Enviar contato (vCard)" },
  { method: "POST", path: "/api/send/reaction", desc: "Enviar reação" },
  { method: "GET", path: "/api/chats", desc: "Listar chats" },
  { method: "GET", path: "/api/messages/:jid", desc: "Mensagens de um chat" },
  { method: "GET", path: "/api/contacts", desc: "Listar contatos" },
  { method: "GET", path: "/api/contacts/:jid", desc: "Info do contato" },
  { method: "POST", path: "/api/check-number", desc: "Verificar número" },
  { method: "GET", path: "/api/groups", desc: "Listar grupos" },
  { method: "GET", path: "/api/groups/:jid", desc: "Info do grupo" },
  { method: "POST", path: "/api/webhook", desc: "Configurar webhook" },
  { method: "GET", path: "/api/webhook", desc: "Ver webhook" },
  { method: "GET", path: "/api/profile-pic/:jid", desc: "Foto de perfil" },
  { method: "PUT", path: "/api/profile-pic", desc: "Alterar foto de perfil" },
  { method: "PUT", path: "/api/profile-status", desc: "Alterar status" },
  { method: "POST", path: "/api/presence", desc: "Definir presença" },
  { method: "POST", path: "/api/mark-read", desc: "Marcar como lido" },
  { method: "POST", path: "/api/messages/delete", desc: "Deletar mensagem" },
  { method: "GET", path: "/api/newsletters", desc: "Listar canais/newsletters" },
];

export default function Connection() {
  const { baseUrl, setBaseUrl } = useConnectionStore();
  const [urlInput, setUrlInput] = useState(baseUrl);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<{ connected: boolean; phone?: string; name?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSaveUrl = () => {
    setBaseUrl(urlInput);
    toast.success("URL salva com sucesso");
  };

  const handleGetQR = async () => {
    setLoading(true);
    try {
      const res = await api.getQRCode();
      setQrCode(res.qrcode);
      toast.success("QR Code gerado");
    } catch {
      toast.error("Erro ao gerar QR Code");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    try {
      const res = await api.getStatus();
      setStatus(res);
    } catch {
      toast.error("Erro ao verificar status");
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.disconnect();
      setStatus({ connected: false });
      setQrCode(null);
      toast.success("Desconectado");
    } catch {
      toast.error("Erro ao desconectar");
    }
  };

  const copyEndpoint = (path: string) => {
    navigator.clipboard.writeText(`${baseUrl}${path}`);
    toast.success("Copiado!");
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Conexão WhatsApp</h1>
      <p className="text-sm text-muted-foreground">
        Configure a URL do servidor whatsmeow e gerencie a sessão do WhatsApp.
      </p>

      {/* URL Config */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Configuração do Servidor</h2>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="http://seu-servidor:8080"
            className="flex-1 bg-secondary rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={handleSaveUrl}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Salvar
          </button>
        </div>
      </div>

      {/* Session */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* QR Code */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">QR Code</h2>
          </div>

          {qrCode ? (
            <div className="bg-white rounded-lg p-6 flex items-center justify-center">
              <div className="text-center">
                <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center mb-3">
                  <QrCode className="w-24 h-24 text-foreground/20" />
                </div>
                <p className="text-xs text-muted-foreground">Escaneie com o WhatsApp</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              Clique para gerar o QR Code
            </div>
          )}

          <button
            onClick={handleGetQR}
            disabled={loading}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            {loading ? "Gerando..." : "Gerar QR Code"}
          </button>
        </div>

        {/* Status */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-2">
            {status?.connected ? (
              <Wifi className="w-5 h-5 text-primary" />
            ) : (
              <WifiOff className="w-5 h-5 text-destructive" />
            )}
            <h2 className="font-semibold text-foreground">Status da Sessão</h2>
          </div>

          {status ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "w-3 h-3 rounded-full",
                    status.connected ? "bg-primary" : "bg-destructive"
                  )}
                />
                <span className="text-sm font-medium text-foreground">
                  {status.connected ? "Conectado" : "Desconectado"}
                </span>
              </div>
              {status.phone && (
                <p className="text-sm text-muted-foreground">
                  📱 {status.phone}
                </p>
              )}
              {status.name && (
                <p className="text-sm text-muted-foreground">
                  👤 {status.name}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
              Clique para verificar
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleCheckStatus}
              className="flex-1 py-2.5 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-accent transition-colors"
            >
              Verificar Status
            </button>
            <button
              onClick={handleDisconnect}
              className="flex-1 py-2.5 bg-destructive/10 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/20 transition-colors"
            >
              Desconectar
            </button>
          </div>
        </div>
      </div>

      {/* Endpoints Table */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <h2 className="font-semibold text-foreground">Endpoints da API Whatsmeow</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Método</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Endpoint</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Descrição</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINTS.map((ep) => (
                <tr key={ep.path + ep.method} className="border-b border-border/50 hover:bg-accent/30">
                  <td className="py-2 px-3">
                    <span
                      className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded",
                        ep.method === "GET" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                        ep.method === "POST" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                        ep.method === "PUT" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      )}
                    >
                      {ep.method}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono text-xs text-foreground">{ep.path}</td>
                  <td className="py-2 px-3 text-muted-foreground">{ep.desc}</td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => copyEndpoint(ep.path)}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground"
                      title="Copiar URL"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
