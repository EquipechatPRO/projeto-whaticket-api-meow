import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Company {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "starter" | "professional" | "enterprise";
  status: "active" | "suspended" | "trial";
  createdAt: string;
  maxAgents: number;
  agentCount: number;
  email: string;
  phone?: string;
  notes?: string;
}

interface CompanyStore {
  companies: Company[];
  addCompany: (c: Omit<Company, "id" | "createdAt">) => Company;
  updateCompany: (id: string, data: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
  getCompany: (id: string) => Company | undefined;
}

const defaultCompanies: Company[] = [
  { id: "c1", name: "TechCorp", slug: "techcorp", plan: "professional", status: "active", createdAt: "2025-01-15", maxAgents: 20, agentCount: 8, email: "admin@techcorp.com" },
  { id: "c2", name: "VendaMax", slug: "vendamax", plan: "starter", status: "active", createdAt: "2025-02-20", maxAgents: 5, agentCount: 3, email: "contato@vendamax.com" },
  { id: "c3", name: "SupportPro", slug: "supportpro", plan: "enterprise", status: "active", createdAt: "2024-11-10", maxAgents: 50, agentCount: 22, email: "admin@supportpro.com" },
  { id: "c4", name: "ChatRapido", slug: "chatrapido", plan: "free", status: "trial", createdAt: "2025-03-01", maxAgents: 2, agentCount: 1, email: "chat@chatrapido.com" },
];

export const useCompanyStore = create<CompanyStore>()(
  persist(
    (set, get) => ({
      companies: defaultCompanies,
      addCompany: (data) => {
        const company: Company = {
          ...data,
          id: `c${Date.now()}`,
          createdAt: new Date().toISOString().split("T")[0],
        };
        set((s) => ({ companies: [...s.companies, company] }));
        return company;
      },
      updateCompany: (id, data) =>
        set((s) => ({
          companies: s.companies.map((c) => (c.id === id ? { ...c, ...data } : c)),
        })),
      deleteCompany: (id) =>
        set((s) => ({ companies: s.companies.filter((c) => c.id !== id) })),
      getCompany: (id) => get().companies.find((c) => c.id === id),
    }),
    { name: "company-store" }
  )
);
