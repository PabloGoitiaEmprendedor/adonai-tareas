import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, CalendarDays, Trophy, User, CalendarCheck } from 'lucide-react';

const tabs = [
  { path: '/', label: 'Hoy', icon: Calendar },
  { path: '/week', label: 'Semana', icon: CalendarDays },
  { path: '/calendar', label: 'Agenda', icon: CalendarCheck },
  { path: '/goals', label: 'Metas', icon: Trophy },
  { path: '/profile', label: 'Perfil', icon: User },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-sheet pb-safe">
      <div className="flex justify-around items-center h-16 max-w-[430px] mx-auto">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 transition-all duration-200 ${
                active ? 'text-primary scale-105' : 'text-on-surface-variant/60 hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium uppercase tracking-widest">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
