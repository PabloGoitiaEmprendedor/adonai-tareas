import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { subscribeElectronEvent } from '@/lib/electronEvents';

type UpdateReadyPayload = { version?: string };

const UpdateDialog = () => {
  const [readyUpdate, setReadyUpdate] = useState<UpdateReadyPayload | null>(null);

  useEffect(() => {
    if (!window.electronAPI) return;

    let mounted = true;
    window.electronAPI.getReadyUpdate?.().then((data) => {
      if (mounted && data) setReadyUpdate(data);
    });

    const unsubscribeReady = subscribeElectronEvent(window.electronAPI.onUpdateReady, (data: UpdateReadyPayload) => {
      setReadyUpdate(data);
    });

    return () => {
      mounted = false;
      unsubscribeReady();
    };
  }, []);

  const isMiniRoute =
    window.location.hash.startsWith('#/mini')
    || window.location.pathname.replace(/\/$/, '') === '/mini';

  if (isMiniRoute) return null;

  return (
    <AnimatePresence>
      {readyUpdate && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="pointer-events-none fixed inset-0 z-[210] flex items-center justify-center p-4"
          >
            <div className="pointer-events-auto w-full max-w-[420px] rounded-[24px] border border-outline-variant bg-surface p-6 pt-8 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
              <div className="flex flex-col items-center gap-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                  className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15"
                >
                  <RefreshCw className="h-8 w-8 text-primary" />
                </motion.div>

                <div className="space-y-2 text-center">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    Actualizacion lista
                  </h2>
                  <p className="text-sm font-medium text-on-surface-variant">
                    {readyUpdate.version ? `La version ${readyUpdate.version} ya se descargo.` : 'La nueva version ya se descargo.'}
                    {' '}Reinicia para aplicar los cambios.
                  </p>
                </div>

                <div className="grid w-full gap-2">
                  <button
                    type="button"
                    onClick={() => window.electronAPI?.installUpdate?.()}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-primary text-base font-black text-primary-foreground shadow-xl shadow-primary/25 transition-all hover:opacity-90 active:scale-[0.98]"
                  >
                    <RefreshCw className="h-5 w-5" />
                    Reiniciar ahora
                  </button>
                  <button
                    type="button"
                    onClick={() => setReadyUpdate(null)}
                    className="h-11 w-full rounded-[18px] text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container"
                  >
                    Seguir usando Adonai
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

export default UpdateDialog;
