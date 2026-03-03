import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import AppLayout from "./components/AppLayout";
import Conversations from "./pages/Conversations";
import Connection from "./pages/Connection";
import Contacts from "./pages/Contacts";
import Dashboard from "./pages/Dashboard";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/conversations" element={<Conversations />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/connection" element={<Connection />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
