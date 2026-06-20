import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import DeliveryDetail from "@/pages/DeliveryDetail";
import History from "@/pages/History";
import Notifications from "@/pages/Notifications";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/NotFound";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";

const queryClient = new QueryClient();

function Protected({ children }: { children: React.ReactNode }) {
  const { courier, loading } = useAuth();
  if (loading) return <div className="flex h-full items-center justify-center text-muted-foreground">Chargement…</div>;
  if (!courier) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <PwaInstallPrompt />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Protected><AppShell /></Protected>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/livraisons/:id" element={<DeliveryDetail />} />
              <Route path="/historique" element={<History />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/profil" element={<Profile />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
