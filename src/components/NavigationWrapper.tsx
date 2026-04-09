import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FolderOpen, Users, User, Calendar, LogOut, Settings, Bell, HelpCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import BottomNav from './BottomNav';

interface NavigationWrapperProps {
  children: React.ReactNode;
}

const NavigationWrapper = ({ children }: NavigationWrapperProps) => {
  const [open, setOpen] = useState(false);
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { label: 'Mañana', icon: Calendar, path: '/tomorrow' },
    { label: 'Carpetas', icon: FolderOpen, path: '/folders' },
    { label: 'Amigos', icon: Users, path: '/friends' },
    { label: 'Perfil', icon: User, path: '/profile' },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar / Sheet for Menu */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[280px] glass-sheet border-r-outline-variant/20 p-0">
          <div className="flex flex-col h-full">
            <SheetHeader className="p-6 border-b border-outline-variant/10">
              <SheetTitle className="text-left text-2xl font-bold primary-gradient-text tracking-tight">
                Adonai
              </SheetTitle>
              {user?.email && (
                <p className="text-[10px] text-on-surface-variant/60 truncate italic mt-1">{user.email}</p>
              )}
            </SheetHeader>

            <div className="flex-1 overflow-y-auto py-4">
              <div className="px-3 space-y-1">
                {menuItems.map((item) => (
                  <Button
                    key={item.path}
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
              </div>

              <div className="mt-8 px-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/40 mb-4">Ajustes</p>
                <div className="space-y-1">
                   <Button variant="ghost" className="w-full justify-start gap-4 h-11 text-on-surface-variant/60 hover:text-foreground">
                    <Bell className="w-4 h-4" /> <span className="text-xs">Notificaciones</span>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start gap-4 h-11 text-on-surface-variant/60 hover:text-foreground">
                    <Settings className="w-4 h-4" /> <span className="text-xs">Preferencias</span>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start gap-4 h-11 text-on-surface-variant/60 hover:text-foreground">
                    <HelpCircle className="w-4 h-4" /> <span className="text-xs">Ayuda</span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-outline-variant/10">
              <Button 
                onClick={() => signOut()} 
                variant="ghost" 
                className="w-full justify-start gap-4 h-12 text-error hover:text-error hover:bg-error/5 rounded-xl font-semibold"
              >
                <LogOut className="w-5 h-5" />
                <span>Cerrar sesión</span>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <main className="pb-20 lg:pb-0 lg:pl-20">
        {children}
      </main>

      <BottomNav onMenuClick={() => setOpen(true)} />
    </div>
  );
};

export default NavigationWrapper;
