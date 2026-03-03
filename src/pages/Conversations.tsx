import { useState, useEffect } from "react";
import { api, Chat, Message } from "@/services/api";
import ConversationList from "@/components/ConversationList";
import ChatWindow from "@/components/ChatWindow";
import { cn } from "@/lib/utils";
import { MessageSquare, Clock, Users, Search } from "lucide-react";

type Tab = "attending" | "waiting" | "groups";

export default function Conversations() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedJid, setSelectedJid] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("attending");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.getChats().then(setChats);
  }, []);

  const loadMessages = (jid: string) => {
    setSelectedJid(jid);
    api.getMessages(jid).then(setMessages);
  };

  const filteredChats = chats.filter((c) => {
    if (tab === "groups") return c.isGroup;
    if (tab === "waiting") return !c.isGroup && c.status === "waiting";
    return !c.isGroup && c.status !== "waiting";
  }).filter((c) =>
    search ? c.name.toLowerCase().includes(search.toLowerCase()) : true
  );

  const selectedChat = chats.find((c) => c.jid === selectedJid);

  const counts = {
    attending: chats.filter((c) => !c.isGroup && c.status !== "waiting").length,
    waiting: chats.filter((c) => !c.isGroup && c.status === "waiting").length,
    groups: chats.filter((c) => c.isGroup).length,
  };

  const tabs: { key: Tab; label: string; icon: typeof MessageSquare; count: number }[] = [
    { key: "attending", label: "Atendendo", icon: MessageSquare, count: counts.attending },
    { key: "waiting", label: "Aguardando", icon: Clock, count: counts.waiting },
    { key: "groups", label: "Grupos", icon: Users, count: counts.groups },
  ];

  return (
    <div className="flex h-full">
      {/* Left Panel */}
      <div className="w-80 border-r border-border flex flex-col bg-card shrink-0">
        {/* Search */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversa..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2",
                tab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                  tab === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

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
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
            <h2 className="text-lg font-medium">Selecione uma conversa</h2>
            <p className="text-sm mt-1">Escolha uma conversa ao lado para iniciar</p>
          </div>
        )}
      </div>
    </div>
  );
}
