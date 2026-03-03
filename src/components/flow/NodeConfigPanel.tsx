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
  const { queues, addQueue } = useQueueStore();
  const [showNewQueue, setShowNewQueue] = useState(false);
  const [newQueueName, setNewQueueName] = useState("");

  if (!node) return null;
  const d = node.data;

  const update = (patch: Partial<FlowNodeData>) => onUpdate(node.id, patch);

  const handleCreateQueue = () => {
    if (!newQueueName.trim()) return;
    addQueue(newQueueName.trim());
    const created = useQueueStore.getState().queues;
    const newest = created[created.length - 1];
    if (newest) {
      update({ queueId: newest.id, queueName: newest.name });
    }
    setNewQueueName("");
    setShowNewQueue(false);
  };

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
          <div className="space-y-3">
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

            {/* Create new queue inline */}
            {!showNewQueue ? (
              <button
                onClick={() => setShowNewQueue(true)}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
              >
                <Plus className="w-3 h-3" /> Criar nova fila
              </button>
            ) : (
              <div className="bg-secondary/50 border border-border rounded-lg p-3 space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase block">Nova fila</label>
                <input
                  type="text"
                  value={newQueueName}
                  onChange={(e) => setNewQueueName(e.target.value)}
                  placeholder="Nome da fila"
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateQueue()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateQueue}
                    disabled={!newQueueName.trim()}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    Criar
                  </button>
                  <button
                    onClick={() => { setShowNewQueue(false); setNewQueueName(""); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-accent transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
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

        {/* Transfer config */}
        {d.type === "transfer" && (
          <>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Transferir para</label>
              <select
                value={d.transferTo || "agent"}
                onChange={(e) => update({ transferTo: e.target.value as "agent" | "queue" })}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
              >
                <option value="agent">Próximo atendente disponível</option>
                <option value="queue">Fila específica</option>
              </select>
            </div>
            {d.transferTo === "queue" && (
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Fila</label>
                <select
                  value={d.transferQueueId || ""}
                  onChange={(e) => update({ transferQueueId: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                >
                  <option value="">Selecione uma fila</option>
                  {queues.map((q) => (
                    <option key={q.id} value={q.id}>{q.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Mensagem ao transferir</label>
              <textarea
                value={d.transferMessage || ""}
                onChange={(e) => update({ transferMessage: e.target.value })}
                rows={2}
                placeholder="Ex: Aguarde, transferindo para um atendente..."
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
          </>
        )}

        {/* Wait config */}
        {d.type === "wait" && (
          <>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Tempo de espera</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={d.waitTimeout || 30}
                  onChange={(e) => update({ waitTimeout: Number(e.target.value) })}
                  min={1}
                  className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                />
                <select
                  value={d.waitUnit || "seconds"}
                  onChange={(e) => update({ waitUnit: e.target.value as any })}
                  className="w-24 bg-secondary border border-border rounded-lg px-2 py-2 text-sm text-foreground outline-none"
                >
                  <option value="seconds">seg</option>
                  <option value="minutes">min</option>
                  <option value="hours">horas</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Ação no timeout</label>
              <select
                value={d.waitTimeoutAction || "end"}
                onChange={(e) => update({ waitTimeoutAction: e.target.value as any })}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none"
              >
                <option value="end">Encerrar conversa</option>
                <option value="message">Enviar mensagem</option>
                <option value="transfer">Transferir para atendente</option>
              </select>
            </div>
            {d.waitTimeoutAction === "message" && (
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Mensagem de timeout</label>
                <textarea
                  value={d.waitTimeoutMessage || ""}
                  onChange={(e) => update({ waitTimeoutMessage: e.target.value })}
                  rows={2}
                  placeholder="Ex: Tempo esgotado, tente novamente mais tarde."
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
            )}
            <div className="flex gap-2 text-[10px]">
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-primary" /> Resposta</div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Timeout</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
