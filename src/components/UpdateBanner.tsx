/**
 * UpdateBanner – Beautiful in-app update notification bar.
 * Shows download progress and a one-click "Restart" button.
 * Replaces the old native dialog for a premium UX.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, Check, X } from 'lucide-react';

type UpdateStatus =
  | { status: 'checking' }
  | { status: 'available'; version: string }
  | { status: 'downloading'; percent: number; transferred: number; total: number }
  | { status: 'ready'; version: string }
  | { status: 'up-to-date' }
  | { status: 'error'; message?: string };

const UpdateBanner = () => {
  const [update, setUpdate] = useState<UpdateStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.onUpdateStatus) return;

    api.onUpdateStatus((data: UpdateStatus) => {
      setUpdate(data);
      setDismissed(false); // show again on new status
    });
  }, []);

  if (!update || dismissed) return null;

  // Don't show anything for 'checking' or 'up-to-date'
  if (update.status === 'checking' || update.status === 'up-to-date') return null;

  const handleRestart = () => {
    const api = (window as any).electronAPI;
    api?.installUpdateNow?.();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        style={{
          position: 'fixed',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          width: 'auto',
          maxWidth: 420,
          minWidth: 280,
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            border: '1px solid rgba(163,230,53,0.25)',
            borderRadius: 16,
            padding: '12px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(163,230,53,0.1)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {/* Top row: icon + message + dismiss */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {update.status === 'downloading' ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
              >
                <Download style={{ width: 18, height: 18, color: '#A3E635' }} />
              </motion.div>
            ) : update.status === 'ready' ? (
              <Check style={{ width: 18, height: 18, color: '#A3E635' }} />
            ) : update.status === 'available' ? (
              <Download style={{ width: 18, height: 18, color: '#A3E635' }} />
            ) : (
              <X style={{ width: 18, height: 18, color: '#ef4444' }} />
            )}

            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#F4F4F5',
                margin: 0,
                lineHeight: 1.3,
              }}>
                {update.status === 'available' && `Nueva versión ${update.version} disponible`}
                {update.status === 'downloading' && 'Descargando actualización...'}
                {update.status === 'ready' && '¡Actualización lista!'}
                {update.status === 'error' && 'Error al actualizar'}
              </p>
              <p style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.5)',
                margin: 0,
                lineHeight: 1.3,
                marginTop: 2,
              }}>
                {update.status === 'available' && 'Descargando en segundo plano...'}
                {update.status === 'downloading' && `${update.percent}% completado`}
                {update.status === 'ready' && 'Reinicia para aplicar los cambios'}
                {update.status === 'error' && (update.message || 'Intenta más tarde')}
              </p>
            </div>

            {/* Dismiss X — always available */}
            {update.status !== 'downloading' && (
              <button
                onClick={() => setDismissed(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.3)' }} />
              </button>
            )}
          </div>

          {/* Progress bar — only during download */}
          {update.status === 'downloading' && (
            <div style={{
              height: 4,
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 999,
              overflow: 'hidden',
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${update.percent}%` }}
                transition={{ duration: 0.3 }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #A3E635, #65a30d)',
                  borderRadius: 999,
                }}
              />
            </div>
          )}

          {/* Restart button — only when ready */}
          {update.status === 'ready' && (
            <button
              onClick={handleRestart}
              style={{
                width: '100%',
                padding: '8px 0',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, #A3E635, #65a30d)',
                color: '#000',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                letterSpacing: '0.02em',
              }}
            >
              <RefreshCw style={{ width: 13, height: 13 }} />
              Reiniciar ahora
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UpdateBanner;
