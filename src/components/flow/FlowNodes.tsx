import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Play, MessageSquare, List, ArrowRightToLine,
  GitBranch, FileInput, StopCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FlowNodeData } from "@/stores/flow-store";

// ── Start Node ──
export function StartNode({ data, selected }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  return (
    <div className={cn(
      "px-5 py-3 rounded-full border-2 bg-primary text-primary-foreground shadow-lg transition-shadow",
      selected ? "ring-2 ring-primary/50 shadow-xl" : ""
    )}>
      <div className="flex items-center gap-2">
        <Play className="w-4 h-4" />
        <span className="text-sm font-bold">{d.label || "Início"}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-primary-foreground !border-2 !border-primary" />
    </div>
  );
}

// ── Message Node ──
export function MessageNode({ data, selected }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  return (
    <div className={cn(
      "w-64 bg-card border-2 rounded-xl shadow-md transition-all",
      selected ? "border-primary ring-2 ring-primary/20 shadow-lg" : "border-border"
    )}>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-primary !border-2 !border-card" />
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-blue-500/10 rounded-t-xl">
        <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
        <span className="text-xs font-bold text-blue-700 dark:text-blue-300">{d.label || "Mensagem"}</span>
      </div>
      <div className="px-3 py-2">
        <p className="text-[11px] text-muted-foreground line-clamp-3 whitespace-pre-wrap">
          {d.messageText || "Configure a mensagem..."}
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-primary !border-2 !border-card" />
    </div>
  );
}

// ── Menu Node ──
export function MenuNode({ data, selected }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  const options = d.menuOptions || [];
  return (
    <div className={cn(
      "w-64 bg-card border-2 rounded-xl shadow-md transition-all",
      selected ? "border-primary ring-2 ring-primary/20 shadow-lg" : "border-border"
    )}>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-primary !border-2 !border-card" />
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-amber-500/10 rounded-t-xl">
        <List className="w-3.5 h-3.5 text-amber-600" />
        <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{d.label || "Menu"}</span>
      </div>
      <div className="px-3 py-2 space-y-1">
        {options.length > 0 ? options.map((opt, i) => (
          <div key={opt.id} className="flex items-center gap-2 text-[11px] text-foreground">
            <span className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center text-[9px] font-bold text-amber-600 shrink-0">{i + 1}</span>
            <span className="truncate">{opt.label}</span>
          </div>
        )) : (
          <p className="text-[11px] text-muted-foreground">Sem opções configuradas</p>
        )}
      </div>
      {options.map((opt) => (
        <Handle
          key={opt.id}
          type="source"
          position={Position.Bottom}
          id={opt.id}
          className="!w-2.5 !h-2.5 !bg-amber-500 !border-2 !border-card"
        />
      ))}
      {options.length === 0 && (
        <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-primary !border-2 !border-card" />
      )}
    </div>
  );
}

// ── Queue Node ──
export function QueueNode({ data, selected }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  return (
    <div className={cn(
      "w-56 bg-card border-2 rounded-xl shadow-md transition-all",
      selected ? "border-primary ring-2 ring-primary/20 shadow-lg" : "border-border"
    )}>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-primary !border-2 !border-card" />
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-green-500/10 rounded-t-xl">
        <ArrowRightToLine className="w-3.5 h-3.5 text-green-600" />
        <span className="text-xs font-bold text-green-700 dark:text-green-300">{d.label || "Fila"}</span>
      </div>
      <div className="px-3 py-2">
        <p className="text-[11px] text-muted-foreground">
          Encaminhar → <span className="font-semibold text-foreground">{d.queueName || "Selecione uma fila"}</span>
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-primary !border-2 !border-card" />
    </div>
  );
}

// ── Condition Node ──
export function ConditionNode({ data, selected }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  return (
    <div className={cn(
      "w-60 bg-card border-2 rounded-xl shadow-md transition-all",
      selected ? "border-primary ring-2 ring-primary/20 shadow-lg" : "border-border"
    )}>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-primary !border-2 !border-card" />
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-purple-500/10 rounded-t-xl">
        <GitBranch className="w-3.5 h-3.5 text-purple-500" />
        <span className="text-xs font-bold text-purple-700 dark:text-purple-300">{d.label || "Condição"}</span>
      </div>
      <div className="px-3 py-2">
        <p className="text-[11px] text-muted-foreground">
          {d.conditionType === "keyword" && `Palavra-chave: "${d.conditionValue || "..."}"`}
          {d.conditionType === "schedule" && `Horário: ${d.conditionValue || "..."}`}
          {d.conditionType === "variable" && `Variável: ${d.conditionValue || "..."}`}
          {!d.conditionType && "Configure a condição..."}
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} id="yes" className="!w-2.5 !h-2.5 !bg-green-500 !border-2 !border-card !left-[30%]" />
      <Handle type="source" position={Position.Bottom} id="no" className="!w-2.5 !h-2.5 !bg-red-500 !border-2 !border-card !left-[70%]" />
    </div>
  );
}

// ── Collect Data Node ──
export function CollectNode({ data, selected }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  return (
    <div className={cn(
      "w-60 bg-card border-2 rounded-xl shadow-md transition-all",
      selected ? "border-primary ring-2 ring-primary/20 shadow-lg" : "border-border"
    )}>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-primary !border-2 !border-card" />
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-cyan-500/10 rounded-t-xl">
        <FileInput className="w-3.5 h-3.5 text-cyan-600" />
        <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300">{d.label || "Coletar Dados"}</span>
      </div>
      <div className="px-3 py-2 space-y-1">
        <p className="text-[11px] text-muted-foreground">
          {d.collectPrompt || "Configure a pergunta..."}
        </p>
        {d.collectField && (
          <p className="text-[10px] text-muted-foreground">
            Campo: <span className="font-mono bg-muted px-1 rounded">{d.collectField}</span>
          </p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-primary !border-2 !border-card" />
    </div>
  );
}

// ── End Node ──
export function EndNode({ data, selected }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  return (
    <div className={cn(
      "px-5 py-3 rounded-full border-2 bg-muted text-muted-foreground shadow-md transition-shadow",
      selected ? "ring-2 ring-primary/50 shadow-lg" : ""
    )}>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-muted" />
      <div className="flex items-center gap-2">
        <StopCircle className="w-4 h-4" />
        <span className="text-sm font-bold">{d.label || "Fim"}</span>
      </div>
    </div>
  );
}
