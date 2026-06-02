import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NotebookTabs, Users, User, Calendar, Settings, Menu, Target, Trophy, BarChart3, Sun, History, Palette, X, Flame, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';


import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import AppTutorial from './AppTutorial';
import TitleBar from './TitleBar';
import { useProfile } from '@/hooks/useProfile';
import AnonymousReminder from './AnonymousReminder';
import FirstTaskSignupModal from './FirstTaskSignupModal';
import ExitIntentModal from './ExitIntentModal';
import PostOnboardingVideoTutorial from './PostOnboardingVideoTutorial';
import { useTasks } from '@/hooks/useTasks';
import { usePriorityColors, getPriorityKey } from '@/hooks/usePriorityColors';
import { MobileDynamicIsland } from '@/components/ui/mobile-task-island';
import FAB from '@/components/FAB';
import TaskCaptureModal, { type TaskCaptureModalHandle } from '@/components/TaskCaptureModal';
import QuickRecurrenceFlow from '@/components/QuickRecurrenceFlow';
import { format, addMinutes, startOfMonth, endOfMonth } from 'date-fns';
import { useFolders } from '@/hooks/useFolders';
import { useNotionIntegration } from '@/hooks/useNotionIntegration';
import { useFriendUnreadCount } from '@/hooks/useFriendChats';
import { useRef, useCallback } from 'react';
import { useStreaks } from '@/hooks/useStreaks';
import { NavigationPilot } from './NavigationPilot';
import ProfilePage from '@/pages/ProfilePage';
import AchievementsPage from '@/pages/AchievementsPage';
import AppSettingsPage from '@/pages/SettingsPage';
import PrioritySettingsPage from '@/pages/PrioritySettingsPage';
import TrashPage from '@/pages/TrashPage';

// Detect if running inside Electron (desktop app)
const isElectronEnv: boolean =
  typeof window !== 'undefined' &&
  (!!window.electronAPI ||
    navigator.userAgent.toLowerCase().includes('electron') ||
    !!(window.process && window.process.versions && window.process.versions.electron));

const SETTINGS_PATHS = ['/profile', '/achievements', '/settings', '/priority-settings', '/trash'];

const SETTINGS_DIALOG_ITEMS = [
  {
    label: 'Perfil',
    icon: User,
    path: '/profile',
    description: 'Identidad, presencia y resumen personal.',
    Component: ProfilePage,
  },
  {
    label: 'Logros',
    icon: Trophy,
    path: '/achievements',
    description: 'Rachas, niveles y recompensas desbloqueadas.',
    Component: AchievementsPage,
  },
  {
    label: 'Configuraci\u00f3n',
    icon: Settings,
    path: '/settings',
    description: 'Preferencias generales, conexiones e integraciones.',
    Component: AppSettingsPage,
  },
  {
    label: 'Personalizar',
    icon: Palette,
    path: '/priority-settings',
    description: 'Colores de prioridades y experiencia visual.',
    Component: PrioritySettingsPage,
  },
  {
    label: 'Historial',
    icon: History,
    path: '/trash',
    description: 'Tareas eliminadas y recuperaci\u00f3n.',
    Component: TrashPage,
  },
];

interface NavigationWrapperProps {
  children: React.ReactNode;
}

