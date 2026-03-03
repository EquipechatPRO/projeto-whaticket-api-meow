import { Outlet } from "react-router-dom";
import TopNavbar from "./TopNavbar";

export default function AppLayout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-muted/50">
      <TopNavbar />
      <main className="flex-1 overflow-hidden p-4">
        <div className="h-full rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
