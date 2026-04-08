import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Conectando con Google...');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        toast.error('Acceso denegado por Google');
        navigate('/auth');
        return;
      }

      if (!code) {
        navigate('/auth');
        return;
      }

      setStatus('Configurando tu cuenta...');

      try {
        const { data, error: fnError } = await supabase.functions.invoke('google-auth', {
          body: {
            action: 'callback',
            code,
            redirect_uri: `${window.location.origin}/auth/callback`,
          },
        });

        if (fnError) throw fnError;
        if (!data?.success) throw new Error(data?.error || 'Error de autenticación');

        // Use the verification URL to sign in
        if (data.verification_url) {
          // Extract the token from the magic link
          const url = new URL(data.verification_url);
          const token_hash = url.searchParams.get('token') || url.hash;
          
          const { error: verifyError } = await supabase.auth.verifyOtp({
            email: data.email,
            token: data.hashed_token,
            type: 'magiclink',
          });

          if (verifyError) {
            // Fallback: try signing in with the magic link directly
            const { error: signInError } = await supabase.auth.signInWithOtp({
              email: data.email,
            });
            
            if (signInError) {
              console.error('Sign in failed:', signInError);
              toast.error('Error al iniciar sesión. Intenta con email y contraseña.');
              navigate('/auth');
              return;
            }
            
            toast.success(`¡Bienvenido ${data.name}! Revisa tu correo para confirmar.`);
            navigate('/auth');
            return;
          }
        }

        setStatus('¡Listo! Redirigiendo...');
        toast.success(`¡Bienvenido ${data.name}! Calendario conectado.`);
        navigate('/');
      } catch (err: any) {
        console.error('Callback error:', err);
        toast.error(err.message || 'Error al conectar con Google');
        navigate('/auth');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-on-surface-variant text-lg">{status}</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
