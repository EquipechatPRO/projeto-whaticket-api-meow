import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole = "super_admin" | "company_admin" | "supervisor" | "agent";

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

/**
 * Master admin credentials – created during VPS installation (install.sh).
 * In production, these would come from environment variables or a config file.
 * Default: admin@whatspanel.com / admin123
 */
const MASTER_ADMIN = {
  id: "master",
  name: "Master Admin",
  email: "admin@whatspanel.com",
  password: "admin123",
  role: "super_admin" as UserRole,
  companyId: null,
  companyName: null,
};

// Mock users for login (includes master admin + company users)
const mockUsers: Array<User & { password: string }> = [
  MASTER_ADMIN,
  { id: "u2", name: "Carlos Silva", email: "carlos@techcorp.com", password: "123456", role: "super_admin", companyId: "c1", companyName: "TechCorp" },
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
        const newUser: User = {
          id: `u${Date.now()}`,
          name: data.name,
          email: data.email,
          role: "company_admin",
          companyId: `c${Date.now()}`,
          companyName: data.companyName,
        };
        set({ user: newUser, isAuthenticated: true });
        return true;
      },
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: "auth-store" }
  )
);
