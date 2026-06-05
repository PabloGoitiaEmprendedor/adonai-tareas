import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, MoreHorizontal, User } from 'lucide-react';

import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  activePaths?: string[];
  badge?: number;
}

interface NavigationPilotProps {
  menuItems: NavItem[];
  settingsItems?: NavItem[];
  displayName?: string;
  showAdmin?: boolean;
  electronOffset?: boolean;
  user?: any;
  onNavigate?: (path: string) => void;
}

export function NavigationPilot({
  menuItems,
  settingsItems,
  displayName,
  showAdmin,
  electronOffset,
  user,
  onNavigate,
}: NavigationPilotProps) {
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const timeoutRef = useRef<number>();

  const totalBadge =
    menuItems.reduce((total, item) => total + (item.badge || 0), 0) +
    (settingsItems || []).reduce((total, item) => total + (item.badge || 0), 0);

  const show = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const hide = () => {
    timeoutRef.current = window.setTimeout(() => {
      setOpen(false);
      setMoreOpen(false);
    }, 180);
  };

  const goTo = (path: string) => {
    if (onNavigate) onNavigate(path);
    else navigate(path);
    setOpen(false);
    setMoreOpen(false);
  };

  return (
    <div
      className={cn(
        'pointer-events-none fixed left-0 top-0 z-[80] hidden h-screen lg:block',
        electronOffset && 'mt-4'
      )}
    >
      <div
        className="pointer-events-auto absolute left-0 top-0 z-20 h-full w-3"
        onMouseEnter={show}
        onMouseLeave={hide}
      />

      <div
        onMouseEnter={show}
        onMouseLeave={hide}
        className={cn(
          'pointer-events-auto absolute left-0 top-0 h-full overflow-hidden border-r transition-[width] duration-200 ease-out',
          open ? 'w-[256px]' : 'w-[58px]',
          'bg-[#fffdf6] text-[#1d2430] shadow-[0_16px_34px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-[#111827] dark:text-white'
        )}
      >
        <div className="flex h-full flex-col">
          <div className={cn(
            "flex items-center border-b border-black/5 py-4 dark:border-white/10",
            open ? "gap-3 px-4" : "justify-center px-0"
          )}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary shadow-sm">
              <User className="h-5 w-5" />
            </div>
            <div className={cn('min-w-0 transition-all duration-200', open ? 'opacity-100' : 'pointer-events-none w-0 overflow-hidden opacity-0')}>
              <p className="truncate text-sm font-black text-foreground dark:text-white">{displayName || 'Usuario'}</p>
            </div>
            {totalBadge > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black leading-none text-white shadow-lg shadow-red-500/35">
                {totalBadge > 99 ? '99+' : totalBadge}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-3">
            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || item.activePaths?.includes(location.pathname);

                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => goTo(item.path)}
                    className={cn(
                      'flex items-center rounded-2xl text-left transition-all',
                      open ? 'h-11 w-full justify-start gap-3 px-3' : 'mx-auto h-10 w-10 justify-center gap-0 px-0',
                      isActive
                        ? 'bg-primary/15 text-foreground font-bold dark:bg-primary/20 dark:text-white'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-foreground dark:text-white/72 dark:hover:bg-white/8 dark:hover:text-white'
                    )}
                  >
                    <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                      <Icon className="h-5 w-5" />
                      {(item.badge || 0) > 0 && (
                        <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black leading-none text-white">
                          {item.badge! > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </span>
                    <span className={cn('truncate text-sm font-medium transition-all', open ? 'opacity-100' : 'pointer-events-none w-0 overflow-hidden opacity-0')}>
                      {item.label}
                    </span>
                    {open && (item.badge || 0) > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black leading-none text-white">
                        {item.badge! > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {settingsItems && settingsItems.length > 0 && (
              <div className="mt-2 px-0 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    show();
                    setMoreOpen((prev) => !prev);
                  }}
                  className={cn(
                    'flex items-center rounded-2xl text-left transition-all',
                    open ? 'h-11 w-full justify-start gap-3 px-3' : 'mx-auto h-10 w-10 justify-center gap-0 px-0',
                    'text-on-surface-variant hover:bg-surface-container hover:text-foreground dark:text-white/72 dark:hover:bg-white/8 dark:hover:text-white'
                  )}
                >
                  <MoreHorizontal className="h-5 w-5 shrink-0" />
                  <span className={cn('truncate text-sm font-medium transition-all', open ? 'opacity-100' : 'pointer-events-none w-0 overflow-hidden opacity-0')}>
                    Mas
                  </span>
                  {open && <ChevronDown className={cn('ml-auto h-4 w-4 transition-transform', moreOpen && 'rotate-180')} />}
                </button>

                <div
                  className={cn(
                    'overflow-hidden transition-all duration-200',
                    open && moreOpen ? 'mt-2 max-h-[340px] opacity-100' : 'max-h-0 opacity-0'
                  )}
                >
                  <div className="space-y-1">
                    {settingsItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;

                      return (
                        <button
                          key={item.path}
                          type="button"
                          onClick={() => goTo(item.path)}
                          className={cn(
                            'flex h-10 w-full items-center gap-3 rounded-2xl px-3 text-left transition-all',
                            'justify-start',
                            isActive
                              ? 'bg-primary/15 text-foreground font-bold dark:bg-primary/20 dark:text-white'
                              : 'text-on-surface-variant hover:bg-surface-container hover:text-foreground dark:text-white/72 dark:hover:bg-white/8 dark:hover:text-white'
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate text-xs font-medium">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {showAdmin && (
            <div className="border-t border-black/5 px-2 py-3 dark:border-white/10">
              <button
                onClick={() => goTo('/admin')}
                className={cn(
                  'flex items-center rounded-2xl text-left transition-all',
                  open ? 'h-11 w-full justify-start gap-3 px-3' : 'mx-auto h-10 w-10 justify-center gap-0 px-0',
                  location.pathname === '/admin'
                    ? 'bg-primary/15 text-foreground font-bold dark:bg-primary/20 dark:text-white'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-foreground dark:text-white/72 dark:hover:bg-white/8 dark:hover:text-white'
                )}
              >
                <span className={cn('truncate text-xs font-medium transition-all', open ? 'opacity-100' : 'pointer-events-none w-0 overflow-hidden opacity-0')}>
                  Admin Panel
                </span>
              </button>
            </div>
          )}

          {user?.is_anonymous && (
            <div className="border-t border-black/5 px-2 py-3 dark:border-white/10">
              <button
                onClick={() => goTo('/auth')}
                className={cn(
                  'flex items-center rounded-2xl text-left text-sm font-bold text-primary transition-all hover:bg-primary/10 dark:hover:bg-white/8',
                  open ? 'h-11 w-full justify-start gap-3 px-3' : 'mx-auto h-10 w-10 justify-center gap-0 px-0'
                )}
              >
                <User className="h-5 w-5 shrink-0" />
                <span className={cn('truncate transition-all', open ? 'opacity-100' : 'pointer-events-none w-0 overflow-hidden opacity-0')}>
                  Iniciar sesion
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
