import { useState, useEffect, useMemo } from "react";
import api from "@/services/api";
import {
  Wifi, WifiOff, MessageSquare, Users, Clock, TrendingUp,
  ArrowUpRight, ArrowDownRight, Phone, BarChart3, Activity,
  CheckCircle2, PauseCircle, AlertCircle, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, LineChart, Line,
} from "recharts";

// ── Mock data for Power BI-style charts ──

const hourlyMessages = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, "0")}h`,
  enviadas: Math.floor(Math.random() * 80 + (i > 7 && i < 20 ? 40 : 5)),
  recebidas: Math.floor(Math.random() * 100 + (i > 7 && i < 20 ? 60 : 8)),
}));

const weeklyData = [
  { day: "Seg", atendimentos: 124, resolvidos: 98, tempo: 4.2 },
  { day: "Ter", atendimentos: 156, resolvidos: 132, tempo: 3.8 },
  { day: "Qua", atendimentos: 189, resolvidos: 165, tempo: 3.5 },
  { day: "Qui", atendimentos: 142, resolvidos: 120, tempo: 4.1 },
  { day: "Sex", atendimentos: 198, resolvidos: 178, tempo: 3.2 },
  { day: "Sáb", atendimentos: 67, resolvidos: 60, tempo: 2.8 },
  { day: "Dom", atendimentos: 34, resolvidos: 30, tempo: 2.5 },
];

const agentPerformance = [
  { name: "Carlos S.", atendimentos: 45, resolvidos: 42, satisfacao: 94 },
  { name: "Ana P.", atendimentos: 38, resolvidos: 35, satisfacao: 97 },
  { name: "Pedro L.", atendimentos: 52, resolvidos: 48, satisfacao: 91 },
  { name: "Maria F.", atendimentos: 41, resolvidos: 39, satisfacao: 96 },
  { name: "João R.", atendimentos: 33, resolvidos: 30, satisfacao: 89 },
];

const statusDistribution = [
  { name: "Em atendimento", value: 23, color: "hsl(142, 72%, 29%)" },
  { name: "Aguardando", value: 15, color: "hsl(38, 92%, 50%)" },
  { name: "Resolvidos", value: 89, color: "hsl(210, 80%, 55%)" },
  { name: "Pausados", value: 8, color: "hsl(210, 10%, 55%)" },
];

const channelData = [
  { name: "WhatsApp", value: 78 },
  { name: "Telegram", value: 12 },
  { name: "Webchat", value: 10 },
];

const satisfactionTrend = Array.from({ length: 14 }, (_, i) => ({
  date: `${i + 1}/03`,
  score: Math.floor(Math.random() * 10 + 85),
  nps: Math.floor(Math.random() * 15 + 60),
}));

// ── Helpers ──

const KPICard = ({
  title, value, subtitle, icon: Icon, trend, trendValue, color, onClick,
}: {
  title: string; value: string; subtitle?: string; icon: React.ElementType;
  trend?: "up" | "down"; trendValue?: string; color: string; onClick?: () => void;
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
    <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
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
      <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground">
        <Filter className="w-3.5 h-3.5" />
      </button>
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
  const [chatCount, setChatCount] = useState(0);
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");

  useEffect(() => {
    api.getStatus().then(setStatus).catch(() => setStatus({ connected: false }));
    api.getChats().then((c) => setChatCount(c.length)).catch(() => {});
  }, []);

  const totalMessages = useMemo(() =>
    hourlyMessages.reduce((a, b) => a + b.enviadas + b.recebidas, 0), []);
  const avgResponseTime = "3m 24s";
  const satisfactionScore = "94%";

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-4 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground">Visão geral do atendimento em tempo real</p>
        </div>
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-0.5">
          {(["today", "week", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p === "today" ? "Hoje" : p === "week" ? "Semana" : "Mês"}
            </button>
          ))}
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
        />
        <KPICard
          title="Conversas Ativas"
          value={String(chatCount || 135)}
          trend="up" trendValue="+12%"
          icon={MessageSquare}
          color="bg-info/10 text-info"
          onClick={() => navigate("/conversations")}
        />
        <KPICard
          title="Mensagens Hoje"
          value={totalMessages.toLocaleString("pt-BR")}
          trend="up" trendValue="+8%"
          icon={Activity}
          color="bg-primary/10 text-primary"
        />
        <KPICard
          title="Tempo Médio"
          value={avgResponseTime}
          trend="down" trendValue="-15%"
          subtitle="de resposta"
          icon={Clock}
          color="bg-warning/10 text-warning"
        />
        <KPICard
          title="Satisfação"
          value={satisfactionScore}
          trend="up" trendValue="+3%"
          subtitle="CSAT"
          icon={TrendingUp}
          color="bg-primary/10 text-primary"
        />
      </div>

      {/* Row 1: Area + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Volume de Mensagens" subtitle="Enviadas vs Recebidas por hora" className="lg:col-span-2">
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

        <ChartCard title="Status das Conversas" subtitle="Distribuição atual">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                {statusDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {statusDistribution.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                {s.name}: <span className="font-semibold text-foreground">{s.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Row 2: Bar + Line */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Atendimentos por Dia" subtitle="Abertos vs Resolvidos na semana">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(210, 10%, 55%)" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(210, 10%, 55%)" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="atendimentos" fill="hsl(210, 80%, 55%)" radius={[4, 4, 0, 0]} name="Abertos" />
              <Bar dataKey="resolvidos" fill="hsl(142, 72%, 29%)" radius={[4, 4, 0, 0]} name="Resolvidos" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Satisfação & NPS" subtitle="Últimos 14 dias">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={satisfactionTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(210, 10%, 55%)" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(210, 10%, 55%)" domain={[50, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="score" stroke="hsl(142, 72%, 29%)" strokeWidth={2} dot={{ r: 3 }} name="CSAT %" />
              <Line type="monotone" dataKey="nps" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 3 }} name="NPS" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3: Agent Table + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Desempenho por Atendente" subtitle="Ranking do período" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[11px] font-medium text-muted-foreground pb-2 pr-4">Atendente</th>
                  <th className="text-center text-[11px] font-medium text-muted-foreground pb-2 px-2">Atendimentos</th>
                  <th className="text-center text-[11px] font-medium text-muted-foreground pb-2 px-2">Resolvidos</th>
                  <th className="text-center text-[11px] font-medium text-muted-foreground pb-2 px-2">Taxa</th>
                  <th className="text-center text-[11px] font-medium text-muted-foreground pb-2 px-2">CSAT</th>
                  <th className="text-left text-[11px] font-medium text-muted-foreground pb-2 pl-2">Performance</th>
                </tr>
              </thead>
              <tbody>
                {agentPerformance.map((agent, i) => {
                  const rate = Math.round((agent.resolvidos / agent.atendimentos) * 100);
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
                      <td className="text-center text-sm font-semibold text-foreground py-2.5">{agent.satisfacao}%</td>
                      <td className="pl-2 py-2.5">
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-primary transition-all"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <div className="space-y-4">
          <ChartCard title="Tempo Médio por Dia" subtitle="Minutos de resposta">
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={weeklyData}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(210, 10%, 55%)" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="tempo" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} name="Tempo (min)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Resumo Rápido</h3>
            <div className="space-y-3">
              {[
                { icon: CheckCircle2, label: "Resolvidos hoje", value: "89", color: "text-primary" },
                { icon: PauseCircle, label: "Em espera", value: "15", color: "text-warning" },
                { icon: AlertCircle, label: "SLA violado", value: "3", color: "text-destructive" },
                { icon: Phone, label: "Chamadas ativas", value: "2", color: "text-info" },
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
