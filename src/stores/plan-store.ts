import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Plan {
  id: string;
  name: string;
  slug: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxAgents: number;
  maxQueues: number;
  maxContacts: number;
  features: string[];
  isActive: boolean;
  createdAt: string;
}

interface PlanStore {
  plans: Plan[];
  addPlan: (p: Omit<Plan, "id" | "createdAt">) => Plan;
  updatePlan: (id: string, data: Partial<Plan>) => void;
  deletePlan: (id: string) => void;
  getPlan: (id: string) => Plan | undefined;
}

const defaultPlans: Plan[] = [
  {
    id: "p1", name: "Free", slug: "free", monthlyPrice: 0, yearlyPrice: 0,
    maxAgents: 2, maxQueues: 1, maxContacts: 100,
    features: ["1 conexão WhatsApp", "Respostas rápidas básicas", "Suporte por e-mail"],
    isActive: true, createdAt: "2025-01-01",
  },
  {
    id: "p2", name: "Starter", slug: "starter", monthlyPrice: 97, yearlyPrice: 970,
    maxAgents: 5, maxQueues: 3, maxContacts: 1000,
    features: ["2 conexões WhatsApp", "Filas de atendimento", "Respostas rápidas", "Relatórios básicos", "Suporte prioritário"],
    isActive: true, createdAt: "2025-01-01",
  },
  {
    id: "p3", name: "Professional", slug: "professional", monthlyPrice: 197, yearlyPrice: 1970,
    maxAgents: 20, maxQueues: 10, maxContacts: 10000,
    features: ["5 conexões WhatsApp", "Filas ilimitadas", "Chatbot básico", "API de integração", "Relatórios avançados", "Suporte prioritário"],
    isActive: true, createdAt: "2025-01-01",
  },
  {
    id: "p4", name: "Enterprise", slug: "enterprise", monthlyPrice: 497, yearlyPrice: 4970,
    maxAgents: 50, maxQueues: -1, maxContacts: -1,
    features: ["Conexões ilimitadas", "Filas ilimitadas", "Chatbot avançado com IA", "API completa", "Webhooks", "Multi-tenant", "Suporte dedicado", "SLA garantido"],
    isActive: true, createdAt: "2025-01-01",
  },
];

export const usePlanStore = create<PlanStore>()(
  persist(
    (set, get) => ({
      plans: defaultPlans,
      addPlan: (data) => {
        const plan: Plan = { ...data, id: `p${Date.now()}`, createdAt: new Date().toISOString().split("T")[0] };
        set((s) => ({ plans: [...s.plans, plan] }));
        return plan;
      },
      updatePlan: (id, data) =>
        set((s) => ({ plans: s.plans.map((p) => (p.id === id ? { ...p, ...data } : p)) })),
      deletePlan: (id) =>
        set((s) => ({ plans: s.plans.filter((p) => p.id !== id) })),
      getPlan: (id) => get().plans.find((p) => p.id === id),
    }),
    { name: "plan-store" }
  )
);
