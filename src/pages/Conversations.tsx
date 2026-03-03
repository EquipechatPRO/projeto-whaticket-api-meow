import { useState, useEffect, useCallback } from "react";
import { api, Chat, Message } from "@/services/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import ConversationList from "@/components/ConversationList";
import ChatWindow from "@/components/ChatWindow";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  MessageSquare,
  Clock,
  Users,
  Search,
  Inbox,
  PauseCircle,
  CheckCircle,
  Plus,
  SlidersHorizontal,
  Bot,
} from "lucide-react";

type MainTab = "inbox" | "paused" | "resolved" | "search";
type SubTab = "attending" | "waiting" | "bot" | "groups";

export default function Conversations() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedJid, setSelectedJid] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>("inbox");
  const [subTab, setSubTab] = useState<SubTab>("attending");
  const [search, setSearch] = useState("");
  const [selectedSector, setSelectedSector] = useState("all");

  useEffect(() => {
    api.getChats().then(setChats);
  }, []);

  const loadMessages = (jid: string) => {
    setSelectedJid(jid);
    api.getMessages(jid).then(setMessages);
  };

  const updateChatStatus = (jid: string, status: Chat["status"]) => {
    setChats((prev) =>
      prev.map((c): Chat => (c.jid === jid ? { ...c, status } : c))
    );
  };

  const handleReturn = (jid: string) => {
    updateChatStatus(jid, "waiting");
    setSelectedJid(null);
    setMessages([]);
  };

  const handlePause = (jid: string) => {
    updateChatStatus(jid, "paused");
    setSelectedJid(null);
    setMessages([]);
    setMainTab("paused");
  };

  const handleFinish = (jid: string) => {
    updateChatStatus(jid, "resolved");
    setSelectedJid(null);
    setMessages([]);
    setMainTab("resolved");
  };

  const handleTransfer = (jid: string) => {
    updateChatStatus(jid, "waiting");
    setSelectedJid(null);
    setMessages([]);
  };

  const handleDelete = (jid: string) => {
    setChats((prev) => prev.filter((c) => c.jid !== jid));
    setSelectedJid(null);
    setMessages([]);
  };

  const handleBack = () => {
    setSelectedJid(null);
    setMessages([]);
  };

  const filteredChats = chats
    .filter((c) => {
      if (mainTab === "paused") return c.status === "paused";
      if (mainTab === "resolved") return c.status === "resolved";
      if (mainTab === "inbox" || mainTab === "search") {
        if (subTab === "groups") return c.isGroup && c.status !== "paused" && c.status !== "resolved";
        if (subTab === "waiting") return !c.isGroup && c.status === "waiting";
        if (subTab === "bot") return false;
        return !c.isGroup && c.status !== "waiting" && c.status !== "paused" && c.status !== "resolved";
      }
      return true;
    })
    .filter((c) =>
      search ? c.name.toLowerCase().includes(search.toLowerCase()) : true
    );

  const selectedChat = chats.find((c) => c.jid === selectedJid);

  const counts = {
    attending: chats.filter((c) => !c.isGroup && !["waiting", "paused", "resolved"].includes(c.status || "")).length,
    waiting: chats.filter((c) => !c.isGroup && c.status === "waiting").length,
    bot: 0,
    groups: chats.filter((c) => c.isGroup && !["paused", "resolved"].includes(c.status || "")).length,
    paused: chats.filter((c) => c.status === "paused").length,
    resolved: chats.filter((c) => c.status === "resolved").length,
  };

  const mainTabs: { key: MainTab; label: string; icon: typeof Inbox; count?: number }[] = [
    { key: "inbox", label: "Inbox", icon: Inbox },
    { key: "paused", label: "Pausados", icon: PauseCircle, count: counts.paused },
    { key: "resolved", label: "Resolvidos", icon: CheckCircle, count: counts.resolved },
    { key: "search", label: "Busca", icon: Search },
  ];

  const subTabs: { key: SubTab; label: string; icon: typeof MessageSquare; count: number; color: string }[] = [
    { key: "attending", label: "ATENDIMENTO", icon: MessageSquare, count: counts.attending, color: "bg-primary text-primary-foreground" },
    { key: "waiting", label: "AGUARDANDO", icon: Clock, count: counts.waiting, color: "bg-warning text-warning-foreground" },
    { key: "bot", label: "NO BOT", icon: Bot, count: counts.bot, color: "bg-info text-info-foreground" },
    { key: "groups", label: "GRUPOS", icon: Users, count: counts.groups, color: "bg-destructive text-destructive-foreground" },
  ];

  return (
    <div className="flex h-full">
      {/* Left Panel */}
      <div className="w-[380px] border-r border-border flex flex-col bg-card shrink-0">
        {/* Main Tabs */}
        <div className="flex border-b border-border">
          {mainTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setMainTab(t.key)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors border-b-2 relative",
                mainTab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <t.icon className="w-4 h-4" />
                {t.count != null && t.count > 0 && (
                  <span className="absolute -top-2 -right-3 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center bg-warning text-warning-foreground">
                    {t.count}
                  </span>
                )}
              </div>
              {t.label}
            </button>
          ))}
        </div>

        {/* Actions Row */}
        <div className="flex items-center gap-2 p-3 border-b border-border">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:bg-primary/90 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            NOVO
          </button>
          <div className="flex items-center gap-1 ml-auto">
            <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
            </button>
            <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="bg-secondary text-foreground text-xs rounded-md px-2 py-1.5 border border-border outline-none"
          >
            <option value="all">Setores</option>
            <option value="suporte">Suporte</option>
            <option value="vendas">Vendas</option>
          </select>
        </div>

        {/* Sub Tabs - only show on inbox/search */}
        {(mainTab === "inbox" || mainTab === "search") && (
          <div className="flex border-b border-border">
            {subTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setSubTab(t.key)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold transition-colors relative",
                  subTab === t.key
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="relative">
                  <t.icon className="w-4 h-4" />
                  {t.count > 0 && (
                    <span className={cn("absolute -top-2 -right-3 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center", t.color)}>
                      {t.count}
                    </span>
                  )}
                </div>
                <span className="mt-1">{t.label}</span>
                {subTab === t.key && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-t" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Search in list */}
        {mainTab === "search" && (
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 bg-secondary rounded-md px-3 py-1.5">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar conversa..."
                className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
          </div>
        )}

        {/* List */}
        <ConversationList
          chats={filteredChats}
          selectedJid={selectedJid}
          onSelect={loadMessages}
        />
      </div>

      {/* Right Panel */}
      <div className="flex-1">
        {selectedChat ? (
          <ChatWindow
            chat={selectedChat}
            messages={messages}
            onMessageSent={() => loadMessages(selectedChat.jid)}
            onReturn={handleReturn}
            onPause={handlePause}
            onFinish={handleFinish}
            onTransfer={handleTransfer}
            onDelete={handleDelete}
            onBack={handleBack}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-chat-bg">
            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
            <h2 className="text-lg font-medium">Selecione uma conversa</h2>
            <p className="text-sm mt-1">Escolha uma conversa ao lado para iniciar</p>
          </div>
        )}
      </div>
    </div>
  );
}
