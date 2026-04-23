import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FolderOpen, Users, User, Calendar, LogOut, Settings, Bell, HelpCircle, Menu, Trash2, Home, Target } from 'lucide-react';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import BottomNav from './BottomNav';
import AppTutorial from './AppTutorial';

interface NavigationWrapperProps {
  children: React.ReactNode;
}

const SidebarContent = ({ user, menuItems, location, handleNavigate, signOut, startTutorial, isSheet = false }: any) => (
  <div className="flex flex-col h-full">
    <div className="p-6 border-b border-outline-variant/10">
      <div 
        onClick={() => handleNavigate('/profile')}
        className="flex items-center gap-3 mb-6 cursor-pointer hover:opacity-80 transition-opacity group"
      >
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 transition-colors">
          <User className="w-6 h-6 text-primary" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-black text-foreground truncate tracking-tight">{user?.email?.split('@')[0] || 'Mi Espacio'}</span>
          <span className="text-[10px] text-primary font-bold uppercase tracking-wider opacity-60">Configuración</span>
        </div>
      </div>

      {isSheet ? (
        <SheetHeader>
          <SheetTitle className="text-left text-xl font-black primary-gradient-text tracking-tighter opacity-40">
            Adonai
          </SheetTitle>
        </SheetHeader>
      ) : (
        <h2 className="text-left text-xl font-black primary-gradient-text tracking-tighter opacity-40">
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
                ? 'bg-primary/10 text-primary font-bold shadow-sm' 
                : 'text-on-surface-variant/80 hover:bg-surface-container-high'
            }`}
          >
            <item.icon className={`w-5 h-5 ${location.pathname === item.path ? 'text-primary' : ''}`} />
            <span className="text-sm tracking-wide">{item.label}</span>
          </Button>
        ))}
        <Button
          variant="ghost"
          onClick={() => handleNavigate('/trash')}
          className={`w-full justify-start gap-4 h-12 rounded-xl transition-all duration-300 ${
            location.pathname === '/trash' 
              ? 'bg-primary/10 text-primary font-bold shadow-sm' 
              : 'text-on-surface-variant/80 hover:bg-surface-container-high'
          }`}
        >
          <Trash2 className={`w-5 h-5 ${location.pathname === '/trash' ? 'text-primary' : ''}`} />
          <span className="text-sm tracking-wide">Historial</span>
        </Button>
      </div>

      <div className="mt-8 px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/40 mb-4">Ajustes</p>
        <div className="space-y-1">
           <Button variant="ghost" className="w-full justify-start gap-4 h-11 text-on-surface-variant/60 hover:text-foreground">
            <Bell className="w-4 h-4" /> <span className="text-xs">Notificaciones</span>
          </Button>
          <Button onClick={() => handleNavigate('/profile')} variant="ghost" className="w-full justify-start gap-4 h-11 text-on-surface-variant/60 hover:text-foreground">
            <Settings className="w-4 h-4" /> <span className="text-xs">Preferencias</span>
          </Button>
          <Button onClick={startTutorial} variant="ghost" className="w-full justify-start gap-4 h-11 text-on-surface-variant/60 hover:text-foreground">
            <HelpCircle className="w-4 h-4" /> <span className="text-xs">Guía rápida</span>
          </Button>
        </div>
      </div>
    </div>

    <div className="p-6 border-t border-outline-variant/10">
      <Button 
        onClick={() => signOut()} 
        variant="ghost" 
        className="w-full justify-start gap-4 h-12 text-error hover:text-error hover:bg-error/5 rounded-xl font-semibold transition-colors"
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

  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();



  const isHome = location.pathname === '/';

  const menuItems = [
    { label: 'Hoy', icon: Home, path: '/' },
    { label: 'Calendario', icon: Calendar, path: '/week' },
    { label: 'Carpetas', icon: FolderOpen, path: '/folders' },
    { label: 'Amigos', icon: Users, path: '/friends' },
    { label: 'Metas', icon: Target, path: '/goals' },
    { label: 'Perfil', icon: User, path: '/profile' },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const getPageTitle = (path: string) => {
    switch (path) {
      case '/': return '';
      case '/week': return 'Calendario';
      case '/goals': return 'Metas';
      case '/folders': return 'Carpetas';
      case '/friends': return 'Amigos';
      case '/profile': return 'Perfil';
      case '/trash': return 'Historial';
      default: return 'Adonai';
    }
  };

  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="min-h-screen bg-background">
      <AppTutorial run={tutorialRun} onFinish={() => setTutorialRun(false)} />
      
      <Sheet open={open} onOpenChange={setOpen}>
        <header className={`sticky top-0 inset-x-0 h-16 bg-background/80 backdrop-blur-xl border-b border-outline-variant/10 z-[55] lg:hidden flex items-center justify-between px-4 transition-shadow duration-300 ${isHome ? 'shadow-none' : 'shadow-sm'}`}>
          <div className="w-10 flex justify-start">
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="w-10 h-10 rounded-2xl text-foreground hover:bg-surface-container-high transition-all">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
          </div>
          {!isHome && pageTitle && (
            <div className="flex-1 flex justify-center">
              <span className="text-sm font-black uppercase tracking-[0.2em] primary-gradient-text">
                {pageTitle}
              </span>
            </div>
          )}
          {isHome && <div className="flex-1" />}
          <div className="w-10" />
        </header>

        <SheetContent side="left" className="w-[280px] glass-sheet border-r-outline-variant/20 p-0">
          <SidebarContent 
            user={user} 
            menuItems={menuItems} 
            location={location} 
            handleNavigate={handleNavigate} 
            signOut={signOut} 
            startTutorial={() => { setTutorialRun(true); setOpen(false); }}
            isSheet 
          />
        </SheetContent>
      </Sheet>

      {/* Desktop: floating hamburger trigger always visible */}
      <button
        onClick={() => setDesktopSidebarOpen(v => !v)}
        aria-label={desktopSidebarOpen ? 'Ocultar menú' : 'Mostrar menú'}
        className="hidden lg:flex fixed top-4 left-4 z-[60] w-10 h-10 items-center justify-center rounded-xl bg-surface-container-high/80 backdrop-blur-md border border-outline-variant/20 hover:bg-surface-container-highest text-foreground shadow-sm transition-all"
      >
        <Menu className="w-5 h-5" />
      </button>

      <aside
        className={`hidden lg:flex fixed left-0 top-0 bottom-0 w-72 bg-surface-container-low border-r border-outline-variant/10 z-[55] flex-col shadow-2xl shadow-black/5 transition-transform duration-300 ${
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

      <BottomNav />
    </div>
  );
};

export default NavigationWrapper;
