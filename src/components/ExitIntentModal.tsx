import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Smartphone, Monitor, Apple } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { startGuidedDownload } from '@/lib/downloadGuide';

const ExitIntentModal = () => {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  const dismissedRef = useRef(false);
  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  useEffect(() => {
    const canShow = () =>
      !dismissedRef.current &&
      localStorage.getItem('adonai_onboarding_done') &&
      !localStorage.getItem('adonai_exit_intent_dismissed');

    const handleMouseLeave = (e: MouseEvent) => {
      if (!canShow()) return;
      if (e.clientY > 0) return;
      setShow(true);
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!canShow()) return;
      if (!show) setShow(true);
      e.preventDefault();
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [show]);

  const handleDismiss = () => {
    setShow(false);
    dismissedRef.current = true;
    localStorage.setItem('adonai_exit_intent_dismissed', 'true');
  };

  const handleInstall = (platform?: 'win' | 'mac') => {
    setShow(false);
    dismissedRef.current = true;
    localStorage.setItem('adonai_exit_intent_dismissed', 'true');
    if (isMobile) {
      navigate('/auth');
    } else if (platform) {
      startGuidedDownload(platform);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-[360px] bg-surface-container border border-outline-variant rounded-[32px] overflow-hidden shadow-2xl relative"
          >
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2 text-on-surface-variant hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8 space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                  {isMobile ? (
                    <Smartphone className="w-8 h-8 text-primary" />
                  ) : (
                    <Download className="w-8 h-8 text-primary" />
                  )}
                </div>
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-xl font-black tracking-tight text-foreground">
                  ¿Ya te vas?
                </h2>
                <p className="text-on-surface-variant text-sm font-medium leading-relaxed">
                  {isMobile
                    ? "Agrega Adonai a tu pantalla de inicio y vuelve en 1 toque. Sin buscar la URL, sin esperar."
                    : "Instala Adonai en tu escritorio y ten la mini ventana siempre visible. Vuelve en 1 clic."}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                {isMobile ? (
                  <button
                    onClick={() => handleInstall()}
                    className="w-full h-[52px] bg-primary text-black font-black text-base rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
                  >
                    <Smartphone className="w-5 h-5 inline-block mr-2" />
                    Agregar a pantalla de inicio
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleInstall('win')}
                      className="w-full h-14 bg-foreground text-background font-black text-base rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                    >
                      <Monitor className="w-5 h-5" />
                      Descargar para Windows
                    </button>
                    <button
                      onClick={() => handleInstall('mac')}
                      className="w-full h-14 bg-foreground text-background font-black text-base rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-lg mt-2"
                    >
                      <Apple className="w-5 h-5" />
                      Descargar para Mac
                    </button>
                  </>
                )}
                <button
                  onClick={handleDismiss}
                  className="w-full h-11 text-on-surface-variant/60 font-bold text-xs hover:text-foreground transition-colors"
                >
                  Seguir en la web
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ExitIntentModal;
