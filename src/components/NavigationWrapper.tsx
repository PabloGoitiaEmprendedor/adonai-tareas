import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FolderOpen, Users, User, Calendar, LogOut, Settings, Bell, HelpCircle, Menu, Trash2, Home, Target, Trophy, BarChart3, Sun, History, Palette, Download, Monitor, Apple, Loader2, X, Clock } from 'lucide-react';
import { WIN_DOWNLOAD, MAC_DOWNLOAD } from '@/lib/download-urls';
import { toast } from 'sonner';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import AppTutorial from './AppTutorial';
import TitleBar from './TitleBar';
import { useProfile } from '@/hooks/useProfile';
import AnonymousReminder from './AnonymousReminder';
import { useTasks } from '@/hooks/useTasks';
import { usePriorityColors, getPriorityKey } from '@/hooks/usePriorityColors';
import { useGlobalVoiceCapture } from '@/hooks/useGlobalVoiceCapture';
import { MobileDynamicIsland } from '@/components/ui/mobile-task-island';
import FAB from '@/components/FAB';
import TaskCaptureModal, { type TaskCaptureModalHandle } from '@/components/TaskCaptureModal';
import QuickRecurrenceFlow from '@/components/QuickRecurrenceFlow';
import { format, addMinutes } from 'date-fns';
import { useFolders } from '@/hooks/useFolders';
import { useRef, useCallback } from 'react';

// Detect if running inside Electron (desktop app)
const isElectronEnv: boolean =
  typeof window !== 'undefined' &&
  (!!window.electronAPI ||
    navigator.userAgent.toLowerCase().includes('electron') ||
    !!(window.process && window.process.versions && window.process.versions.electron));

/* ─── Persistent "Download Desktop App" banner (web-only) ─── */
function DesktopDownloadBanner() {
  const [winLoading, setWinLoading] = useState(false);
  const [macLoading, setMacLoading] = useState(false);

  const handleDownload = (platform: 'win' | 'mac') => {
    const setLoading = platform === 'win' ? setWinLoading : setMacLoading;
    setLoading(true);
    const url = platform === 'win' ? WIN_DOWNLOAD : MAC_DOWNLOAD;
    const link = document.createElement('a');
    link.href = url;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setLoading(false), 3000);
  };

  return (
    <div className="rounded-2xl bg-primary/8 border border-primary/20 p-3">
      <div className="flex items-center gap-2 mb-2.5">
        <Download className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <p className="text-[11px] font-bold text-primary leading-tight">
          App de escritorio
        </p>
      </div>
      <p className="text-[10px] text-on-surface-variant leading-relaxed mb-3">
        Descarga para tener la mini-ventana y notificaciones nativas.
      </p>
      <div className="flex gap-1.5">
        <button
          id="sidebar-download-win"
          onClick={() => handleDownload('win')}
          disabled={winLoading}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary text-[10px] font-bold py-2 px-2 transition-colors disabled:opacity-60"
        >
          {winLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Monitor className="w-3 h-3" />}
          Windows
        </button>
        <button
          id="sidebar-download-mac"
          onClick={() => handleDownload('mac')}
          disabled={macLoading}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary text-[10px] font-bold py-2 px-2 transition-colors disabled:opacity-60"
        >
          {macLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Apple className="w-3 h-3" />}
          Mac
        </button>
      </div>
    </div>
  );
}

interface NavigationWrapperProps {
  children: React.ReactNode;
}

