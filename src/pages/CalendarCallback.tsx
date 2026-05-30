import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CalendarCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorDetails, setErrorDetails] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      if (!user) return;

      const code = searchParams.get('code');
      if (!code) {
        setStatus('error');
        toast.error('No se recibió el código de autorización');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('google-auth', {
          body: {
            action: 'callback',
            code,
            redirect_uri: window.location.origin + '/calendar-callback',
            user_id: user.id
          },
        });

        if (data?.success) {
          setStatus('success');
          queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
          queryClient.invalidateQueries({ queryKey: ['settings'] });
          toast.success('¡Google Calendar conectado con éxito!');
          setTimeout(() => {
            navigate('/week');
          }, 2000);
          return;
        }

        if (error) throw error;
        throw new Error(data?.error || 'Error desconocido');
      } catch (error) {
        console.error('Error en el callback de Google:', error);
        setStatus('error');
        setErrorDetails(error instanceof Error ? error.message : String(error));
        toast.error('Error al sincronizar con Google Calendar');
      }
    };

    handleCallback();
  }, [searchParams, navigate, user]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-10 bg-surface-container-low rounded-[48px] border border-outline-variant/10 shadow-2xl space-y-8"
      >
        <div className="w-24 h-24 mx-auto bg-primary/10 rounded-[32px] flex items-center justify-center relative">
          {status === 'loading' && (
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          )}
          {status === 'success' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute inset-0 bg-primary rounded-[32px] flex items-center justify-center"
            >
              <Check className="w-12 h-12 text-primary-foreground" />
            </motion.div>
          )}
          {status === 'error' && (
            <div className="w-full h-full bg-destructive/10 rounded-[32px] flex items-center justify-center">
              <span className="text-4xl">!</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-black font-headline tracking-tight">
            {status === 'loading' && 'Conectando con Google...'}
            {status === 'success' && '¡Conexión Exitosa!'}
            {status === 'error' && 'Algo salió mal'}
          </h2>
          <p className="text-on-surface-variant/60 font-medium">
            {status === 'loading' && 'Estamos sincronizando tus eventos de Google con Adonai.'}
            {status === 'success' && 'Tus calendarios están listos. Volviendo a Adonai...'}
            {status === 'error' && 'Hubo un problema al procesar la autorización. Intenta de nuevo.'}
          </p>
        </div>

        {status === 'error' && errorDetails && (
          <div className="p-4 bg-destructive/10 rounded-2xl border border-destructive/20">
            <p className="text-xs font-mono text-destructive break-words whitespace-pre-wrap">{errorDetails}</p>
          </div>
        )}

        {status === 'error' && (
          <button
            onClick={() => navigate('/week')}
            className="w-full py-4 bg-primary text-primary-foreground rounded-[24px] font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all"
          >
            Volver al Calendario
          </button>
        )}
      </motion.div>
    </div>
  );
};

export default CalendarCallback;
