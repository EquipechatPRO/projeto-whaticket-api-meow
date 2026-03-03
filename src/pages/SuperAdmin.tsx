import { useState } from "react";
import {
  Building2, Users, CreditCard, Search, MoreVertical,
  TrendingUp, AlertTriangle, CheckCircle2, Clock, Plus,
  Eye, Ban, Trash2, ChevronDown,
} from "lucide-react";
import { getMockCompanies, type Company } from "@/stores/auth-store";
import { toast } from "sonner";

const plans: Record<string, { label: string; color: string }> = {
  free: { label: "Free", color: "bg-muted text-muted-foreground" },
  starter: { label: "Starter", color: "bg-info/10 text-info" },
  professional: { label: "Professional", color: "bg-primary/10 text-primary" },
  enterprise: { label: "Enterprise", color: "bg-warning/10 text-warning" },
};

const statuses: Record<string, { label: string; color: string }> = {
  active: { label: "Ativo", color: "text-primary" },
  trial: { label: "Trial", color: "text-warning" },
  suspended: { label: "Suspenso", color: "text-destructive" },
};

export default function SuperAdmin() {
  const companies = getMockCompanies();
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState<string>("all");

  const filtered = companies.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchPlan = filterPlan === "all" || c.plan === filterPlan;
    return matchSearch && matchPlan;
  });

  const stats = [
    { label: "Total empresas", value: companies.length, icon: Building2, color: "text-primary" },
    { label: "Atendentes ativos", value: companies.reduce((a, c) => a + c.agentCount, 0), icon: Users, color: "text-info" },
    { label: "Em trial", value: companies.filter((c) => c.status === "trial").length, icon: Clock, color: "text-warning" },
    { label: "Receita mensal", value: "R$ 4.850", icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel Super Admin</h1>
          <p className="text-sm text-muted-foreground">Gerencie todas as empresas da plataforma</p>
        </div>
        <button
          onClick={() => toast.info("Funcionalidade disponível em breve")}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Nova empresa
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-sm">
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar empresa..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        </div>
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground outline-none"
        >
          <option value="all">Todos os planos</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="professional">Professional</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Empresa</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Plano</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Atendentes</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Criado em</th>
              <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.slug}.whatspanel.com</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-md ${plans[c.plan].color}`}>
                    {plans[c.plan].label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${statuses[c.status].color}`}>
                    {statuses[c.status].label}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-foreground">
                  {c.agentCount}/{c.maxAgents}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{c.createdAt}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => toast.info("Visualizar empresa")}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toast.info("Suspender empresa")}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground"
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toast.error("Excluir empresa")}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-destructive/10 text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
