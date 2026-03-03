import { useState, useMemo } from "react";
import {
  Building2, Users, CreditCard, Search, TrendingUp, Clock, Plus,
  Eye, Ban, Trash2, X, Edit2, CheckCircle2, AlertTriangle, RefreshCw,
  Shield, Mail, Phone, FileText, Power, Package, DollarSign, Zap,
  BarChart3, MessageSquare, Activity,
} from "lucide-react";
import { useCompanyStore, type Company } from "@/stores/company-store";
import { usePlanStore, type Plan } from "@/stores/plan-store";
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
type ActiveTab = "companies" | "plans" | "reports";

export default function SuperAdmin() {
  const { t } = useTranslation();
  const { companies, addCompany, updateCompany, deleteCompany } = useCompanyStore();
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

  const handleSave = () => {
    if (!formName.trim() || !formEmail.trim()) { toast.error("Preencha nome e e-mail da empresa"); return; }
    const slug = formSlug.trim() || formName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (modalMode === "create") {
      addCompany({ name: formName, slug, email: formEmail, phone: formPhone || undefined, plan: formPlan, status: formStatus, maxAgents: formMaxAgents, agentCount: 0, notes: formNotes || undefined });
      toast.success(`Empresa "${formName}" criada com sucesso`);
    } else if (modalMode === "edit" && selectedCompany) {
      updateCompany(selectedCompany.id, { name: formName, slug, email: formEmail, phone: formPhone || undefined, plan: formPlan, status: formStatus, maxAgents: formMaxAgents, notes: formNotes || undefined });
      toast.success(`Empresa "${formName}" atualizada`);
    }
    setModalMode(null);
  };

  const handleDelete = (c: Company) => { deleteCompany(c.id); toast.success(`Empresa "${c.name}" removida`); setConfirmDelete(null); };
  const toggleStatus = (c: Company) => {
    const newStatus = c.status === "suspended" ? "active" : "suspended";
    updateCompany(c.id, { status: newStatus });
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