const SidebarContent = ({ user, profile, menuItems, location, handleNavigate, signOut, startTutorial, isSheet, toggleSidebar }: any) => (
  <div className="flex flex-col h-full bg-surface text-foreground">
    <div className="p-6 border-b border-outline-variant flex items-center justify-between gap-4">
      <div 
        onClick={() => handleNavigate('/profile')}
        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity group flex-1 min-w-0"
      >
        <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center border border-outline-variant group-hover:bg-surface-container-high transition-colors flex-shrink-0">
          <User className="w-6 h-6 text-primary" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-black text-foreground truncate tracking-tight">
            {user?.is_anonymous 
              ? 'Invitado' 
              : ((profile?.name && profile.name.trim()) || 
                 (user?.user_metadata?.full_name && user.user_metadata.full_name.trim()) || 
                 user?.email?.split('@')[0] || 
                 'Mi Espacio')}
          </span>
        </div>
      </div>

      {!isSheet && (
        <div className="flex flex-col gap-2">
          <button 
            onClick={toggleSidebar}
            className="w-10 h-10 flex items-center justify-center text-on-surface-variant transition-colors flex-shrink-0"
            aria-label="Cerrar menú"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
    
    <div className="flex-1 overflow-y-auto py-4">
      <div className="px-3 space-y-1">
        {menuItems.map((item: any) => (
          <Button
            key={item.path}
            id={`nav-${item.path.replace('/', '') || 'today'}`}
            variant="ghost"
            onClick={() => handleNavigate(item.path)}
            className={`w-full justify-start gap-4 h-12 rounded-xl transition-all duration-300 ${
              location.pathname === item.path 
                ? 'bg-primary/20 text-foreground font-bold' 
                : 'text-on-surface-variant hover:bg-surface-container hover:text-foreground'
            }`}
          >
            <item.icon className={`w-5 h-5 ${location.pathname === item.path ? 'text-foreground' : ''}`} />
            <span className="text-sm tracking-wide">{item.label}</span>
          </Button>
        ))}

        {/* Admin panel — CEO only */}
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

      <div className="mt-8 px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-4">Ajustes</p>
        <div className="space-y-1">
          <Button id="nav-personalizar" onClick={() => handleNavigate('/priority-settings')} variant="ghost" className="w-full justify-start gap-4 h-11 text-on-surface-variant hover:text-foreground hover:bg-surface-container">
            <Palette className="w-4 h-4" /> <span className="text-xs">Personalizar</span>
          </Button>
          <Button id="nav-profile" onClick={() => handleNavigate('/profile')} variant="ghost" className="w-full justify-start gap-4 h-11 text-on-surface-variant hover:text-foreground hover:bg-surface-container">
            <User className="w-4 h-4" /> <span className="text-xs">Perfil</span>
          </Button>
          <Button id="nav-settings" onClick={() => handleNavigate('/settings')} variant="ghost" className="w-full justify-start gap-4 h-11 text-on-surface-variant hover:text-foreground hover:bg-surface-container">
            <Settings className="w-4 h-4" /> <span className="text-xs">Ajustes</span>
          </Button>
        </div>
      </div>
    </div>

    <div className="p-6 border-t border-outline-variant space-y-3">
      {/* Download desktop app — only shown in web (hidden in Electron) */}
      {!isElectronEnv && (
        <DesktopDownloadBanner />
      )}

      {user?.is_anonymous ? (
        <Button 
          onClick={() => handleNavigate('/auth')} 
          variant="default" 
          className="w-full justify-start gap-4 h-12 bg-primary text-black hover:bg-primary/90 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
        >
          <User className="w-5 h-5" />
          <span>Iniciar sesión</span>
        </Button>
      ) : (
        <Button 
          onClick={() => signOut()} 
          variant="ghost" 
          className="w-full justify-start gap-4 h-12 text-error hover:text-error hover:bg-error/10 rounded-xl font-semibold transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Cerrar sesión</span>
        </Button>
      )}
    </div>
  </div>
);

const NavigationWrapper = ({ children }: NavigationWrapperProps) => {
  const [open, setOpen] = useState(false);
  const [tutorialRun, setTutorialRun] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('adonai_sidebar_open');
    return saved === null ? true : saved === '1';
  });

  const [draftActive, setDraftActive] = useState(false);
  const [detailActive, setDetailActive] = useState(false);

  const fabHidden = draftActive || detailActive

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
    const handler = () => {
      if (window.location.pathname !== '/week') {
        setEvTitle('')
        setEvDate(format(new Date(), 'yyyy-MM-dd'))
        const now = new Date()
        setEvHour(now.getHours())
        setEvMin(Math.ceil(now.getMinutes() / 30) * 30)
        setEvDuration(30)
        setEvColor('#6366f1')
        setEventCreateOpen(true)
      }
    }
    window.addEventListener('adonai:open-create-event', handler)
    return () => window.removeEventListener('adonai:open-create-event', handler)
  }, [])

  useEffect(() => {
    localStorage.setItem('adonai_sidebar_open', desktopSidebarOpen ? '1' : '0');
  }, [desktopSidebarOpen]);

  useEffect(() => {
    const handleRestart = () => {
      setTutorialRun(true);
      setOpen(false); // Close mobile sidebar if open
    };
    window.addEventListener('restart-adonai-tour', handleRestart);
    return () => window.removeEventListener('restart-adonai-tour', handleRestart);
  }, []);


  const { signOut, user, loading } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const isWeeklyPage = location.pathname === '/week';

  // Task capture state
  const [captureOpen, setCaptureOpen] = useState(false);
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [eventCreateOpen, setEventCreateOpen] = useState(false);
  const [evTitle, setEvTitle] = useState('');
  const [evDate, setEvDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [evHour, setEvHour] = useState(new Date().getHours());
  const [evMin, setEvMin] = useState(Math.ceil(new Date().getMinutes() / 30) * 30);
  const [evDuration, setEvDuration] = useState(30);
  const [evColor, setEvColor] = useState('#6366f1');
  const [targetContext, setTargetContext] = useState<{ goalId?: string; folderId?: string }>({});
  const captureModalRef = useRef<TaskCaptureModalHandle>(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const { tasks, createTask } = useTasks({ date: today });
  const { folders } = useFolders();
  const { colors: priorityColors } = usePriorityColors();

  const openCapture = useCallback((context?: { goalId?: string; folderId?: string }) => {
    if (context) setTargetContext(context);
    else setTargetContext({});
    setCaptureOpen(true);
  }, []);

  const openCaptureInVoiceMode = useCallback((context?: { goalId?: string; folderId?: string }) => {
    if (context) setTargetContext(context);
    else setTargetContext({});
    setCaptureOpen(true);
    setTimeout(() => {
      captureModalRef.current?.openInVoiceMode();
    }, 10);
  }, []);

  useGlobalVoiceCapture(captureModalRef, () => openCapture());

  // Listen for global open-capture events
  useEffect(() => {
    const handleOpenCapture = (e: any) => {
      const { goalId, folderId, voice } = e.detail || {};
      if (voice) {
        openCaptureInVoiceMode({ goalId, folderId });
      } else {
        openCapture({ goalId, folderId });
      }
    };
    window.addEventListener('adonai:open-capture' as any, handleOpenCapture);
    return () => window.removeEventListener('adonai:open-capture' as any, handleOpenCapture);
  }, [openCapture, openCaptureInVoiceMode]);

  const isAdmin = user?.email === 'pablogoitiaemprendedor@gmail.com';

  const menuItems = [
    { label: 'Hoy', icon: Sun, path: '/daily' },
    { label: isAdmin ? 'Calendario' : 'Calendario (Pronto)', icon: Calendar, path: isAdmin ? '/week' : '#' },
    { label: 'Metas', icon: Target, path: '/goals' },
    { label: 'Carpetas', icon: FolderOpen, path: '/folders' },
    { label: 'Logros', icon: Trophy, path: '/achievements' },
    { label: 'Amigos', icon: Users, path: '/friends' },
    { label: 'Historial', icon: History, path: '/trash' },
  ];

  const handleNavigate = (path: string) => {
    if (path === '#') return;
    navigate(path);
    setOpen(false);
  };

  const isWelcomePage = location.pathname === '/welcome';
  const isAuthPage = location.pathname === '/auth';
  const isMiniPage = location.pathname === '/mini';
  const isLandingPage = location.pathname === '/';
  const isPrivacyPage = location.pathname === '/politica-de-privacidad';
  const isTermsPage = location.pathname === '/terminos-de-servicio';
  const isDocsPage = location.pathname.startsWith('/docs');
  const isCaracteristicasPage = location.pathname === '/caracteristicas';
  const isFaqPage = location.pathname === '/faq';
  const isOnboardingPage = location.pathname === '/onboarding';
  
  const showNavigation = !loading && !isWelcomePage && !isAuthPage && !isMiniPage && !isLandingPage && !isPrivacyPage && !isTermsPage && !isDocsPage && !isCaracteristicasPage && !isFaqPage && !isOnboardingPage;

  if (!showNavigation) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <TitleBar />
      <AnonymousReminder />
      
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[280px] glass-sheet border-r-outline-variant/20 p-0">
          <SidebarContent 
            user={user} 
            profile={profile} 
            menuItems={menuItems} 
            location={location} 
            handleNavigate={handleNavigate} 
            signOut={signOut} 
            startTutorial={() => { setTutorialRun(true); setOpen(false); }}
            isSheet 
            toggleSidebar={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Floating Header Actions
          - Mobile: ALWAYS visible (top-left) when the mobile Sheet is closed
          - Desktop: only when the desktop sidebar is collapsed */}
      {!open && (
        <div className={`fixed left-4 z-[70] flex items-center gap-2 ${
            desktopSidebarOpen ? 'lg:hidden' : ''
          } ${window.electronAPI ? 'top-12' : 'top-4'}`}>
          <button
            id="global-menu-trigger"
            onClick={() => {
              if (window.innerWidth < 1024) {
                setOpen(true);
              } else {
                setDesktopSidebarOpen(true);
              }
            }}
            aria-label="Mostrar menú"
            className="p-2.5 text-on-surface-variant/70 hover:text-foreground transition-all active:scale-90"
          >
            <Menu className="w-5 h-5" />
          </button>
          {user?.is_anonymous && (
            <button
              onClick={() => navigate('/auth')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 transition-all active:scale-95"
            >
              Invitado · Iniciar sesión
            </button>
          )}
        </div>
      )}

      <aside
        className={`hidden lg:flex fixed left-0 top-0 bottom-0 w-72 bg-surface border-r border-outline-variant z-40 flex-col shadow-xl transition-transform duration-300 ${
          desktopSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent 
          user={user} 
          profile={profile} 
          menuItems={menuItems} 
          location={location} 
          handleNavigate={handleNavigate} 
          signOut={signOut} 
          startTutorial={() => setTutorialRun(true)}
          toggleSidebar={() => setDesktopSidebarOpen(false)}
        />
      </aside>

      <main
        id="main-content"
        className={`flex-1 pb-24 lg:pb-12 min-h-screen bg-background transition-[padding] duration-300 ${
          desktopSidebarOpen ? 'lg:pl-72' : 'lg:pl-0'
        }`}
      >
        <div className={`max-w-7xl mx-auto px-0 lg:px-4 ${window.electronAPI ? 'pt-12' : 'pt-10'}`}>
          {children}
        </div>
      </main>

      {/* Universal Task Capture UI */}
      <div className="relative z-[60]">
        {/* Mobile logic: Island on week page, FAB elsewhere */}
        <div className="lg:hidden">
          {isWeeklyPage && !draftActive ? (
            <MobileDynamicIsland
              tasks={tasks}
              currentDate={new Date()}
              onAddTask={() => openCapture()}
              onTaskClick={(task) => {
                window.dispatchEvent(new CustomEvent('adonai:open-task-detail', { detail: task }));
              }}
              priorityColors={priorityColors}
              getPriorityKey={getPriorityKey}
              folders={folders}
            />
          ) : !isWeeklyPage && !fabHidden ? (
            <FAB 
              onTextClick={() => openCapture()} 
              onVoiceClick={() => openCaptureInVoiceMode()} 
              onRecurrenceClick={() => setRecurrenceOpen(true)}
               onEventClick={() => {
                setEvTitle('')
                setEvDate(format(new Date(), 'yyyy-MM-dd'))
                const now = new Date()
                setEvHour(now.getHours())
                setEvMin(Math.ceil(now.getMinutes() / 30) * 30)
                setEvDuration(30)
                setEvColor('#6366f1')
                window.dispatchEvent(new CustomEvent('adonai:open-create-event'))
              }}
            />
          ) : null}
        </div>

        {/* Desktop logic: FAB visible unless draft or detail is open */}
        {!fabHidden && (
        <div className="hidden lg:block">
          <FAB 
            onTextClick={() => openCapture()} 
            onVoiceClick={() => openCaptureInVoiceMode()} 
            onRecurrenceClick={() => setRecurrenceOpen(true)}
              onEventClick={() => {
                setEvTitle('')
                setEvDate(format(new Date(), 'yyyy-MM-dd'))
                const now = new Date()
                setEvHour(now.getHours())
                setEvMin(Math.ceil(now.getMinutes() / 30) * 30)
                setEvDuration(30)
                setEvColor('#6366f1')
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
          setTargetContext({});
        }} 
        goalId={targetContext.goalId}
        folderId={targetContext.folderId}
        creationSource="global-fab" 
      />

      <Dialog open={eventCreateOpen} onOpenChange={(open) => { if (!open) setEventCreateOpen(false) }}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl">
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
              placeholder="Título del evento"
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
              <span className="text-xs font-bold text-muted-foreground/60">Duración:</span>
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
                {['#6366f1', '#ef4444', '#f59e0b', '#22c55e'].map(c => (
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
                    creation_source: 'event',
                  });
                  toast.success('Evento creado');
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
