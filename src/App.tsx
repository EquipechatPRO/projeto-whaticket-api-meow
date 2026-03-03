import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Conversations from "./pages/Conversations";
import Connection from "./pages/Connection";
import Contacts from "./pages/Contacts";
import Dashboard from "./pages/Dashboard";
import Queues from "./pages/Queues";
import QuickRepliesPage from "./pages/QuickRepliesPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import SuperAdmin from "./pages/SuperAdmin";
import Users from "./pages/Users";
import Plans from "./pages/Plans";
import Settings from "./pages/Settings";
import { useAuth } from "./stores/auth-store";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/plans" element={<Plans />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/"
          element={
            user?.role === "super_admin" ? <SuperAdmin /> : <Dashboard />
          }
        />
        <Route path="/conversations" element={<Conversations />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/queues" element={<Queues />} />
        <Route path="/quick-replies" element={<QuickRepliesPage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/connection" element={<Connection />} />
        <Route path="/users" element={<Users />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <SuperAdmin />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
