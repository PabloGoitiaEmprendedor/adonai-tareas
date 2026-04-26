import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FolderOpen, Users, User, Calendar, LogOut, Settings, Bell, HelpCircle, Menu, Trash2, Home, Target, Trophy, Download, Monitor } from 'lucide-react';
import { toast } from 'sonner';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import BottomNav from './BottomNav';
import AppTutorial from './AppTutorial';

interface NavigationWrapperProps {
  children: React.ReactNode;
}

const SidebarContent = ({ user, menuItems, location, handleNavigate, signOut, startTutorial, isSheet, toggleSidebar }: any) => (
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
          <span className="text-sm font-black text-foreground truncate tracking-tight">{user?.email?.split('@')[0] || 'Mi Espacio'}</span>
          <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Configuración</span>
        </div>
      </div>

      {!isSheet && (
        <button 
          onClick={toggleSidebar}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-container text-on-surface-variant transition-colors flex-shrink-0"
          aria-label="Cerrar menú"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}
    </div>
    
    <div className="px-6 py-2">
      {isSheet ? (
        <SheetHeader className="p-0">
          <SheetTitle className="text-left text-xl font-black text-foreground tracking-tighter opacity-80">
            Adonai
          </SheetTitle>
        </SheetHeader>
      ) : (
        <h2 className="text-left text-xl font-black text-foreground tracking-tighter opacity-80">
          Adonai
        </h2>
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
        <Button
          variant="ghost"
          onClick={() => handleNavigate('/trash')}
          className={`w-full justify-start gap-4 h-12 rounded-xl transition-all duration-300 ${
            location.pathname === '/trash' 
              ? 'bg-primary/20 text-foreground font-bold' 
              : 'text-on-surface-variant hover:bg-surface-container hover:text-foreground'
          }`}
        >
          <Trash2 className={`w-5 h-5 ${location.pathname === '/trash' ? 'text-foreground' : ''}`} />
          <span className="text-sm tracking-wide">Historial</span>
        </Button>
      </div>

      <div className="mt-8 px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-4">Ajustes</p>
        <div className="space-y-1">
           <Button variant="ghost" className="w-full justify-start gap-4 h-11 text-on-surface-variant hover:text-foreground hover:bg-surface-container">
            <Bell className="w-4 h-4" /> <span className="text-xs">Notificaciones</span>
          </Button>
          <Button onClick={() => handleNavigate('/profile')} variant="ghost" className="w-full justify-start gap-4 h-11 text-on-surface-variant hover:text-foreground hover:bg-surface-container">
            <Settings className="w-4 h-4" /> <span className="text-xs">Preferencias</span>
          </Button>
          <Button onClick={startTutorial} variant="ghost" className="w-full justify-start gap-4 h-11 text-on-surface-variant hover:text-foreground hover:bg-surface-container">
            <HelpCircle className="w-4 h-4" /> <span className="text-xs">Guía rápida</span>
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
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('adonai_sidebar_open');
    return saved === null ? true : saved === '1';
  });

  useEffect(() => {
    localStorage.setItem('adonai_sidebar_open', desktopSidebarOpen ? '1' : '0');
  }, [desktopSidebarOpen]);

  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { label: 'Hoy', icon: Home, path: '/' },
    { label: 'Planificación', icon: Calendar, path: '/week' },
    { label: 'Carpetas', icon: FolderOpen, path: '/folders' },
    { label: 'Logros', icon: Trophy, path: '/achievements' },
    { label: 'Amigos', icon: Users, path: '/friends' },
    { label: 'Metas', icon: Target, path: '/goals' },
    { label: 'Perfil', icon: User, path: '/profile' },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  // For /mini popup window — render children without any navigation chrome
  if (location.pathname === '/mini') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppTutorial run={tutorialRun} onFinish={() => setTutorialRun(false)} />
      
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[280px] glass-sheet border-r-outline-variant/20 p-0">
          <SidebarContent 
            user={user} 
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

      {/* Floating hamburger trigger - ONLY visible when ALL sidebars are CLOSED */}
      {!desktopSidebarOpen && !open && (
        <button
          onClick={() => {
            if (window.innerWidth < 1024) {
              setOpen(true);
            } else {
              setDesktopSidebarOpen(true);
            }
          }}
          aria-label="Mostrar menú"
          className="fixed top-4 left-4 z-40 w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-high/80 backdrop-blur-md border border-outline-variant/20 text-foreground shadow-sm transition-all active:scale-90 hover:bg-surface-container-highest"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      <aside
        className={`hidden lg:flex fixed left-0 top-0 bottom-0 w-72 bg-surface border-r border-outline-variant z-[55] flex-col shadow-xl transition-transform duration-300 ${
          desktopSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent 
          user={user} 
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
        <div className="max-w-7xl mx-auto px-0 lg:px-4">
          {children}
        </div>
      </main>

      <BottomNav onOpenMenu={() => setOpen(true)} />
      
      {/* Desktop-only floating window promo
          - Desktop browser: actually downloads the .exe
          - Mobile browser: informational chip explaining the floating widget is desktop-only */}
      {!window.electronAPI && (
        <div className="fixed top-4 right-4 z-[60] flex items-center gap-2">
          <Button
            onClick={() => { window.location.href = 'https://github.com/PabloGoitiaEmprendedor/adonai-tareas/releases/download/v1.0.13/Adonai.Tasks.Setup.1.0.13.exe'; }}
            variant="outline"
            className="hidden md:flex items-center gap-2 bg-card border border-border text-foreground hover:text-foreground hover:border-primary h-10 rounded-xl transition-all shadow-sm group"
          >
            <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center group-hover:bg-primary/25 transition-colors">
              <Download className="w-3.5 h-3.5 text-foreground" />
            </div>
            <span className="text-xs font-bold tracking-tight">Descargar App</span>
          </Button>
          
          {/* Mobile: download chip → opens informative dialog */}
          <button
            onClick={() => setDownloadDialogOpen(true)}
            className="md:hidden flex items-center gap-1.5 bg-card border border-border text-foreground h-10 px-3 rounded-xl shadow-sm active:scale-95 transition-transform"
            aria-label="Descargar app de escritorio"
          >
            <Download className="w-4 h-4 text-on-surface-variant" />
            <span className="text-[11px] font-bold tracking-tight">Descarga app</span>
          </button>
        </div>
      )}

      <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md rounded-3xl">
          <DialogHeader>
            <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-2">
              <Monitor className="w-7 h-7 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl font-black tracking-tight">
              Descarga la app de escritorio
            </DialogTitle>
            <DialogDescription className="text-center text-sm leading-relaxed pt-2">
              Para usar la <strong className="text-foreground">pestaña flotante</strong> necesitas la app de escritorio.
              Estará siempre presente en tu computadora para ver y crear tareas al instante.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-surface-container-low rounded-2xl p-4 text-sm space-y-2">
            <p className="font-bold text-foreground">Cómo descargarla:</p>
            <ol className="space-y-1.5 text-on-surface-variant list-decimal list-inside">
              <li>Abre esta misma web en tu computadora.</li>
              <li>Arriba a la derecha verás el botón <strong className="text-foreground">Descargar App</strong>.</li>
              <li>Instálala y activa la pestaña flotante desde la app.</li>
            </ol>
          </div>
          <DialogFooter>
            <Button onClick={() => setDownloadDialogOpen(false)} className="w-full rounded-xl font-bold">
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NavigationWrapper;
