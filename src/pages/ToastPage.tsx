import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { playReminderSound } from '@/lib/soundEffects';

type ToastPayload = {
  title: string;
  body: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  durationMs?: number;
};

const readInitialPayload = () => {
  const hashQuery = window.location.hash.includes('?')
    ? window.location.hash.slice(window.location.hash.indexOf('?') + 1)
    : '';
  const params = new URLSearchParams(hashQuery || window.location.search);
  const payload = params.get('payload');

  if (!payload) return null;

  try {
    return JSON.parse(payload) as ToastPayload;
  } catch {
    return null;
  }
};

const getEventName = (title: string) => {
  const cleanTitle = title
    .replace(/^Tarea:\s*/i, '')
    .replace(/^Recordatorio:\s*/i, '')
    .trim();

  return cleanTitle || 'tu evento';
};

const getReminderMessage = (toast: ToastPayload) => {
  const eventName = getEventName(toast.title);
  return `Pablo, es hora de ${eventName}`;
};

const ToastPage = () => {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const lastToastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const showToast = (data: ToastPayload) => {
      const toastKey = `${data.title}-${data.body}-${data.type || 'info'}`;
      if (lastToastKeyRef.current === toastKey) return;

      lastToastKeyRef.current = toastKey;
      setToast(data);
      playReminderSound();
    };

    const applyUrlPayload = () => {
      const payload = readInitialPayload();
      if (payload?.title) {
        showToast(payload);
        return true;
      }
      return false;
    };

    const unsubscribe = window.electronAPI?.onCustomToast?.(showToast);
    const hasInitialPayload = applyUrlPayload();
    window.addEventListener('hashchange', applyUrlPayload);
    window.addEventListener('popstate', applyUrlPayload);

    window.electronAPI?.toastReady?.();

    const params = new URLSearchParams(window.location.search);
    if (!hasInitialPayload && params.get('test')) {
      showToast({
        title: 'Design Meeting',
        body: 'Ahora. Empieza a las 9:45.',
        type: 'info',
        durationMs: 6500,
      });
    }

    return () => {
      unsubscribe?.();
      window.removeEventListener('hashchange', applyUrlPayload);
      window.removeEventListener('popstate', applyUrlPayload);
    };
  }, []);

  const closeToast = () => {
    setToast(null);
    window.electronAPI?.closeToast?.();
  };

  if (!toast) return null;

  return (
    <div className="flex h-screen w-screen items-center justify-center overflow-hidden bg-transparent p-[8px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${toast.title}-${toast.body}`}
          initial={{ opacity: 0, y: -18, scale: 0.985, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -10, scale: 0.985, filter: 'blur(4px)' }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="group relative flex h-full w-full items-center rounded-[26px] border border-white/70 bg-white/[0.82] px-5 pr-11 shadow-[0_18px_48px_rgba(0,0,0,0.26)] ring-1 ring-black/5 backdrop-blur-2xl"
        >
          <div className="pointer-events-none absolute inset-0 rounded-[26px] bg-gradient-to-b from-white/55 to-white/15" />
          <p className="relative z-10 line-clamp-2 text-[15px] font-semibold leading-snug tracking-[-0.02em] text-[#111827]">
            {getReminderMessage(toast)}
          </p>

          <button
            type="button"
            onClick={closeToast}
            aria-label="Cerrar recordatorio"
            className="absolute right-3 top-3 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/[0.055] text-black/42 opacity-70 transition hover:bg-black/[0.09] hover:text-black/70 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.4} />
          </button>
        </motion.div>
      </AnimatePresence>

      <style>{`
        html,
        body,
        #root {
          background: transparent !important;
          margin: 0;
          overflow: hidden;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
        }

        * {
          user-select: none;
          -webkit-app-region: no-drag;
        }
      `}</style>
    </div>
  );
};

export default ToastPage;
