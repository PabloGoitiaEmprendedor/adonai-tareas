import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FolderOpen, Users, User, Calendar, LogOut, Settings, Bell, HelpCircle, Menu, Trash2, Home, Target, Trophy, BarChart3, Sun, History, Palette, Download, Monitor, Apple, Loader2 } from 'lucide-react';
import { WIN_DOWNLOAD, MAC_DOWNLOAD } from '@/lib/download-urls';
import { toast } from 'sonner';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { format } from 'date-fns';
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

  // Task capture state
  const [captureOpen, setCaptureOpen] = useState(false);
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [targetContext, setTargetContext] = useState<{ goalId?: string; folderId?: string }>({});
  const captureModalRef = useRef<TaskCaptureModalHandle>(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const { tasks } = useTasks({ date: today });
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

  // For /mini popup window, Auth Page, Landing Page, or public pages — render children without any navigation chrome
  const isAuthPage = location.pathname === '/auth';
  const isMiniPage = location.pathname === '/mini';
  const isLandingPage = location.pathname === '/';
  const isPrivacyPage = location.pathname === '/politica-de-privacidad';
  const isTermsPage = location.pathname === '/terminos-de-servicio';
  const isDocsPage = location.pathname.startsWith('/docs');
  const isCaracteristicasPage = location.pathname === '/caracteristicas';
  const isFaqPage = location.pathname === '/faq';
  
  // Solo mostrar navegación si NO está cargando y NO es auth/mini/landing/privacy/terms/docs/caracteristicas/faq
  const showNavigation = !loading && !isAuthPage && !isMiniPage && !isLandingPage && !isPrivacyPage && !isTermsPage && !isDocsPage && !isCaracteristicasPage && !isFaqPage;

  if (!showNavigation) {
    return <>{children}</>;
  }

  const isWeeklyPage = location.pathname === '/week';

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
          {isWeeklyPage ? (
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
          ) : (
            <FAB 
              onTextClick={() => openCapture()} 
              onVoiceClick={() => openCaptureInVoiceMode()} 
              onRecurrenceClick={() => setRecurrenceOpen(true)}
            />
          )}
        </div>

        {/* Desktop logic: FAB is always present */}
        <div className="hidden lg:block">
          <FAB 
            onTextClick={() => openCapture()} 
            onVoiceClick={() => openCaptureInVoiceMode()} 
            onRecurrenceClick={() => setRecurrenceOpen(true)}
          />
        </div>
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

      <QuickRecurrenceFlow 
        open={recurrenceOpen}
        onClose={() => setRecurrenceOpen(false)}
      />

      <AppTutorial run={tutorialRun} onFinish={() => setTutorialRun(false)} />
    </div>
  );
};

export default NavigationWrapper;
