import { create } from "zustand";

export type FlowNodeType = "start" | "message" | "menu" | "queue" | "condition" | "collect" | "end";

export interface FlowNodeData {
  label: string;
  type: FlowNodeType;
  // Message node
  messageText?: string;
  // Menu node
  menuOptions?: { id: string; label: string; targetNodeId?: string }[];
  // Queue node
  queueId?: string;
  queueName?: string;
  // Condition node
  conditionType?: "keyword" | "schedule" | "variable";
  conditionValue?: string;
  // Collect node
  collectField?: string;
  collectPrompt?: string;
  collectVariable?: string;
}

export interface Flow {
  id: string;
  name: string;
  description: string;
  connectionId?: string;
  trigger: "greeting" | "keyword" | "schedule" | "manual";
  triggerValue?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  nodes: any[];
  edges: any[];
}

interface FlowStore {
  flows: Flow[];
  addFlow: (flow: Omit<Flow, "id" | "createdAt" | "updatedAt">) => Flow;
  updateFlow: (id: string, data: Partial<Flow>) => void;
  deleteFlow: (id: string) => void;
  duplicateFlow: (id: string) => void;
}

const defaultNodes = [
  {
    id: "start-1",
    type: "startNode",
    position: { x: 250, y: 50 },
    data: { label: "Início", type: "start" as FlowNodeType },
  },
];

const initialFlows: Flow[] = [
  {
    id: "flow-1",
    name: "Boas-vindas",
    description: "Fluxo de saudação inicial com menu de opções",
    trigger: "greeting",
    isActive: true,
    connectionId: "conn-1",
    createdAt: "2025-03-01",
    updatedAt: "2025-03-01",
    nodes: [
      { id: "start-1", type: "startNode", position: { x: 300, y: 50 }, data: { label: "Início", type: "start" } },
      { id: "msg-1", type: "messageNode", position: { x: 300, y: 180 }, data: { label: "Saudação", type: "message", messageText: "Olá! 👋 Bem-vindo ao nosso atendimento. Como posso ajudá-lo?" } },
      { id: "menu-1", type: "menuNode", position: { x: 300, y: 340 }, data: { label: "Menu Principal", type: "menu", menuOptions: [{ id: "opt-1", label: "Suporte técnico" }, { id: "opt-2", label: "Financeiro" }, { id: "opt-3", label: "Falar com atendente" }] } },
      { id: "queue-1", type: "queueNode", position: { x: 100, y: 530 }, data: { label: "Fila Suporte", type: "queue", queueId: "1", queueName: "Suporte" } },
      { id: "queue-2", type: "queueNode", position: { x: 350, y: 530 }, data: { label: "Fila Financeiro", type: "queue", queueId: "3", queueName: "Financeiro" } },
      { id: "queue-3", type: "queueNode", position: { x: 600, y: 530 }, data: { label: "Fila Vendas", type: "queue", queueId: "2", queueName: "Vendas" } },
    ],
    edges: [
      { id: "e-start-msg", source: "start-1", target: "msg-1", animated: true },
      { id: "e-msg-menu", source: "msg-1", target: "menu-1" },
      { id: "e-menu-q1", source: "menu-1", target: "queue-1", sourceHandle: "opt-1", label: "Suporte" },
      { id: "e-menu-q2", source: "menu-1", target: "queue-2", sourceHandle: "opt-2", label: "Financeiro" },
      { id: "e-menu-q3", source: "menu-1", target: "queue-3", sourceHandle: "opt-3", label: "Atendente" },
    ],
  },
  {
    id: "flow-2",
    name: "Coleta de Dados",
    description: "Coleta informações do cliente antes do atendimento",
    trigger: "keyword",
    triggerValue: "cadastro",
    isActive: false,
    createdAt: "2025-03-02",
    updatedAt: "2025-03-02",
    nodes: defaultNodes,
    edges: [],
  },
];

export const useFlowStore = create<FlowStore>((set, get) => ({
  flows: initialFlows,
  addFlow: (data) => {
    const now = new Date().toISOString().split("T")[0];
    const flow: Flow = {
      ...data,
      id: `flow-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ flows: [...s.flows, flow] }));
    return flow;
  },
  updateFlow: (id, data) =>
    set((s) => ({
      flows: s.flows.map((f) =>
        f.id === id ? { ...f, ...data, updatedAt: new Date().toISOString().split("T")[0] } : f
      ),
    })),
  deleteFlow: (id) => set((s) => ({ flows: s.flows.filter((f) => f.id !== id) })),
  duplicateFlow: (id) => {
    const flow = get().flows.find((f) => f.id === id);
    if (!flow) return;
    const now = new Date().toISOString().split("T")[0];
    set((s) => ({
      flows: [
        ...s.flows,
        {
          ...flow,
          id: `flow-${Date.now()}`,
          name: `${flow.name} (cópia)`,
          isActive: false,
          createdAt: now,
          updatedAt: now,
        },
      ],
    }));
  },
}));
