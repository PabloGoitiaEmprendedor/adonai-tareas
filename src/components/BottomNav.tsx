import { Link, useLocation } from 'react-router-dom';
import { Calendar, FolderOpen, Sun } from 'lucide-react';
import { motion } from 'framer-motion';

const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { icon: Sun, label: 'Hoy', path: '/', id: 'nav-today' },
    { icon: Calendar, label: 'Calendario', path: '/week', id: 'nav-week' },
    { icon: FolderOpen, label: 'Carpetas', path: '/folders', id: 'nav-folders' },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 h-20 bg-background/90 backdrop-blur-2xl border-t border-outline-variant/10 px-6 pb-6 pt-2 z-50 lg:hidden shadow-[0_-8px_40px_rgba(0,0,0,0.12)]">
      <div className="flex items-center justify-around h-full max-w-md mx-auto relative">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              id={item.id}
              className={`flex flex-col items-center gap-1 min-w-[64px] transition-all duration-500 ease-out active:scale-90 ${
                isActive ? 'text-primary' : 'text-on-surface-variant/40 hover:text-on-surface-variant'
              }`}
            >
              <div
                className={`relative p-2 rounded-2xl transition-all duration-500 ease-out ${
                  isActive ? 'bg-primary/10 shadow-[0_0_20px_hsla(var(--primary),0.1)]' : 'hover:bg-surface-container-high/50'
                }`}
              >
                <item.icon className={`w-5 h-5 transition-transform duration-500 ${isActive ? 'scale-110' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <motion.div 
                    layoutId="nav-active-pill"
                    className="absolute inset-0 bg-primary/10 rounded-2xl -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </div>
              <span className={`text-[10px] uppercase font-black tracking-widest transition-all duration-300 ${isActive ? 'opacity-100 scale-105' : 'opacity-40'}`}>
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
