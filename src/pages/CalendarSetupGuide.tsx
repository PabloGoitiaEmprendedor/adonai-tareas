import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Bell, Calendar, Check, ExternalLink, Monitor, Smartphone } from 'lucide-react'

const CalendarSetupGuide = () => {
  const navigate = useNavigate()
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768
    setMobile(isMobile)
  }, [])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-xl rounded-[36px] border border-outline-variant/10 bg-surface-container-low p-6 shadow-2xl sm:p-8"
      >
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] border border-primary/20 bg-primary/10">
            <Bell className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-on-surface-variant/45">Un ultimo paso</p>
            <h1 className="text-3xl font-black tracking-tight text-foreground">Activa los avisos</h1>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-on-surface-variant/70">
              Google Calendar ya esta conectado. Solo falta activar las notificaciones para que Adonai te avise.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {mobile ? (
            <>
              <Step
                icon={<Smartphone className="h-5 w-5" />}
                title="Abre Google Calendar"
                description="Instala la app si todavia no la tienes."
                actionLabel="Google Play"
                actionHref="https://play.google.com/store/apps/details?id=com.google.android.calendar"
              />
              <Step
                icon={<Bell className="h-5 w-5" />}
                title="Activa las notificaciones"
                description="En Ajustes, enciende los avisos de Google Calendar."
              />
            </>
          ) : (
            <>
              <Step
                icon={<Monitor className="h-5 w-5" />}
                title="Permite los avisos del navegador"
                description="Chrome, Edge o Firefox deben tener permiso para notificarte."
              />
              <Step
                icon={<Bell className="h-5 w-5" />}
                title="Activa avisos en Google Calendar"
                description="Entra a calendar.google.com y en Ajustes activa los avisos de escritorio."
                actionLabel="Abrir Google Calendar"
                actionHref="https://calendar.google.com"
              />
            </>
          )}
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => navigate('/week')}
            className="flex h-16 w-full items-center justify-center gap-2 rounded-[24px] bg-primary px-4 font-black text-primary-foreground transition hover:scale-[1.01] active:scale-95"
          >
            Listo, entrar
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="text-center text-[11px] text-on-surface-variant/45">
            Puedes volver aqui si quieres revisar los avisos.
          </p>
        </div>
      </motion.div>
    </div>
  )
}

const Step = ({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: React.ReactNode
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}) => (
  <div className="flex gap-3 rounded-[24px] border border-outline-variant/10 bg-surface/50 p-4">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
      {icon}
    </div>
    <div className="min-w-0 space-y-1">
      <div className="text-sm font-bold text-foreground">{title}</div>
      <p className="text-xs leading-relaxed text-on-surface-variant/60">{description}</p>
      {actionLabel && actionHref && (
        <a
          href={actionHref}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-[11px] font-bold text-primary transition hover:bg-primary/20"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {actionLabel}
        </a>
      )}
    </div>
  </div>
)

export default CalendarSetupGuide
