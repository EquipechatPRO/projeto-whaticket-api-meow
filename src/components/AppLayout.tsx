import { Outlet } from "react-router-dom";
import TopNavbar from "./TopNavbar";

export default function AppLayout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <TopNavbar />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
