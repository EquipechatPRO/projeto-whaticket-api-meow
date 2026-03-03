import { useState, useMemo } from "react";
import {
  Building2, Users, CreditCard, Search, TrendingUp, Clock, Plus,
  Eye, Ban, Trash2, X, Edit2, CheckCircle2, AlertTriangle, RefreshCw,
  Shield, Mail, Phone, FileText, Power, Package, DollarSign, Zap,
  BarChart3, MessageSquare, Activity, ScrollText, Filter,
} from "lucide-react";
import { useCompanyStore, type Company } from "@/stores/company-store";
import { usePlanStore, type Plan } from "@/stores/plan-store";
import { useAuditStore, actionLabels, actionColors, type AuditAction } from "@/stores/audit-store";
import { useAuth } from "@/stores/auth-store";
import { useTranslation } from "@/i18n/translations";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, Area, AreaChart,
} from "recharts";

const planConfig: Record<string, { label: string; color: string; maxAgentsDefault: number }> = {
  free: { label: "Free", color: "bg-muted text-muted-foreground", maxAgentsDefault: 2 },
  starter: { label: "Starter", color: "bg-info/10 text-info-foreground", maxAgentsDefault: 5 },
  professional: { label: "Professional", color: "bg-primary/10 text-primary", maxAgentsDefault: 20 },
  enterprise: { label: "Enterprise", color: "bg-warning/10 text-warning-foreground", maxAgentsDefault: 50 },
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  active: { label: "Ativo", color: "text-success-foreground", icon: CheckCircle2 },
  trial: { label: "Trial", color: "text-warning-foreground", icon: Clock },
  suspended: { label: "Suspenso", color: "text-destructive", icon: AlertTriangle },
};

type ModalMode = "create" | "edit" | "view" | null;
type ActiveTab = "companies" | "plans" | "reports" | "audit";

