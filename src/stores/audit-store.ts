import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuditAction =
  | "company_created"
  | "company_updated"
  | "company_deleted"
  | "company_suspended"
  | "company_reactivated"
  | "plan_created"
  | "plan_updated"
  | "plan_deleted"
  | "plan_activated"
  | "plan_deactivated"
  | "user_login"
  | "user_logout"
  | "settings_changed";

export interface AuditLog {
  id: string;
  action: AuditAction;
  label: string;
  description: string;
  user: string;
  userEmail: string;
  targetType: "company" | "plan" | "user" | "system";
  targetName: string;
  timestamp: string;
  details?: Record<string, string>;
}

interface AuditStore {
  logs: AuditLog[];
  addLog: (log: Omit<AuditLog, "id" | "timestamp">) => void;
  clearLogs: () => void;
}

const seedLogs: AuditLog[] = [
  { id: "a1", action: "company_created", label: "Empresa criada", description: 'Empresa "TechCorp" foi cadastrada', user: "Master Admin", userEmail: "admin@whatspanel.com", targetType: "company", targetName: "TechCorp", timestamp: "2025-01-15T10:30:00Z" },
  { id: "a2", action: "company_created", label: "Empresa criada", description: 'Empresa "VendaMax" foi cadastrada', user: "Master Admin", userEmail: "admin@whatspanel.com", targetType: "company", targetName: "VendaMax", timestamp: "2025-02-20T14:15:00Z" },
  { id: "a3", action: "plan_updated", label: "Plano atualizado", description: 'Plano "Professional" teve o preço alterado', user: "Master Admin", userEmail: "admin@whatspanel.com", targetType: "plan", targetName: "Professional", timestamp: "2025-02-25T09:00:00Z", details: { campo: "monthlyPrice", de: "R$ 177", para: "R$ 197" } },
  { id: "a4", action: "company_suspended", label: "Empresa suspensa", description: 'Empresa "ChatRapido" foi suspensa', user: "Master Admin", userEmail: "admin@whatspanel.com", targetType: "company", targetName: "ChatRapido", timestamp: "2025-03-01T16:45:00Z" },
  { id: "a5", action: "company_reactivated", label: "Empresa reativada", description: 'Empresa "ChatRapido" foi reativada', user: "Master Admin", userEmail: "admin@whatspanel.com", targetType: "company", targetName: "ChatRapido", timestamp: "2025-03-02T08:20:00Z" },
  { id: "a6", action: "user_login", label: "Login realizado", description: "Master Admin fez login no sistema", user: "Master Admin", userEmail: "admin@whatspanel.com", targetType: "user", targetName: "Master Admin", timestamp: "2025-03-03T07:00:00Z" },
];

export const useAuditStore = create<AuditStore>()(
  persist(
    (set) => ({
      logs: seedLogs,
      addLog: (log) => {
        const entry: AuditLog = {
          ...log,
          id: `a${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
        };
        set((s) => ({ logs: [entry, ...s.logs] }));
      },
      clearLogs: () => set({ logs: [] }),
    }),
    { name: "audit-store" }
  )
);

/* Helper labels for display */
export const actionLabels: Record<AuditAction, string> = {
  company_created: "Empresa criada",
  company_updated: "Empresa atualizada",
  company_deleted: "Empresa excluída",
  company_suspended: "Empresa suspensa",
  company_reactivated: "Empresa reativada",
  plan_created: "Plano criado",
  plan_updated: "Plano atualizado",
  plan_deleted: "Plano excluído",
  plan_activated: "Plano ativado",
  plan_deactivated: "Plano desativado",
  user_login: "Login",
  user_logout: "Logout",
  settings_changed: "Configuração alterada",
};

export const actionColors: Record<AuditAction, string> = {
  company_created: "text-primary",
  company_updated: "text-info-foreground",
  company_deleted: "text-destructive",
  company_suspended: "text-warning-foreground",
  company_reactivated: "text-primary",
  plan_created: "text-primary",
  plan_updated: "text-info-foreground",
  plan_deleted: "text-destructive",
  plan_activated: "text-primary",
  plan_deactivated: "text-warning-foreground",
  user_login: "text-muted-foreground",
  user_logout: "text-muted-foreground",
  settings_changed: "text-info-foreground",
};
