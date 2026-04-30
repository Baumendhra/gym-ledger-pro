import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import Dashboard from "@/pages/Dashboard";
import MembersPage from "@/pages/MembersPage";
import PaymentPage from "@/pages/PaymentPage";
import PendingPage from "@/pages/PendingPage";
import MemberDetail from "@/pages/MemberDetail";
import AnalyticsPage from "@/pages/AnalyticsPage";
import AuthPage from "@/pages/AuthPage";
import CheckInPage from "@/pages/CheckInPage";
import NotFound from "@/pages/NotFound";
import { useEffect } from "react";
import { handleNotificationAction } from "@/services/pushNotifications";

const queryClient = new QueryClient();

/** Global listener: routes SW 'pn-action' messages to DB update */
function useSWNotificationListener() {
  useEffect(() => {
    function handleMsg(event: MessageEvent) {
      const msg = event.data;
      if (msg?.type === "pn-action" && msg.memberId && msg.notifType && msg.status) {
        handleNotificationAction(msg.memberId, msg.notifType, msg.status);
      }
    }
    navigator.serviceWorker?.addEventListener("message", handleMsg);
    return () => navigator.serviceWorker?.removeEventListener("message", handleMsg);
  }, []);
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  useSWNotificationListener();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/pending" element={<PendingPage />} />
        <Route path="/member/:id" element={<MemberDetail />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner position="top-center" />
      <BrowserRouter>
        <AuthProvider>
          <div className="min-h-screen bg-background">
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/checkin" element={<CheckInPage />} />
              <Route path="/*" element={<ProtectedRoutes />} />
            </Routes>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