export default function SuperAdmin() {
  const { t } = useTranslation();
  const { companies, addCompany, updateCompany, deleteCompany } = useCompanyStore();
  const { addLog } = useAuditStore();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>("companies");
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Company | null>(null);

  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPlan, setFormPlan] = useState<Company["plan"]>("free");
  const [formStatus, setFormStatus] = useState<Company["status"]>("trial");
  const [formMaxAgents, setFormMaxAgents] = useState(2);
  const [formNotes, setFormNotes] = useState("");

  const filtered = companies.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchPlan = filterPlan === "all" || c.plan === filterPlan;
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchPlan && matchStatus;
  });

  const stats = [
    { label: "Total empresas", value: companies.length, icon: Building2, color: "text-primary" },
    { label: "Atendentes ativos", value: companies.reduce((a, c) => a + c.agentCount, 0), icon: Users, color: "text-info-foreground" },
    { label: "Em trial", value: companies.filter((c) => c.status === "trial").length, icon: Clock, color: "text-warning-foreground" },
    { label: "Receita mensal", value: `R$ ${calcRevenue(companies)}`, icon: TrendingUp, color: "text-primary" },
  ];

  function calcRevenue(list: Company[]) {
    const prices: Record<string, number> = { free: 0, starter: 97, professional: 197, enterprise: 497 };
    return list.filter((c) => c.status !== "suspended").reduce((a, c) => a + (prices[c.plan] || 0), 0).toLocaleString("pt-BR");
  }

  const openCreate = () => {
    setModalMode("create"); setSelectedCompany(null);
    setFormName(""); setFormSlug(""); setFormEmail(""); setFormPhone("");
    setFormPlan("free"); setFormStatus("trial"); setFormMaxAgents(2); setFormNotes("");
  };

  const openEdit = (c: Company) => {
    setModalMode("edit"); setSelectedCompany(c);
    setFormName(c.name); setFormSlug(c.slug); setFormEmail(c.email); setFormPhone(c.phone || "");
    setFormPlan(c.plan); setFormStatus(c.status); setFormMaxAgents(c.maxAgents); setFormNotes(c.notes || "");
  };

  const openView = (c: Company) => { setModalMode("view"); setSelectedCompany(c); };

  const logAction = (action: AuditAction, label: string, description: string, targetType: "company" | "plan" | "user" | "system", targetName: string, details?: Record<string, string>) => {
    addLog({ action, label, description, user: user?.name || "Admin", userEmail: user?.email || "", targetType, targetName, details });
  };

  const handleSave = () => {
    if (!formName.trim() || !formEmail.trim()) { toast.error("Preencha nome e e-mail da empresa"); return; }
    const slug = formSlug.trim() || formName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (modalMode === "create") {
      addCompany({ name: formName, slug, email: formEmail, phone: formPhone || undefined, plan: formPlan, status: formStatus, maxAgents: formMaxAgents, agentCount: 0, notes: formNotes || undefined });
      logAction("company_created", "Empresa criada", `Empresa "${formName}" foi cadastrada com plano ${formPlan}`, "company", formName, { plano: formPlan, email: formEmail });
      toast.success(`Empresa "${formName}" criada com sucesso`);
    } else if (modalMode === "edit" && selectedCompany) {
      updateCompany(selectedCompany.id, { name: formName, slug, email: formEmail, phone: formPhone || undefined, plan: formPlan, status: formStatus, maxAgents: formMaxAgents, notes: formNotes || undefined });
      logAction("company_updated", "Empresa atualizada", `Empresa "${formName}" foi atualizada`, "company", formName);
      toast.success(`Empresa "${formName}" atualizada`);
    }
    setModalMode(null);
  };

  const handleDelete = (c: Company) => {
    deleteCompany(c.id);
    logAction("company_deleted", "Empresa excluída", `Empresa "${c.name}" foi excluída permanentemente`, "company", c.name);
    toast.success(`Empresa "${c.name}" removida`);
    setConfirmDelete(null);
  };
  const toggleStatus = (c: Company) => {
    const newStatus = c.status === "suspended" ? "active" : "suspended";
    updateCompany(c.id, { status: newStatus });
    logAction(newStatus === "suspended" ? "company_suspended" : "company_reactivated", newStatus === "suspended" ? "Empresa suspensa" : "Empresa reativada", `Empresa "${c.name}" foi ${newStatus === "suspended" ? "suspensa" : "reativada"}`, "company", c.name);
    toast.success(`Empresa "${c.name}" ${newStatus === "suspended" ? "suspensa" : "reativada"}`);
  };

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Painel Master Admin
          </h1>
          <p className="text-sm text-muted-foreground">Gerencie empresas, planos e configurações globais da plataforma</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className={cn("w-5 h-5", s.color)} />
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/50 border border-border rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("companies")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === "companies" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Building2 className="w-4 h-4" /> Empresas
        </button>
        <button
          onClick={() => setActiveTab("plans")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === "plans" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Package className="w-4 h-4" /> Planos
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === "reports" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <BarChart3 className="w-4 h-4" /> Relatórios
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === "audit" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ScrollText className="w-4 h-4" /> Auditoria
        </button>
      </div>

      {activeTab === "companies" && (
        <>
          {/* Company action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap flex-1">
              <div className="flex-1 max-w-sm">
                <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar empresa ou e-mail..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
                </div>
              </div>
              <select value={filterPlan} onChange={(e) => setFilterPlan(e.target.value)} className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground outline-none">
                <option value="all">Todos os planos</option>
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground outline-none">
                <option value="all">Todos os status</option>
                <option value="active">Ativo</option>
                <option value="trial">Trial</option>
                <option value="suspended">Suspenso</option>
              </select>
            </div>
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors ml-3">
              <Plus className="w-4 h-4" /> Nova empresa
            </button>
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Empresa</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Plano</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Atendentes</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Criado em</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const plan = planConfig[c.plan];
                  const status = statusConfig[c.status];
                  const StatusIcon = status.icon;
                  return (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", plan.color)}>{plan.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("flex items-center gap-1.5 text-xs font-medium", status.color)}>
                          <StatusIcon className="w-3.5 h-3.5" /> {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-foreground">{c.agentCount}</span>
                        <span className="text-muted-foreground text-xs">/{c.maxAgents}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{c.createdAt}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openView(c)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Visualizar"><Eye className="w-3.5 h-3.5" /></button>
                          <button onClick={() => openEdit(c)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => toggleStatus(c)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title={c.status === "suspended" ? "Reativar" : "Suspender"}>
                            {c.status === "suspended" ? <Power className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => setConfirmDelete(c)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">Nenhuma empresa encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === "plans" && <PlansTab />}

      {activeTab === "reports" && <ReportsTab companies={companies} />}

      {activeTab === "audit" && <AuditTab />}

      {/* Create/Edit Modal */}
      {(modalMode === "create" || modalMode === "edit") && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModalMode(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">{modalMode === "create" ? "Cadastrar Empresa" : `Editar: ${selectedCompany?.name}`}</h2>
              <button onClick={() => setModalMode(null)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Nome da empresa *</label>
                  <input type="text" value={formName} onChange={(e) => { setFormName(e.target.value); if (modalMode === "create") setFormSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30" placeholder="Nome da empresa" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Slug</label>
                  <input type="text" value={formSlug} onChange={(e) => setFormSlug(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30" placeholder="slug-da-empresa" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">E-mail *</label>
                  <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30" placeholder="admin@empresa.com" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Telefone</label>
                  <input type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30" placeholder="(11) 99999-9999" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Plano</label>
                  <select value={formPlan} onChange={(e) => { const p = e.target.value as Company["plan"]; setFormPlan(p); setFormMaxAgents(planConfig[p].maxAgentsDefault); }}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none">
                    <option value="free">Free</option><option value="starter">Starter</option><option value="professional">Professional</option><option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Status</label>
                  <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as Company["status"])}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none">
                    <option value="trial">Trial</option><option value="active">Ativo</option><option value="suspended">Suspenso</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Max atendentes</label>
                  <input type="number" value={formMaxAgents} onChange={(e) => setFormMaxAgents(Number(e.target.value))} min={1}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Observações</label>
                <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={3}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="Notas internas sobre a empresa..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setModalMode(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">{modalMode === "create" ? "Cadastrar" : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modalMode === "view" && selectedCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModalMode(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" />{selectedCompany.name}</h2>
              <button onClick={() => setModalMode(null)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <InfoRow icon={Mail} label="E-mail" value={selectedCompany.email} />
              {selectedCompany.phone && <InfoRow icon={Phone} label="Telefone" value={selectedCompany.phone} />}
              <InfoRow icon={CreditCard} label="Plano" value={planConfig[selectedCompany.plan].label} />
              <InfoRow icon={CheckCircle2} label="Status" value={statusConfig[selectedCompany.status].label} />
              <InfoRow icon={Users} label="Atendentes" value={`${selectedCompany.agentCount}/${selectedCompany.maxAgents}`} />
              <InfoRow icon={Clock} label="Criado em" value={selectedCompany.createdAt} />
              {selectedCompany.notes && <InfoRow icon={FileText} label="Observações" value={selectedCompany.notes} />}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => { setModalMode(null); openEdit(selectedCompany); }} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">Editar empresa</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setConfirmDelete(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-2">Excluir empresa</h2>
            <p className="text-sm text-muted-foreground mb-6">Tem certeza que deseja excluir <strong>"{confirmDelete.name}"</strong>? Todos os dados serão removidos permanentemente.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-semibold hover:bg-destructive/90 transition-colors">Excluir permanentemente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Plans Tab ─── */
function PlansTab() {
  const { plans, addPlan, updatePlan, deletePlan } = usePlanStore();
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<Plan | null>(null);
  const [confirmDel, setConfirmDel] = useState<Plan | null>(null);

  // form
  const [fName, setFName] = useState("");
  const [fSlug, setFSlug] = useState("");
  const [fMonthly, setFMonthly] = useState(0);
  const [fYearly, setFYearly] = useState(0);
  const [fAgents, setFAgents] = useState(5);
  const [fQueues, setFQueues] = useState(3);
  const [fContacts, setFContacts] = useState(1000);
  const [fFeatures, setFFeatures] = useState("");
  const [fActive, setFActive] = useState(true);

  const openCreate = () => {
    setModal("create"); setSelected(null);
    setFName(""); setFSlug(""); setFMonthly(0); setFYearly(0);
    setFAgents(5); setFQueues(3); setFContacts(1000); setFFeatures(""); setFActive(true);
  };

  const openEdit = (p: Plan) => {
    setModal("edit"); setSelected(p);
    setFName(p.name); setFSlug(p.slug); setFMonthly(p.monthlyPrice); setFYearly(p.yearlyPrice);
    setFAgents(p.maxAgents); setFQueues(p.maxQueues); setFContacts(p.maxContacts);
    setFFeatures(p.features.join("\n")); setFActive(p.isActive);
  };

  const handleSave = () => {
    if (!fName.trim()) { toast.error("Preencha o nome do plano"); return; }
    const slug = fSlug.trim() || fName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const features = fFeatures.split("\n").map((f) => f.trim()).filter(Boolean);

    if (modal === "create") {
      addPlan({ name: fName, slug, monthlyPrice: fMonthly, yearlyPrice: fYearly, maxAgents: fAgents, maxQueues: fQueues, maxContacts: fContacts, features, isActive: fActive });
      toast.success(`Plano "${fName}" criado`);
    } else if (modal === "edit" && selected) {
      updatePlan(selected.id, { name: fName, slug, monthlyPrice: fMonthly, yearlyPrice: fYearly, maxAgents: fAgents, maxQueues: fQueues, maxContacts: fContacts, features, isActive: fActive });
      toast.success(`Plano "${fName}" atualizado`);
    }
    setModal(null);
  };

  const handleDel = (p: Plan) => { deletePlan(p.id); toast.success(`Plano "${p.name}" removido`); setConfirmDel(null); };

  const fmt = (v: number) => (v < 0 ? "Ilimitado" : v.toLocaleString("pt-BR"));
  const fmtPrice = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{plans.length} planos cadastrados</p>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Novo plano
        </button>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {plans.map((p) => (
          <div key={p.id} className={cn("bg-card border rounded-xl p-5 flex flex-col transition-colors", p.isActive ? "border-border" : "border-border opacity-60")}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-bold text-foreground">{p.name}</h3>
              </div>
              {!p.isActive && <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Inativo</span>}
            </div>

            <div className="mb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">{fmtPrice(p.monthlyPrice)}</span>
                <span className="text-xs text-muted-foreground">/mês</span>
              </div>
              <p className="text-xs text-muted-foreground">{fmtPrice(p.yearlyPrice)}/ano</p>
            </div>

            <div className="space-y-2 mb-4 flex-1">
              <LimitRow icon={Users} label="Atendentes" value={fmt(p.maxAgents)} />
              <LimitRow icon={Zap} label="Filas" value={fmt(p.maxQueues)} />
              <LimitRow icon={Mail} label="Contatos" value={fmt(p.maxContacts)} />
            </div>

            <div className="border-t border-border pt-3 mb-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Recursos</p>
              <ul className="space-y-1">
                {p.features.slice(0, 4).map((f, i) => (
                  <li key={i} className="text-xs text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-primary shrink-0" /> {f}
                  </li>
                ))}
                {p.features.length > 4 && <li className="text-xs text-muted-foreground">+{p.features.length - 4} recursos</li>}
              </ul>
            </div>

            <div className="flex items-center gap-1 pt-2 border-t border-border">
              <button onClick={() => openEdit(p)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors">
                <Edit2 className="w-3 h-3" /> Editar
              </button>
              <button onClick={() => updatePlan(p.id, { isActive: !p.isActive })} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors">
                <Power className="w-3 h-3" /> {p.isActive ? "Desativar" : "Ativar"}
              </button>
              <button onClick={() => setConfirmDel(p)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors">
                <Trash2 className="w-3 h-3" /> Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Plan Create/Edit Modal */}
      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModal(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">{modal === "create" ? "Criar Plano" : `Editar: ${selected?.name}`}</h2>
              <button onClick={() => setModal(null)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Nome do plano *</label>
                  <input type="text" value={fName} onChange={(e) => { setFName(e.target.value); if (modal === "create") setFSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: Professional" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Slug</label>
                  <input type="text" value={fSlug} onChange={(e) => setFSlug(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30" placeholder="professional" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Preço mensal (R$)</label>
                  <input type="number" value={fMonthly} onChange={(e) => setFMonthly(Number(e.target.value))} min={0}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Preço anual (R$)</label>
                  <input type="number" value={fYearly} onChange={(e) => setFYearly(Number(e.target.value))} min={0}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Max atendentes</label>
                  <input type="number" value={fAgents} onChange={(e) => setFAgents(Number(e.target.value))}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
                  <p className="text-[10px] text-muted-foreground mt-0.5">-1 = ilimitado</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Max filas</label>
                  <input type="number" value={fQueues} onChange={(e) => setFQueues(Number(e.target.value))}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
                  <p className="text-[10px] text-muted-foreground mt-0.5">-1 = ilimitado</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Max contatos</label>
                  <input type="number" value={fContacts} onChange={(e) => setFContacts(Number(e.target.value))}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
                  <p className="text-[10px] text-muted-foreground mt-0.5">-1 = ilimitado</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-muted-foreground">Ativo</label>
                <button onClick={() => setFActive(!fActive)} className={cn("w-10 h-5 rounded-full transition-colors relative", fActive ? "bg-primary" : "bg-muted")}>
                  <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform", fActive ? "left-5" : "left-0.5")} />
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Recursos (um por linha)</label>
                <textarea value={fFeatures} onChange={(e) => setFFeatures(e.target.value)} rows={5}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder={"1 conexão WhatsApp\nRespostas rápidas\nRelatórios básicos"} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">{modal === "create" ? "Criar plano" : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Plan Confirmation */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setConfirmDel(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-2">Excluir plano</h2>
            <p className="text-sm text-muted-foreground mb-6">Tem certeza que deseja excluir o plano <strong>"{confirmDel.name}"</strong>?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDel(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors">Cancelar</button>
              <button onClick={() => handleDel(confirmDel)} className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-semibold hover:bg-destructive/90 transition-colors">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Reports Tab ─── */
const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info, 200 80% 55%))",
  "hsl(var(--warning, 38 92% 50%))",
  "hsl(var(--destructive))",
  "hsl(150 60% 45%)",
  "hsl(280 60% 55%)",
];

function generateMockMetrics(companies: Company[]) {
  const seed = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  };

  return companies.filter(c => c.status !== "suspended").map((c) => {
    const s = seed(c.id);
    const conversations = 50 + (s % 500);
    const messages = conversations * (3 + (s % 8));
    const avgResponseTime = 1 + (s % 15);
    const satisfaction = 60 + (s % 40);
    return { name: c.name, slug: c.slug, plan: c.plan, conversations, messages, agents: c.agentCount, maxAgents: c.maxAgents, avgResponseTime, satisfaction };
  });
}

function generateMonthlyTrend(companies: Company[]) {
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
  return months.map((m, i) => {
    const base = companies.filter(c => c.status !== "suspended").length;
    return {
      month: m,
      conversas: Math.round(base * (80 + i * 30 + Math.sin(i) * 20)),
      mensagens: Math.round(base * (300 + i * 120 + Math.cos(i) * 80)),
      atendentes: companies.reduce((a, c) => a + c.agentCount, 0) + i * 2,
    };
  });
}

function ReportsTab({ companies }: { companies: Company[] }) {
  const metrics = useMemo(() => generateMockMetrics(companies), [companies]);
  const trend = useMemo(() => generateMonthlyTrend(companies), [companies]);

  const planDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    companies.forEach((c) => { counts[c.plan] = (counts[c.plan] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({
      name: planConfig[name]?.label || name,
      value,
    }));
  }, [companies]);

  const totalConversas = metrics.reduce((a, m) => a + m.conversations, 0);
  const totalMensagens = metrics.reduce((a, m) => a + m.messages, 0);
  const totalAgents = metrics.reduce((a, m) => a + m.agents, 0);
  const avgSatisfaction = metrics.length ? Math.round(metrics.reduce((a, m) => a + m.satisfaction, 0) / metrics.length) : 0;

  const summaryCards = [
    { label: "Total conversas", value: totalConversas.toLocaleString("pt-BR"), icon: MessageSquare, color: "text-primary" },
    { label: "Total mensagens", value: totalMensagens.toLocaleString("pt-BR"), icon: Mail, color: "text-info-foreground" },
    { label: "Atendentes ativos", value: totalAgents, icon: Users, color: "text-warning-foreground" },
    { label: "Satisfação média", value: `${avgSatisfaction}%`, icon: Activity, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className={cn("w-5 h-5", s.color)} />
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Evolução mensal
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="conversas" name="Conversas" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.15} strokeWidth={2} />
              <Area type="monotone" dataKey="mensagens" name="Mensagens" stroke={CHART_COLORS[1]} fill={CHART_COLORS[1]} fillOpacity={0.1} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Plan distribution */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" /> Distribuição por plano
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                {planDistribution.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 - Per company */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Conversations per company */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" /> Conversas por empresa
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={metrics} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="conversations" name="Conversas" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Messages per company */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" /> Mensagens por empresa
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={metrics} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="messages" name="Mensagens" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Agents usage + satisfaction */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Uso de atendentes por empresa
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="agents" name="Em uso" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="maxAgents" name="Limite" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} opacity={0.4} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Tempo de resposta e satisfação
          </h3>
          <div className="space-y-3">
            {metrics.map((m, i) => (
              <div key={m.slug} className="flex items-center gap-3">
                <div className="w-24 text-xs font-medium text-foreground truncate">{m.name}</div>
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Satisfação</span>
                      <span>{m.satisfaction}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${m.satisfaction}%`,
                          backgroundColor: m.satisfaction >= 80 ? CHART_COLORS[4] : m.satisfaction >= 60 ? CHART_COLORS[2] : CHART_COLORS[3],
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground w-16 text-right">
                    <span className="font-medium text-foreground">{m.avgResponseTime}min</span> resp.
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Detalhamento por empresa</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-2">Empresa</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-2">Plano</th>
              <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-2">Conversas</th>
              <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-2">Mensagens</th>
              <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-2">Atendentes</th>
              <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-2">Resp. média</th>
              <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-2">Satisfação</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.slug} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                <td className="px-4 py-2.5 text-sm font-medium text-foreground">{m.name}</td>
                <td className="px-4 py-2.5">
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", planConfig[m.plan]?.color || "bg-muted text-muted-foreground")}>
                    {planConfig[m.plan]?.label || m.plan}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-sm text-foreground text-right">{m.conversations.toLocaleString("pt-BR")}</td>
                <td className="px-4 py-2.5 text-sm text-foreground text-right">{m.messages.toLocaleString("pt-BR")}</td>
                <td className="px-4 py-2.5 text-sm text-foreground text-right">{m.agents}/{m.maxAgents}</td>
                <td className="px-4 py-2.5 text-sm text-foreground text-right">{m.avgResponseTime} min</td>
                <td className="px-4 py-2.5 text-right">
                  <span className={cn("text-xs font-semibold", m.satisfaction >= 80 ? "text-primary" : m.satisfaction >= 60 ? "text-warning-foreground" : "text-destructive")}>
                    {m.satisfaction}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Audit Tab ─── */
function AuditTab() {
  const { logs, clearLogs } = useAuditStore();
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterTarget, setFilterTarget] = useState("all");

  const filtered = logs.filter((l) => {
    const matchSearch = l.description.toLowerCase().includes(search.toLowerCase()) || l.targetName.toLowerCase().includes(search.toLowerCase()) || l.user.toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === "all" || l.action === filterAction;
    const matchTarget = filterTarget === "all" || l.targetType === filterTarget;
    return matchSearch && matchAction && matchTarget;
  });

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const actionIconMap: Record<string, typeof Building2> = {
    company_created: Plus,
    company_updated: Edit2,
    company_deleted: Trash2,
    company_suspended: Ban,
    company_reactivated: Power,
    plan_created: Plus,
    plan_updated: Edit2,
    plan_deleted: Trash2,
    plan_activated: Power,
    plan_deactivated: Ban,
    user_login: Users,
    user_logout: Users,
    settings_changed: Settings,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} de {logs.length} registros</p>
        <button onClick={() => { if (confirm("Limpar todos os logs de auditoria?")) { clearLogs(); toast.success("Logs limpos"); } }} className="text-xs text-destructive hover:underline">
          Limpar logs
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 max-w-sm">
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nos logs..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
          </div>
        </div>
        <select value={filterTarget} onChange={(e) => setFilterTarget(e.target.value)} className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground outline-none">
          <option value="all">Todos os tipos</option>
          <option value="company">Empresa</option>
          <option value="plan">Plano</option>
          <option value="user">Usuário</option>
          <option value="system">Sistema</option>
        </select>
        <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground outline-none">
          <option value="all">Todas as ações</option>
          <option value="company_created">Empresa criada</option>
          <option value="company_updated">Empresa atualizada</option>
          <option value="company_deleted">Empresa excluída</option>
          <option value="company_suspended">Empresa suspensa</option>
          <option value="company_reactivated">Empresa reativada</option>
          <option value="plan_created">Plano criado</option>
          <option value="plan_updated">Plano atualizado</option>
          <option value="plan_deleted">Plano excluído</option>
          <option value="user_login">Login</option>
        </select>
      </div>

      {/* Timeline */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ScrollText className="w-8 h-8 mb-3 opacity-30" />
            <p className="text-sm">Nenhum log encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((log) => {
              const Icon = actionIconMap[log.action] || FileText;
              const color = actionColors[log.action] || "text-muted-foreground";
              return (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-accent/30 transition-colors">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", color.replace("text-", "bg-").replace("foreground", "foreground/10"))}>
                    <Icon className={cn("w-4 h-4", color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-xs font-semibold", color)}>{actionLabels[log.action]}</span>
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{log.targetType}</span>
                    </div>
                    <p className="text-sm text-foreground mt-0.5">{log.description}</p>
                    {log.details && (
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {Object.entries(log.details).map(([k, v]) => (
                          <span key={k} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                            {k}: {v}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{log.user}</span>
                      <span>{log.userEmail}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(log.timestamp)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function LimitRow({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="w-3 h-3" />{label}</span>
      <span className="text-xs font-semibold text-foreground">{value}</span>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}
