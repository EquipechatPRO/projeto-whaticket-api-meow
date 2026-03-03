import { useState } from "react";
import { create } from "zustand";
import {
  Users, Plus, Pencil, Trash2, Link2, Send, Image, Shield,
  Search, MoreVertical, UserPlus, UserMinus, Crown, Archive,
  BellOff, MessageSquare, Copy, ExternalLink, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Store ──
interface GroupMember {
  id: string;
  name: string;
  phone: string;
  isAdmin: boolean;
}

interface Group {
  id: string;
  name: string;
  description: string;
  photo: string;
  members: GroupMember[];
  inviteLink: string;
  welcomeMessage: string;
  createdAt: string;
  archived: boolean;
  muted: boolean;
}

interface GroupStore {
  groups: Group[];
  addGroup: (g: Group) => void;
  removeGroup: (id: string) => void;
  updateGroup: (id: string, data: Partial<Group>) => void;
  addMember: (groupId: string, member: GroupMember) => void;
  removeMember: (groupId: string, memberId: string) => void;
  toggleAdmin: (groupId: string, memberId: string) => void;
}

const useGroupStore = create<GroupStore>((set) => ({
  groups: [
    {
      id: "g1",
      name: "Suporte Premium",
      description: "Grupo de suporte para clientes premium",
      photo: "",
      members: [
        { id: "m1", name: "João Silva", phone: "+55 11 99999-0001", isAdmin: true },
        { id: "m2", name: "Maria Souza", phone: "+55 11 99999-0002", isAdmin: false },
        { id: "m3", name: "Carlos Lima", phone: "+55 11 99999-0003", isAdmin: false },
      ],
      inviteLink: "https://chat.whatsapp.com/abc123",
      welcomeMessage: "Bem-vindo ao grupo de suporte! 🎉",
      createdAt: "2025-01-15",
      archived: false,
      muted: false,
    },
    {
      id: "g2",
      name: "Equipe Vendas",
      description: "Comunicação interna da equipe de vendas",
      photo: "",
      members: [
        { id: "m4", name: "Ana Costa", phone: "+55 11 99999-0004", isAdmin: true },
        { id: "m5", name: "Pedro Oliveira", phone: "+55 11 99999-0005", isAdmin: false },
      ],
      inviteLink: "https://chat.whatsapp.com/def456",
      welcomeMessage: "Olá! Bem-vindo à equipe de vendas!",
      createdAt: "2025-02-10",
      archived: false,
      muted: false,
    },
    {
      id: "g3",
      name: "Promoções 2025",
      description: "Grupo de divulgação de promoções",
      photo: "",
      members: [
        { id: "m6", name: "Fernanda Reis", phone: "+55 11 99999-0006", isAdmin: true },
      ],
      inviteLink: "https://chat.whatsapp.com/ghi789",
      welcomeMessage: "",
      createdAt: "2025-03-01",
      archived: true,
      muted: true,
    },
  ],
  addGroup: (g) => set((s) => ({ groups: [...s.groups, g] })),
  removeGroup: (id) => set((s) => ({ groups: s.groups.filter((g) => g.id !== id) })),
  updateGroup: (id, data) => set((s) => ({ groups: s.groups.map((g) => (g.id === id ? { ...g, ...data } : g)) })),
  addMember: (groupId, member) =>
    set((s) => ({
      groups: s.groups.map((g) =>
        g.id === groupId ? { ...g, members: [...g.members, member] } : g
      ),
    })),
  removeMember: (groupId, memberId) =>
    set((s) => ({
      groups: s.groups.map((g) =>
        g.id === groupId ? { ...g, members: g.members.filter((m) => m.id !== memberId) } : g
      ),
    })),
  toggleAdmin: (groupId, memberId) =>
    set((s) => ({
      groups: s.groups.map((g) =>
        g.id === groupId
          ? { ...g, members: g.members.map((m) => (m.id === memberId ? { ...m, isAdmin: !m.isAdmin } : m)) }
          : g
      ),
    })),
}));

// ── Tabs ──
type Tab = "details" | "members" | "messages" | "actions";

export default function Groups() {
  const { groups, addGroup, removeGroup, updateGroup, addMember, removeMember, toggleAdmin } = useGroupStore();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("details");
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newWelcome, setNewWelcome] = useState("");

  // Add member form
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberPhone, setMemberPhone] = useState("");

  // Bulk message
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkTargets, setBulkTargets] = useState<string[]>([]);

  const filtered = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.description.toLowerCase().includes(search.toLowerCase())
  );

  const selected = groups.find((g) => g.id === selectedId);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const g: Group = {
      id: `g-${Date.now()}`,
      name: newName.trim(),
      description: newDesc.trim(),
      photo: "",
      members: [],
      inviteLink: `https://chat.whatsapp.com/${Math.random().toString(36).slice(2, 10)}`,
      welcomeMessage: newWelcome.trim(),
      createdAt: new Date().toISOString().split("T")[0],
      archived: false,
      muted: false,
    };
    addGroup(g);
    setNewName("");
    setNewDesc("");
    setNewWelcome("");
    setShowCreate(false);
    setSelectedId(g.id);
    toast.success("Grupo criado!");
  };

  const handleAddMember = () => {
    if (!selectedId || !memberName.trim() || !memberPhone.trim()) return;
    addMember(selectedId, {
      id: `m-${Date.now()}`,
      name: memberName.trim(),
      phone: memberPhone.trim(),
      isAdmin: false,
    });
    setMemberName("");
    setMemberPhone("");
    setShowAddMember(false);
    toast.success("Membro adicionado!");
  };

  const handleBulkSend = () => {
    if (!bulkMessage.trim() || bulkTargets.length === 0) return;
    toast.success(`Mensagem enviada para ${bulkTargets.length} grupo(s)!`);
    setBulkMessage("");
    setBulkTargets([]);
  };

  const copyInviteLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  return (
    <div className="flex h-full gap-2 p-2">
      {/* Left: Group List */}
      <div className="w-[340px] shrink-0 bg-card border border-border rounded-2xl flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Grupos
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">{groups.length}</span>
            </h2>
            <button
              onClick={() => setShowCreate(true)}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2 bg-secondary rounded-lg px-2.5 py-1.5">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar grupos..."
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map((g) => (
            <button
              key={g.id}
              onClick={() => { setSelectedId(g.id); setTab("details"); }}
              className={cn(
                "w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-accent/50 transition-colors border-b border-border",
                selectedId === g.id && "bg-primary/5"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-foreground truncate">{g.name}</span>
                  {g.archived && <Archive className="w-3 h-3 text-muted-foreground" />}
                  {g.muted && <BellOff className="w-3 h-3 text-muted-foreground" />}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{g.description || "Sem descrição"}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{g.members.length} membros</p>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-xs">Nenhum grupo encontrado</p>
            </div>
          )}
        </div>

        {/* Bulk Message Section */}
        <div className="border-t border-border p-3 space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Envio em massa</p>
          <div className="flex flex-wrap gap-1">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() =>
                  setBulkTargets((prev) =>
                    prev.includes(g.id) ? prev.filter((x) => x !== g.id) : [...prev, g.id]
                  )
                }
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                  bulkTargets.includes(g.id)
                    ? "bg-primary/10 border-primary text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                {g.name}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={bulkMessage}
              onChange={(e) => setBulkMessage(e.target.value)}
              placeholder="Mensagem para os grupos..."
              className="flex-1 bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleBulkSend()}
            />
            <button
              onClick={handleBulkSend}
              disabled={!bulkMessage.trim() || bulkTargets.length === 0}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Right: Group Detail / Create Form */}
      <div className="flex-1 bg-card border border-border rounded-2xl flex flex-col overflow-hidden">
        {showCreate ? (
          <div className="flex-1 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Criar novo grupo</h3>
              <button onClick={() => setShowCreate(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Nome do grupo *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Suporte VIP"
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Descrição</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
                placeholder="Descrição do grupo..."
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Mensagem de boas-vindas</label>
              <textarea
                value={newWelcome}
                onChange={(e) => setNewWelcome(e.target.value)}
                rows={2}
                placeholder="Mensagem automática ao entrar..."
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="px-6 py-2 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Criar grupo
            </button>
          </div>
        ) : selected ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{selected.name}</h3>
                  <p className="text-[10px] text-muted-foreground">{selected.members.length} membros · Criado em {selected.createdAt}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { updateGroup(selected.id, { archived: !selected.archived }); toast.success(selected.archived ? "Desarquivado!" : "Arquivado!"); }}
                  className={cn("w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors", selected.archived ? "text-primary" : "text-muted-foreground")}
                  title={selected.archived ? "Desarquivar" : "Arquivar"}
                >
                  <Archive className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { updateGroup(selected.id, { muted: !selected.muted }); toast.success(selected.muted ? "Notificações ativadas!" : "Silenciado!"); }}
                  className={cn("w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors", selected.muted ? "text-primary" : "text-muted-foreground")}
                  title={selected.muted ? "Ativar notificações" : "Silenciar"}
                >
                  <BellOff className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { removeGroup(selected.id); setSelectedId(null); toast.success("Grupo removido!"); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  title="Excluir grupo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border px-4">
              {([
                { key: "details" as Tab, label: "Detalhes", icon: Pencil },
                { key: "members" as Tab, label: "Membros", icon: Users },
                { key: "messages" as Tab, label: "Mensagens", icon: MessageSquare },
                { key: "actions" as Tab, label: "Ações", icon: Shield },
              ]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors",
                    tab === t.key
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {tab === "details" && (
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Nome do grupo</label>
                    <input
                      type="text"
                      value={selected.name}
                      onChange={(e) => updateGroup(selected.id, { name: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Descrição</label>
                    <textarea
                      value={selected.description}
                      onChange={(e) => updateGroup(selected.id, { description: e.target.value })}
                      rows={3}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Foto do grupo (URL)</label>
                    <input
                      type="text"
                      value={selected.photo}
                      onChange={(e) => updateGroup(selected.id, { photo: e.target.value })}
                      placeholder="https://..."
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Link de convite</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={selected.inviteLink}
                        readOnly
                        className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground outline-none"
                      />
                      <button
                        onClick={() => copyInviteLink(selected.inviteLink)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground transition-colors"
                        title="Copiar link"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => window.open(selected.inviteLink, "_blank")}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground transition-colors"
                        title="Abrir link"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {tab === "members" && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">{selected.members.length} membros</p>
                    <button
                      onClick={() => setShowAddMember(true)}
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Adicionar membro
                    </button>
                  </div>

                  {showAddMember && (
                    <div className="bg-secondary/50 border border-border rounded-lg p-3 space-y-2">
                      <input
                        type="text"
                        value={memberName}
                        onChange={(e) => setMemberName(e.target.value)}
                        placeholder="Nome"
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                      />
                      <input
                        type="text"
                        value={memberPhone}
                        onChange={(e) => setMemberPhone(e.target.value)}
                        placeholder="Telefone (+55...)"
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                      />
                      <div className="flex gap-2">
                        <button onClick={handleAddMember} disabled={!memberName.trim() || !memberPhone.trim()} className="flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                          Adicionar
                        </button>
                        <button onClick={() => { setShowAddMember(false); setMemberName(""); setMemberPhone(""); }} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-accent">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    {selected.members.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">{m.name.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-foreground">{m.name}</span>
                            {m.isAdmin && (
                              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                                <Crown className="w-2.5 h-2.5" /> Admin
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">{m.phone}</p>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => { toggleAdmin(selected.id, m.id); toast.success(m.isAdmin ? "Admin removido" : "Promovido a admin!"); }}
                            className={cn("w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent transition-colors", m.isAdmin ? "text-primary" : "text-muted-foreground")}
                            title={m.isAdmin ? "Remover admin" : "Tornar admin"}
                          >
                            <Crown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { removeMember(selected.id, m.id); toast.success("Membro removido!"); }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Remover membro"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {selected.members.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-6">Nenhum membro</p>
                    )}
                  </div>
                </>
              )}

              {tab === "messages" && (
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Mensagem de boas-vindas</label>
                    <textarea
                      value={selected.welcomeMessage}
                      onChange={(e) => updateGroup(selected.id, { welcomeMessage: e.target.value })}
                      rows={3}
                      placeholder="Mensagem enviada automaticamente ao novo membro..."
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring resize-none"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Use {"{{nome}}"} para inserir o nome do membro</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Enviar mensagem ao grupo</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Digite uma mensagem..."
                        className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                            toast.success("Mensagem enviada ao grupo!");
                            (e.target as HTMLInputElement).value = "";
                          }
                        }}
                      />
                      <button
                        onClick={() => toast.success("Mensagem enviada!")}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {tab === "actions" && (
                <div className="space-y-3">
                  <button
                    onClick={() => { copyInviteLink(selected.inviteLink); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary hover:bg-accent transition-colors text-left"
                  >
                    <Link2 className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Copiar link de convite</p>
                      <p className="text-[10px] text-muted-foreground">Compartilhe o link para novos membros</p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      updateGroup(selected.id, { inviteLink: `https://chat.whatsapp.com/${Math.random().toString(36).slice(2, 10)}` });
                      toast.success("Link renovado!");
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary hover:bg-accent transition-colors text-left"
                  >
                    <Link2 className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Revogar e gerar novo link</p>
                      <p className="text-[10px] text-muted-foreground">Invalida o link anterior e gera um novo</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { updateGroup(selected.id, { archived: !selected.archived }); toast.success(selected.archived ? "Desarquivado!" : "Arquivado!"); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary hover:bg-accent transition-colors text-left"
                  >
                    <Archive className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">{selected.archived ? "Desarquivar grupo" : "Arquivar grupo"}</p>
                      <p className="text-[10px] text-muted-foreground">{selected.archived ? "Mover de volta para grupos ativos" : "Esconder dos grupos ativos"}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { updateGroup(selected.id, { muted: !selected.muted }); toast.success(selected.muted ? "Notificações ativadas!" : "Silenciado!"); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary hover:bg-accent transition-colors text-left"
                  >
                    <BellOff className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">{selected.muted ? "Ativar notificações" : "Silenciar grupo"}</p>
                      <p className="text-[10px] text-muted-foreground">{selected.muted ? "Receber notificações novamente" : "Parar de receber notificações"}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { removeGroup(selected.id); setSelectedId(null); toast.success("Grupo excluído!"); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors text-left"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                    <div>
                      <p className="text-xs font-semibold text-destructive">Sair e excluir grupo</p>
                      <p className="text-[10px] text-destructive/70">Esta ação não pode ser desfeita</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Users className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">Selecione um grupo</p>
            <p className="text-xs mt-1">Ou crie um novo para começar</p>
          </div>
        )}
      </div>
    </div>
  );
}