import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, MessageSquare, Users, Wifi, Settings, ListOrdered,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/translations";

export default function Sidebar() {
  const { t } = useTranslation();

  const links = [
    { to: "/", icon: LayoutDashboard, label: t("nav.dashboard") },
    { to: "/conversations", icon: MessageSquare, label: t("nav.conversations") },
    { to: "/contacts", icon: Users, label: t("nav.contacts") },
    { to: "/queues", icon: ListOrdered, label: t("nav.queues") },
    { to: "/connection", icon: Wifi, label: t("nav.connection") },
    { to: "/settings", icon: Settings, label: t("nav.settings") },
  ];

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
