import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Smartphone } from 'lucide-react'
import { checkForUpdate, type UpdateInfo } from '@/lib/appUpdate'

const MobileUpdateBanner = () => {
  const [update, setUpdate] = useState<UpdateInfo | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkForUpdate().then((info) => {
      setUpdate(info)
      setLoading(false)
    })
  }, [])

  if (loading || !update || dismissed) return null
  if (!update.available) return null

  const handleUpdate = () => {
    const isCapacitor = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNative
    if (isCapacitor) {
      window.open(update.downloadUrl, '_system')
    } else {
      window.open(update.downloadUrl, '_blank')
    }
  }

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Smartphone style={{ width: 18, height: 18, color: '#a3e635' }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#F4F4F5', margin: 0, lineHeight: 1.3 }}>
                Nueva versión {update.latestVersion} disponible
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.3, marginTop: 2 }}>
                Tienes v{update.currentVersion} — Actualiza para tener lo último
              </p>
            </div>
            <button
              onClick={() => setDismissed(true)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: 4, borderRadius: 8, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.3)' }} />
            </button>
          </div>

          <button
            onClick={handleUpdate}
            style={{
              width: '100%', padding: '8px 0', borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #a3e635, #84cc16)',
              color: '#151820', fontSize: 12, fontWeight: 800,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6, letterSpacing: '0.02em',
            }}
          >
            <Download style={{ width: 13, height: 13 }} />
            Descargar actualización
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default MobileUpdateBanner
