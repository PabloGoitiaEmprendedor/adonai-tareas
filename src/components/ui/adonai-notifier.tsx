/**
 * AdonaiNotifier
 * ─────────────────────────────────────────────────────────────────────────────
 * A global, bottom-right notification system styled to match the Adonai
 * design system.  Works two ways:
 *
 *   1. Via the `notify(message, type)` programmatic API (import & call).
 *   2. Via the `adonai:notify` CustomEvent dispatched on `window`.
 *      Payload: { type: 'success' | 'error' | 'info', message: string }
 *
 * Mount <AdonaiNotifier /> once inside App.tsx (or any root provider).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType = 'success' | 'error' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

// ─── Global imperative API ────────────────────────────────────────────────────

/** Call anywhere in the app: notify('Tarea guardada', 'success') */
export const notify = (message: string, type: NotificationType = 'success') => {
  window.dispatchEvent(
    new CustomEvent('adonai:notify', { detail: { type, message } })
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const DURATION = 4000; // ms before auto-dismiss

const icons: Record<NotificationType, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 shrink-0" />,
  error:   <XCircle     className="w-4 h-4 shrink-0" />,
  info:    <Info        className="w-4 h-4 shrink-0" />,
};

const palettes: Record<NotificationType, { bar: string; icon: string; glow: string }> = {
  success: {
    bar:  'bg-primary',
    icon: 'text-primary',
    glow: 'shadow-primary/20',
  },
  error: {
    bar:  'bg-red-500',
    icon: 'text-red-400',
    glow: 'shadow-red-500/20',
  },
  info: {
    bar:  'bg-sky-500',
    icon: 'text-sky-400',
    glow: 'shadow-sky-500/20',
  },
};

function NotificationItem({
  notification,
  onDismiss,
}: {
  notification: Notification;
  onDismiss: (id: string) => void;
}) {
  const { type, message, id } = notification;
  const pal   = palettes[type];
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const dismiss = useCallback(() => onDismiss(id), [id, onDismiss]);

  useEffect(() => {
    timer.current = setTimeout(dismiss, DURATION);
    return () => clearTimeout(timer.current);
  }, [dismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.92 }}
      animate={{ opacity: 1, y: 0,  scale: 1     }}
      exit   ={{ opacity: 0, y: 12, scale: 0.88, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className={cn(
        'relative flex items-start gap-3 w-[320px] max-w-[calc(100vw-2rem)]',
        'bg-surface-container-high/95 backdrop-blur-2xl',
        'border border-outline-variant/10',
        'rounded-[20px] px-4 py-3.5',
        'shadow-2xl',
        pal.glow,
        'overflow-hidden'
      )}
      onMouseEnter={() => clearTimeout(timer.current)}
      onMouseLeave={() => { timer.current = setTimeout(dismiss, DURATION); }}
    >
      {/* Accent bar */}
      <div className={cn('absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full', pal.bar)} />

      {/* Icon */}
      <span className={cn('mt-0.5 ml-1', pal.icon)}>
        {icons[type]}
      </span>

      {/* Text */}
      <p className="flex-1 text-[13px] font-black text-foreground leading-snug pr-2">
        {message}
      </p>

      {/* Close */}
      <button
        onClick={dismiss}
        className="shrink-0 mt-0.5 p-1 rounded-lg hover:bg-white/10 transition-colors text-on-surface-variant/30 hover:text-foreground"
        aria-label="Cerrar notificación"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Progress bar */}
      <motion.div
        className={cn('absolute bottom-0 left-0 h-[2px] rounded-b-full', pal.bar, 'opacity-40')}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: DURATION / 1000, ease: 'linear' }}
      />
    </motion.div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AdonaiNotifier() {
  const [items, setItems] = useState<Notification[]>([]);

  const add = useCallback((type: NotificationType, message: string) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setItems(prev => [...prev, { id, type, message }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setItems(prev => prev.filter(n => n.id !== id));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const { type, message } = (e as CustomEvent<{ type: NotificationType; message: string }>).detail;
      add(type ?? 'info', message ?? '');
    };
    window.addEventListener('adonai:notify', handler);
    return () => window.removeEventListener('adonai:notify', handler);
  }, [add]);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-2 pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {items.map(n => (
          <div key={n.id} className="pointer-events-auto">
            <NotificationItem notification={n} onDismiss={dismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default AdonaiNotifier;
