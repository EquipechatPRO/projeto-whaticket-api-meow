import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, MessageSquare, Bot, Shield, Settings,
  Search, Bell, Monitor, Moon, MessageCircle, Zap, LogOut, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useWSStatus } from "@/stores/ws-status-store";
import { useAuth } from "@/stores/auth-store";
import { toast } from "sonner";
import { useTranslation } from "@/i18n/translations";

export default function TopNavbar() {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState("");
  const wsConnected = useWSStatus((s) => s.isConnected);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = user?.role === "super_admin";

  const navLinks = isSuperAdmin
    ? [
        { to: "/", icon: LayoutDashboard, label: t("nav.companies") },
        { to: "/connection", icon: Settings, label: t("nav.settings") },
      ]
    : [
        { to: "/", icon: LayoutDashboard, label: t("nav.dashboard") },
        { to: "/conversations", icon: MessageSquare, label: t("nav.conversations") },
        { to: "/contacts", icon: Bot, label: t("nav.contacts") },
        { to: "/queues", icon: Shield, label: t("nav.queues") },
        { to: "/quick-replies", icon: Zap, label: t("nav.quick_replies") },
        { to: "/connection", icon: Settings, label: t("nav.connection") },
      ];

  const handleLogout = () => {
    logout();
    toast.success(t("nav.logout_success"));
    navigate("/login");
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
        {user?.companyName && (
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent text-xs text-foreground mr-1">
            <Building2 className="w-3 h-3" />
            {user.companyName}
          </div>
        )}
        <div
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold mr-1",
            wsConnected ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"
          )}
          title={wsConnected ? "WebSocket connected" : "WebSocket disconnected"}
        >
          <span className={cn("w-2 h-2 rounded-full", wsConnected ? "bg-green-500 animate-pulse" : "bg-destructive")} />
          <span className="hidden sm:inline">{wsConnected ? t("common.online") : t("common.offline")}</span>
        </div>
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">2</span>
        </button>
        <div className="flex items-center gap-2 ml-1 pl-2 border-l border-border">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-medium text-foreground leading-tight">{user?.name}</p>
            <p className="text-[10px] text-muted-foreground">{roleLabels[user?.role || "agent"]}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center cursor-pointer">
            <span className="text-xs font-bold text-primary">{user?.name?.charAt(0) || "U"}</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title={t("nav.logout")}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