const ProfileProgress = ({ metrics }: { metrics: any }) => (
  <div className="grid grid-cols-2 gap-2 pt-1 w-full">
    <div className="relative overflow-hidden rounded-2xl border border-[#E65100]/20 bg-gradient-to-br from-[#E65100]/16 to-[#FFB300]/5 px-2 py-1.5 shadow-sm">
      <div className="absolute -right-3 -top-3 h-10 w-10 rounded-full bg-[#E65100]/25 blur-xl" />
      <div className="relative flex items-center gap-1.5">
        <div className="relative flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[#E65100]/15">
          <span className="absolute h-4 w-4 rounded-full bg-[#E65100]/25 blur-md animate-pulse" />
          <Flame className="relative z-10 h-3.5 w-3.5 text-[#E65100] fill-[#E65100]/35 drop-shadow-[0_0_6px_rgba(230,81,0,0.35)]" />
        </div>
        <div className="min-w-0">
          <p className="text-[7.5px] font-black uppercase tracking-[0.16em] text-[#E65100]/70">Racha</p>
          <p className="text-xs font-black leading-none text-foreground">{metrics?.streak_current || 0}d</p>
        </div>
      </div>
    </div>

    <div className="relative overflow-hidden rounded-2xl border border-[#FFD700]/25 bg-gradient-to-br from-[#FFD700]/18 to-[#F59E0B]/5 px-2 py-1.5 shadow-sm">
      <div className="absolute -right-3 -top-3 h-10 w-10 rounded-full bg-[#FFD700]/25 blur-xl" />
      <div className="relative flex items-center gap-1.5">
        <div className="relative flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[#FFD700]/15">
          <span className="absolute h-4 w-4 rounded-full bg-[#FFD700]/25 blur-md animate-pulse" />
          <Trophy className="relative z-10 h-3.5 w-3.5 text-[#D9A600] fill-[#FFD700]/35 drop-shadow-[0_0_6px_rgba(255,215,0,0.35)]" />
        </div>
        <div className="min-w-0">
          <p className="text-[7.5px] font-black uppercase tracking-[0.16em] text-[#B88A00]/75">Nivel</p>
          <p className="text-xs font-black leading-none text-foreground">{metrics?.level || 1}</p>
        </div>
      </div>
    </div>
  </div>
);

