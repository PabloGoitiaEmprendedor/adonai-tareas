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

    const timeout = setTimeout(() => {
      if (profileLoading) {
        console.warn("Profile loading timeout - redirecting to auth");
        navigate('/auth');
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [profileLoading, navigate]);

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

  if (profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  
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

  // Helper: on web, redirect all app routes back to landing
  const appRouteElement = (element: React.ReactNode) => 
    isElectron ? <ProtectedRoute>{element}</ProtectedRoute> : <Navigate to="/" replace />;

  return (
    <Routes>
      <Route path="/mini" element={<MiniTasksPage />} />
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/onboarding" element={isElectron && user ? <OnboardingPage /> : <Navigate to="/auth" replace />} />
      
      {/* Root: Electron → app | Web → landing */}
      <Route 
        path="/" 
        element={
          isElectron
            ? <ProtectedRoute><DailyPage /></ProtectedRoute>
            : <LandingPage />
        } 
      />

      <Route path="/dashboard" element={appRouteElement(<DashboardPage />)} />
      <Route path="/app" element={appRouteElement(<DashboardPage />)} />
      <Route path="/daily" element={appRouteElement(<DailyPage />)} />
      <Route path="/today" element={isElectron ? <Navigate to="/" replace /> : <Navigate to="/" replace />} />
      <Route path="/week" element={appRouteElement(<WeeklyPage />)} />
      <Route path="/goals" element={appRouteElement(<GoalsPage />)} />
      <Route path="/folders" element={appRouteElement(<FoldersPage />)} />
      <Route path="/friends" element={appRouteElement(<FriendsPage />)} />
      <Route path="/profile" element={appRouteElement(<ProfilePage />)} />
      <Route path="/trash" element={appRouteElement(<TrashPage />)} />
      <Route path="/achievements" element={appRouteElement(<AchievementsPage />)} />
      <Route path="/admin" element={appRouteElement(<AdminPanelPage />)} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="*" element={<NotFound />} />
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
