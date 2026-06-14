import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Route, Routes, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeProvider";
import { useProfile } from "@/hooks/useProfile";

import AuthPage from "./pages/AuthPage";
import { HandleSSOCallback } from "@clerk/react";

function SSOCallbackWithRouter() {
  const navigate = useNavigate();
  return (
    <HandleSSOCallback
      navigateToApp={({ decorateUrl }) => {
        const destination = decorateUrl("/daily");
        if (destination.startsWith("http")) {
          window.location.href = destination;
        } else {
          navigate(destination);
        }
      }}
      navigateToSignIn={() => navigate("/auth")}
      navigateToSignUp={() => navigate("/auth")}
    />
  );
}

import OnboardingPage from "./pages/OnboardingPage";
import DailyPage from "./pages/DailyPage";
import DashboardPage from "./pages/DashboardPage";
import WeeklyPage from "./pages/WeeklyPage";
import ChatPage from "./pages/ChatPage";
import GoalsPage from "./pages/GoalsPage";
import TimePage from "./pages/TimePage";
import ProfilePage from "./pages/ProfilePage";
import FriendsPage from "./pages/FriendsPage";
import FriendInvitePage from "./pages/FriendInvitePage";
import GroupInvitePage from "./pages/GroupInvitePage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import TrashPage from "./pages/TrashPage";
import AchievementsPage from "./pages/AchievementsPage";
import SettingsPage from "./pages/SettingsPage";
import MiniTasksPage from "./pages/MiniTasksPage";
import AdminPanelPage from "./pages/AdminPanelPage";
import LandingPage from "./pages/LandingPage";
import PricingPage from "./pages/PricingPage";
import CaracteristicasPage from "./pages/CaracteristicasPage";
import FAQPage from "./pages/FAQPage";
import AppleInstallPage from "./pages/AppleInstallPage";
import AndroidDownloadPage from "./pages/AndroidDownloadPage";
import PrioritySettingsPage from "./pages/PrioritySettingsPage";
import NotFound from "./pages/NotFound";
import WelcomePage from "./pages/WelcomePage";
import AccountRequiredPage from "./pages/AccountRequiredPage";
import { supabase } from "@/integrations/supabase/client";
import UpdateDialog from "@/components/UpdateDialog";

import SelectionBubblePage from './pages/SelectionBubblePage';
import QuickTaskPage from './pages/QuickTaskPage';
import ToastPage from './pages/ToastPage';
import ExitCodesPage from './pages/ExitCodesPage';
import NotificationManager from './components/NotificationManager';
import { AdonaiNotifier } from '@/components/ui/adonai-notifier';
import DownloadGuideOverlay from '@/components/DownloadGuideOverlay';
import DownloadGateModal from '@/components/DownloadGateModal';
import { getAnalyticsExperience, setAnalyticsUser, trackAnalyticsEvent, trackPageView } from "@/lib/analytics";
import CalendarCallback from "./pages/CalendarCallback";
import CalendarSetupGuide from "./pages/CalendarSetupGuide";
import SheetsCallback from "./pages/SheetsCallback";
import { WeeklySummaryCollector } from "@/components/WeeklySummaryCollector";
import { subscribeElectronEvent } from "@/lib/electronEvents";
import { BrandLogo } from '@/components/BrandLogo';
import { getLegacyWebRouteRedirect } from '@/lib/webRouteBridge';


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      staleTime: 1000 * 60 * 5,
      retry: (failureCount, error: unknown) => {
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
  },
});

import NavigationWrapper from "@/components/NavigationWrapper";

const isElectronRenderer = () => !!(
  window.electronAPI ||
  navigator.userAgent.toLowerCase().includes('electron') ||
  (window.process && window.process.versions && !!window.process.versions.electron)
);

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

const AnalyticsRouteTracking = () => {
  const location = useLocation();

  useEffect(() => {
    trackAnalyticsEvent("app_surface_loaded", {
      app_experience: getAnalyticsExperience(location.pathname),
    });
  }, [location.pathname]);

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return null;
};

