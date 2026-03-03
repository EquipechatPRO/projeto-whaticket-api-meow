import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Wifi,
  Settings,
  ListOrdered,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/conversations", icon: MessageSquare, label: "Atendimento" },
  { to: "/contacts", icon: Users, label: "Contatos" },
  { to: "/queues", icon: ListOrdered, label: "Filas" },
  { to: "/connection", icon: Wifi, label: "Conexão" },
  { to: "/settings", icon: Settings, label: "Configurações" },
];

export default function Sidebar() {
  return (
    <aside className="w-16 bg-sidebar border-r border-sidebar-border flex flex-col items-center py-4 gap-1 shrink-0">
      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center mb-6">
        <MessageSquare className="w-5 h-5 text-primary-foreground" />
      </div>

      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === "/"}
          className={({ isActive }) =>
            cn(
              "w-12 h-12 flex items-center justify-center rounded-lg transition-colors",
              "hover:bg-sidebar-accent",
              isActive ? "bg-sidebar-accent text-primary" : "text-muted-foreground"
            )
          }
          title={link.label}
        >
          <link.icon className="w-5 h-5" />
        </NavLink>
      ))}

      <div className="mt-auto" />
    </aside>
  );
}
