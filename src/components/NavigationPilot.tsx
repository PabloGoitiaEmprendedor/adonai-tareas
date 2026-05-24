import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

interface NavigationPilotProps {
  menuItems: NavItem[];
  settingsItems?: NavItem[];
  showAdmin?: boolean;
  electronOffset?: boolean;
  user?: any;
}

export function NavigationPilot({ menuItems, settingsItems, showAdmin, electronOffset, user }: NavigationPilotProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const timeoutRef = useRef<number>();

  const show = () => {
    clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const hide = () => {
    timeoutRef.current = window.setTimeout(() => setOpen(false), 200);
  };

  return (
    <div
      className={cn(
        "fixed left-0 z-[80] hidden lg:block",
        electronOffset ? 'top-8' : 'top-0',
        'bottom-0'
      )}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {/* Thin invisible trigger strip on the very left edge */}
      <div className="absolute inset-y-0 left-0 w-1.5 z-20" />

      {/* Nub — always slightly visible on the left edge */}
      <div
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 w-[16px] h-20 rounded-r-xl transition-all duration-200 flex items-center justify-center",
          open
            ? "bg-surface shadow-2xl border border-outline-variant/20 opacity-100"
            : "bg-surface/50 backdrop-blur-sm border border-outline-variant/5 opacity-40 hover:opacity-80",
          "shadow-[0_0_10px_rgba(91,124,250,0.25)]"
        )}
      >
        <div className="flex flex-col items-center gap-1">
          <div className="w-[4px] h-[4px] rounded-full bg-on-surface-variant/40" />
          <div className="w-[4px] h-[4px] rounded-full bg-on-surface-variant/40" />
          <div className="w-[4px] h-[4px] rounded-full bg-on-surface-variant/40" />
        </div>
      </div>

      {/* Expanded panel — appears on hover */}
      <div
        className={cn(
          "relative z-10 transition-all duration-200 ease-out h-full flex items-center pointer-events-none",
          open ? "opacity-100" : "opacity-0"
        )}
      >
        <div
          className={cn(
            "bg-surface/95 backdrop-blur-xl shadow-2xl border border-outline-variant/20 rounded-r-2xl py-3 px-2 min-w-[190px] ml-0 transition-transform duration-200 ease-out",
            open ? "translate-x-0 pointer-events-auto" : "-translate-x-4"
          )}
        >
          <div className="space-y-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-left cursor-click",
                    isActive
                      ? "bg-primary/20 text-foreground font-bold"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-foreground"
                  )}
                >
                  <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-foreground" : "")} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>

          {settingsItems && settingsItems.length > 0 && (
            <div className="mt-2 pt-2 border-t border-outline-variant/10 space-y-0.5">
              <p className="px-4 pb-1 text-[9px] font-black uppercase tracking-[0.15em] text-on-surface-variant/30">Ajustes</p>
              {settingsItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all text-left cursor-click",
                      isActive
                        ? "bg-primary/20 text-foreground font-bold"
                        : "text-on-surface-variant hover:bg-surface-container hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-foreground" : "")} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {showAdmin && (
            <div className="mt-2 pt-2 border-t border-outline-variant/10">
              <button
                onClick={() => { navigate('/admin'); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all text-left cursor-click",
                  location.pathname === '/admin'
                    ? "bg-primary/20 text-foreground font-bold"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-foreground"
                )}
              >
                <span className="text-xs font-medium">Admin Panel</span>
              </button>
            </div>
          )}
          {user?.is_anonymous && (
            <div className="mt-2 pt-2 border-t border-outline-variant/10">
              <button
                onClick={() => { navigate('/auth'); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-primary font-bold hover:bg-primary/10 transition-all cursor-click"
              >
                <User className="w-5 h-5" />
                Iniciar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
