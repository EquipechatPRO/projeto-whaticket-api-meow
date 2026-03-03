import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { api, Chat, Message } from "@/services/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import ConversationList from "@/components/ConversationList";
import ChatWindow from "@/components/ChatWindow";
import NewChatModal from "@/components/NewChatModal";
import { useNotifications } from "@/hooks/useNotifications";
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

interface SearchResult {
  id: string;
  jid: string;
  text: string;
  timestamp: string;
  senderName?: string;
  fromMe: boolean;
}

export default function Conversations() {
  const { notify } = useNotifications();
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedJid, setSelectedJid] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>("inbox");
  const [subTab, setSubTab] = useState<SubTab>("attending");
  const [search, setSearch] = useState("");
  const [selectedSector, setSelectedSector] = useState("all");
  const [typingJids, setTypingJids] = useState<Record<string, string>>({});
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // WebSocket real-time updates
  const { isConnected: wsConnected } = useWebSocket({
    onMessage: useCallback((msg: Message) => {
      // Add to messages if viewing that chat
      setMessages((prev) => {
        if (selectedJid === msg.jid) {
          return [...prev, msg];
        }
        return prev;
      });
      // Update chat list
      setChats((prev) => {
        const existing = prev.find((c) => c.jid === msg.jid);
        if (existing) {
          return prev.map((c): Chat =>
            c.jid === msg.jid
              ? { ...c, lastMessage: msg.text, lastMessageTime: msg.timestamp, unreadCount: selectedJid === msg.jid ? c.unreadCount : c.unreadCount + 1 }
              : c
          );
        }
        // New chat
        return [
          {
            jid: msg.jid,
            name: msg.senderName || msg.jid,
            lastMessage: msg.text,
            lastMessageTime: msg.timestamp,
            unreadCount: 1,
            isGroup: msg.jid.includes("@g.us"),
            status: "waiting" as const,
          },
          ...prev,
        ];
      });
      if (!msg.fromMe && selectedJid !== msg.jid) {
        toast.info(`Nova mensagem de ${msg.senderName || msg.jid}`);
        notify(`Nova mensagem de ${msg.senderName || msg.jid}`, {
          body: msg.text?.slice(0, 100) || "Nova mensagem",
          tag: msg.jid,
        });
      }
    }, [selectedJid]),
    onTyping: useCallback((data: { jid: string; from: string; state: string }) => {
      if (data.state === "composing") {
        setTypingJids((prev) => ({ ...prev, [data.jid]: data.from }));
        setTimeout(() => {
          setTypingJids((prev) => {
            const next = { ...prev };
            delete next[data.jid];
            return next;
          });
        }, 5000);
      } else {
        setTypingJids((prev) => {
          const next = { ...prev };
          delete next[data.jid];
          return next;
        });
      }
    }, []),
  });

  useEffect(() => {
    api.getChats().then(setChats);
  }, []);

  const PAGE_SIZE = 50;

  const loadMessages = (jid: string) => {
    setSelectedJid(jid);
    api.getMessages(jid, PAGE_SIZE, 0).then((res) => {
      setMessages(res.messages);
      setTotalMessages(res.total);
    });
  };

  const loadOlderMessages = useCallback(() => {
    if (!selectedJid || loadingMore) return;
    const currentCount = messages.length;
    if (currentCount >= totalMessages) return;
    setLoadingMore(true);
    // offset from the end (we fetch newest-first then reverse in backend)
    api.getMessages(selectedJid, PAGE_SIZE, currentCount).then((res) => {
      setMessages((prev) => [...res.messages, ...prev]);
      setTotalMessages(res.total);
    }).finally(() => setLoadingMore(false));
  }, [selectedJid, messages.length, totalMessages, loadingMore]);

  // Full-text search with debounce
  useEffect(() => {
    if (mainTab !== "search" || !search.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      api.searchMessages(search.trim()).then((results) => {
        setSearchResults(results as unknown as SearchResult[]);
        setIsSearching(false);
      }).catch(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, mainTab]);

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

  const mainTabs: { key: MainTab; icon: typeof Inbox; count?: number; tooltip: string }[] = [
    { key: "inbox", icon: Inbox, tooltip: "Inbox" },
    { key: "paused", icon: PauseCircle, count: counts.paused, tooltip: "Pausados" },
    { key: "resolved", icon: CheckCircle, count: counts.resolved, tooltip: "Resolvidos" },
    { key: "search", icon: Search, tooltip: "Busca" },
  ];

  const subTabs: { key: SubTab; label: string; icon: typeof MessageSquare; count: number; color: string }[] = [
    { key: "attending", label: "ATENDIMENTO", icon: MessageSquare, count: counts.attending, color: "bg-primary text-primary-foreground" },
    { key: "waiting", label: "AGUARDANDO", icon: Clock, count: counts.waiting, color: "bg-warning text-warning-foreground" },
    { key: "bot", label: "NO BOT", icon: Bot, count: counts.bot, color: "bg-info text-info-foreground" },
    { key: "groups", label: "GRUPOS", icon: Users, count: counts.groups, color: "bg-destructive text-destructive-foreground" },
  ];

  return (
    <div className="flex h-full pb-2">
      {/* Left Panel */}
      <div className="w-[380px] border-r border-border flex flex-col bg-card shrink-0">
        {/* Main Tabs */}
        <div className="flex border-b border-border mt-2">
          {mainTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setMainTab(t.key)}
              title={t.tooltip}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 transition-colors border-b-2 relative",
                mainTab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <t.icon className="w-5 h-5" />
                {t.count != null && t.count > 0 && (
                  <span className="absolute -top-2 -right-3 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center bg-destructive text-destructive-foreground">
                    {t.count}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold">{t.tooltip}</span>
            </button>
          ))}
        </div>

        {/* Actions Row */}
        <div className="flex items-center gap-2 p-3 border-b border-border">
          <button
            onClick={() => setShowNewChat(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
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
                placeholder="Buscar em todas as mensagens..."
                className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
              />
              {isSearching && (
                <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          </div>
        )}

        {/* Search Results */}
        {mainTab === "search" && search.trim() && searchResults.length > 0 && (
          <div className="flex-1 overflow-y-auto">
            <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {searchResults.length} resultado{searchResults.length !== 1 ? "s" : ""} encontrado{searchResults.length !== 1 ? "s" : ""}
            </div>
            {searchResults.map((result) => {
              const chat = chats.find((c) => c.jid === result.jid);
              const time = (() => { try { return format(new Date(result.timestamp), "dd/MM HH:mm"); } catch { return ""; } })();
              return (
                <button
                  key={result.id}
                  onClick={() => loadMessages(result.jid)}
                  className="flex items-start gap-3 p-3 text-left hover:bg-accent/50 transition-colors border-b border-border w-full"
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {(chat?.name || result.senderName || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground truncate">
                        {chat?.name || result.senderName || result.jid}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{time}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                      {result.fromMe && <span className="text-primary font-medium">Você: </span>}
                      {result.text}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {mainTab === "search" && search.trim() && !isSearching && searchResults.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Search className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">Nenhum resultado encontrado</p>
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
            hasMore={messages.length < totalMessages}
            loadingMore={loadingMore}
            onLoadMore={loadOlderMessages}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-chat-bg">
            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
            <h2 className="text-lg font-medium">Selecione uma conversa</h2>
            <p className="text-sm mt-1">Escolha uma conversa ao lado para iniciar</p>
          </div>
        )}
      </div>

      <NewChatModal
        open={showNewChat}
        onClose={() => setShowNewChat(false)}
        onCreated={(chat) => {
          setChats((prev) => [chat, ...prev]);
          setSelectedJid(chat.jid);
          api.getMessages(chat.jid, 50, 0).then((res) => { setMessages(res.messages); setTotalMessages(res.total); });
        }}
      />
    </div>
  );
}
