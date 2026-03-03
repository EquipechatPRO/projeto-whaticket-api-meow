import { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import type { FlowNodeData, FlowNodeType } from "@/stores/flow-store";
import { useQueueStore } from "@/pages/Queues";

interface Props {
  node: { id: string; data: FlowNodeData } | null;
  onUpdate: (nodeId: string, data: Partial<FlowNodeData>) => void;
  onClose: () => void;
}

export default function NodeConfigPanel({ node, onUpdate, onClose }: Props) {
  const { queues } = useQueueStore();

  if (!node) return null;
  const d = node.data;

  const update = (patch: Partial<FlowNodeData>) => onUpdate(node.id, patch);

  return (
    <div className="w-80 bg-card border-l border-border h-full overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-bold text-foreground">Configurar Nó</h3>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Label */}
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Nome do nó</label>
          <input
            type="text"
            value={d.label || ""}
            onChange={(e) => update({ label: e.target.value })}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Message config */}
        {d.type === "message" && (
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Texto da mensagem</label>
            <textarea
              value={d.messageText || ""}
              onChange={(e) => update({ messageText: e.target.value })}
              rows={4}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring resize-none"
              placeholder="Digite a mensagem que será enviada..."
            />
            <p className="text-[10px] text-muted-foreground mt-1">Use {"{{nome}}"} para variáveis do contato</p>
          </div>
        )}

        {/* Menu config */}
        {d.type === "menu" && (
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Opções do menu</label>
            <div className="space-y-2">
              {(d.menuOptions || []).map((opt, i) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] font-bold text-amber-600 shrink-0">{i + 1}</span>
                  <input
                    type="text"
                    value={opt.label}
                    onChange={(e) => {
                      const opts = [...(d.menuOptions || [])];
                      opts[i] = { ...opts[i], label: e.target.value };
                      update({ menuOptions: opts });
                    }}
                    className="flex-1 bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button
                    onClick={() => {
                      const opts = (d.menuOptions || []).filter((_, j) => j !== i);
                      update({ menuOptions: opts });
                    }}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const opts = [...(d.menuOptions || []), { id: `opt-${Date.now()}`, label: `Opção ${(d.menuOptions?.length || 0) + 1}` }];
                  update({ menuOptions: opts });
                }}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
              >
                <Plus className="w-3 h-3" /> Adicionar opção
              </button>
            </div>
          </div>
        )}

        {/* Queue config */}
        {d.type === "queue" && (
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Fila de atendimento</label>
            <select
              value={d.queueId || ""}
              onChange={(e) => {
                const q = queues.find((q) => q.id === e.target.value);
                update({ queueId: e.target.value, queueName: q?.name || "" });
              }}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
            >
              <option value="">Selecione uma fila</option>
              {queues.map((q) => (
                <option key={q.id} value={q.id}>{q.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Condition config */}
        {d.type === "condition" && (
          <>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Tipo de condição</label>
              <select
                value={d.conditionType || "keyword"}
                onChange={(e) => update({ conditionType: e.target.value as any })}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
              >
                <option value="keyword">Palavra-chave</option>
                <option value="schedule">Horário</option>
                <option value="variable">Variável</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Valor</label>
              <input
                type="text"
                value={d.conditionValue || ""}
                onChange={(e) => update({ conditionValue: e.target.value })}
                placeholder={d.conditionType === "keyword" ? "Ex: suporte, vendas" : d.conditionType === "schedule" ? "Ex: 08:00-18:00" : "Ex: {{nome}} != vazio"}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex gap-2 text-[10px]">
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Sim (verdadeiro)</div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Não (falso)</div>
            </div>
          </>
        )}

        {/* Collect config */}
        {d.type === "collect" && (
          <>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Pergunta ao cliente</label>
              <textarea
                value={d.collectPrompt || ""}
                onChange={(e) => update({ collectPrompt: e.target.value })}
                rows={3}
                placeholder="Ex: Por favor, informe seu CPF:"
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Nome do campo</label>
              <input
                type="text"
                value={d.collectField || ""}
                onChange={(e) => update({ collectField: e.target.value })}
                placeholder="Ex: cpf, nome, email"
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Salvar como variável</label>
              <input
                type="text"
                value={d.collectVariable || ""}
                onChange={(e) => update({ collectVariable: e.target.value })}
                placeholder="Ex: {{cpf}}"
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
