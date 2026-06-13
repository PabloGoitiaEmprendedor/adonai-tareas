import { Link, useLocation } from 'react-router-dom';
import { Sun, Calendar, MessageSquare, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { writeCalendarDate, writeCalendarViewMode } from '@/lib/calendarStateSync';

const navItems = [
  { icon: Sun, label: 'Hoy', path: '/daily', id: 'nav-island-today' },
  { icon: Calendar, label: 'Calendario', path: '/week', id: 'nav-island-calendar' },
  { icon: MessageSquare, label: 'Chat IA', path: '/chat', id: 'nav-island-chat' },
  { icon: Users, label: 'Amigos', path: '/friends', id: 'nav-island-friends' },
];

export function MobileBottomIsland() {
  const location = useLocation();

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] lg:hidden pointer-events-none">
      <nav className="grid h-[72px] grid-cols-4 border-t border-black/8 bg-[#fffdf7] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-10px_28px_rgba(0,0,0,0.12)] dark:border-white/10 dark:bg-[#101826] pointer-events-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              id={item.id}
              onClick={() => {
                if (item.path === '/week') {
                  writeCalendarDate(new Date());
                  writeCalendarViewMode('day');
                }
              }}
              className="relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[#1b2430] transition-all duration-150 dark:text-white"
            >
              <div className="relative flex h-7 w-10 items-center justify-center rounded-full">
                {isActive && (
                  <motion.span
                    layoutId="mobile-bottom-active-pill"
                    className="absolute inset-x-1 inset-y-0 rounded-full bg-primary shadow-sm shadow-primary/20"
                    transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.8 }}
                  />
                )}
                <Icon className={`relative w-5 h-5 transition-all duration-150 ${
                  isActive ? 'scale-110 text-primary-foreground' : 'opacity-65 dark:opacity-80'
                }`} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`max-w-full truncate text-[10px] font-semibold tracking-tight leading-none transition-all duration-150 ${
                isActive ? 'text-primary opacity-100 dark:text-white' : 'opacity-60 dark:opacity-70'
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