const SidebarContent = ({ user, profile, metrics, menuItems, location, handleNavigate, startTutorial, isSheet, toggleSidebar }: any) => {

  return (
  <div className="flex flex-col h-full bg-surface text-foreground">
    <div className={`p-5 border-b border-outline-variant flex flex-col gap-3.5 ${isSheet ? 'pr-16' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div 
          onClick={() => handleNavigate('/profile')}
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity group flex-1 min-w-0"
        >
          <div className="w-11 h-11 rounded-2xl bg-surface-container flex items-center justify-center border border-outline-variant group-hover:bg-surface-container-high transition-colors flex-shrink-0">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-black text-foreground truncate tracking-tight">
              {((profile?.name && profile.name.trim()) || 
                 (user?.user_metadata?.full_name && user.user_metadata.full_name.trim()) || 
                 user?.email?.split('@')[0] || 
                 'Mi Espacio')}
            </span>

          </div>
        </div>

        {!isSheet && (
          <button 
            onClick={toggleSidebar}
            className="w-9 h-9 rounded-xl hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors flex-shrink-0"
            aria-label={"Cerrar men\u00fa"}
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
      </div>

      <ProfileProgress metrics={metrics} />
    </div>
    
    <div className="flex-1 overflow-y-auto py-4">
      <div className="px-3 space-y-1">
        {menuItems.map((item: any) => (
          (() => {
            const active = location.pathname === item.path || item.activePaths?.includes(location.pathname);
            return (
          <Button
            key={item.path}
            id={`nav-${item.path.replace('/', '') || 'today'}`}
            variant="ghost"
            onClick={() => handleNavigate(item.path)}
            className={`w-full justify-start gap-4 h-12 rounded-xl transition-all duration-300 ${
              active
                ? 'bg-primary/20 text-foreground font-bold' 
                : 'text-on-surface-variant hover:bg-surface-container hover:text-foreground'
            }`}
          >
            <span className="relative flex h-5 w-5 items-center justify-center">
              <item.icon className={`w-5 h-5 ${active ? 'text-foreground' : ''}`} />
              {item.badge > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black leading-none text-white">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </span>
            <span className="text-sm tracking-wide">{item.label}</span>
            {item.badge > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black leading-none text-white shadow-sm shadow-red-500/30">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </Button>
            );
          })()
        ))}

        {/* Admin panel - CEO only */}
        {user?.email === 'pablogoitiaemprendedor@gmail.com' && (
          <Button
            variant="ghost"
            onClick={() => handleNavigate('/admin')}
            className={`w-full justify-start gap-4 h-12 rounded-xl transition-all duration-300 ${
              location.pathname === '/admin' 
                ? 'bg-primary/20 text-foreground font-bold' 
                : 'text-on-surface-variant hover:bg-surface-container hover:text-foreground'
            }`}
          >
            <BarChart3 className={`w-5 h-5 ${location.pathname === '/admin' ? 'text-foreground' : ''}`} />
            <span className="text-sm tracking-wide">Admin Panel</span>
          </Button>
        )}
      </div>

    </div>

    {user?.is_anonymous && (
      <div className="p-6 border-t border-outline-variant space-y-3">
        <Button 
          onClick={() => handleNavigate('/auth')} 
          variant="default" 
          className="w-full justify-start gap-4 h-12 bg-primary text-black hover:bg-primary/90 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
        >
          <User className="w-5 h-5" />
          <span>{"Iniciar sesi\u00f3n"}</span>
        </Button>
      </div>
    )}
  </div>
  );
};

const NavigationWrapper = ({ children }: NavigationWrapperProps) => {
  const [open, setOpen] = useState(false);
  const [tutorialRun, setTutorialRun] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [settingsPanelPath, setSettingsPanelPath] = useState('/profile');

  const location = useLocation();
  const [draftActive, setDraftActive] = useState(false);
  const [detailActive, setDetailActive] = useState(false);
  const [eventCreateOpen, setEventCreateOpen] = useState(false);
  const [taskEditingActive, setTaskEditingActive] = useState(false);

  const isPathFabHidden = ['/folders', '/goals', '/friends', '/profile', '/settings', '/priority-settings', '/trash', '/achievements', '/chat'].some(path => location.pathname.startsWith(path));
  const fabHidden = draftActive || detailActive || eventCreateOpen || taskEditingActive || isPathFabHidden;

  useEffect(() => {
    const handler = (e: Event) => setDraftActive((e as CustomEvent).detail.active)
    window.addEventListener('adonai:draft-state-change', handler)
    return () => window.removeEventListener('adonai:draft-state-change', handler)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => setDetailActive((e as CustomEvent).detail.active)
    window.addEventListener('adonai:dialog-state-change', handler)
    window.addEventListener('adonai:detail-state-change', handler)
    return () => {
      window.removeEventListener('adonai:dialog-state-change', handler)
      window.removeEventListener('adonai:detail-state-change', handler)
    }
  }, [])

  useEffect(() => {
    const handler = (e: Event) => setTaskEditingActive((e as CustomEvent).detail.active)
    window.addEventListener('adonai:task-editing-change', handler)
    return () => window.removeEventListener('adonai:task-editing-change', handler)
  }, [])

  useEffect(() => {
    const handler = () => {
      if (window.location.pathname !== '/week') {
        setEvTitle('')
        setEvDate(format(new Date(), 'yyyy-MM-dd'))
        const now = new Date()
        setEvHour(now.getHours())
        setEvMin(Math.ceil(now.getMinutes() / 30) * 30)
        setEvDuration(30)
        setEvColor('#5B7CFA')
        setEventCreateOpen(true)
      }
    }
    window.addEventListener('adonai:open-create-event', handler)
    return () => window.removeEventListener('adonai:open-create-event', handler)
  }, [])

  useEffect(() => {
    const handleRestart = () => {
      setTutorialRun(true);
      setOpen(false);
    };
    window.addEventListener('restart-adonai-tour', handleRestart);
    return () => window.removeEventListener('restart-adonai-tour', handleRestart);
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);


  const { user, loading } = useAuth();
  const { profile } = useProfile();
  const { metrics } = useStreaks();
  const navigate = useNavigate();
  const isWeeklyPage = location.pathname === '/week';

  // Task capture state
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureInitialMode, setCaptureInitialMode] = useState<'text' | 'voice' | 'recurrence' | null>(null);
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);

  const [evTitle, setEvTitle] = useState('');
  const [evDate, setEvDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [evHour, setEvHour] = useState(new Date().getHours());
  const [evMin, setEvMin] = useState(Math.ceil(new Date().getMinutes() / 30) * 30);
  const [evDuration, setEvDuration] = useState(30);
  const [evColor, setEvColor] = useState('#5B7CFA');
  const [targetContext, setTargetContext] = useState<{ goalId?: string; folderId?: string }>({});
  const captureModalRef = useRef<TaskCaptureModalHandle>(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const [mobileIslandDate, setMobileIslandDate] = useState(new Date());
  const mobileMonthStart = startOfMonth(mobileIslandDate);
  const mobileMonthEnd = endOfMonth(mobileIslandDate);
  const mobileTasksFilter = useMemo(() => ({
    startDate: format(mobileMonthStart, 'yyyy-MM-dd'),
    endDate: format(mobileMonthEnd, 'yyyy-MM-dd'),
  }), [mobileMonthStart, mobileMonthEnd]);
  const { tasks, createTask } = useTasks(mobileTasksFilter);
  const { folders } = useFolders();
  const { colors: priorityColors } = usePriorityColors();
  const notion = useNotionIntegration();
  const friendUnreadCount = useFriendUnreadCount();
  const lastNotionAutoSyncRef = useRef(0);
  const isAdmin = user?.email === 'pablogoitiaemprendedor@gmail.com';

  useEffect(() => {
    const handler = (event: Event) => {
      const date = (event as CustomEvent).detail?.date;
      if (!date) return;
      const nextDate = date instanceof Date ? date : new Date(date);
      if (!Number.isNaN(nextDate.getTime())) setMobileIslandDate(nextDate);
    };
    window.addEventListener('adonai:calendar-selected-date-change', handler);
    return () => window.removeEventListener('adonai:calendar-selected-date-change', handler);
  }, []);

  const openCapture = useCallback((context?: { goalId?: string; folderId?: string }) => {
    if (context) setTargetContext(context);
    else setTargetContext({});
    setCaptureInitialMode(null);
    setCaptureOpen(true);
  }, []);

  const openCaptureInTextMode = useCallback((context?: { goalId?: string; folderId?: string }) => {
    if (context) setTargetContext(context);
    else setTargetContext({});
    setCaptureInitialMode('text');
    setCaptureOpen(true);
  }, []);

  const openCaptureInVoiceMode = useCallback((context?: { goalId?: string; folderId?: string }) => {
    if (context) setTargetContext(context);
    else setTargetContext({});
    setCaptureInitialMode('text');
    setCaptureOpen(true);
  }, []);

  // Listen for global open-capture events
  useEffect(() => {
    const handleOpenCapture = (e: any) => {
      const { goalId, folderId } = e.detail || {};
      openCaptureInTextMode({ goalId, folderId });
    };
    window.addEventListener('adonai:open-capture' as any, handleOpenCapture);
    return () => window.removeEventListener('adonai:open-capture' as any, handleOpenCapture);
  }, [openCaptureInTextMode]);

  const menuItems = [
    { label: 'Hoy', icon: Sun, path: '/daily' },
    { label: 'Cuadernos', icon: NotebookTabs, path: '/folders' },
    { label: 'Calendario', icon: Calendar, path: '/week' },
    { label: isAdmin ? 'Chat IA' : 'IA pronto', icon: MessageSquare, path: '/chat' },
    { label: 'Metas', icon: Target, path: '/goals' },
    { label: 'Amigos', icon: Users, path: '/friends', badge: friendUnreadCount },
    { label: 'Ajustes', icon: Settings, path: '#settings', activePaths: SETTINGS_PATHS },
  ];

  const handleNavigate = (path: string) => {
    if (path === '#') return;
    if (path === '#settings') {
      setSettingsPanelPath(SETTINGS_PATHS.includes(location.pathname) ? location.pathname : '/profile');
      setSettingsDialogOpen(true);
      setOpen(false);
      return;
    }
    navigate(path);
    setOpen(false);
  };

  useEffect(() => {
    if (!notion.connection || notion.mappings.length === 0) return;

    const runAutoSync = async () => {
      const now = Date.now();
      if (now - lastNotionAutoSyncRef.current < 10000) return;
      lastNotionAutoSyncRef.current = now;

      try {
        await notion.sync.mutateAsync();
      } catch {
        // Background sync should stay quiet.
      }
    };

    void runAutoSync();

    const interval = window.setInterval(() => {
      void runAutoSync();
    }, 15000);

    const onFocus = () => {
      if (document.visibilityState === 'visible') {
        void runAutoSync();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [notion.connection, notion.mappings.length, notion.sync]);

  const cleanPath = location.pathname.toLowerCase().trim().replace(/\/$/, '');
  const isWelcomePage = cleanPath === '/welcome';
  const isAuthPage = cleanPath === '/auth';
  const isMiniPage = cleanPath === '/mini';
  const isCalendarPage = cleanPath === '/calendar';
  const isLandingPage = cleanPath === '' || cleanPath === '/' || cleanPath === '/landing';
  const isPrivacyPage = cleanPath === '/politica-de-privacidad';
  const isTermsPage = cleanPath === '/terminos-de-servicio';
  const isDocsPage = cleanPath.startsWith('/docs');
  const isCaracteristicasPage = cleanPath === '/caracteristicas';
  const isFaqPage = cleanPath === '/faq';
  const isPrecioPage = cleanPath === '/precio' || cleanPath === '/precios' || cleanPath === '/pricing';
  const isExitCodesPage = cleanPath === '/codigos-de-retorno';
  const isOnboardingPage = cleanPath === '/onboarding';
  const isInvitePage = cleanPath.startsWith('/invite');
  const isGroupInvitePage = cleanPath.startsWith('/group-invite');
  
  const showNavigation = !loading && 
    !isWelcomePage && 
    !isAuthPage && 
    !isMiniPage && 
    !isLandingPage && 
    !isPrivacyPage && 
    !isTermsPage && 
    !isDocsPage && 
    !isCaracteristicasPage && 
    !isFaqPage && 
    !isOnboardingPage && 
    !isInvitePage && 
    !isGroupInvitePage && 
    !isPrecioPage &&
    !isExitCodesPage;

  if (!showNavigation) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <TitleBar />
      <AnonymousReminder />
      <FirstTaskSignupModal />
      <ExitIntentModal />
      <PostOnboardingVideoTutorial />
      
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[280px] glass-sheet border-r-outline-variant/20 p-0">
          <SidebarContent 
            user={user} 
            profile={profile} 
            metrics={metrics}
            menuItems={menuItems} 
            location={location} 
            handleNavigate={handleNavigate} 
            startTutorial={() => { setTutorialRun(true); setOpen(false); }}
            isSheet 
            toggleSidebar={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="h-[min(92dvh,780px)] w-[calc(100vw-1rem)] max-w-[1120px] rounded-[26px] border border-outline-variant/25 bg-surface/94 p-0 shadow-2xl shadow-black/35 backdrop-blur-xl overflow-hidden sm:w-[calc(100vw-1.5rem)] sm:rounded-[28px]">
          <DialogHeader>
            <DialogTitle className="sr-only">Ajustes</DialogTitle>
            <DialogDescription className="sr-only">Configura las preferencias de la aplicacion.</DialogDescription>
          </DialogHeader>

          <div className="grid h-full min-h-0 grid-rows-[auto_1fr] sm:grid-cols-[240px_1fr] sm:grid-rows-1">
            <aside className="min-w-0 border-b border-outline-variant/20 bg-surface-container/50 p-3 sm:border-b-0 sm:border-r sm:p-4">
              <div className="mb-4 hidden px-2 sm:block">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant/45">Centro</p>
                <h2 className="text-xl font-black tracking-tight">Ajustes</h2>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar sm:block sm:space-y-1.5 sm:overflow-visible">
                {SETTINGS_DIALOG_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = settingsPanelPath === item.path;
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => setSettingsPanelPath(item.path)}
                      className={`flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2.5 text-left transition-all sm:w-full sm:gap-3 sm:py-3 ${
                        active ? 'bg-background text-foreground shadow-sm' : 'text-on-surface-variant hover:bg-background/45 hover:text-foreground'
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-primary' : ''}`} />
                      <span className="whitespace-nowrap text-xs font-bold sm:text-sm">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="min-h-0 overflow-hidden bg-background/45">
              {(() => {
                const cleanItem = SETTINGS_DIALOG_ITEMS.find((option) => option.path === settingsPanelPath) || SETTINGS_DIALOG_ITEMS[0];
                const Icon = cleanItem.icon;
                const ActiveSettingsPage = cleanItem.Component;
                return (
                  <div className="flex h-full min-h-0 flex-col">
                    <div className="flex items-center gap-3 border-b border-outline-variant/15 bg-surface/70 px-4 py-3 backdrop-blur-xl sm:px-7 sm:py-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary/60">{"Secci\u00f3n"}</p>
                          <h3 className="text-xl font-black tracking-tight">{cleanItem.label}</h3>
                          <p className="hidden text-xs font-medium text-on-surface-variant/60 sm:block">{cleanItem.description}</p>
                        </div>
                      </div>
                    <div className="min-h-0 flex-1 overflow-y-auto [&_.min-h-screen]:min-h-0 [&_.pb-32]:pb-10 [&_.pt-8]:pt-4 [&_.pt-6]:pt-4">
                      <ActiveSettingsPage />
                      </div>
                  </div>
                );
              })()}
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Header Trigger - mobile only (pilot handles desktop) */}
      {!open && (
        <div className={`fixed left-3 z-[70] flex items-center gap-2 sm:left-4 lg:hidden ${
            window.electronAPI ? 'top-10' : 'top-3 sm:top-4'}`}>
          <button
            id="global-menu-trigger"
            onClick={() => setOpen(true)}
            aria-label={"Mostrar men\u00fa"}
            className="relative w-9 h-9 rounded-xl bg-transparent text-on-surface-variant/70 backdrop-blur-xl border border-outline-variant/10 hover:bg-surface-container/40 hover:text-foreground transition-all active:scale-90 flex items-center justify-center"
          >
            <Menu className="w-4 h-4" />
            {friendUnreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black leading-none text-white shadow-lg shadow-red-500/35">
                {friendUnreadCount > 99 ? '99+' : friendUnreadCount}
              </span>
            )}
          </button>
          {user?.is_anonymous && (
            <button
              onClick={() => navigate('/auth')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 transition-all active:scale-95"
            >
              {"Invitado \u00b7 Iniciar sesi\u00f3n"}
            </button>
          )}
        </div>
      )}

      {/* Navigation Pilot - floating hover menu (desktop only) */}
      <NavigationPilot
        menuItems={menuItems}
        showAdmin={user?.email === 'pablogoitiaemprendedor@gmail.com'}
        electronOffset={isElectronEnv}
        user={user}
        onNavigate={handleNavigate}
      />

      <main
        id="main-content"
        className="flex-1 pb-24 lg:pb-12 min-h-screen bg-background"
      >
        <div className={`w-full ${window.electronAPI ? 'pt-16' : 'pt-[4.5rem]'}`}>
          {children}
        </div>
      </main>

      {/* Universal Task Capture UI */}
      <div className="relative z-[60]">
        {/* Mobile logic: Island on week page + FAB everywhere (hidden during draft/detail/event-create) */}
        <div className="lg:hidden">
          {(isWeeklyPage || isCalendarPage) && !draftActive && (
            <MobileDynamicIsland
              tasks={tasks}
              currentDate={mobileIslandDate}
              onAddTask={() => openCaptureInTextMode()}
              onTaskClick={(task) => {
                window.dispatchEvent(new CustomEvent('adonai:open-task-detail', { detail: task }));
              }}
              priorityColors={priorityColors}
              getPriorityKey={getPriorityKey}
              folders={folders}
            />
          )}
          {!fabHidden && (
            <FAB 
              onTextClick={() => openCaptureInTextMode()} 
              onVoiceClick={() => openCaptureInVoiceMode()} 
              onRecurrenceClick={() => setRecurrenceOpen(true)}
               onEventClick={() => {
                setEvTitle('')
                setEvDate(format(new Date(), 'yyyy-MM-dd'))
                const now = new Date()
                setEvHour(now.getHours())
                setEvMin(Math.ceil(now.getMinutes() / 30) * 30)
                setEvDuration(30)
                setEvColor('#5B7CFA')
                window.dispatchEvent(new CustomEvent('adonai:open-create-event'))
              }}
            />
          )}
        </div>

        {/* Desktop logic: FAB visible unless draft or detail is open */}
        {!fabHidden && (
        <div className="hidden lg:block">
          <FAB 
            onTextClick={() => openCaptureInTextMode()} 
            onVoiceClick={() => openCaptureInVoiceMode()} 
            onRecurrenceClick={() => setRecurrenceOpen(true)}
              onEventClick={() => {
                setEvTitle('')
                setEvDate(format(new Date(), 'yyyy-MM-dd'))
                const now = new Date()
                setEvHour(now.getHours())
                setEvMin(Math.ceil(now.getMinutes() / 30) * 30)
                setEvDuration(30)
                setEvColor('#5B7CFA')
                window.dispatchEvent(new CustomEvent('adonai:open-create-event'))
              }}
          />
        </div>
        )}
      </div>

      <TaskCaptureModal 
        ref={captureModalRef} 
        open={captureOpen} 
        onClose={() => {
          setCaptureOpen(false);
          setCaptureInitialMode(null);
          setTargetContext({});
        }} 
        goalId={targetContext.goalId}
        folderId={targetContext.folderId}
        initialMode={captureInitialMode}
        creationSource="fab" 
      />

      <Dialog open={eventCreateOpen} onOpenChange={(open) => { if (!open) setEventCreateOpen(false) }}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl">
          <DialogTitle className="sr-only">Nuevo evento</DialogTitle>
          <DialogDescription className="sr-only">Crea un evento con fecha, hora, duracion y color.</DialogDescription>
          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black">Nuevo Evento</h2>
              <button onClick={() => setEventCreateOpen(false)} className="p-1.5 rounded-xl hover:bg-surface-container transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              value={evTitle}
              onChange={(e) => setEvTitle(e.target.value)}
              placeholder={"T\u00edtulo del evento"}
              className="w-full text-sm font-bold bg-surface-container/30 border border-outline-variant/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={evDate}
                onChange={(e) => setEvDate(e.target.value)}
                className="flex-1 h-10 text-xs font-bold bg-surface-container/30 border border-outline-variant/20 rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="time"
                value={`${String(evHour).padStart(2, '0')}:${String(evMin).padStart(2, '0')}`}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(':').map(Number);
                  setEvHour(h); setEvMin(m);
                }}
                className="h-10 text-xs font-bold bg-surface-container/30 border border-outline-variant/20 rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground/60">{"Duraci\u00f3n:"}</span>
              <select
                value={evDuration}
                onChange={(e) => setEvDuration(Number(e.target.value))}
                className="flex-1 h-10 text-xs font-bold bg-surface-container/30 border border-outline-variant/20 rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 hora</option>
                <option value={90}>1:30 hora</option>
                <option value={120}>2 horas</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground/60">Color:</span>
              <div className="flex gap-1.5">
                {['#5B7CFA', '#EB5757', '#F4B860', '#6FCF97'].map(c => (
                  <button
                    key={c}
                    onClick={() => setEvColor(c)}
                    className={`w-7 h-7 rounded-full transition-all ${evColor === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <label className="relative w-7 h-7 rounded-full flex items-center justify-center border-2 border-dashed border-muted-foreground/30 cursor-pointer">
                  <span className="text-xs font-bold text-muted-foreground/50">+</span>
                  <input type="color" value={evColor} onChange={(e) => setEvColor(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEventCreateOpen(false)}
                className="flex-1 py-3 rounded-xl bg-surface-container text-xs font-bold hover:bg-surface-container-high transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!evTitle.trim()) return;
                  const start = new Date(`${evDate}T${String(evHour).padStart(2, '0')}:${String(evMin).padStart(2, '0')}:00`);
                  const end = addMinutes(start, evDuration);
                  const desc = `[T:${format(start, 'HH:mm')}-${format(end, 'HH:mm')}][C:${evColor}]`;
                  createTask.mutate({
                    title: evTitle.trim(),
                    description: desc,
                    due_date: evDate,
                    status: 'pending',
                  });
                  setEventCreateOpen(false);
                }}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
              >
                Crear Evento
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <QuickRecurrenceFlow 
        open={recurrenceOpen}
        onClose={() => setRecurrenceOpen(false)}
      />

      <AppTutorial run={tutorialRun} onFinish={() => setTutorialRun(false)} />
    </div>
  );
};

export default NavigationWrapper;

