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
        await signUp(email, password);
        toast.success('Cuenta creada. Revisa tu correo para confirmar.');
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
      const electron = window.electronAPI as any;
      if (electron && electron.openExternal) {
        // En Escritorio: Redirigimos a la web oficial para que el usuario inicie sesión ahí.
        // La web oficial tiene el puente (App.tsx) que enviará la sesión de vuelta.
        electron.openExternal('https://3a84d585-06c0-49da-b64a-79238927162d.lovableproject.com/auth');
        setGoogleLoading(false);
        return;
      }

      // En Web: Redirección normal usando Lovable Auth (que maneja Google/Apple en sus servidores)
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 selection:bg-primary/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] -right-[5%] w-[30%] h-[30%] bg-primary-container/5 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[430px] space-y-8"
      >
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tighter text-foreground">Adonai</h1>
          <p className="text-on-surface-variant text-lg">
            {isLogin ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}
          </p>
        </div>

        {/* OAuth Buttons (Google/Apple) removed temporarily until Supabase providers are configured */}
        <p className="text-center text-xs text-on-surface-variant/60">
          Inicia sesión de forma segura para acceder a tus tareas
        </p>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-[0.2em] font-bold text-on-surface-variant ml-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full h-14 px-5 bg-surface-container-lowest rounded-lg text-foreground placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all border-none"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-[0.2em] font-bold text-on-surface-variant ml-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-14 px-5 bg-surface-container-lowest rounded-lg text-foreground placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all border-none"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="primary-gradient w-full h-14 rounded-lg text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loading ? 'Cargando...' : isLogin ? 'Entrar' : 'Crear cuenta'}
        </button>

        <p className="text-center text-on-surface-variant text-sm">
          {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-semibold hover:underline"
          >
            {isLogin ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default AuthPage;
