import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { isGoogleOAuthDesktopState, validateGoogleOAuthState } from '@/lib/googleOAuthState'

const CalendarCallback = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const { profile } = useProfile()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'redirecting'>('loading')
  const [errorDetails, setErrorDetails] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const state = searchParams.get('state')

      if (!code) {
        setStatus('error')
        toast.error('No se recibio el codigo de autorizacion')
        return
      }

      if (isGoogleOAuthDesktopState(state) && !window.electronAPI) {
        setStatus('redirecting')
        window.location.href = `adonai-tasks://calendar-callback?code=${code}&state=${state}`
        return
      }

      if (!user) {
        if (!loading) {
          setStatus('error')
          setErrorDetails('Inicia sesion en Adonai antes de conectar Google Calendar.')
        }
        return
      }

      try {
        if (!validateGoogleOAuthState(state, 'calendar')) {
          throw new Error('Estado OAuth invalido o expirado')
        }

        const isElectron = !!window.electronAPI
        const redirect_uri = isElectron
          ? 'https://adonai-tareas.vercel.app/calendar-callback'
          : `${window.location.origin}/calendar-callback`

        const { data, error } = await supabase.functions.invoke('google-auth', {
          body: {
            action: 'callback',
            code,
            redirect_uri,
            user_id: user.id,
          },
        })

        if (error) throw error
        if (!data?.success) throw new Error(data?.error || 'No se pudo conectar Google Calendar')

        setStatus('success')
        queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
        queryClient.invalidateQueries({ queryKey: ['settings'] })
        localStorage.setItem('adonai_calendar_connected_once', 'true')
        toast.success('Google Calendar conectado')

        const isOnboardingFlow = localStorage.getItem('adonai_onboarding_calendar_pending') === 'true'
        localStorage.removeItem('adonai_onboarding_calendar_pending')
        const shouldReturnToOnboarding =
          isOnboardingFlow && !profile?.onboarding_completed && !profile?.name

        setTimeout(() => {
          navigate(shouldReturnToOnboarding ? '/onboarding?calendar_setup=1' : '/daily', { replace: true })
        }, 1600)
      } catch (err) {
        console.error('Error en el callback de Google:', err)
        setStatus('error')
        setErrorDetails(err instanceof Error ? err.message : String(err))
        toast.error('No se pudo conectar Google Calendar')
      }
    }

    handleCallback()
  }, [loading, navigate, profile?.name, profile?.onboarding_completed, queryClient, searchParams, user])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md rounded-[36px] border border-outline-variant/10 bg-surface-container-low p-8 text-center shadow-2xl space-y-8"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-primary/10">
          {(status === 'loading' || status === 'redirecting') && <Loader2 className="h-9 w-9 animate-spin text-primary" />}
          {status === 'success' && (
            <div className="flex h-full w-full items-center justify-center rounded-[28px] bg-primary">
              <Check className="h-10 w-10 text-primary-foreground" />
            </div>
          )}
          {status === 'error' && <span className="text-4xl font-black text-destructive">!</span>}
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            {status === 'loading' && 'Conectando Google Calendar'}
            {status === 'redirecting' && 'Abriendo Adonai'}
            {status === 'success' && 'Listo'}
            {status === 'error' && 'Algo salio mal'}
          </h1>
          <p className="text-sm leading-relaxed text-on-surface-variant/65">
            {status === 'loading' && 'Estamos terminando la conexion.'}
            {status === 'redirecting' && 'Te estamos enviando a la app de escritorio.'}
            {status === 'success' && 'Ya puedes volver a Adonai.'}
            {status === 'error' && 'Puedes volver a la guia e intentar otra vez.'}
          </p>
        </div>

        {status === 'error' && errorDetails && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-left">
            <p className="break-words whitespace-pre-wrap text-xs text-destructive">{errorDetails}</p>
          </div>
        )}

        {status === 'error' && (
          <button
            onClick={() => navigate('/calendar-setup', { replace: true })}
            className="flex h-14 w-full items-center justify-center rounded-[22px] bg-primary font-black text-primary-foreground transition hover:scale-[1.01] active:scale-95"
          >
            Volver a la guia
          </button>
        )}
      </motion.div>
    </div>
  )
}

export default CalendarCallback
