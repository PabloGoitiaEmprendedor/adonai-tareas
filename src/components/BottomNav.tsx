import { Link, useLocation } from 'react-router-dom';
import { Calendar, FolderOpen, Sun } from 'lucide-react';

const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { icon: Sun, label: 'Hoy', path: '/' },
    { icon: Calendar, label: 'Calendario', path: '/week' },
    { icon: FolderOpen, label: 'Carpetas', path: '/folders' },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 h-16 glass-sheet border-t border-outline-variant/30 px-6 pb-4 pt-1.5 z-50 lg:hidden rounded-t-2xl shadow-[0_-4px_20px_rgb(0,0,0,0.08)]">
      <div className="flex items-center justify-around h-full max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 min-w-[56px] transition-all duration-300 ${
                isActive ? 'text-primary' : 'text-on-surface-variant/60 hover:text-on-surface-variant'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all duration-300 ${
                  isActive ? 'bg-primary/10 scale-110' : ''
                }`}
              >
                <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[9px] font-bold tracking-tight ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
