import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Monitor, X } from 'lucide-react';
import { startGuidedDownload } from '@/lib/downloadGuide';
import type { DownloadPlatform } from '@/lib/downloadGuide';

const DownloadGateModal = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<{ open: boolean; platform: DownloadPlatform | null }>({ open: false, platform: null });

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setState({ open: true, platform: detail?.platform || 'win' });
    };
    window.addEventListener('adonai:show-download-gate', handler);
    return () => window.removeEventListener('adonai:show-download-gate', handler);
  }, []);

  const handleClose = () => setState({ open: false, platform: null });

  const handleSignIn = () => {
    handleClose();
    navigate('/auth');
  };

  const handleDownloadAnyway = () => {
    if (state.platform) {
      startGuidedDownload(state.platform, true);
    }
    handleClose();
  };

  return (
    <AnimatePresence>
      {state.open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#01260E]/40 backdrop-blur-xl"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="relative mx-auto w-full max-w-[380px] pointer-events-auto bg-background border border-border rounded-[32px] overflow-hidden shadow-2xl">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-black/5 transition-all active:scale-90 text-muted-foreground z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-8 space-y-6">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <Monitor className="w-8 h-8 text-primary" />
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <h2 className="text-xl font-black tracking-tight text-foreground">
                    Guarda tus datos primero
                  </h2>
                  <p className="text-on-surface-variant text-sm font-medium leading-relaxed">
                    Completaste el onboarding pero tus tareas están en modo invitado. 
                    Inicia sesión con tu correo para que tus datos se sincronicen al descargar la app.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleSignIn}
                    className="w-full h-14 bg-foreground text-background font-black text-sm rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                  >
                    <Mail className="w-5 h-5" />
                    Iniciar sesión con email
                  </button>
                  <button
                    onClick={handleDownloadAnyway}
                    className="w-full h-14 bg-primary/10 text-primary font-black text-sm rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    <Monitor className="w-5 h-5" />
                    Descargar de todas formas
                  </button>
                  <button
                    onClick={handleClose}
                    className="w-full h-11 text-on-surface-variant/60 font-bold text-xs hover:text-foreground transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DownloadGateModal;
