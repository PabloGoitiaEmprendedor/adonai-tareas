import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, X } from 'lucide-react';

const UpdateDialog = () => {
  const [updateInfo, setUpdateInfo] = useState<{ version: string; releaseNotes: string } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.onUpdateAvailable?.((_event: any, info: any) => {
      setUpdateInfo({
        version: info.version,
        releaseNotes: info.releaseNotes || '',
      });
    });

    window.electronAPI.onUpdateDownloadProgress?.((_event: any, progress: number) => {
      setDownloading(true);
      setDownloadProgress(Math.round(progress));
    });

    window.electronAPI.onUpdateDownloaded?.(() => {
      setDownloading(false);
      setReady(true);
    });

    return () => {
      window.electronAPI.onUpdateAvailable = undefined;
      window.electronAPI.onUpdateDownloadProgress = undefined;
      window.electronAPI.onUpdateDownloaded = undefined;
    };
  }, []);

  const handleRestart = () => {
    window.electronAPI?.restartApp?.();
  };

  const handleDismiss = () => {
    setUpdateInfo(null);
    setReady(false);
  };

  return (
    <AnimatePresence>
      {(updateInfo || ready) && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={handleDismiss}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-[400px] pointer-events-auto"
              style={{
                background: 'hsl(var(--surface))',
                borderRadius: 24,
                border: '1px solid hsl(var(--outline-variant))',
                boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
              }}
            >
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'hsl(var(--on-surface-variant) / 0.5)' }}
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-6 pt-8 flex flex-col items-center gap-5">
                {ready ? (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                      className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ background: 'hsl(var(--primary) / 0.15)' }}
                    >
                      <RefreshCw className="w-8 h-8" style={{ color: 'hsl(var(--primary))' }} />
                    </motion.div>

                    <div className="text-center space-y-2">
                      <h2 className="text-xl font-bold tracking-tight" style={{ color: 'hsl(var(--on-surface))' }}>
                        Actualización lista
                      </h2>
                      <p className="text-sm font-medium" style={{ color: 'hsl(var(--on-surface-variant))' }}>
                        La nueva versión ya se instaló. Reinicia la app para aplicar los cambios.
                      </p>
                    </div>

                    <button
                      onClick={handleRestart}
                      className="w-full h-14 rounded-[20px] font-black text-base flex items-center justify-center gap-2 shadow-xl transition-all hover:opacity-90 active:scale-[0.98]"
                      style={{
                        background: 'hsl(var(--primary))',
                        color: 'hsl(var(--primary-foreground))',
                        boxShadow: '0 8px 32px hsl(var(--primary) / 0.25)',
                      }}
                    >
                      <RefreshCw className="w-5 h-5" />
                      Reiniciar ahora
                    </button>
                  </>
                ) : downloading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ background: 'hsl(var(--primary) / 0.15)' }}
                    >
                      <Download className="w-8 h-8" style={{ color: 'hsl(var(--primary))' }} />
                    </motion.div>

                    <div className="text-center space-y-3 w-full">
                      <h2 className="text-xl font-bold tracking-tight" style={{ color: 'hsl(var(--on-surface))' }}>
                        Descargando actualización
                      </h2>

                      <div className="w-full space-y-1">
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'hsl(var(--surface-container-highest))' }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: 'hsl(var(--primary))' }}
                            animate={{ width: `${downloadProgress}%` }}
                          />
                        </div>
                        <p className="text-xs font-bold text-center" style={{ color: 'hsl(var(--on-surface-variant))' }}>
                          {downloadProgress}%
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                      className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ background: 'hsl(var(--primary) / 0.15)' }}
                    >
                      <Download className="w-8 h-8" style={{ color: 'hsl(var(--primary))' }} />
                    </motion.div>

                    <div className="text-center space-y-2">
                      <h2 className="text-xl font-bold tracking-tight" style={{ color: 'hsl(var(--on-surface))' }}>
                        Nueva versión disponible
                      </h2>
                      <p className="text-sm font-medium" style={{ color: 'hsl(var(--on-surface-variant))' }}>
                        v{updateInfo?.version}
                      </p>
                      {updateInfo?.releaseNotes && (
                        <div
                          className="mt-3 p-3 rounded-xl text-xs text-left whitespace-pre-line"
                          style={{
                            background: 'hsl(var(--surface-container))',
                            color: 'hsl(var(--on-surface-variant))',
                          }}
                        >
                          {updateInfo.releaseNotes}
                        </div>
                      )}
                    </div>

                    <div className="w-full space-y-2">
                      <p className="text-xs text-center font-medium" style={{ color: 'hsl(var(--on-surface-variant) / 0.6)' }}>
                        Descargando automáticamente...
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default UpdateDialog;
