import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";

import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import DailyPage from "./pages/DailyPage";
import DashboardPage from "./pages/DashboardPage";
import WeeklyPage from "./pages/WeeklyPage";
import GoalsPage from "./pages/GoalsPage";
import ProfilePage from "./pages/ProfilePage";
import FoldersPage from "./pages/FoldersPage";
import FriendsPage from "./pages/FriendsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import TrashPage from "./pages/TrashPage";
import AchievementsPage from "./pages/AchievementsPage";
import MiniTasksPage from "./pages/MiniTasksPage";
import AdminPanelPage from "./pages/AdminPanelPage";
import LandingPage from "./pages/LandingPage";
import NotFound from "./pages/NotFound";
import { supabase } from "@/integrations/supabase/client";
import UpdateBanner from "@/components/UpdateBanner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true, // Crucial for Electron multi-window sync
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

import NavigationWrapper from "@/components/NavigationWrapper";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { profile, isLoading: profileLoading, error: profileError } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5E9] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-primary font-bold animate-pulse text-sm">Cargando Adonai...</p>
      </div>
    );
  }

  if (!user || profileError) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  
  // Robust Electron detection
  const isElectron = !!window.electronAPI || 
                     navigator.userAgent.toLowerCase().includes('electron') ||
                     (window.process && window.process.versions && !!window.process.versions.electron);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5E9] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // DESKTOP APP (Electron): ALWAYS protected. No landing page. Ever.
  // If not logged in → redirect to /auth via ProtectedRoute.
  if (isElectron) {
    return (
      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
        <Route path="/onboarding" element={user ? <OnboardingPage /> : <Navigate to="/auth" replace />} />
        <Route path="/" element={<ProtectedRoute><DailyPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/app" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/daily" element={<ProtectedRoute><DailyPage /></ProtectedRoute>} />
        <Route path="/today" element={<Navigate to="/" replace />} />
        <Route path="/week" element={<ProtectedRoute><WeeklyPage /></ProtectedRoute>} />
        <Route path="/goals" element={<ProtectedRoute><GoalsPage /></ProtectedRoute>} />
        <Route path="/folders" element={<ProtectedRoute><FoldersPage /></ProtectedRoute>} />
        <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/trash" element={<ProtectedRoute><TrashPage /></ProtectedRoute>} />
        <Route path="/achievements" element={<ProtectedRoute><AchievementsPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminPanelPage /></ProtectedRoute>} />
        <Route path="/mini" element={<MiniTasksPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  // WEB: Landing page ONLY. No app functionality. The app is desktop-only.
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => {
  useEffect(() => {
    // 1. Send session back to Desktop if we are on the Web and just logged in via OAuth
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=') && !window.electronAPI) {
      console.log("Bridging session to desktop app...");
      // Intentamos enviar la sesión a la app de escritorio
      window.location.assign(`adonai-tasks://${hash}`);
    }

    // 2. Handle Deep Linking for Electron (Receiving the session from the Web)
    if (window.electronAPI?.onDeepLink) {
      window.electronAPI.onDeepLink(async (url: string) => {
        console.log("Received deep link:", url);
        
        const hashPart = url.split('#')[1];
        if (hashPart) {
          const params = new URLSearchParams(hashPart);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          
          if (access_token && refresh_token) {
            await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            console.log("Session set from deep link");
          }
        }
      });
    }

    // 3. Global Query Invalidation listener for multi-window sync
    if (window.electronAPI?.onInvalidateQueries) {
      window.electronAPI.onInvalidateQueries(() => {
        console.log("Global sync: Invalidate queries");
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['subtasks'] });
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner position="top-center" duration={2000} />
        <UpdateBanner />
        <HashRouter>
        <AuthProvider>
          <NavigationWrapper>
            <AppRoutes />
          </NavigationWrapper>
        </AuthProvider>
      </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
