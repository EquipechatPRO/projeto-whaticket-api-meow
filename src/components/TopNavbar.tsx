import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, MessageSquare, Bot, Shield, Settings,
  Search, Bell, Moon, Sun, MessageCircle, Zap, LogOut, Building2, GitBranch,
  Menu, User, Users, CreditCard, Key, HelpCircle,
  BellRing, Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { useWSStatus } from "@/stores/ws-status-store";
import { useAuth } from "@/stores/auth-store";
import { toast } from "sonner";
import { useTranslation } from "@/i18n/translations";
import { useSettingsStore, type Theme, type Language } from "@/stores/settings-store";
import { useNotificationPrefs } from "@/stores/notification-store";
import { useNotificationInbox } from "@/stores/notification-inbox-store";

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

export default function TopNavbar() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState("");
  const wsConnected = useWSStatus((s) => s.isConnected);
  const { user, logout } = useAuth();

  const { theme, setTheme, language, setLanguage } = useSettingsStore();
  const { soundEnabled, setSoundEnabled, toastEnabled, setToastEnabled, pushEnabled, setPushEnabled } = useNotificationPrefs();
  const { notifications, unreadCount, markAsRead, markAllAsRead, getTimeAgo } = useNotificationInbox();

  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showHamburger, setShowHamburger] = useState(false);
  const [notifTab, setNotifTab] = useState<"messages" | "settings">("messages");

  const langRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLDivElement>(null);

  useClickOutside(langRef, () => setShowLangMenu(false));
  useClickOutside(notifRef, () => setShowNotifMenu(false));
  useClickOutside(hamburgerRef, () => setShowHamburger(false));

  const isSuperAdmin = user?.role === "super_admin";

  const navLinks = [
    { to: "/", icon: LayoutDashboard, label: t("nav.dashboard") },
    { to: "/conversations", icon: MessageSquare, label: t("nav.conversations") },
    { to: "/contacts", icon: Bot, label: t("nav.contacts") },
    { to: "/queues", icon: Shield, label: t("nav.queues") },
    { to: "/flows", icon: GitBranch, label: "Fluxos" },
    { to: "/quick-replies", icon: Zap, label: t("nav.quick_replies") },
    ...(user?.role === "company_admin" || isSuperAdmin
      ? [{ to: "/users", icon: Users, label: t("users.title").split(" ")[0] }]
      : []),
    { to: "/connection", icon: Settings, label: t("nav.connection") },
  ];

  const handleLogout = () => {
    logout();
    toast.success(t("nav.logout_success"));
    navigate("/login");
  };

  const toggleTheme = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
  };

  const langLabels: Record<Language, { flag: string; label: string }> = {
    "pt-BR": { flag: "🇧🇷", label: "Português" },
    en: { flag: "🇺🇸", label: "English" },
    es: { flag: "🇪🇸", label: "Español" },
  };

  const roleLabels: Record<string, string> = {
    super_admin: t("role.super_admin"),
    company_admin: t("role.company_admin"),
    supervisor: t("role.supervisor"),
    agent: t("role.agent"),
  };

  return (
    <header className="h-14 bg-navbar border-b border-navbar-border flex items-center px-4 gap-3 shrink-0 z-50">
      <NavLink to="/" className="flex items-center gap-2 mr-4 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <MessageCircle className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-foreground text-sm hidden md:inline">WhatsPanel</span>
      </NavLink>

      <nav className="flex items-center gap-0.5">
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )
            }
          >
            <link.icon className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="flex-1 max-w-md ml-auto">
        <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-1.5">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={t("nav.search_placeholder")}
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 ml-3 shrink-0">
        {/* WS Status */}
        <div
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold",
            wsConnected ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"
          )}
          title={wsConnected ? "WebSocket connected" : "WebSocket disconnected"}
        >
          <span className={cn("w-2 h-2 rounded-full", wsConnected ? "bg-green-500 animate-pulse" : "bg-destructive")} />
        </div>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground transition-colors"
            title={t("settings.notifications")}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {showNotifMenu && (
            <div className="absolute right-0 top-10 w-80 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                <p className="text-sm font-semibold text-foreground">{t("settings.notifications")}</p>
                <div className="flex items-center gap-2">
                  {notifTab === "messages" && unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-[10px] font-medium text-primary hover:underline">
                      Marcar todas como lidas
                    </button>
                  )}
                  <button
                    onClick={() => setNotifTab(notifTab === "messages" ? "settings" : "messages")}
                    className="text-[10px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    {notifTab === "messages" ? "⚙️" : "💬"}
                  </button>
                </div>
              </div>

              {notifTab === "messages" ? (
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Bell className="w-6 h-6 mb-2 opacity-30" />
                      <p className="text-xs">Nenhuma notificação</p>
                      <p className="text-[10px] mt-1">Mensagens recebidas via WebSocket aparecerão aqui</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => { markAsRead(n.id); navigate("/conversations"); setShowNotifMenu(false); }}
                        className={cn(
                          "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors border-b border-border last:border-0",
                          !n.read && "bg-primary/5"
                        )}
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">{n.sender.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={cn("text-xs truncate", n.read ? "text-muted-foreground" : "font-semibold text-foreground")}>
                              {n.sender}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{getTimeAgo(n.timestamp)}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        </div>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <div className="p-3 space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Volume2 className="w-3.5 h-3.5" />{t("settings.sound")}</span>
                    <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} className="accent-primary w-4 h-4" />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5"><BellRing className="w-3.5 h-3.5" />{t("settings.toast")}</span>
                    <input type="checkbox" checked={toastEnabled} onChange={(e) => setToastEnabled(e.target.checked)} className="accent-primary w-4 h-4" />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Bell className="w-3.5 h-3.5" />Push</span>
                    <input type="checkbox" checked={pushEnabled} onChange={(e) => setPushEnabled(e.target.checked)} className="accent-primary w-4 h-4" />
                  </label>
                </div>
              )}

              {/* Footer */}
              <div className="border-t border-border px-4 py-2">
                <button
                  onClick={() => { navigate("/conversations"); setShowNotifMenu(false); }}
                  className="text-xs text-primary hover:underline font-medium w-full text-center"
                >
                  Ver todas as conversas
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground transition-colors"
          title={theme === "dark" ? t("settings.light") : t("settings.dark")}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Language Selector */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground transition-colors text-base"
            title={t("settings.language")}
          >
            {langLabels[language].flag}
          </button>
          {showLangMenu && (
            <div className="absolute right-0 top-10 w-40 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
              {(Object.keys(langLabels) as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => { setLanguage(lang); setShowLangMenu(false); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent transition-colors",
                    language === lang ? "bg-primary/10 text-primary font-semibold" : "text-foreground"
                  )}
                >
                  <span>{langLabels[lang].flag}</span>
                  <span>{langLabels[lang].label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Profile Avatar */}
        <div
          className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center cursor-pointer border-2 border-primary/30"
          title={user?.name || ""}
          onClick={() => navigate("/settings")}
        >
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-primary">{user?.name?.charAt(0) || "U"}</span>
          )}
        </div>

        {/* Hamburger Menu */}
        <div className="relative" ref={hamburgerRef}>
          <button
            onClick={() => setShowHamburger(!showHamburger)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground transition-colors"
          >
            <Menu className="w-4 h-4" />
          </button>
          {showHamburger && (
            <div className="absolute right-0 top-10 w-52 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1">
              {/* User info */}
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-semibold text-foreground">{user?.name}</p>
                <p className="text-[10px] text-muted-foreground">{roleLabels[user?.role || "agent"]}</p>
                {user?.companyName && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5"><Building2 className="w-3 h-3" />{user.companyName}</p>
                )}
              </div>
              {/* Menu items */}
              <button onClick={() => { navigate("/settings"); setShowHamburger(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors">
                <User className="w-3.5 h-3.5" /> {t("settings.profile")}
              </button>
              <button onClick={() => { navigate("/contacts"); setShowHamburger(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors">
                <Users className="w-3.5 h-3.5" /> {t("nav.contacts")}
              </button>
              <button onClick={() => { navigate("/plans"); setShowHamburger(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors">
                <CreditCard className="w-3.5 h-3.5" /> Planos
              </button>
              <button onClick={() => { navigate("/connection"); setShowHamburger(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors">
                <Key className="w-3.5 h-3.5" /> API / {t("nav.connection")}
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors">
                <HelpCircle className="w-3.5 h-3.5" /> Ajuda
              </button>
              {isSuperAdmin && (
                <button onClick={() => { navigate("/admin"); setShowHamburger(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-primary font-semibold hover:bg-primary/10 transition-colors">
                  <Building2 className="w-3.5 h-3.5" /> Master Admin
                </button>
              )}
              <div className="border-t border-border mt-1 pt-1">
                <button
                  onClick={() => { handleLogout(); setShowHamburger(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" /> {t("nav.logout")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
