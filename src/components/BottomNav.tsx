import { Link, useLocation } from 'react-router-dom';
import { Calendar, FolderOpen, Target } from 'lucide-react';

const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { icon: Calendar, label: 'Hoy', path: '/dashboard' },
    { icon: FolderOpen, label: 'Carpetas', path: '/folders' },
    { icon: Target, label: 'Metas', path: '/goals' },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 h-20 glass-sheet border-t border-outline-variant/30 px-6 pb-6 pt-2 z-50 lg:hidden rounded-t-[32px] shadow-[0_-8px_30px_rgb(0,0,0,0.12)]">
      <div className="flex items-center justify-around h-full max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 min-w-[64px] transition-all duration-300 ${
                isActive ? 'text-primary' : 'text-on-surface-variant/60 hover:text-on-surface-variant'
              }`}
            >
              <div
                className={`p-2 rounded-2xl transition-all duration-300 ${
                  isActive ? 'bg-primary/10 scale-110' : ''
                }`}
              >
                <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-bold tracking-tight ${isActive ? 'opacity-100' : 'opacity-60'}`}>
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
