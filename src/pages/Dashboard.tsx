import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import api, { Chat, Message, DashboardStats } from "@/services/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "sonner";
import {
  Wifi, WifiOff, MessageSquare, Users, Clock, TrendingUp,
  ArrowUpRight, ArrowDownRight, Phone, BarChart3, Activity,
  CheckCircle2, PauseCircle, AlertCircle, Filter, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, LineChart, Line,
} from "recharts";

// ── Helpers ──

// groupMessagesByHour is now computed server-side via /api/stats


function getStatusDistribution(chats: Chat[]) {
  const counts = { attending: 0, waiting: 0, resolved: 0, paused: 0, closed: 0, other: 0 };
  chats.forEach((c) => {
    if (c.status === "attending") counts.attending++;
    else if (c.status === "waiting") counts.waiting++;
    else if (c.status === "resolved") counts.resolved++;
    else if (c.status === "paused") counts.paused++;
    else if (c.status === "closed") counts.closed++;
    else counts.other++;
  });
  return [
    { name: "Em atendimento", value: counts.attending, color: "hsl(142, 72%, 29%)" },
    { name: "Aguardando", value: counts.waiting, color: "hsl(38, 92%, 50%)" },
    { name: "Resolvidos", value: counts.resolved + counts.closed, color: "hsl(210, 80%, 55%)" },
    { name: "Pausados", value: counts.paused, color: "hsl(210, 10%, 55%)" },
  ].filter((s) => s.value > 0);
}

function getAgentPerformance(chats: Chat[]) {
  const agents: Record<string, { atendimentos: number; resolvidos: number }> = {};
  chats.forEach((c) => {
    const name = c.assignedTo || "Não atribuído";
    if (!agents[name]) agents[name] = { atendimentos: 0, resolvidos: 0 };
    agents[name].atendimentos++;
    if (c.status === "resolved" || c.status === "closed") agents[name].resolvidos++;
  });
  return Object.entries(agents)
    .map(([name, data]) => ({
      name,
      atendimentos: data.atendimentos,
      resolvidos: data.resolvidos,
      satisfacao: data.atendimentos > 0 ? Math.round((data.resolvidos / data.atendimentos) * 100) : 0,
    }))
    .sort((a, b) => b.atendimentos - a.atendimentos)
    .slice(0, 10);
}

function getQueueDistribution(chats: Chat[]) {
  const queues: Record<string, number> = {};
  chats.forEach((c) => {
    const q = c.queue || "Sem fila";
    queues[q] = (queues[q] || 0) + 1;
  });
  return Object.entries(queues).map(([name, value]) => ({ name, value }));
}

// ── UI Components ──

