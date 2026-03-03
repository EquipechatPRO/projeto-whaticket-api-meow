import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole = "super_admin" | "company_admin" | "supervisor" | "agent";

export interface Company {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "starter" | "professional" | "enterprise";
  status: "active" | "suspended" | "trial";
  createdAt: string;
  maxAgents: number;
  agentCount: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string | null;
  companyName: string | null;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: { name: string; email: string; password: string; companyName: string }) => Promise<boolean>;
  logout: () => void;
}

// Mock companies
const mockCompanies: Company[] = [
  { id: "c1", name: "TechCorp", slug: "techcorp", plan: "professional", status: "active", createdAt: "2025-01-15", maxAgents: 20, agentCount: 8 },
  { id: "c2", name: "VendaMax", slug: "vendamax", plan: "starter", status: "active", createdAt: "2025-02-20", maxAgents: 5, agentCount: 3 },
  { id: "c3", name: "SupportPro", slug: "supportpro", plan: "enterprise", status: "active", createdAt: "2024-11-10", maxAgents: 50, agentCount: 22 },
  { id: "c4", name: "ChatRapido", slug: "chatrapido", plan: "free", status: "trial", createdAt: "2025-03-01", maxAgents: 2, agentCount: 1 },
];

// Mock users for login
const mockUsers: Array<User & { password: string }> = [
  { id: "u1", name: "Admin Global", email: "admin@whatspanel.com", password: "admin123", role: "super_admin", companyId: null, companyName: null },
  { id: "u2", name: "Carlos Silva", email: "carlos@techcorp.com", password: "123456", role: "company_admin", companyId: "c1", companyName: "TechCorp" },
  { id: "u3", name: "Ana Souza", email: "ana@techcorp.com", password: "123456", role: "agent", companyId: "c1", companyName: "TechCorp" },
  { id: "u4", name: "Pedro Lima", email: "pedro@vendamax.com", password: "123456", role: "supervisor", companyId: "c2", companyName: "VendaMax" },
];

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: async (email, password) => {
        const found = mockUsers.find((u) => u.email === email && u.password === password);
        if (found) {
          const { password: _, ...user } = found;
          set({ user, isAuthenticated: true });
          return true;
        }
        return false;
      },
      register: async (data) => {
        const newCompany: Company = {
          id: `c${Date.now()}`,
          name: data.companyName,
          slug: data.companyName.toLowerCase().replace(/\s+/g, "-"),
          plan: "free",
          status: "trial",
          createdAt: new Date().toISOString().split("T")[0],
          maxAgents: 2,
          agentCount: 1,
        };
        const newUser: User = {
          id: `u${Date.now()}`,
          name: data.name,
          email: data.email,
          role: "company_admin",
          companyId: newCompany.id,
          companyName: newCompany.name,
        };
        set({ user: newUser, isAuthenticated: true });
        return true;
      },
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: "auth-store" }
  )
);

export const getMockCompanies = () => mockCompanies;
