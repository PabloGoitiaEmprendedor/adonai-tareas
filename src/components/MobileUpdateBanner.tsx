import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Smartphone, RotateCw, ArrowRight } from 'lucide-react'
import { startUpdatePolling, type UpdateInfo } from '@/lib/appUpdate'

const MobileUpdateDialog = () => {
  const [update, setUpdate] = useState<UpdateInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [downloadStarted, setDownloadStarted] = useState(false)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    checkNow()
    cleanupRef.current = startUpdatePolling((info) => {
      setUpdate(info)
      setLoading(false)
    }, 30000)
    return () => cleanupRef.current?.()
  }, [])

  const checkNow = async () => {
    const { checkForUpdate } = await import('@/lib/appUpdate')
    const info = await checkForUpdate()
    if (info?.available) {
      setUpdate(info)
    }
    setLoading(false)
  }

  const handleUpdate = () => {
    setDownloading(true)
    const isCapacitor = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNative
    if (isCapacitor) {
      window.open(update!.downloadUrl, '_system')
    } else {
      window.open(update!.downloadUrl, '_blank')
    }
    setTimeout(() => {
      setDownloading(false)
      setDownloadStarted(true)
    }, 1500)
  }

  if (loading) return null
  if (!update?.available) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 260 }}
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            border: '1px solid rgba(163,230,53,0.3)',
            borderRadius: 24,
            padding: '28px 24px',
            maxWidth: 360,
            width: 'calc(100% - 32px)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'rgba(163,230,53,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Smartphone style={{ width: 28, height: 28, color: '#a3e635' }} />
          </div>

          <h2
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: '#F4F4F5',
              margin: '0 0 6px',
              letterSpacing: '-0.01em',
            }}
          >
            Actualización disponible
          </h2>

          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', margin: '0 0 4px', lineHeight: 1.4 }}>
            Nueva versión <strong style={{ color: '#a3e635' }}>{update.latestVersion}</strong>
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 20px', lineHeight: 1.4 }}>
            Tienes v{update.currentVersion} — Actualiza para obtener las últimas funciones y mejoras.
          </p>

          {!downloadStarted ? (
            <button
              onClick={handleUpdate}
              disabled={downloading}
              style={{
                width: '100%',
                padding: '14px 0',
                borderRadius: 14,
                border: 'none',
                background: downloading
                  ? 'rgba(163,230,53,0.4)'
                  : 'linear-gradient(135deg, #a3e635, #84cc16)',
                color: downloading ? 'rgba(255,255,255,0.6)' : '#151820',
                fontSize: 15,
                fontWeight: 800,
                cursor: downloading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                letterSpacing: '0.01em',
              }}
            >
              {downloading ? (
                <>
                  <RotateCw style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                  Abriendo descarga...
                </>
              ) : (
                <>
                  <Download style={{ width: 16, height: 16 }} />
                  Descargar e instalar
                </>
              )}
            </button>
          ) : (
            <div>
              <div
                style={{
                  background: 'rgba(163,230,53,0.1)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  marginBottom: 12,
                  border: '1px solid rgba(163,230,53,0.15)',
                }}
              >
                <p style={{ fontSize: 13, color: '#a3e635', fontWeight: 700, margin: '0 0 4px' }}>
                  Descarga iniciada
                </p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.4 }}>
                  {update.platform === 'android'
                    ? 'Cuando termine la descarga, abre el archivo APK para instalar la actualización.'
                    : 'Sigue las instrucciones en TestFlight para actualizar.'}
                </p>
              </div>

              <button
                onClick={() => {
                  const isCapacitor = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNative
                  if (isCapacitor) {
                    window.open(update!.downloadUrl, '_system')
                  } else {
                    window.open(update!.downloadUrl, '_blank')
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px 0',
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'transparent',
                  color: '#F4F4F5',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <ArrowRight style={{ width: 14, height: 14 }} />
                Reintentar descarga
              </button>
            </div>
          )}

          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '14px 0 0', lineHeight: 1.3 }}>
            La aplicación se actualizará al reiniciar después de la instalación
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default MobileUpdateDialog
