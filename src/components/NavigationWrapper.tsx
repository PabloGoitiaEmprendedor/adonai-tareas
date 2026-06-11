import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Users, User, Calendar, Settings, Target, Trophy, Sun, History, Palette, X, Flame, MessageSquare, MoreVertical, Link2, Bell, BellOff, Smartphone, Download } from 'lucide-react';
import { toast } from 'sonner';


import { MobileBottomIsland } from '@/components/MobileBottomIsland';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import AppTutorial from './AppTutorial';
import TitleBar from './TitleBar';
import { useProfile } from '@/hooks/useProfile';
import AnonymousReminder from './AnonymousReminder';
import MobileUpdateBanner from './MobileUpdateBanner';
import FirstTaskSignupModal from './FirstTaskSignupModal';
import ExitIntentModal from './ExitIntentModal';
import PostOnboardingVideoTutorial from './PostOnboardingVideoTutorial';
import { useTasks } from '@/hooks/useTasks';
import FAB from '@/components/FAB';
import TaskCaptureModal, { type TaskCaptureModalHandle } from '@/components/TaskCaptureModal';
import QuickRecurrenceFlow from '@/components/QuickRecurrenceFlow';
import { format, addMinutes, startOfMonth, endOfMonth } from 'date-fns';
import { useFolders } from '@/hooks/useFolders';
import { useNotionIntegration } from '@/hooks/useNotionIntegration';
import { useFriendUnreadCount } from '@/hooks/useFriendChats';
import { useRef, useCallback } from 'react';
import { useStreaks } from '@/hooks/useStreaks';
import { useRecurrenceRules } from '@/hooks/useRecurrenceRules';
import { REMINDER_OPTIONS, type ReminderMinutes, buildReminderMetadata } from '@/lib/reminders';
import { NavigationPilot } from './NavigationPilot';
import ProfilePage from '@/pages/ProfilePage';
import AchievementsPage from '@/pages/AchievementsPage';
import AppSettingsPage from '@/pages/SettingsPage';
import PrioritySettingsPage from '@/pages/PrioritySettingsPage';
import TrashPage from '@/pages/TrashPage';
import { writeCalendarDate, writeCalendarViewMode } from '@/lib/calendarStateSync';

// Detect if running inside Electron (desktop app)
const isElectronEnv: boolean =
  typeof window !== 'undefined' &&
  (!!window.electronAPI ||
    navigator.userAgent.toLowerCase().includes('electron') ||
    !!(window.process && window.process.versions && window.process.versions.electron));

const SETTINGS_PATHS = ['/profile', '/achievements', '/settings', '/priority-settings', '/trash'];
const REMINDER_CYCLE_VALUES: ReminderMinutes[] = [0, 5, 10, 15, 30, 60, 1440, 10080];
const REMINDER_LABEL_BY_VALUE = new Map<number, string>(REMINDER_OPTIONS.map((option) => [option.value, option.label]));

