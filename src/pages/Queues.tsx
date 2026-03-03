import { useState } from "react";
import { create } from "zustand";
import { ListOrdered, Plus, Pencil, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/translations";

interface Queue { id: string; name: string; color: string; users: string[]; }

interface QueueStore {
  queues: Queue[];
  addQueue: (q: Queue) => void;
  removeQueue: (id: string) => void;
  updateQueue: (id: string, q: Partial<Queue>) => void;
}

export const useQueueStore = create<QueueStore>((set) => ({
  queues: [
    { id: "1", name: "Suporte", color: "142 72% 29%", users: ["João", "Maria"] },
    { id: "2", name: "Vendas", color: "210 80% 50%", users: ["Carlos"] },
    { id: "3", name: "Financeiro", color: "30 80% 50%", users: ["Ana"] },
  ],
  addQueue: (q) => set((s) => ({ queues: [...s.queues, q] })),
  removeQueue: (id) => set((s) => ({ queues: s.queues.filter((q) => q.id !== id) })),
  updateQueue: (id, data) => set((s) => ({ queues: s.queues.map((q) => (q.id === id ? { ...q, ...data } : q)) })),
}));

export default function Queues() {
  const { t } = useTranslation();
  const { queues, addQueue, removeQueue } = useQueueStore();
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");

  const handleAdd = () => {
    if (!newName.trim()) return;
    addQueue({ id: Date.now().toString(), name: newName.trim(), color: `${Math.floor(Math.random() * 360)} 70% 45%`, users: [] });
    setNewName("");
    setShowForm(false);
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("queues.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("queues.subtitle")}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          {t("queues.new_queue")}
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-4 flex gap-2">
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} placeholder={t("queues.queue_name")} className="flex-1 bg-secondary rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring" autoFocus />
          <button onClick={handleAdd} className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">{t("common.create")}</button>
          <button onClick={() => setShowForm(false)} className="px-4 py-2.5 bg-secondary text-foreground rounded-lg text-sm hover:bg-accent">{t("common.cancel")}</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {queues.map((queue) => (
          <div key={queue.id} className="bg-card border border-border rounded-xl p-5 space-y-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: `hsl(${queue.color})` }} />
                <h3 className="font-semibold text-foreground">{queue.name}</h3>
              </div>
              <div className="flex gap-1">
                <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-accent text-muted-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => removeQueue(queue.id)} className="w-7 h-7 rounded flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{queue.users.length > 0 ? queue.users.join(", ") : t("queues.no_agents")}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ListOrdered className="w-3.5 h-3.5" />
              <span>0 {t("queues.conversations_in_queue")}</span>
            </div>
          </div>
        ))}
      </div>

      {queues.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <ListOrdered className="w-16 h-16 mb-4 opacity-20" />
          <h2 className="text-lg font-medium">{t("queues.no_queues")}</h2>
          <p className="text-sm mt-1">{t("queues.no_queues_hint")}</p>
        </div>
      )}
    </div>
  );
}