const AnalyticsIdentity = () => {
  const { user } = useAuth();
  const { profile } = useProfile();

  useEffect(() => {
    setAnalyticsUser({
      userId: user?.id,
      email: user?.email,
      name: profile?.name,
      isAnonymous: user?.is_anonymous,
      onboardingCompleted: profile?.onboarding_completed,
    });
  }, [user?.id, user?.email, user?.is_anonymous, profile?.name, profile?.onboarding_completed]);

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
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
      >
        <BrandLogo className="h-16 w-16 drop-shadow-[0_0_18px_rgba(91,124,250,0.28)]" />
      </motion.div>

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

  // Si no hay usuario después de cargar, a la pantalla de bienvenida
  if (!loading && !user) {
    return <Navigate to="/welcome" replace />;
  }

  // No bloqueamos por profileLoading para que la UI cargue instantáneamente.
  // El perfil se actualizará en la sidebar y en el contenido cuando llegue.
  
  // Si el perfil ya cargó y el onboarding no está completo, redirigir
  // Añadimos check de localStorage para evitar bucles si el perfil tarda en refrescarse
  const localOnboardingDone = localStorage.getItem('adonai_onboarding_done') === 'true';
  
  if (profile && !profile.onboarding_completed && !localOnboardingDone) {
    // Si el usuario ya tiene nombre en su perfil, ya usó la app → saltar onboarding
    if (profile.name) {
      return <>{children}</>;
    }
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, loading, hasAnonymousData } = useAuth();
  const location = useLocation();
  const browserPath = window.location.pathname.replace(/\/$/, '');
  
  const isElectron = !!window.electronAPI || 
                     navigator.userAgent.toLowerCase().includes('electron') ||
                     (window.process && window.process.versions && !!window.process.versions.electron);
  const isLocalHost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' || 
                      window.location.hostname.startsWith('192.168.');

  // El loading de auth lo maneja ProtectedRoute para ser más fluido

  const appRouteElement = (element: React.ReactNode) => 
    <ProtectedRoute>{element}</ProtectedRoute>;

  const rootRouteElement = () => {
    // HashRouter normally expects /#/mini. Keep direct localhost /mini working too.
    if (browserPath === '/mini') {
      return <MiniTasksPage />;
    }
    if (browserPath === '/onboarding' || browserPath.startsWith('/onboarding?')) {
      return <OnboardingPage />;
    }

    if (loading) {
      return <LoadingScreen message="Sincronizando Adonai" />;
    }

    // Web publica: si ya hay sesión, ir directo a la app
    if (!isElectron && !isLocalHost) {
      if (user) return <Navigate to="/daily" replace />;
      return <LandingPage />;
    }

    // Primer uso en escritorio/local: mostrar la pantalla que pregunta si ya tiene cuenta.
    if (isElectron || isLocalHost) {
      // Respetar sesiones existentes para que una actualizacion no saque a nadie de su cuenta.
      if (user && !user.is_anonymous) {
        return <Navigate to="/daily" replace />;
      }

      // Si el usuario ya completó onboarding (aunque sea anónimo), ir directo a la app
      if (user && localStorage.getItem('adonai_onboarding_done') === 'true') {
        return <Navigate to="/daily" replace />;
      }

      return <Navigate to="/welcome" replace />;
    }

    return <LandingPage />;
  };

  return (
    <>
      <ThemeSync />
      <Routes location={location} key={location.key}>
        <Route path="/mini" element={<MiniTasksPage />} />
        <Route path="/toast" element={<ToastPage />} />
        <Route path="/welcome" element={
          loading ? <LoadingScreen message="Sincronizando Adonai" /> : user ? <Navigate to="/daily" replace /> : hasAnonymousData ? <Navigate to="/account-required" replace /> : <WelcomePage />
        } />
        <Route path="/account-required" element={
          loading ? <LoadingScreen message="Sincronizando Adonai" /> : user ? <Navigate to="/daily" replace /> : <AccountRequiredPage />
        } />
        <Route path="/auth/sso-callback" element={<SSOCallbackWithRouter />} />
        <Route path="/auth" element={
          loading ? <LoadingScreen message="Sincronizando Adonai" /> : user && !user.is_anonymous ? <Navigate to="/daily" replace /> : <AuthPage />
        } />
        <Route path="/invite/:inviterId" element={<FriendInvitePage />} />
        <Route path="/group-invite/:groupId" element={<GroupInvitePage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/calendar-callback" element={<CalendarCallback />} />
        <Route path="/calendar-setup" element={appRouteElement(<CalendarSetupGuide />)} />
        <Route path="/sheets-callback" element={appRouteElement(<SheetsCallback />)} />
        
        <Route 
          path="/" 
          element={rootRouteElement()} 
        />
        <Route path="/dashboard" element={appRouteElement(<DashboardPage />)} />
        <Route path="/app" element={appRouteElement(<DashboardPage />)} />
        <Route path="/daily" element={appRouteElement(<DailyPage />)} />
        <Route path="/today" element={<Navigate to="/daily" replace />} />
        <Route path="/week" element={appRouteElement(<WeeklyPage />)} />
        <Route path="/goals" element={appRouteElement(<GoalsPage />)} />
        <Route path="/time" element={appRouteElement(<TimePage />)} />
        <Route path="/folders" element={<Navigate to="/daily" replace />} />
        <Route path="/chat" element={appRouteElement(<ChatPage />)} />
        <Route path="/friends" element={appRouteElement(<FriendsPage />)} />
        <Route path="/profile" element={appRouteElement(<ProfilePage />)} />
        <Route path="/profile/:userId" element={appRouteElement(<ProfilePage />)} />
        <Route path="/settings" element={appRouteElement(<SettingsPage />)} />
        <Route path="/priority-settings" element={appRouteElement(<PrioritySettingsPage />)} />
        <Route path="/trash" element={appRouteElement(<TrashPage />)} />
        <Route path="/achievements" element={appRouteElement(<AchievementsPage />)} />
        <Route path="/admin" element={appRouteElement(<AdminPanelPage />)} />
        <Route path="/selection-bubble" element={<SelectionBubblePage />} />
        <Route path="/quick-task" element={<QuickTaskPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/precio" element={<PricingPage />} />
        <Route path="/caracteristicas" element={<CaracteristicasPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/android" element={<AndroidDownloadPage />} />
        <Route path="/apple" element={<AppleInstallPage />} />
        <Route path="/politica-de-privacidad" element={<PrivacyPolicyPage />} />
        <Route path="/terminos-de-servicio" element={<TermsOfServicePage />} />
        <Route path="/codigos-de-retorno" element={<ExitCodesPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {isElectron && <UpdateDialog />}
    </>
  );
};

const App = () => {
  const Router = isElectronRenderer() ? HashRouter : BrowserRouter;
  const isToastWindow =
    isElectronRenderer()
    && (
      window.location.hash.startsWith('#/toast')
      || window.location.pathname.replace(/\/$/, '') === '/toast'
    );

  useEffect(() => {
    const browserPath = window.location.pathname.replace(/\/$/, '');
    const legacyWebRouteRedirect = !isElectronRenderer()
      ? getLegacyWebRouteRedirect(window.location)
      : null;
    if (legacyWebRouteRedirect) {
      window.location.replace(legacyWebRouteRedirect);
      return;
    }

    const isMiniRoute =
      window.location.hash.startsWith('#/mini') ||
      browserPath === '/mini';

    if (!window.electronAPI && window.location.hostname === '127.0.0.1' && isMiniRoute) {
      const canonicalUrl = new URL(window.location.href);
      canonicalUrl.hostname = 'localhost';
      window.location.replace(canonicalUrl.toString());
      return;
    }

    const hash = window.location.hash;
    if (hash && hash.includes('access_token=') && !window.electronAPI) {
      // Don't bridge if we are developing locally
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        console.log("Bridging session to desktop app...");
        window.location.assign(`adonai-tasks://${hash}`);
      }
    }

    const unsubscribeDeepLink = subscribeElectronEvent(window.electronAPI?.onDeepLink, async (url: string) => {
        console.log("Received deep link:", url);
        
        // Handle calendar callback deep links
        if (url.includes('/calendar-callback')) {
          const queryPart = url.split('?')[1];
          if (queryPart) {
            window.location.hash = `#/calendar-callback?${queryPart}`;
          }
          return;
        }

        // Handle sheets callback deep links
        if (url.includes('/sheets-callback')) {
          const queryPart = url.split('?')[1];
          if (queryPart) {
            window.location.hash = `#/sheets-callback?${queryPart}`;
          }
          return;
        }

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

    const unsubscribeInvalidateQueries = subscribeElectronEvent(window.electronAPI?.onInvalidateQueries, () => {
        console.log("Global sync: Invalidate queries");
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      });

    return () => {
      unsubscribeDeepLink();
      unsubscribeInvalidateQueries();
    };
  }, []);

  if (isToastWindow) {
    return <ToastPage />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Sonner position="bottom-right" duration={4000} />
          <AdonaiNotifier />
          <Router future={{ v7_relativeSplatPath: true }}>
            <AuthProvider>
              <AnalyticsRouteTracking />
              <AnalyticsIdentity />
              <NotificationManager />
              <WeeklySummaryCollector />
              <NavigationWrapper>
                <AppRoutes />
              </NavigationWrapper>
              <DownloadGuideOverlay />
              <DownloadGateModal />
            </AuthProvider>
          </Router>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
