import { useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft, Save, Play, Plus, MessageSquare, List,
  ArrowRightToLine, GitBranch, FileInput, StopCircle, Trash2, UserCheck, Timer,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useFlowStore, type FlowNodeData, type FlowNodeType } from "@/stores/flow-store";
import { StartNode, MessageNode, MenuNode, QueueNode, ConditionNode, CollectNode, TransferNode, WaitNode, EndNode } from "@/components/flow/FlowNodes";
import NodeConfigPanel from "@/components/flow/NodeConfigPanel";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const nodeTypes = {
  startNode: StartNode,
  messageNode: MessageNode,
  menuNode: MenuNode,
  queueNode: QueueNode,
  conditionNode: ConditionNode,
  collectNode: CollectNode,
  transferNode: TransferNode,
  waitNode: WaitNode,
  endNode: EndNode,
};

const NODE_PALETTE: { type: string; nodeType: FlowNodeType; label: string; icon: React.ElementType; color: string }[] = [
  { type: "messageNode", nodeType: "message", label: "Mensagem", icon: MessageSquare, color: "text-blue-500 bg-blue-500/10" },
  { type: "menuNode", nodeType: "menu", label: "Menu", icon: List, color: "text-amber-600 bg-amber-500/10" },
  { type: "queueNode", nodeType: "queue", label: "Fila", icon: ArrowRightToLine, color: "text-green-600 bg-green-500/10" },
  { type: "conditionNode", nodeType: "condition", label: "Condição", icon: GitBranch, color: "text-purple-500 bg-purple-500/10" },
  { type: "collectNode", nodeType: "collect", label: "Coletar", icon: FileInput, color: "text-cyan-600 bg-cyan-500/10" },
  { type: "transferNode", nodeType: "transfer", label: "Transferir", icon: UserCheck, color: "text-orange-600 bg-orange-500/10" },
  { type: "waitNode", nodeType: "wait", label: "Espera", icon: Timer, color: "text-rose-600 bg-rose-500/10" },
  { type: "endNode", nodeType: "end", label: "Fim", icon: StopCircle, color: "text-muted-foreground bg-muted" },
];

export default function FlowBuilder() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { flows, updateFlow } = useFlowStore();
  const flow = flows.find((f) => f.id === id);

  const [nodes, setNodes, onNodesChange] = useNodesState(flow?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flow?.edges || []);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: false, style: { strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const addNode = (type: string, nodeType: FlowNodeType, label: string) => {
    const newNode = {
      id: `${nodeType}-${Date.now()}`,
      type,
      position: { x: 250 + Math.random() * 100, y: 200 + nodes.length * 80 },
      data: {
        label,
        type: nodeType,
        ...(nodeType === "menu" ? { menuOptions: [{ id: `opt-${Date.now()}`, label: "Opção 1" }] } : {}),
        ...(nodeType === "condition" ? { conditionType: "keyword" } : {}),
        ...(nodeType === "transfer" ? { transferTo: "agent" } : {}),
        ...(nodeType === "wait" ? { waitTimeout: 30, waitUnit: "seconds", waitTimeoutAction: "end" } : {}),
      } as FlowNodeData,
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const handleNodeClick = useCallback((_: any, node: any) => {
    setSelectedNode(node);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const updateNodeData = useCallback((nodeId: string, data: Partial<FlowNodeData>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
    );
    setSelectedNode((prev: any) => prev?.id === nodeId ? { ...prev, data: { ...prev.data, ...data } } : prev);
  }, [setNodes]);

  const deleteSelected = useCallback(() => {
    if (!selectedNode) return;
    if (selectedNode.data.type === "start") {
      toast.error("Não é possível excluir o nó de início");
      return;
    }
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
    toast.success("Nó removido");
  }, [selectedNode, setNodes, setEdges]);

  const handleSave = () => {
    if (!id) return;
    updateFlow(id, { nodes, edges });
    toast.success("Fluxo salvo com sucesso!");
  };

  if (!flow) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Fluxo não encontrado</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/flows")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-sm font-bold text-foreground">{flow.name}</h2>
            <p className="text-[10px] text-muted-foreground">{flow.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedNode && selectedNode.data.type !== "start" && (
            <button onClick={deleteSelected} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Excluir nó
            </button>
          )}
          <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Save className="w-3.5 h-3.5" /> Salvar
          </button>
        </div>
      </div>

      {/* Canvas + Config Panel */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode="Delete"
            defaultEdgeOptions={{ style: { strokeWidth: 2, stroke: "hsl(var(--primary))" }, type: "smoothstep" }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--muted-foreground) / 0.15)" />
            <Controls className="!bg-card !border-border !rounded-lg !shadow-md [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-accent" />
            <MiniMap
              className="!bg-card !border-border !rounded-lg"
              nodeColor="hsl(var(--primary))"
              maskColor="hsl(var(--background) / 0.7)"
            />

            {/* Node Palette */}
            <Panel position="top-left" className="!m-3">
              <div className="bg-card border border-border rounded-xl shadow-lg p-2 space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-1">Adicionar nó</p>
                {NODE_PALETTE.map((item) => (
                  <button
                    key={item.type}
                    onClick={() => addNode(item.type, item.nodeType, item.label)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-accent text-left transition-colors"
                  >
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", item.color)}>
                      <item.icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-medium text-foreground">{item.label}</span>
                  </button>
                ))}
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Config Panel */}
        {selectedNode && !["start", "end"].includes(selectedNode.data.type) && (
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={updateNodeData}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}