type EventRepeatMode = 'none' | 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';

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

  const [pageTitle, setPageTitle] = useState(() => {
    const map: Record<string, string> = {
      '/daily': 'Tareas de hoy',
      '/week': '',
      '/friends': 'Amigos',
      '/chat': 'Chat IA',
      '/goals': 'Metas',
      '/profile': 'Perfil',
      '/achievements': 'Logros',
      '/settings': 'Ajustes',
      '/priority-settings': 'Personalizar',
      '/trash': 'Historial',
      '/admin': 'Admin',
    };
    return map[location.pathname] || '';
  });
  const [pageTitleMeta, setPageTitleMeta] = useState('');

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ title?: string; meta?: string }>).detail || {};
      setPageTitle(detail.title || '');
      setPageTitleMeta(detail.meta || '');
    };
    window.addEventListener('adonai:set-page-title', handler);
    return () => window.removeEventListener('adonai:set-page-title', handler);
  }, []);

  useEffect(() => {
    const map: Record<string, string> = {
      '/daily': 'Tareas de hoy',
      '/week': '',
      '/friends': 'Amigos',
      '/chat': 'Chat IA',
      '/goals': 'Metas',
      '/profile': 'Perfil',
      '/achievements': 'Logros',
      '/settings': 'Ajustes',
      '/priority-settings': 'Personalizar',
      '/trash': 'Historial',
      '/admin': 'Admin',
    };
    if (location.pathname in map) {
      setPageTitle(map[location.pathname]);
      setPageTitleMeta('');
    }
  }, [location.pathname]);

  const isPathFabHidden = ['/folders', '/goals', '/friends', '/profile', '/settings', '/priority-settings', '/trash', '/achievements', '/chat'].some(path => location.pathname.startsWith(path));
  const fabHidden = draftActive || detailActive || eventCreateOpen || taskEditingActive || isPathFabHidden;
  const islandHidden = draftActive || detailActive || eventCreateOpen || taskEditingActive || settingsDialogOpen;

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
        setEvDescription('')
        setEvIsEvent(true)
        setEvLink('')
        setEvReminderEnabled(true)
        setEvReminderMinutes(0)
        setEvRepeatEnabled(false)
        setEvRepeatFrequency('weekly')
        setEvRepeatDays([])
        setEvRepeatEndType('never')
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
    setOpen(false);
  }, [location.pathname]);


  const PUBLIC_ROUTES = ['/auth', '/welcome', '/account-required', '/onboarding', '/auth/sso-callback'];
  const isPublicRoute = PUBLIC_ROUTES.some(p => location.pathname.startsWith(p));

  const { user, loading } = useAuth();
  const { profile } = useProfile();
  const { metrics } = useStreaks();
  const navigate = useNavigate();

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
  const [evDescription, setEvDescription] = useState('');
  const [evIsEvent, setEvIsEvent] = useState(true);
  const [evLink, setEvLink] = useState('');
  const [evReminderEnabled, setEvReminderEnabled] = useState(true);
  const [evReminderMinutes, setEvReminderMinutes] = useState<ReminderMinutes>(0);
  const [evRepeatEnabled, setEvRepeatEnabled] = useState(false);
  const [evRepeatFrequency, setEvRepeatFrequency] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'>('weekly');
  const [evRepeatDays, setEvRepeatDays] = useState<number[]>([]);
  const [evRepeatEndType, setEvRepeatEndType] = useState<'never' | 'date' | 'count'>('never');
  const [targetContext, setTargetContext] = useState<{ goalId?: string; folderId?: string }>({});
  const [dailyFolderContext, setDailyFolderContext] = useState<{ folderId?: string; folderName?: string }>({});
  const captureModalRef = useRef<TaskCaptureModalHandle>(null);
  const repeatDayLabels = [
    { label: 'D', value: 0, full: 'Domingo' },
    { label: 'L', value: 1, full: 'Lunes' },
    { label: 'M', value: 2, full: 'Martes' },
    { label: 'X', value: 3, full: 'Miércoles' },
    { label: 'J', value: 4, full: 'Jueves' },
    { label: 'V', value: 5, full: 'Viernes' },
    { label: 'S', value: 6, full: 'Sábado' },
  ];

  const getReminderDisplayLabel = useCallback((enabled: boolean, minutes?: number) => {
    if (!enabled) return 'Sin recordatorio';
    return REMINDER_LABEL_BY_VALUE.get(minutes ?? 0) || 'En el momento';
  }, []);

  const getNextReminderState = useCallback((enabled: boolean, minutes?: number) => {
    if (!enabled) {
      return { reminderEnabled: true, reminderMinutesBefore: REMINDER_CYCLE_VALUES[0] };
    }

    const currentIndex = REMINDER_CYCLE_VALUES.indexOf((minutes ?? 0) as ReminderMinutes);
    const nextIndex = currentIndex >= 0 ? currentIndex + 1 : 0;

    if (nextIndex >= REMINDER_CYCLE_VALUES.length) {
      return { reminderEnabled: false, reminderMinutesBefore: minutes ?? REMINDER_CYCLE_VALUES[0] };
    }

    return { reminderEnabled: true, reminderMinutesBefore: REMINDER_CYCLE_VALUES[nextIndex] };
  }, []);

  const resetEventCreateState = useCallback(() => {
    const now = new Date();
    setEvTitle('');
    setEvDate(format(now, 'yyyy-MM-dd'));
    setEvHour(now.getHours());
    setEvMin(Math.ceil(now.getMinutes() / 30) * 30);
    setEvDuration(30);
    setEvColor('#5B7CFA');
    setEvDescription('');
    setEvIsEvent(true);
    setEvLink('');
    setEvReminderEnabled(true);
    setEvReminderMinutes(0);
    setEvRepeatEnabled(false);
    setEvRepeatFrequency('weekly');
    setEvRepeatDays([]);
    setEvRepeatEndType('never');
  }, []);

  const getRepeatMode = useCallback((): EventRepeatMode => {
    if (!evRepeatEnabled) return 'none';
    const sortedDays = [...evRepeatDays].sort((a, b) => a - b);
    if (evRepeatFrequency === 'weekly' && sortedDays.join(',') === '1,2,3,4,5') return 'weekdays';
    return evRepeatFrequency;
  }, [evRepeatDays, evRepeatEnabled, evRepeatFrequency]);

  const applyRepeatMode = useCallback((mode: EventRepeatMode) => {
    if (mode === 'none') {
      setEvRepeatEnabled(false);
      return;
    }

    setEvRepeatEnabled(true);

    if (mode === 'weekdays') {
      setEvRepeatFrequency('weekly');
      setEvRepeatDays([1, 2, 3, 4, 5]);
      return;
    }

    if (mode === 'custom') {
      setEvRepeatFrequency('weekly');
      setEvRepeatDays((current) => current.length > 0 ? current : [new Date(evDate).getDay()]);
      return;
    }

    setEvRepeatFrequency(mode);
    if (mode !== 'weekly' && mode !== 'biweekly') {
      setEvRepeatDays([]);
    }
  }, [evDate]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const [mobileIslandDate, setMobileIslandDate] = useState(new Date());
  const mobileMonthStart = startOfMonth(mobileIslandDate);
  const mobileMonthEnd = endOfMonth(mobileIslandDate);
  const mobileTasksFilter = useMemo(() => ({
    startDate: format(mobileMonthStart, 'yyyy-MM-dd'),
    endDate: format(mobileMonthEnd, 'yyyy-MM-dd'),
  }), [mobileMonthStart, mobileMonthEnd]);
  const { tasks, createTask } = useTasks(mobileTasksFilter);
  const { createRule } = useRecurrenceRules();
  const { folders } = useFolders();
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
    const handleOpenCapture = (e: Event) => {
      const { goalId, folderId } = (e as CustomEvent<{ goalId?: string; folderId?: string }>).detail || {};
      openCaptureInTextMode({ goalId, folderId });
    };
    window.addEventListener('adonai:open-capture', handleOpenCapture);
    return () => window.removeEventListener('adonai:open-capture', handleOpenCapture);
  }, [openCaptureInTextMode]);

  useEffect(() => {
    const handleDailyFolderContext = (event: Event) => {
      const { folderId, folderName } = (event as CustomEvent).detail || {};
      setDailyFolderContext(folderId ? { folderId, folderName } : {});
    };

    window.addEventListener('adonai:daily-folder-context-change', handleDailyFolderContext);
    return () => window.removeEventListener('adonai:daily-folder-context-change', handleDailyFolderContext);
  }, []);

  useEffect(() => {
    if (location.pathname !== '/daily') {
      setDailyFolderContext({});
    }
  }, [location.pathname]);

  const menuItems = [
    { label: 'Hoy', icon: Sun, path: '/daily' },
    { label: 'Calendario', icon: Calendar, path: '/week' },
    { label: isAdmin ? 'Chat IA' : 'IA pronto', icon: MessageSquare, path: '/chat' },
    { label: 'Metas', icon: Target, path: '/goals' },
    { label: 'Amigos', icon: Users, path: '/friends', badge: friendUnreadCount },
  ];

  const moreItems = [
    { label: 'Perfil', icon: User, path: '/profile' },
    { label: 'Logros', icon: Trophy, path: '/achievements' },
    { label: 'Configuracion', icon: Settings, path: '/settings' },
    { label: 'Personalizar', icon: Palette, path: '/priority-settings' },
    { label: 'Historial', icon: History, path: '/trash' },
  ];

  const toggleRepeatDay = (day: number) => {
    setEvRepeatDays((previous) =>
      previous.includes(day)
        ? previous.filter((value) => value !== day)
        : [...previous, day].sort((a, b) => a - b)
    );
  };

  const getRepeatSummary = () => {
    if (!evRepeatEnabled) return 'Sin repetición';
    const selectedNames = evRepeatDays
      .map((day) => repeatDayLabels.find((option) => option.value === day)?.label)
      .filter(Boolean)
      .join(', ');
    const sortedDays = [...evRepeatDays].sort((a, b) => a - b).join(',');
    if (evRepeatFrequency === 'daily') return 'Todos los días';
    if (evRepeatFrequency === 'weekly' && sortedDays === '1,2,3,4,5') return 'Se repite de lunes a viernes';
    if (evRepeatFrequency === 'weekly') return `Cada semana${selectedNames ? ` · ${selectedNames}` : ''}`;
    if (evRepeatFrequency === 'biweekly') return `Cada 2 semanas${selectedNames ? ` · ${selectedNames}` : ''}`;
    if (evRepeatFrequency === 'monthly') return `Cada mes · día ${new Date(evDate).getDate()}`;
    return `Cada año · ${format(new Date(evDate), 'd MMM')}`;
  };

  const handleNavigate = (path: string) => {
    if (path === '#') return;
    if (path === '#settings') {
      navigate('/settings');
      setOpen(false);
      return;
    }
    if (path === '/week') {
      writeCalendarDate(new Date());
      writeCalendarViewMode('day');
    }
    navigate(path);
    setOpen(false);
  };

  const openSettingsPanel = (path: string) => {
    setSettingsPanelPath(path);
    setSettingsDialogOpen(true);
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

  const isDailyPage = location.pathname === '/daily';
  const isCalendarRoute = location.pathname === '/week';
  const isFriendsRoute = location.pathname === '/friends';
  const hideMobileHeader = isCalendarRoute;
  const isMobileDevice = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const mobileOverflowItems = [
    { label: 'Perfil', icon: User, action: () => handleNavigate('/profile') },
    { label: 'Metas', icon: Target, action: () => handleNavigate('/goals') },
    { label: 'Logros', icon: Trophy, action: () => handleNavigate('/achievements') },
    { label: 'Configuracion', icon: Settings, action: () => handleNavigate('/settings') },
    { label: 'Personalizar', icon: Palette, action: () => handleNavigate('/priority-settings') },
    { label: 'Historial', icon: History, action: () => handleNavigate('/trash') },
    ...(isMobileDevice ? [
      { label: 'Android', icon: Smartphone, action: () => window.open('/adonai.apk', '_blank') },
      { label: 'Apple', icon: Download, action: () => window.open('https://testflight.apple.com/join/adonai', '_blank') },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <TitleBar />
      <MobileUpdateBanner />
      <AnonymousReminder />
      <FirstTaskSignupModal />
      <ExitIntentModal />
      <PostOnboardingVideoTutorial />
      
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
      {!hideMobileHeader && (
      <div
        className={`fixed left-0 right-0 z-[70] lg:hidden ${
          window.electronAPI ? 'top-10' : 'top-0'} ${
          isDailyPage
            ? 'bg-[#f7f3e9]'
            : isFriendsRoute
              ? 'border-b border-outline-variant/10 bg-surface'
              : 'border-b border-outline-variant/10 bg-background'
        }`}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <div className={`min-w-0 flex-1 ${location.pathname === '/friends' ? 'pr-24' : 'pr-2'}`}>
              {pageTitle && (
                <h1 className={`truncate text-lg font-black font-headline tracking-tight ${isDailyPage ? 'text-[#1f2633]' : 'text-foreground/85'}`}>
                  {pageTitle}
                </h1>
              )}
            {user?.is_anonymous && (
              <button
                onClick={() => navigate('/auth')}
                className="mt-0.5 flex w-max items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary transition-all active:scale-95"
              >
                {"Invitado \u00b7 Iniciar sesi\u00f3n"}
              </button>
            )}
          </div>

          <div className="relative flex items-center gap-1.5">
            {location.pathname === '/friends' && (
              <div className="absolute right-11 top-0 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('adonai:friends-copy-link'))}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-foreground shadow-sm"
                  aria-label="Copiar link personal"
                >
                  <Link2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('adonai:friends-create-group'))}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
                  aria-label="Crear grupo"
                >
                  <Users className="h-4 w-4" />
                </button>
              </div>
            )}
            {pageTitleMeta && (
              <span className={`rounded-full px-2 text-xs font-black tabular-nums ${isDailyPage ? 'text-[#6f7480]/65' : 'text-on-surface-variant/70'}`}>
                {pageTitleMeta}
              </span>
            )}
            <button
              id="global-menu-trigger"
              onClick={() => setOpen((value) => !value)}
              aria-label={"Mostrar opciones"}
              className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all hover:text-foreground active:scale-90 ${isDailyPage ? 'text-[#1f2633]/70' : 'text-on-surface-variant/70'}`}
            >
              <MoreVertical className="w-5 h-5" />
              {friendUnreadCount > 0 && (
                <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black leading-none text-white shadow-lg shadow-red-500/35">
                  {friendUnreadCount > 99 ? '99+' : friendUnreadCount}
                </span>
              )}
            </button>

            {open && (
              <div className="pointer-events-auto absolute right-0 top-12 z-[95] w-[248px] overflow-hidden rounded-3xl border border-black/10 bg-[#fffdf6] p-2 text-[#1d2430] shadow-2xl shadow-black/25 dark:border-white/10 dark:bg-[#111827] dark:text-white">
                <div className="grid grid-cols-2 gap-2 border-b border-black/10 p-2 pb-3 dark:border-white/10">
                  <div className="rounded-2xl bg-[#182033] px-3 py-2 text-white">
                    <div className="flex items-center gap-2 text-[#E65100]">
                      <Flame className="h-4 w-4 fill-[#E65100]/35" />
                      <span className="text-[10px] font-black uppercase tracking-[0.14em]">Racha</span>
                    </div>
                    <p className="mt-1 text-lg font-black leading-none">{metrics?.streak_current || 0}d</p>
                  </div>
                  <div className="rounded-2xl bg-[#182033] px-3 py-2 text-white">
                    <div className="flex items-center gap-2 text-[#D9A600]">
                      <Trophy className="h-4 w-4 fill-[#FFD700]/35" />
                      <span className="text-[10px] font-black uppercase tracking-[0.14em]">Nivel</span>
                    </div>
                    <p className="mt-1 text-lg font-black leading-none">{metrics?.level || 1}</p>
                  </div>
                </div>
                <div className="py-1">
                  {mobileOverflowItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={item.action}
                        className="flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-bold text-[#1d2430] transition-colors hover:bg-black/5 dark:text-white dark:hover:bg-white/8"
                      >
                        <Icon className="h-4 w-4 text-[#687181] dark:text-white/60" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Navigation Pilot - floating hover menu (desktop only) */}
      {!isPublicRoute && (
        <NavigationPilot
          menuItems={menuItems}
          settingsItems={moreItems}
          displayName={profile?.name?.trim() || user?.email?.split('@')[0] || 'Usuario'}
          showAdmin={user?.email === 'pablogoitiaemprendedor@gmail.com'}
          electronOffset={isElectronEnv}
          user={user}
          onNavigate={handleNavigate}
        />
      )}
 
      <main
        id="main-content"
        className="flex-1 pb-24 lg:pb-12 min-h-screen bg-background"
      >
        <div className={`w-full ${isCalendarRoute ? 'pt-0' : window.electronAPI ? 'pt-16' : 'pt-14'}`}>
          {children}
        </div>
      </main>

      {/* Universal Task Capture UI */}
      <div className="relative z-[60]">
        {/* Mobile: Bottom navigation island */}
        {!isPublicRoute && !islandHidden && !captureOpen && !recurrenceOpen && <MobileBottomIsland />}

        {/* Mobile logic: FAB + task trigger on week page */}
        {!isPublicRoute && (
        <div className="lg:hidden">
          {!fabHidden && !captureOpen && !recurrenceOpen && (
            <FAB 
              onTextClick={() => openCaptureInTextMode(dailyFolderContext.folderId ? { folderId: dailyFolderContext.folderId } : undefined)}
              onVoiceClick={() => openCaptureInVoiceMode()} 
              onRecurrenceClick={() => setRecurrenceOpen(true)}
              contextLabel={dailyFolderContext.folderName}
               onEventClick={() => {
                resetEventCreateState()
                setEventCreateOpen(true)
              }}
            />
          )}
        </div>
        )}

        {/* Desktop logic: FAB visible unless draft or detail is open */}
        {!isPublicRoute && !fabHidden && !captureOpen && !recurrenceOpen && (
        <div className="hidden lg:block">
          <FAB 
            onTextClick={() => openCaptureInTextMode(dailyFolderContext.folderId ? { folderId: dailyFolderContext.folderId } : undefined)}
            onVoiceClick={() => openCaptureInVoiceMode()} 
            onRecurrenceClick={() => setRecurrenceOpen(true)}
            contextLabel={dailyFolderContext.folderName}
              onEventClick={() => {
                resetEventCreateState()
                setEventCreateOpen(true)
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
        <DialogContent
          className="left-0 top-0 flex h-[100dvh] max-h-[100dvh] w-screen translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 bg-background p-4 shadow-2xl outline-none sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[min(560px,calc(100vh-48px))] sm:max-w-[430px] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-[30px] sm:border sm:border-outline-variant/25 sm:p-5"
          hideCloseButton={true}
        >
          <DialogTitle className="sr-only">Nuevo recordatorio</DialogTitle>
          <DialogDescription className="sr-only">Crea un recordatorio rapido con color, repeticion y link opcional.</DialogDescription>

          <button
            type="button"
            onClick={() => setEventCreateOpen(false)}
            className="absolute left-5 top-5 z-20 rounded-xl p-1.5 text-muted-foreground transition-all hover:bg-black/5 hover:text-foreground focus:outline-none focus-visible:ring-0 dark:hover:bg-white/5"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 pt-11">

            <div className="space-y-1.5">
              <input
                value={evTitle}
                onChange={(e) => setEvTitle(e.target.value)}
                placeholder="¿Qué tienes que hacer?"
                className="w-full rounded-[22px] border border-outline-variant/25 bg-surface/70 px-4 py-3.5 text-[15px] font-bold text-foreground shadow-sm outline-none transition-all placeholder:text-muted-foreground/25 focus:ring-4 focus:ring-primary/10"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <textarea
                value={evDescription}
                onChange={(e) => setEvDescription(e.target.value)}
                placeholder="Detalles adicionales..."
                className="block min-h-[56px] max-h-[120px] w-full resize-none overflow-y-auto rounded-[22px] border border-outline-variant/10 bg-surface-container/30 p-4 text-sm font-medium leading-[1.5] text-foreground outline-none transition-all placeholder:text-muted-foreground/25 focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="hidden">
              <input
                type="date"
                value={evDate}
                onChange={(e) => setEvDate(e.target.value)}
                className="h-10 rounded-[16px] border border-outline-variant/20 bg-surface/70 px-3.5 text-sm font-bold text-foreground outline-none transition-all focus:ring-4 focus:ring-primary/10"
              />
              <input
                type="time"
                value={`${String(evHour).padStart(2, '0')}:${String(evMin).padStart(2, '0')}`}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(':').map(Number);
                  setEvHour(h);
                  setEvMin(m);
                }}
                className="h-10 min-w-[100px] rounded-[16px] border border-outline-variant/20 bg-surface/70 px-3 text-sm font-bold text-foreground outline-none transition-all focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <div className="hidden">
              <span className="text-xs font-bold text-muted-foreground/60">Duración</span>
              <select
                value={evDuration}
                onChange={(e) => setEvDuration(Number(e.target.value))}
                className="h-10 flex-1 rounded-[16px] border border-outline-variant/20 bg-surface/70 px-3.5 text-sm font-bold text-foreground outline-none transition-all focus:ring-4 focus:ring-primary/10"
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
              <div className="flex flex-1 items-center gap-1.5 rounded-[18px] border border-outline-variant/15 bg-surface-container/25 px-2 py-2">
                {['#5B7CFA', '#EB5757', '#F4B860', '#6FCF97'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEvColor(c)}
                    className={`h-[26px] w-[26px] rounded-full transition-all ${evColor === c ? 'scale-110 ring-2 ring-white/80 ring-offset-2 ring-offset-background' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                    aria-label={`Usar color ${c}`}
                  />
                ))}
                <label className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-dashed border-outline-variant/30 text-muted-foreground/60 transition-colors hover:border-primary/30 hover:text-primary">
                  <span className="text-sm font-black leading-none">+</span>
                  <input
                    type="color"
                    value={evColor}
                    onChange={(e) => setEvColor(e.target.value)}
                    className="sr-only"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextReminder = getNextReminderState(evReminderEnabled, evReminderMinutes);
                  setEvReminderEnabled(nextReminder.reminderEnabled);
                  setEvReminderMinutes(nextReminder.reminderMinutesBefore as ReminderMinutes);
                }}
                className={`flex h-9 items-center justify-center gap-2 rounded-full border px-3 text-[10px] font-black transition-all whitespace-nowrap ${evReminderEnabled ? 'border-primary/25 bg-primary/15 text-primary shadow-sm' : 'border-outline-variant/15 bg-surface-container/30 text-muted-foreground hover:border-primary/30 hover:text-primary'}`}
                aria-label={evReminderEnabled ? 'Cambiar recordatorio' : 'Activar recordatorio'}
              >
                {evReminderEnabled ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
                <span>{getReminderDisplayLabel(evReminderEnabled, evReminderMinutes)}</span>
              </button>
            </div>

            <div className="flex rounded-[18px] border border-outline-variant/20 bg-surface-container/25 p-1">
              {[
                { value: true, label: 'Solo calendario' },
                { value: false, label: 'Tarea y calendario' },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setEvIsEvent(option.value)}
                  className={`h-9 flex-1 rounded-[14px] text-[9px] font-black uppercase tracking-tight transition-all ${evIsEvent === option.value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Repetición</label>
              </div>
              <div className="space-y-3 rounded-[22px] border border-outline-variant/15 bg-surface-container/25 p-3">
                <div className="rounded-2xl border border-primary/15 bg-primary/10 px-4 py-3 text-[12px] font-bold leading-relaxed text-foreground">
                  {getRepeatSummary()}
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {([
                    { id: 'none', label: 'No' },
                    { id: 'daily', label: 'Diario' },
                    { id: 'weekdays', label: 'L-V' },
                    { id: 'weekly', label: 'Semanal' },
                    { id: 'biweekly', label: '2 sem' },
                    { id: 'monthly', label: 'Mensual' },
                    { id: 'yearly', label: 'Anual' },
                    { id: 'custom', label: 'A medida' },
                  ] as const).map((option) => {
                    const active = getRepeatMode() === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => applyRepeatMode(option.id)}
                        className={`h-9 rounded-xl border text-[10px] font-black transition-all ${active ? 'border-primary/30 bg-primary/15 text-primary' : 'border-outline-variant/15 bg-surface/50 text-muted-foreground hover:text-primary'}`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                {evRepeatEnabled && (evRepeatFrequency === 'weekly' || evRepeatFrequency === 'biweekly') && (
                  <div className="grid grid-cols-7 gap-1.5">
                    {repeatDayLabels.map((day) => {
                      const active = evRepeatDays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleRepeatDay(day.value)}
                          className={`h-10 rounded-full border text-xs font-black transition-all ${active ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'border-outline-variant/20 bg-surface/60 text-muted-foreground hover:border-primary/30 hover:text-primary'}`}
                          aria-label={`Repetir en ${day.full}`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {evRepeatEnabled && (
                  <div className="space-y-2 border-t border-outline-variant/10 pt-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">Finaliza</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([
                        { id: 'never', label: 'Nunca' },
                        { id: 'date', label: 'Fecha' },
                        { id: 'count', label: 'Eventos' },
                      ] as const).map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setEvRepeatEndType(option.id)}
                          className={`h-9 rounded-xl border text-[10px] font-black transition-all ${evRepeatEndType === option.id ? 'border-primary/30 bg-primary/15 text-primary' : 'border-outline-variant/15 bg-surface/50 text-muted-foreground hover:text-primary'}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Links o referencias</label>
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/35" />
                <input
                  value={evLink}
                  onChange={(e) => setEvLink(e.target.value)}
                  placeholder="https://..."
                  className="h-11 w-full rounded-[18px] border border-outline-variant/15 bg-surface/70 pl-11 pr-4 text-sm font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground/25 focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!evTitle.trim()) return;
                  const start = new Date(`${evDate}T${String(evHour).padStart(2, '0')}:${String(evMin).padStart(2, '0')}:00`);
                  const end = addMinutes(start, evDuration);
                  const descParts = [`[T:${format(start, 'HH:mm')}-${format(end, 'HH:mm')}]`, `[C:${evColor}]`];
                  const finalDescription = `${descParts.join('')}${evDescription.trim() ? `\n${evDescription.trim()}` : ''}`;

                  try {
                    let recurrenceId: string | null = null;

                    if (evRepeatEnabled) {
                      const selectedDays =
                        (evRepeatFrequency === 'weekly' || evRepeatFrequency === 'biweekly')
                          ? (evRepeatDays.length > 0 ? evRepeatDays : [start.getDay()])
                          : undefined;

                      const recurrenceRule = await createRule.mutateAsync({
                        title: evTitle.trim(),
                        description: evDescription.trim() || null,
                        link: evLink.trim() || null,
                        frequency: evRepeatFrequency === 'biweekly' ? 'weekly' : evRepeatFrequency,
                        interval: evRepeatFrequency === 'biweekly' ? 2 : 1,
                        days_of_week: selectedDays || null,
                        day_of_month: evRepeatFrequency === 'monthly' || evRepeatFrequency === 'yearly' ? start.getDate() : null,
                        month_of_year: evRepeatFrequency === 'yearly' ? start.getMonth() + 1 : null,
                        start_date: evDate,
                        end_date: null,
                        start_time: format(start, 'HH:mm:ss'),
                        end_time: format(end, 'HH:mm:ss'),
                        estimated_minutes: evDuration,
                      } as any);

                      recurrenceId = recurrenceRule.id;
                    }

                    await createTask.mutateAsync({
                      title: evTitle.trim(),
                      description: finalDescription,
                      due_date: evDate,
                      status: 'pending',
                      estimated_minutes: evDuration,
                      recurrence_id: recurrenceId,
                      link: evLink.trim() || null,
                      source_type: 'text',
                      creation_source: evIsEvent ? 'event' : 'fab',
                      metadata: buildReminderMetadata({
                        event_color: evColor,
                        event_repeat_enabled: evRepeatEnabled,
                        event_repeat_frequency: evRepeatEnabled ? evRepeatFrequency : 'none',
                      }, evIsEvent ? 'event' : 'task', evReminderEnabled, evReminderMinutes),
                    });

                    setEventCreateOpen(false);
                  } catch (error) {
                    console.error('[NavigationWrapper] Error creating event:', error);
                    toast.error('No se pudo crear el evento');
                  }
                }}
                className="h-10 flex-1 rounded-[16px] bg-primary px-4 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-opacity hover:opacity-90"
              >
                Crear recordatorio
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

