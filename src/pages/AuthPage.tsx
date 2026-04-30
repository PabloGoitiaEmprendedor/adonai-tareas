import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!email || !password) {
      toast.error('Completa todos los campos');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        navigate('/');
      } else {
        const { data } = await signUp(email, password);
        if (data?.session) {
          toast.success('Cuenta creada exitosamente');
          navigate('/');
        } else {
          toast.success('Cuenta creada. Revisa tu correo para confirmar.');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const electron = (window as any).electronAPI;
      if (electron && electron.openExternal) {
        // En Escritorio: Redirigimos a la web oficial para que el usuario inicie sesión ahí.
        // La web oficial tiene el puente (App.tsx) que enviará la sesión de vuelta via adonai-tasks://
        // Usamos la URL de producción oficial.
        const authUrl = 'https://adonaitasks.com/auth';
        console.log("Opening external browser for OAuth bridge:", authUrl);
        electron.openExternal(authUrl);
        setGoogleLoading(false);
        return;
      }

      // En Web: Redirección normal usando Lovable Auth
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (result.error) throw result.error;
      if (result.redirected) return;
      navigate('/');
    } catch (err: any) {
      toast.error('Error al conectar con Google');
      console.error(err);
      setGoogleLoading(false);
    }
  };

  // Bridge session has been moved to App.tsx to ensure it catches global redirects

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    try {
      const electron = window.electronAPI as any;
      if (electron && electron.openExternal) {
        electron.openExternal('https://3a84d585-06c0-49da-b64a-79238927162d.lovableproject.com/auth');
        setAppleLoading(false);
        return;
      }

      const result = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      navigate('/');
    } catch (err: any) {
      toast.error('Error al conectar con Apple');
      console.error(err);
      setAppleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 selection:bg-primary/30 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[140px] opacity-60" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[140px] opacity-60" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative z-10 w-full max-w-[400px] space-y-10"
      >
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-primary/15 rounded-[32px] flex items-center justify-center mx-auto mb-6 rotate-3">
             <h1 className="text-4xl font-black text-primary">A</h1>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-foreground font-headline">Adonai</h1>
          <p className="text-on-surface-variant font-medium text-lg opacity-80">
            {isLogin ? 'Bienvenido de vuelta' : 'Crea tu cuenta gratis'}
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="h-16 px-4 bg-surface-container rounded-2xl text-foreground font-bold flex items-center justify-center gap-3 border border-outline-variant/10 hover:bg-surface-container-high transition-all disabled:opacity-50 active:scale-95"
            >
              <GoogleIcon />
              <span className="text-sm">Google</span>
            </button>
            <button
              onClick={handleAppleSignIn}
              disabled={appleLoading}
              className="h-16 px-4 bg-surface-container rounded-2xl text-foreground font-bold flex items-center justify-center gap-3 border border-outline-variant/10 hover:bg-surface-container-high transition-all disabled:opacity-50 active:scale-95"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" fill="none">
                <path d="M17.05 20.28c-.96.95-2.04 1.72-3.23 1.72-1.16 0-1.54-.7-2.82-.7-1.28 0-1.74.68-2.82.68-1.12 0-2.31-.83-3.35-1.87-2.12-2.11-3.62-5.96-3.62-8.58 0-4.14 2.69-6.33 5.25-6.33 1.34 0 2.45.83 3.19.83.73 0 2.05-.98 3.59-.98 1.83 0 3.23.95 4.1 2.21-3.56 1.48-2.98 6.55.59 8.12-.73 1.84-1.76 3.88-3.09 4.9zm-4.32-15.65c0-1.44 1.16-2.61 2.61-2.61.08 0 .16.01.23.01.07 1.43-1.07 2.76-2.52 2.76-.08 0-.16-.01-.23-.01.01-.06.01-.11.01-.15z"/>
              </svg>
              <span className="text-sm">Apple</span>
            </button>
          </div>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-outline-variant/10"></span>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black">
              <span className="bg-background px-4 text-on-surface-variant/40">O usa tu email</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full h-16 px-6 bg-surface-container rounded-2xl text-foreground font-semibold placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all border-none"
              />
            </div>
            <div className="space-y-2">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="w-full h-16 px-6 bg-surface-container rounded-2xl text-foreground font-semibold placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all border-none"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-16 rounded-[24px] bg-primary text-black font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'Entrando...' : isLogin ? 'Entrar ahora' : 'Crear mi cuenta'}
          </button>

          <p className="text-center text-on-surface-variant/60 text-sm font-medium">
            {isLogin ? '¿Nuevo por aquí?' : '¿Ya tienes cuenta?'}{' '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-bold hover:underline ml-1"
            >
              {isLogin ? 'Regístrate gratis' : 'Inicia sesión'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
