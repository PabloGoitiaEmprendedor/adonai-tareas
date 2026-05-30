import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, AlertTriangle, X, ExternalLink } from 'lucide-react';

interface UpdateDialogProps {
  forcedVersion?: string;
  onDismiss?: () => void;
}

const REPO = 'PabloGoitiaEmprendedor/adonai-tareas';

const UpdateDialog = ({ forcedVersion, onDismiss }: UpdateDialogProps) => {
  const [updateInfo, setUpdateInfo] = useState<{ version: string; releaseNotes: string } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.electronAPI || forcedVersion) return;

    window.electronAPI.onUpdateAvailable?.((info: any) => {
      setError(null);
      setUpdateInfo({
        version: info.version,
        releaseNotes: info.releaseNotes || '',
      });
    });

    window.electronAPI.onUpdateDownloadProgress?.((progress: number) => {
      setDownloading(true);
      setDownloadProgress(Math.round(progress));
    });

    window.electronAPI.onUpdateDownloaded?.(() => {
      setDownloading(false);
      setReady(true);
    });

    window.electronAPI.onUpdateError?.((msg: string) => {
      setError(msg);
    });

    return () => {
      // Listeners are managed by Electron's IPC, we don't assign to them directly
    };
  }, [forcedVersion]);

  const handleRestart = () => {
    window.electronAPI?.restartApp?.();
  };

  const handleCheckNow = () => {
    setError(null);
    window.electronAPI?.checkForUpdates?.();
  };

  const handleDownload = () => {
    const url = `https://github.com/${REPO}/releases/download/v${forcedVersion || updateInfo?.version}/Adonai-Setup.exe`;
    window.electronAPI?.openUrl?.(url);
    if (onDismiss) onDismiss();
  };

  const handleDismiss = () => {
    setUpdateInfo(null);
    setReady(false);
    setError(null);
    if (onDismiss) onDismiss();
  };

  const isMiniRoute = typeof window !== 'undefined' && !forcedVersion && (
    window.location.hash.startsWith('#/mini') ||
    window.location.pathname.replace(/\/$/, '') === '/mini'
  );

  const isForced = !!forcedVersion;

  if (isMiniRoute) {
    return (
      <AnimatePresence>
        {(updateInfo || downloading || ready) && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            className="fixed right-2 top-2 z-[100000] flex items-center gap-1.5 rounded-full border border-black/10 bg-white/95 py-1 pl-2.5 pr-1 text-[10px] font-black text-slate-900 shadow-lg"
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            <span>{ready ? 'Lista' : 'Actualizando'}</span>
            <button
              type="button"
              onClick={handleDismiss}
              className="flex h-5 w-5 items-center justify-center rounded-full text-slate-500 transition hover:bg-black/5 hover:text-slate-900"
              aria-label="Quitar aviso"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  if (isForced) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200]"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          className="fixed inset-0 z-[210] flex items-center justify-center p-4 pointer-events-none"
        >
          <div
            className="relative w-full max-w-[420px] pointer-events-auto"
            style={{
              background: 'hsl(var(--surface))',
              borderRadius: 24,
              border: '1px solid hsl(var(--outline-variant))',
              boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            }}
          >
            <div className="p-6 pt-8 flex flex-col items-center gap-6">
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
                  v{forcedVersion}
                </p>
                <p className="text-xs mt-3" style={{ color: 'hsl(var(--on-surface-variant) / 0.7)' }}>
                  Descarga el instalador y ejecútalo para actualizar. Tus datos se conservarán.
                </p>
              </div>

              <button
                onClick={handleDownload}
                className="w-full h-14 rounded-[20px] font-black text-base flex items-center justify-center gap-2 shadow-xl transition-all hover:opacity-90 active:scale-[0.98]"
                style={{
                  background: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                  boxShadow: '0 8px 32px hsl(var(--primary) / 0.25)',
                }}
              >
                <ExternalLink className="w-5 h-5" />
                Descargar v{forcedVersion}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {(updateInfo || ready || downloading || error) && (
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
                {error && !updateInfo && !ready ? (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ background: 'hsl(var(--destructive) / 0.15)' }}
                    >
                      <AlertTriangle className="w-8 h-8" style={{ color: 'hsl(var(--destructive))' }} />
                    </motion.div>

                    <div className="text-center space-y-2">
                      <h2 className="text-xl font-bold tracking-tight" style={{ color: 'hsl(var(--on-surface))' }}>
                        Error de actualización
                      </h2>
                      <p className="text-sm font-medium" style={{ color: 'hsl(var(--on-surface-variant))' }}>
                        {error}
                      </p>
                    </div>

                    <button
                      onClick={handleCheckNow}
                      className="w-full h-14 rounded-[20px] font-black text-base flex items-center justify-center gap-2 shadow-xl transition-all hover:opacity-90 active:scale-[0.98]"
                      style={{
                        background: 'hsl(var(--primary))',
                        color: 'hsl(var(--primary-foreground))',
                      }}
                    >
                      <RefreshCw className="w-5 h-5" />
                      Reintentar
                    </button>
                  </>
                ) : ready ? (
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
