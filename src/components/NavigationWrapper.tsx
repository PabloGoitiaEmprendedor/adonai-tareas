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
      {isSheet ? (
        <SheetHeader>
          <SheetTitle className="text-left text-2xl font-black primary-gradient-text tracking-tighter">
            Adonai
          </SheetTitle>
        </SheetHeader>
      ) : (
        <h2 className="text-left text-2xl font-black primary-gradient-text tracking-tighter">
          Adonai
        </h2>
      )}
      {user?.email && (
        <p className="text-[10px] text-on-surface-variant/60 truncate italic mt-1">{user.email}</p>
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
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if tutorial has been completed before
    const tutorialCompleted = localStorage.getItem('adonai_tutorial_completed');
    
    // Check if we just finished onboarding (this is a priority trigger)
    const pendingOnboarding = localStorage.getItem('tutorial_pending');

    if (!tutorialCompleted || pendingOnboarding === 'true') {
      // Small delay to let the page settle before starting the tour
      const timer = setTimeout(() => {
        setTutorialRun(true);
        if (pendingOnboarding) localStorage.removeItem('tutorial_pending');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const isHome = location.pathname === '/';

  const menuItems = [
    { label: 'Hoy', icon: Home, path: '/' },
    { label: 'Calendario', icon: Calendar, path: '/week' },
    { label: 'Carpetas', icon: FolderOpen, path: '/folders' },
    { label: 'Metas', icon: Target, path: '/goals' },
    { label: 'Amigos', icon: Users, path: '/friends' },
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
      case '/friends': return 'Comunidad';
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
        <header className={`sticky top-0 inset-x-0 h-14 glass-sheet border-b border-outline-variant/10 z-[55] lg:hidden flex items-center justify-between px-4 ${isHome ? 'border-b-0 bg-transparent backdrop-blur-none' : ''}`}>
          <div className="w-10 flex justify-start">
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl text-on-surface-variant hover:text-primary transition-all duration-300">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
          </div>
          {!isHome && pageTitle && (
            <div className="flex-1 flex justify-center">
              <span className="text-xs font-black uppercase tracking-[0.3em] primary-gradient-text">
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

      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 glass-sheet border-r border-outline-variant/10 z-[50] flex-col">
        <SidebarContent 
          user={user} 
          menuItems={menuItems} 
          location={location} 
          handleNavigate={handleNavigate} 
          signOut={signOut} 
          startTutorial={() => setTutorialRun(true)}
        />
      </aside>

      <main className="pb-20 lg:pb-0 lg:pl-64 min-h-screen transition-all duration-300">
        {children}
      </main>

      <BottomNav />
    </div>
  );
};

export default NavigationWrapper;
