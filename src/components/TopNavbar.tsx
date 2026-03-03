import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  Shield,
  Settings,
  Search,
  Bell,
  Monitor,
  Moon,
  Menu,
  MessageCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useWSStatus } from "@/stores/ws-status-store";

const navLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/conversations", icon: MessageSquare, label: "Atendimentos" },
  { to: "/contacts", icon: Bot, label: "Contatos" },
  { to: "/queues", icon: Shield, label: "Filas" },
  { to: "/quick-replies", icon: Zap, label: "Respostas" },
  { to: "/connection", icon: Settings, label: "Configurações" },
];

export default function TopNavbar() {
  const [searchText, setSearchText] = useState("");
  const wsConnected = useWSStatus((s) => s.isConnected);

  return (
    <header className="h-14 bg-navbar border-b border-navbar-border flex items-center px-4 gap-3 shrink-0 z-50">
      {/* Logo */}
      <NavLink to="/" className="flex items-center gap-2 mr-4 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <MessageCircle className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-foreground text-sm hidden md:inline">WhatsPanel</span>
      </NavLink>

      {/* Nav Links */}
      <nav className="flex items-center gap-0.5">
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )
            }
          >
            <link.icon className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Search Bar */}
      <div className="flex-1 max-w-md ml-auto">
        <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-1.5">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar atendimentos e mensagens"
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      {/* Right Icons */}
      <div className="flex items-center gap-1 ml-3 shrink-0">
        <div
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold mr-1",
            wsConnected
              ? "bg-green-500/10 text-green-500"
              : "bg-destructive/10 text-destructive"
          )}
          title={wsConnected ? "WebSocket conectado" : "WebSocket desconectado"}
        >
          <span className={cn("w-2 h-2 rounded-full", wsConnected ? "bg-green-500 animate-pulse" : "bg-destructive")} />
          <span className="hidden sm:inline">{wsConnected ? "Online" : "Offline"}</span>
        </div>
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
            2
          </span>
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground transition-colors">
          <Monitor className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground transition-colors">
          <Moon className="w-4 h-4" />
        </button>
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center ml-1 cursor-pointer">
          <span className="text-xs font-bold text-primary">W</span>
        </div>
      </div>
    </header>
  );
}
