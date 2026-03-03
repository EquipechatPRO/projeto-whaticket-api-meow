import { useState } from "react";
import { useQuickReplyStore, QuickReply } from "@/stores/quick-reply-store";
import { cn } from "@/lib/utils";
import {
  Zap,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Save,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

type EditingReply = Omit<QuickReply, "id"> & { id?: string };

const EMPTY_REPLY: EditingReply = { shortcut: "", title: "", text: "", category: "Geral" };

export default function QuickRepliesManager() {
  const { replies, addReply, updateReply, deleteReply, getCategories } = useQuickReplyStore();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [editing, setEditing] = useState<EditingReply | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QuickReply | null>(null);
  const [newCategory, setNewCategory] = useState("");

  const categories = getCategories();

  const filtered = replies
    .filter((r) => filterCat === "all" || r.category === filterCat)
    .filter((r) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return r.shortcut.includes(q) || r.title.toLowerCase().includes(q) || r.text.toLowerCase().includes(q);
    });

  const grouped = filtered.reduce<Record<string, QuickReply[]>>((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {});

  const handleSave = () => {
    if (!editing) return;
    if (!editing.shortcut.trim() || !editing.title.trim() || !editing.text.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const category = newCategory.trim() || editing.category;
    if (editing.id) {
      updateReply(editing.id, { ...editing, category });
      toast.success("Resposta rápida atualizada");
    } else {
      addReply({ ...editing, category });
      toast.success("Resposta rápida criada");
    }
    setEditing(null);
    setNewCategory("");
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteReply(deleteTarget.id);
    toast.success(`"${deleteTarget.title}" excluída`);
    setDeleteTarget(null);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Respostas Rápidas</h1>
              <p className="text-xs text-muted-foreground">{replies.length} templates configurados</p>
            </div>
          </div>
          <button
            onClick={() => setEditing({ ...EMPTY_REPLY })}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Resposta
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mt-4">
          <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-1.5 flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por atalho, título ou conteúdo..."
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilterCat("all")}
              className={cn(
                "px-3 py-1.5 rounded-md text-[11px] font-bold transition-colors",
                filterCat === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[11px] font-bold transition-colors",
                  filterCat === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        {Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">Nenhuma resposta encontrada</p>
            <p className="text-xs mt-1">Crie uma nova resposta rápida para começar</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{cat}</h3>
                <div className="grid gap-2">
                  {items.map((r) => (
                    <div
                      key={r.id}
                      className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                              /{r.shortcut}
                            </span>
                            <span className="text-sm font-semibold text-foreground">{r.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">{r.text}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => setEditing({ ...r })}
                            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                            title="Editar"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(r)}
                            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                {editing.id ? "Editar Resposta" : "Nova Resposta Rápida"}
              </h3>
              <button
                onClick={() => { setEditing(null); setNewCategory(""); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Atalho *
                  </label>
                  <div className="flex items-center bg-secondary rounded-lg border border-border">
                    <span className="pl-3 text-sm text-muted-foreground">/</span>
                    <input
                      type="text"
                      value={editing.shortcut}
                      onChange={(e) => setEditing({ ...editing, shortcut: e.target.value.replace(/\s/g, "").toLowerCase() })}
                      placeholder="meuatalho"
                      className="flex-1 bg-transparent px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    placeholder="Nome da resposta"
                    className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Categoria
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={newCategory ? "__new__" : editing.category}
                    onChange={(e) => {
                      if (e.target.value === "__new__") {
                        setNewCategory(" ");
                      } else {
                        setEditing({ ...editing, category: e.target.value });
                        setNewCategory("");
                      }
                    }}
                    className="bg-secondary rounded-lg px-3 py-2 text-sm text-foreground border border-border outline-none focus:ring-1 focus:ring-ring"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="__new__">+ Nova categoria</option>
                  </select>
                  {newCategory !== "" && (
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Nome da categoria"
                      autoFocus
                      className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:ring-1 focus:ring-ring"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Mensagem *
                </label>
                <textarea
                  value={editing.text}
                  onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                  placeholder="Digite o texto da resposta rápida..."
                  rows={5}
                  className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:ring-1 focus:ring-ring resize-none"
                />
              </div>

              {/* Preview */}
              {editing.text && (
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Pré-visualização
                  </label>
                  <div className="bg-chat-sent rounded-lg px-3 py-2 text-[13px] text-foreground whitespace-pre-wrap max-h-[100px] overflow-y-auto">
                    {editing.text}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => { setEditing(null); setNewCategory(""); }}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                {editing.id ? "Salvar" : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <h3 className="font-bold text-foreground text-base">Excluir resposta</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Tem certeza que deseja excluir a resposta <strong>"{deleteTarget.title}"</strong> (/{deleteTarget.shortcut})?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-bold bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
