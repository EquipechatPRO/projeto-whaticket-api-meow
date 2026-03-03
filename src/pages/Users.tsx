import { useState } from "react";
import { useAuth, type UserRole } from "@/stores/auth-store";
import { useTranslation } from "@/i18n/translations";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Edit2, Trash2, X, UserPlus, Shield, Eye, EyeOff,
} from "lucide-react";

interface Agent {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "inactive";
  createdAt: string;
}

const initialAgents: Agent[] = [
  { id: "u2", name: "Carlos Silva", email: "carlos@techcorp.com", role: "company_admin", status: "active", createdAt: "2025-01-15" },
  { id: "u3", name: "Ana Souza", email: "ana@techcorp.com", role: "agent", status: "active", createdAt: "2025-02-10" },
  { id: "u5", name: "Marcos Lima", email: "marcos@techcorp.com", role: "agent", status: "active", createdAt: "2025-03-01" },
  { id: "u6", name: "Julia Costa", email: "julia@techcorp.com", role: "supervisor", status: "inactive", createdAt: "2025-02-20" },
];

export default function Users() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Agent | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("agent");
  const [formStatus, setFormStatus] = useState<"active" | "inactive">("active");
  const [showPassword, setShowPassword] = useState(false);

  const roleLabels: Record<UserRole, string> = {
    super_admin: t("role.super_admin"),
    company_admin: t("role.company_admin"),
    supervisor: t("role.supervisor"),
    agent: t("role.agent"),
  };

  const roleColors: Record<UserRole, string> = {
    super_admin: "bg-destructive/10 text-destructive",
    company_admin: "bg-primary/10 text-primary",
    supervisor: "bg-warning/10 text-warning-foreground",
    agent: "bg-info/10 text-info-foreground",
  };

  const filtered = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("agent");
    setFormStatus("active");
    setShowPassword(false);
    setShowModal(true);
  };

  const openEdit = (agent: Agent) => {
    setEditing(agent);
    setFormName(agent.name);
    setFormEmail(agent.email);
    setFormPassword("");
    setFormRole(agent.role);
    setFormStatus(agent.status);
    setShowPassword(false);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formName.trim() || !formEmail.trim()) {
      toast.error(t("users.fill_required"));
      return;
    }
    if (!editing && !formPassword.trim()) {
      toast.error(t("users.fill_required"));
      return;
    }

    if (editing) {
      setAgents((prev) =>
        prev.map((a) =>
          a.id === editing.id
            ? { ...a, name: formName, email: formEmail, role: formRole, status: formStatus }
            : a
        )
      );
      toast.success(t("users.updated"));
    } else {
      const newAgent: Agent = {
        id: `u${Date.now()}`,
        name: formName,
        email: formEmail,
        role: formRole,
        status: formStatus,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setAgents((prev) => [...prev, newAgent]);
      toast.success(t("users.created"));
    }
    setShowModal(false);
  };

  const handleDelete = (agent: Agent) => {
    setAgents((prev) => prev.filter((a) => a.id !== agent.id));
    toast.success(t("users.deleted", agent.name));
    setConfirmDelete(null);
  };

  const canManage = user?.role === "company_admin" || user?.role === "super_admin";

  if (!canManage) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Shield className="w-8 h-8 mr-2 opacity-30" />
        <p className="text-sm">{t("users.no_permission")}</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("users.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {agents.length} {t("users.agents_count")}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          {t("users.new_user")}
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 mb-4 max-w-md">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("users.search")}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("users.col_name")}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("users.col_email")}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("users.col_role")}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("users.col_status")}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("users.col_created")}</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{t("users.col_actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((agent) => (
              <tr key={agent.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{agent.name.charAt(0)}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">{agent.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{agent.email}</td>
                <td className="px-4 py-3">
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", roleColors[agent.role])}>
                    {roleLabels[agent.role]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                    agent.status === "active" ? "bg-success/10 text-success-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {agent.status === "active" ? t("users.active") : t("users.inactive")}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{agent.createdAt}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEdit(agent)}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      title={t("common.edit")}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(agent)}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title={t("common.delete")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">
                  {t("users.no_results")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">
                {editing ? t("users.edit_user") : t("users.new_user")}
              </h2>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t("users.col_name")}</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder={t("users.name_placeholder")}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t("users.col_email")}</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder={t("users.email_placeholder")}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  {t("login.password")} {editing && <span className="text-muted-foreground font-normal">({t("users.password_optional")})</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 pr-10 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t("users.col_role")}</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                  >
                    <option value="agent">{roleLabels.agent}</option>
                    <option value="supervisor">{roleLabels.supervisor}</option>
                    <option value="company_admin">{roleLabels.company_admin}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t("users.col_status")}</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "active" | "inactive")}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                  >
                    <option value="active">{t("users.active")}</option>
                    <option value="inactive">{t("users.inactive")}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                {editing ? t("common.save") : t("common.create")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setConfirmDelete(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-2">{t("users.delete_title")}</h2>
            <p className="text-sm text-muted-foreground mb-6">
              {t("users.delete_confirm", confirmDelete.name)}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-semibold hover:bg-destructive/90 transition-colors"
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
