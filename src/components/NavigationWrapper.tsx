import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FolderOpen, Users, User, Calendar, LogOut, Settings, Bell, HelpCircle, Menu, Trash2, Home, Target, Trophy, BarChart3, Sun, History, Palette } from 'lucide-react';
import { toast } from 'sonner';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import BottomNav from './BottomNav';
import AppTutorial from './AppTutorial';
import TitleBar from './TitleBar';
import { useProfile } from '@/hooks/useProfile';

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
            {(profile?.name && profile.name.trim()) || 
             (user?.user_metadata?.full_name && user.user_metadata.full_name.trim()) || 
             user?.email?.split('@')[0] || 
             'Mi Espacio'}
          </span>
          <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Configuración</span>
        </div>
      </div>

      {!isSheet && (
        <div className="flex flex-col gap-2">
          <button 
            onClick={toggleSidebar}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-container text-on-surface-variant transition-colors flex-shrink-0"
            aria-label="Cerrar menú"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button 
            onClick={() => handleNavigate('/priority-settings')}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-container text-on-surface-variant transition-colors flex-shrink-0"
            aria-label="Ajustar Colores"
          >
            <Palette className="w-5 h-5" />
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
          <Button onClick={() => handleNavigate('/profile')} variant="ghost" className="w-full justify-start gap-4 h-11 text-on-surface-variant hover:text-foreground hover:bg-surface-container">
            <Settings className="w-4 h-4" /> <span className="text-xs">Perfil</span>
          </Button>
        </div>
      </div>
    </div>

    <div className="p-6 border-t border-outline-variant">
      <Button 
        onClick={() => signOut()} 
        variant="ghost" 
        className="w-full justify-start gap-4 h-12 text-error hover:text-error hover:bg-error/10 rounded-xl font-semibold transition-colors"
      >
        <LogOut className="w-5 h-5" />
        <span>Cerrar sesión</span>
      </Button>
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

  const { signOut, user, loading } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { label: 'Hoy', icon: Sun, path: '/daily' },
    { label: 'Calendario', icon: Calendar, path: '/week' },
    { label: 'Metas', icon: Target, path: '/goals' },
    { label: 'Carpetas', icon: FolderOpen, path: '/folders' },
    { label: 'Logros', icon: Trophy, path: '/achievements' },
    { label: 'Amigos', icon: Users, path: '/friends' },
    { label: 'Historial', icon: History, path: '/trash' },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  // For /mini popup window, Auth Page, or Landing Page on web — render children without any navigation chrome
  const isAuthPage = location.pathname === '/auth';
  const isMiniPage = location.pathname === '/mini';
  const isLandingOnWeb = location.pathname === '/' && !window.electronAPI;
  
  // Solo mostrar navegación si NO está cargando y NO es auth/mini/landing
  const showNavigation = !loading && !isAuthPage && !isMiniPage && !isLandingOnWeb;

  if (!showNavigation) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <TitleBar />
      <AppTutorial run={tutorialRun} onFinish={() => setTutorialRun(false)} />
      
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
        <div className={`fixed left-4 z-40 flex flex-col items-center gap-2 ${
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
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-high/80 backdrop-blur-md border border-outline-variant/20 text-foreground shadow-sm transition-all active:scale-90 hover:bg-surface-container-highest"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/priority-settings')}
            aria-label="Ajustar Colores"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-high/80 backdrop-blur-md border border-outline-variant/20 text-foreground shadow-sm transition-all active:scale-90 hover:bg-surface-container-highest"
          >
            <Palette className="w-5 h-5" />
          </button>
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
        className={`pb-24 lg:pb-12 min-h-screen bg-background transition-[padding] duration-300 ${
          desktopSidebarOpen ? 'lg:pl-72' : 'lg:pl-0'
        }`}
      >
        <div className={`max-w-7xl mx-auto px-0 lg:px-4 ${window.electronAPI ? 'pt-12' : 'pt-10'}`}>
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default NavigationWrapper;
