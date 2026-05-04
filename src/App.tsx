import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Sparkles } from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeProvider";
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
import PrioritySettingsPage from "./pages/PrioritySettingsPage";
import NotFound from "./pages/NotFound";
import { supabase } from "@/integrations/supabase/client";
import UpdateDialog from "@/components/UpdateDialog";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      staleTime: 1000 * 60 * 5,
    },
  },
});

import NavigationWrapper from "@/components/NavigationWrapper";

const ThemeSync = () => {
  const { setTheme } = useTheme();
  const { profile } = useProfile();

  useEffect(() => {
    if (profile?.theme) {
      setTheme(profile.theme as 'dark' | 'light' | 'system');
    }
  }, [profile?.theme, setTheme]);

  return null;
};

const LoadingScreen = ({ message }: { message: string }) => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="flex flex-col items-center gap-8"
    >
      <div className="relative">
        <Target className="w-8 h-8 text-primary/30" />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="absolute inset-0 bg-primary/10 rounded-full -m-4"
        />
      </div>

      <div className="flex flex-col items-center gap-3">
        <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-[0.6em] ml-[0.6em]">
          {message}
        </p>
        <div className="w-24 h-[1px] bg-surface-container-high overflow-hidden">
          <motion.div 
            animate={{ x: [-100, 100] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            className="w-12 h-full bg-primary/30"
          />
        </div>
      </div>
    </motion.div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();

  // Solo bloquear si la sesión de Auth aún no se ha determinado
  if (loading && !user) {
    return <LoadingScreen message="Sincronizando Adonai" />;
  }

  // Si no hay usuario después de cargar, al login
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  // No bloqueamos por profileLoading para que la UI cargue instantáneamente.
  // El perfil se actualizará en la sidebar y en el contenido cuando llegue.
  
  // Si el perfil ya cargó y el onboarding no está completo, redirigir
  // Añadimos check de localStorage para evitar bucles si el perfil tarda en refrescarse
  const localOnboardingDone = localStorage.getItem('adonai_onboarding_done') === 'true';
  
  if (profile && !profile.onboarding_completed && !localOnboardingDone) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  
  const isElectron = !!window.electronAPI || 
                     navigator.userAgent.toLowerCase().includes('electron') ||
                     (window.process && window.process.versions && !!window.process.versions.electron);

  // El loading de auth lo maneja ProtectedRoute para ser más fluido

  const appRouteElement = (element: React.ReactNode) => 
    <ProtectedRoute>{element}</ProtectedRoute>;

  return (
    <>
      <ThemeSync />
      <Routes>
        <Route path="/mini" element={<MiniTasksPage />} />
        <Route path="/auth" element={user ? <Navigate to="/daily" replace /> : <AuthPage />} />
        <Route path="/onboarding" element={user ? <OnboardingPage /> : <Navigate to="/auth" replace />} />
        
        <Route 
          path="/" 
          element={
            (isElectron || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
              ? (user ? <Navigate to="/daily" replace /> : <Navigate to="/auth" replace />)
              : <LandingPage />
          } 
        />

        <Route path="/dashboard" element={appRouteElement(<DashboardPage />)} />
        <Route path="/app" element={appRouteElement(<DashboardPage />)} />
        <Route path="/daily" element={appRouteElement(<DailyPage />)} />
        <Route path="/today" element={<Navigate to="/daily" replace />} />
        <Route path="/week" element={appRouteElement(<WeeklyPage />)} />
        <Route path="/goals" element={appRouteElement(<GoalsPage />)} />
        <Route path="/folders" element={appRouteElement(<FoldersPage />)} />
        <Route path="/friends" element={appRouteElement(<FriendsPage />)} />
        <Route path="/profile" element={appRouteElement(<ProfilePage />)} />
        <Route path="/priority-settings" element={appRouteElement(<PrioritySettingsPage />)} />
        <Route path="/trash" element={appRouteElement(<TrashPage />)} />
        <Route path="/achievements" element={appRouteElement(<AchievementsPage />)} />
        <Route path="/admin" element={appRouteElement(<AdminPanelPage />)} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {isElectron && <UpdateDialog />}
    </>
  );
};

const App = () => {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=') && !window.electronAPI) {
      console.log("Bridging session to desktop app...");
      window.location.assign(`adonai-tasks://${hash}`);
    }

    if (window.electronAPI?.onDeepLink) {
      window.electronAPI.onDeepLink(async (url: string) => {
        console.log("Received deep link:", url);
        
        let tokenString = '';
        
        // Try hash fragment first (adonai-tasks://#access_token=...)
        const hashPart = url.split('#')[1];
        if (hashPart) {
          tokenString = hashPart;
        } else {
          // Try query params (adonai-tasks://?access_token=...)
          const queryPart = url.split('?')[1];
          if (queryPart) {
            tokenString = queryPart;
          }
        }
        
        if (tokenString) {
          const params = new URLSearchParams(tokenString);
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
      <ThemeProvider>
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
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
