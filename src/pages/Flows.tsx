import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GitBranch, Plus, Search, Play, Pause, Edit2, Trash2, Copy,
  MoreVertical, Zap, X, Link2, Unlink, Wifi, WifiOff, Smartphone,
  Download, Upload,
} from "lucide-react";
import { useFlowStore, type Flow } from "@/stores/flow-store";
import { useConnectionStore } from "@/stores/connection-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const triggerLabels: Record<string, { label: string; color: string }> = {
  greeting: { label: "Saudação", color: "bg-green-500/10 text-green-600" },
  keyword: { label: "Palavra-chave", color: "bg-blue-500/10 text-blue-600" },
  schedule: { label: "Agendado", color: "bg-amber-500/10 text-amber-600" },
  manual: { label: "Manual", color: "bg-muted text-muted-foreground" },
};

export default function Flows() {
  const navigate = useNavigate();
  const { flows, addFlow, deleteFlow, updateFlow, duplicateFlow, exportFlow, importFlow } = useFlowStore();
  const { connections } = useConnectionStore();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Flow | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Create form
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formTrigger, setFormTrigger] = useState<Flow["trigger"]>("greeting");
  const [formKeyword, setFormKeyword] = useState("");

  const filtered = flows.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    if (!formName.trim()) { toast.error("Informe o nome do fluxo"); return; }
    const flow = addFlow({
      name: formName,
      description: formDesc,
      trigger: formTrigger,
      triggerValue: formKeyword || undefined,
      isActive: false,
      nodes: [
        { id: "start-1", type: "startNode", position: { x: 300, y: 50 }, data: { label: "Início", type: "start" } },
      ],
      edges: [],
    });
    toast.success(`Fluxo "${formName}" criado`);
    setShowCreate(false);
    setFormName(""); setFormDesc(""); setFormTrigger("greeting"); setFormKeyword("");
    navigate(`/flows/${flow.id}`);
  };

  const handleDelete = (flow: Flow) => {
    deleteFlow(flow.id);
    toast.success(`Fluxo "${flow.name}" excluído`);
    setConfirmDelete(null);
  };

  const toggleActive = (flow: Flow) => {
    updateFlow(flow.id, { isActive: !flow.isActive });
    toast.success(flow.isActive ? "Fluxo desativado" : "Fluxo ativado");
  };

  const handleExport = (flow: Flow) => {
    const json = exportFlow(flow.id);
    if (!json) return;
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fluxo-${flow.name.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Fluxo exportado!");
    setMenuOpen(null);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        const flow = importFlow(result);
        if (flow) {
          toast.success(`Fluxo "${flow.name}" importado!`);
          navigate(`/flows/${flow.id}`);
        } else {
          toast.error("Arquivo JSON inválido");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Construtor de Fluxos</h1>
            <p className="text-xs text-muted-foreground">{flows.length} fluxos configurados</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleImport}
            className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-accent transition-colors border border-border"
          >
            <Upload className="w-4 h-4" /> Importar
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo Fluxo
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 max-w-md">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar fluxos..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
      </div>

      {/* Flow Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((flow) => {
          const trigger = triggerLabels[flow.trigger] || triggerLabels.manual;
          return (
            <div
              key={flow.id}
              className="bg-card border border-border rounded-xl p-5 space-y-3 hover:shadow-md transition-shadow group relative"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", flow.isActive ? "bg-primary/10" : "bg-muted")}>
                    <GitBranch className={cn("w-4 h-4", flow.isActive ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-foreground truncate">{flow.name}</h3>
                    <p className="text-[10px] text-muted-foreground truncate">{flow.description}</p>
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(menuOpen === flow.id ? null : flow.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {menuOpen === flow.id && (
                    <div className="absolute right-0 top-8 w-40 bg-popover border border-border rounded-lg shadow-lg z-10 py-1">
                      <button onClick={() => { duplicateFlow(flow.id); setMenuOpen(null); toast.success("Fluxo duplicado"); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-accent">
                        <Copy className="w-3.5 h-3.5" /> Duplicar
                      </button>
                      <button onClick={() => handleExport(flow)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-accent">
                        <Download className="w-3.5 h-3.5" /> Exportar JSON
                      </button>
                      <button onClick={() => { setConfirmDelete(flow); setMenuOpen(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", trigger.color)}>{trigger.label}</span>
                {flow.triggerValue && (
                  <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">"{flow.triggerValue}"</span>
                )}
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold",
                  flow.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {flow.isActive ? "Ativo" : "Inativo"}
                </span>
              </div>

              {/* Connection Binding */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <Smartphone className="w-3 h-3" /> Conexão vinculada
                </label>
                <select
                  value={flow.connectionId || ""}
                  onChange={(e) => {
                    const connId = e.target.value || undefined;
                    const conn = connections.find((c) => c.id === connId);
                    updateFlow(flow.id, { connectionId: connId });
                    toast.success(connId ? `Vinculado a "${conn?.name}"` : "Conexão desvinculada");
                  }}
                  className="w-full bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Sem conexão</option>
                  {connections.map((conn) => (
                    <option key={conn.id} value={conn.id}>
                      {conn.status === "connected" ? "🟢" : "🔴"} {conn.name} ({conn.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span>{flow.nodes.length} nós</span>
                <span>{flow.edges.length} conexões</span>
                {flow.connectionId && (() => {
                  const conn = connections.find((c) => c.id === flow.connectionId);
                  return conn ? (
                    <span className={cn("flex items-center gap-1", conn.status === "connected" ? "text-primary" : "text-destructive")}>
                      {conn.status === "connected" ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                      {conn.name}
                    </span>
                  ) : null;
                })()}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <button
                  onClick={() => navigate(`/flows/${flow.id}`)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-secondary hover:bg-accent text-foreground transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => toggleActive(flow)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors",
                    flow.isActive
                      ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  {flow.isActive ? <><Pause className="w-3.5 h-3.5" /> Desativar</> : <><Play className="w-3.5 h-3.5" /> Ativar</>}
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
            <GitBranch className="w-16 h-16 mb-4 opacity-20" />
            <h2 className="text-lg font-medium">Nenhum fluxo encontrado</h2>
            <p className="text-sm mt-1">Crie seu primeiro fluxo para começar</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">Novo Fluxo</h2>
              <button onClick={() => setShowCreate(false)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Nome do fluxo *</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Boas-vindas" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring" autoFocus />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Descrição</label>
                <input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Breve descrição do fluxo" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Gatilho</label>
                <select value={formTrigger} onChange={(e) => setFormTrigger(e.target.value as Flow["trigger"])} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none">
                  <option value="greeting">Saudação (primeira mensagem)</option>
                  <option value="keyword">Palavra-chave</option>
                  <option value="schedule">Agendado</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              {formTrigger === "keyword" && (
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Palavra-chave</label>
                  <input type="text" value={formKeyword} onChange={(e) => setFormKeyword(e.target.value)} placeholder="Ex: menu, ajuda" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring" />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent">Cancelar</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90">Criar e editar</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setConfirmDelete(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-2">Excluir fluxo</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Tem certeza que deseja excluir o fluxo <strong>"{confirmDelete.name}"</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-bold hover:bg-destructive/90">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