const KPICard = ({
  title, value, subtitle, icon: Icon, trend, trendValue, color, onClick, loading,
}: {
  title: string; value: string; subtitle?: string; icon: React.ElementType;
  trend?: "up" | "down"; trendValue?: string; color: string; onClick?: () => void; loading?: boolean;
}) => (
  <button onClick={onClick} className="bg-card border border-border rounded-xl p-4 text-left hover:shadow-md transition-all group w-full">
    <div className="flex items-start justify-between mb-2">
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", color)}>
        <Icon className="w-4 h-4" />
      </div>
      {trend && (
        <div className={cn("flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md",
          trend === "up" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
        )}>
          {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trendValue}
        </div>
      )}
    </div>
    <p className="text-xs text-muted-foreground">{title}</p>
    {loading ? (
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mt-1" />
    ) : (
      <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
    )}
    {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
  </button>
);

const ChartCard = ({ title, subtitle, children, className }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) => (
  <div className={cn("bg-card border border-border rounded-xl p-4", className)}>
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ── Main Component ──

export default function Dashboard() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<{ connected: boolean; phone?: string; name?: string } | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const loadData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const [statusRes, chatsRes, statsRes] = await Promise.all([
        api.getStatus().catch(() => ({ connected: false, phone: "", name: "" })),
        api.getChats().catch(() => [] as Chat[]),
        api.getStats().catch(() => null),
      ]);
      setStatus(statusRes);
      setChats(chatsRes);
      if (statsRes) setStats(statsRes);
      setLastUpdate(new Date());
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Sound notification
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2LkZuWkIuGgX18fX+EiY2PkI+Oi4mHhYOBgICAgoSGiIqLjI2NjYyLioiHhYSDgoGBgYKDhIaHiImKi4uLi4qJiIeGhYSEg4KCgoKDhIWGh4iIiYmJiYiIh4aFhYSEg4ODg4OEhIWFhoaHh4eHh4eGhoaFhYWEhISDg4OEhIWFhYaGhoaGhoaGhYWFhYSEhISDg4OEhISFhYWFhYWFhYWFhYSEhISDg4OEhISEhYWFhYWFhQ==");
    audioRef.current = audio;
  }, []);

  const { notify } = useNotifications();
  const [newMsgCount, setNewMsgCount] = useState(0);

  useWebSocket({
    onMessage: (msg) => {
      if (!msg.fromMe) {
        setNewMsgCount((c) => c + 1);
        // Play sound
        audioRef.current?.play().catch(() => {});
        // Toast
        toast.info(`Nova mensagem de ${msg.senderName || "Contato"}`, {
          description: msg.text?.slice(0, 80) || "Mídia recebida",
          duration: 4000,
        });
        // Push notification
        notify(`Nova mensagem - ${msg.senderName || "Contato"}`, {
          body: msg.text?.slice(0, 100) || "Mídia recebida",
        });
        // Refresh data
        loadData(false);
      }
    },
    onStatus: (data) => {
      setStatus(data);
    },
  });

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => loadData(false), 30000);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, loadData]);

  // Derived data from stats endpoint
  const hourlyMessages = stats?.hourlyVolume || [];
  const statusDist = useMemo(() => getStatusDistribution(chats), [chats]);
  const agentPerf = useMemo(() => getAgentPerformance(chats), [chats]);
  const queueDist = useMemo(() => getQueueDistribution(chats), [chats]);
  const dailyVolume = stats?.dailyVolume || [];

  const totalMessages = stats?.totalMessages || 0;
  const sentMessages = stats?.sentToday || 0;
  const receivedMessages = stats?.receivedToday || 0;
  const activeChats = chats.filter((c) => c.status === "attending").length;
  const waitingChats = chats.filter((c) => c.status === "waiting").length;
  const resolvedChats = chats.filter((c) => c.status === "resolved" || c.status === "closed").length;
  const totalUnread = chats.reduce((a, c) => a + c.unreadCount, 0);
  const avgResponseTime = stats?.avgResponseTime || "—";

  const queueColors = ["hsl(210, 80%, 55%)", "hsl(142, 72%, 29%)", "hsl(38, 92%, 50%)", "hsl(280, 60%, 55%)", "hsl(0, 70%, 55%)"];

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-4 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            Dados em tempo real da API • {chats.length} conversas
            {lastUpdate && ` • Atualizado ${lastUpdate.toLocaleTimeString("pt-BR")}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
              autoRefresh
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-card text-muted-foreground border-border"
            )}
          >
            {autoRefresh ? "⏱ Auto 30s" : "⏸ Pausado"}
          </button>
          <button
            onClick={() => loadData(true)}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Atualizar
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard
          title="Status"
          value={status?.connected ? "Online" : "Offline"}
          subtitle={status?.phone || "—"}
          icon={status?.connected ? Wifi : WifiOff}
          color={status?.connected ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}
          onClick={() => navigate("/connection")}
          loading={loading}
        />
        <KPICard
          title="Conversas Ativas"
          value={String(activeChats)}
          subtitle={`${waitingChats} aguardando`}
          icon={MessageSquare}
          color="bg-blue-500/10 text-blue-500"
          onClick={() => navigate("/conversations")}
          loading={loading}
        />
        <KPICard
          title="Mensagens"
          value={totalMessages.toLocaleString("pt-BR")}
          subtitle={`${sentMessages} env. / ${receivedMessages} rec.`}
          icon={Activity}
          color="bg-primary/10 text-primary"
          loading={loading}
        />
        <KPICard
          title="Tempo Médio"
          value={avgResponseTime}
          subtitle={`${stats?.responseSamples || 0} amostras`}
          icon={Clock}
          color="bg-warning/10 text-warning"
          loading={loading}
        />
        <KPICard
          title="Resolvidos"
          value={String(resolvedChats)}
          subtitle={`de ${chats.length} conversas`}
          icon={CheckCircle2}
          color="bg-primary/10 text-primary"
          loading={loading}
        />
      </div>

      {/* Row 1: Area + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Volume de Mensagens" subtitle={`${totalMessages} mensagens • Enviadas vs Recebidas por hora`} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={hourlyMessages}>
              <defs>
                <linearGradient id="gradEnv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(142, 72%, 29%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(142, 72%, 29%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradRec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(210, 80%, 55%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(210, 80%, 55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="hsl(210, 10%, 55%)" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(210, 10%, 55%)" />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="recebidas" stroke="hsl(210, 80%, 55%)" fill="url(#gradRec)" strokeWidth={2} name="Recebidas" />
              <Area type="monotone" dataKey="enviadas" stroke="hsl(142, 72%, 29%)" fill="url(#gradEnv)" strokeWidth={2} name="Enviadas" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status das Conversas" subtitle={`${chats.length} conversas totais`}>
          {statusDist.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusDist} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                    {statusDist.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {statusDist.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                    {s.name}: <span className="font-semibold text-foreground">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-10">Sem dados de status</p>
          )}
        </ChartCard>
      </div>

      {/* Row 2: Queue distribution + messages by chat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Distribuição por Fila" subtitle="Conversas por fila de atendimento">
          {queueDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={queueDist} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(210, 10%, 55%)" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(210, 10%, 55%)" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Conversas" radius={[4, 4, 0, 0]}>
                  {queueDist.map((_, i) => (
                    <Cell key={i} fill={queueColors[i % queueColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-10">Sem dados de filas</p>
          )}
        </ChartCard>

        <ChartCard title="Volume Diário" subtitle={`Últimos ${dailyVolume.length} dias • do servidor`}>
          {dailyVolume.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyVolume} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(210, 10%, 55%)" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(210, 10%, 55%)" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="enviadas" fill="hsl(142, 72%, 29%)" radius={[4, 4, 0, 0]} name="Enviadas" />
                <Bar dataKey="recebidas" fill="hsl(210, 80%, 55%)" radius={[4, 4, 0, 0]} name="Recebidas" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-10">Sem dados diários</p>
          )}
        </ChartCard>
      </div>

      {/* Row 3: Agent Table + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Desempenho por Atendente" subtitle="Baseado nos chats atribuídos" className="lg:col-span-2">
          {agentPerf.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-[11px] font-medium text-muted-foreground pb-2 pr-4">Atendente</th>
                    <th className="text-center text-[11px] font-medium text-muted-foreground pb-2 px-2">Atendimentos</th>
                    <th className="text-center text-[11px] font-medium text-muted-foreground pb-2 px-2">Resolvidos</th>
                    <th className="text-center text-[11px] font-medium text-muted-foreground pb-2 px-2">Taxa</th>
                    <th className="text-left text-[11px] font-medium text-muted-foreground pb-2 pl-2">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {agentPerf.map((agent, i) => {
                    const rate = agent.atendimentos > 0 ? Math.round((agent.resolvidos / agent.atendimentos) * 100) : 0;
                    return (
                      <tr key={agent.name} className="border-b border-border last:border-0">
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              {i + 1}
                            </div>
                            <span className="text-sm font-medium text-foreground">{agent.name}</span>
                          </div>
                        </td>
                        <td className="text-center text-sm text-foreground py-2.5">{agent.atendimentos}</td>
                        <td className="text-center text-sm text-foreground py-2.5">{agent.resolvidos}</td>
                        <td className="text-center py-2.5">
                          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-md",
                            rate >= 90 ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"
                          )}>{rate}%</span>
                        </td>
                        <td className="pl-2 py-2.5">
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${rate}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-10">Nenhum atendente com chats atribuídos</p>
          )}
        </ChartCard>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Resumo em Tempo Real</h3>
            <div className="space-y-3">
              {[
                { icon: CheckCircle2, label: "Resolvidos", value: String(resolvedChats), color: "text-primary" },
                { icon: PauseCircle, label: "Aguardando", value: String(waitingChats), color: "text-warning" },
                { icon: AlertCircle, label: "Não lidas", value: String(totalUnread), color: "text-destructive" },
                { icon: Clock, label: "Tempo médio", value: avgResponseTime, color: "text-warning" },
                { icon: Users, label: "Grupos", value: String(stats?.totalGroups || chats.filter((c) => c.isGroup).length), color: "text-blue-500" },
                { icon: MessageSquare, label: "Mensagens total", value: String(totalMessages), color: "text-primary" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <item.icon className={cn("w-4 h-4", item.color)} />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
