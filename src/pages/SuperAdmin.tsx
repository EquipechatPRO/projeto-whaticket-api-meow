import { useState } from "react";
import {
  Building2, Users, CreditCard, Search, TrendingUp, Clock, Plus,
  Eye, Ban, Trash2, X, Edit2, CheckCircle2, AlertTriangle, RefreshCw,
  Shield, Mail, Phone, FileText, Power,
} from "lucide-react";
import { useCompanyStore, type Company } from "@/stores/company-store";
import { useTranslation } from "@/i18n/translations";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

export default function SuperAdmin() {
  const { t } = useTranslation();
  const { companies, addCompany, updateCompany, deleteCompany } = useCompanyStore();
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Company | null>(null);

  // Form state
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
    setModalMode("create");
    setSelectedCompany(null);
    setFormName("");
    setFormSlug("");
    setFormEmail("");
    setFormPhone("");
    setFormPlan("free");
    setFormStatus("trial");
    setFormMaxAgents(2);
    setFormNotes("");
  };

  const openEdit = (c: Company) => {
    setModalMode("edit");
    setSelectedCompany(c);
    setFormName(c.name);
    setFormSlug(c.slug);
    setFormEmail(c.email);
    setFormPhone(c.phone || "");
    setFormPlan(c.plan);
    setFormStatus(c.status);
    setFormMaxAgents(c.maxAgents);
    setFormNotes(c.notes || "");
  };

  const openView = (c: Company) => {
    setModalMode("view");
    setSelectedCompany(c);
  };

  const handleSave = () => {
    if (!formName.trim() || !formEmail.trim()) {
      toast.error("Preencha nome e e-mail da empresa");
      return;
    }
    const slug = formSlug.trim() || formName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    if (modalMode === "create") {
      addCompany({
        name: formName,
        slug,
        email: formEmail,
        phone: formPhone || undefined,
        plan: formPlan,
        status: formStatus,
        maxAgents: formMaxAgents,
        agentCount: 0,
        notes: formNotes || undefined,
      });
      toast.success(`Empresa "${formName}" criada com sucesso`);
    } else if (modalMode === "edit" && selectedCompany) {
      updateCompany(selectedCompany.id, {
        name: formName,
        slug,
        email: formEmail,
        phone: formPhone || undefined,
        plan: formPlan,
        status: formStatus,
        maxAgents: formMaxAgents,
        notes: formNotes || undefined,
      });
      toast.success(`Empresa "${formName}" atualizada`);
    }
    setModalMode(null);
  };

  const handleDelete = (c: Company) => {
    deleteCompany(c.id);
    toast.success(`Empresa "${c.name}" removida`);
    setConfirmDelete(null);
  };

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
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
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
              <s.icon className={cn("w-5 h-5", s.color)} />
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 max-w-sm">
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar empresa ou e-mail..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
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
                      <StatusIcon className="w-3.5 h-3.5" />
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-foreground">{c.agentCount}</span>
                    <span className="text-muted-foreground text-xs">/{c.maxAgents}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{c.createdAt}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openView(c)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Visualizar">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => openEdit(c)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Editar">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => toggleStatus(c)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title={c.status === "suspended" ? "Reativar" : "Suspender"}>
                        {c.status === "suspended" ? <Power className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => setConfirmDelete(c)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Excluir">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">Nenhuma empresa encontrada</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {(modalMode === "create" || modalMode === "edit") && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModalMode(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">
                {modalMode === "create" ? "Cadastrar Empresa" : `Editar: ${selectedCompany?.name}`}
              </h2>
              <button onClick={() => setModalMode(null)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
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
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Status</label>
                  <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as Company["status"])}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none">
                    <option value="trial">Trial</option>
                    <option value="active">Ativo</option>
                    <option value="suspended">Suspenso</option>
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
              <button onClick={() => setModalMode(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
                {modalMode === "create" ? "Cadastrar" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modalMode === "view" && selectedCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModalMode(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                {selectedCompany.name}
              </h2>
              <button onClick={() => setModalMode(null)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
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
              <button onClick={() => { setModalMode(null); openEdit(selectedCompany); }} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
                Editar empresa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setConfirmDelete(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-2">Excluir empresa</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Tem certeza que deseja excluir <strong>"{confirmDelete.name}"</strong>? Todos os dados, atendentes e conversas serão removidos permanentemente.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-semibold hover:bg-destructive/90 transition-colors">
                Excluir permanentemente
              </button>
            </div>
          </div>
        </div>
      )}
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
