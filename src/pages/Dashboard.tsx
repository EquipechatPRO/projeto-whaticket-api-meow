import { useState, useEffect } from "react";
import api from "@/services/api";
import { MessageSquare, Users, Wifi, WifiOff, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<{ connected: boolean; phone?: string; name?: string } | null>(null);
  const [chatCount, setChatCount] = useState(0);

  useEffect(() => {
    api.getStatus().then(setStatus).catch(() => setStatus({ connected: false }));
    api.getChats().then((c) => setChatCount(c.length)).catch(() => {});
  }, []);

  const cards = [
    {
      title: "Status da Conexão",
      value: status?.connected ? "Conectado" : "Desconectado",
      icon: status?.connected ? Wifi : WifiOff,
      color: status?.connected ? "text-primary" : "text-destructive",
      action: () => navigate("/connection"),
    },
    {
      title: "Conversas Ativas",
      value: String(chatCount),
      icon: MessageSquare,
      color: "text-primary",
      action: () => navigate("/conversations"),
    },
    {
      title: "Telefone",
      value: status?.phone || "—",
      icon: Users,
      color: "text-muted-foreground",
      action: () => navigate("/connection"),
    },
  ];

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Painel de atendimento WhatsApp com API Whatsmeow
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <button
            key={card.title}
            onClick={card.action}
            className="bg-card border border-border rounded-xl p-5 text-left hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between mb-3">
              <card.icon className={cn("w-6 h-6", card.color)} />
              <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm text-muted-foreground">{card.title}</p>
            <p className="text-xl font-bold text-foreground mt-1">{card.value}</p>
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold text-foreground mb-3">Início Rápido</h2>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>1. Configure a URL do servidor whatsmeow na página de <button onClick={() => navigate("/connection")} className="text-primary underline">Conexão</button></p>
          <p>2. Gere o QR Code e escaneie com o WhatsApp</p>
          <p>3. Acesse a tela de <button onClick={() => navigate("/conversations")} className="text-primary underline">Atendimento</button> para gerenciar conversas</p>
        </div>
      </div>
    </div>
  );
}
