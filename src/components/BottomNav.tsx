import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, CalendarDays, FolderOpen, Target, Menu } from 'lucide-react';

interface BottomNavProps {
  onMenuClick?: () => void;
}

const tabs = [
  { path: '/', label: 'Hoy', icon: Calendar },
  { path: '/goals', label: 'Metas', icon: Target },
  { path: '/week', label: 'Semana', icon: CalendarDays },
  { path: '/folders', label: 'Carpetas', icon: FolderOpen },
];

const BottomNav = ({ onMenuClick }: BottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-sheet pb-safe lg:top-0 lg:bottom-0 lg:left-0 lg:right-auto lg:w-20 lg:pb-0">
      <div className="flex justify-around items-center h-16 max-w-[430px] mx-auto lg:max-w-none lg:flex-col lg:h-full lg:justify-center lg:gap-6 lg:w-20">
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
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center gap-0.5 transition-all duration-200 text-on-surface-variant/60 hover:text-foreground"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium uppercase tracking-widest">Menú</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;

