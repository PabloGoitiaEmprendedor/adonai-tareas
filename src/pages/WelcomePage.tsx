import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

const WelcomePage = () => {
  const navigate = useNavigate();
  const { user, signInAnonymously } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleStartAsGuest = async () => {
    if (user) {
      navigate('/onboarding', { replace: true });
      return;
    }
    setLoading(true);
    try {
      await signInAnonymously();
    } catch {
      // Si falla la creación anónima, igual va al onboarding.
      // El onboarding mismo lo intentará de nuevo al finalizar.
    }
    navigate('/onboarding', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 selection:bg-primary/30 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[140px] opacity-60" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[140px] opacity-60" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[400px] space-y-12"
      >
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center mx-auto">
            <div className="w-24 h-24 relative">
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                <defs>
                  <linearGradient id="welcome-logo" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22C55E" />
                    <stop offset="100%" stopColor="#16a34a" />
                  </linearGradient>
                </defs>
                <path 
                  d="M20 50 L40 75 L85 25" 
                  fill="none" 
                  stroke="url(#welcome-logo)" 
                  strokeWidth="16" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-5xl font-black tracking-tighter text-foreground font-headline">
              Adonai
            </h1>
            <p className="text-on-surface-variant font-medium text-base max-w-xs mx-auto leading-relaxed">
              Recupera el control de tu semana
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <p className="text-center text-on-surface-variant/60 text-sm font-bold uppercase tracking-[0.15em]">
            ¿Ya tienes una cuenta?
          </p>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/auth')}
              className="w-full h-16 rounded-[24px] bg-primary text-black font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Sí, iniciar sesión
            </button>

            <button
              onClick={handleStartAsGuest}
              disabled={loading}
              className="w-full h-16 rounded-[24px] bg-surface-container text-foreground font-bold text-base flex items-center justify-center gap-3 border border-outline-variant/30 hover:bg-surface-container-high active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-on-surface-variant/30 border-t-foreground rounded-full animate-spin" />
              ) : (
                'No, empezar gratis'
              )}
            </button>
          </div>

          <p className="text-center text-on-surface-variant/40 text-xs leading-relaxed max-w-sm mx-auto">
            Puedes usar Adonai sin registro. Tus tareas se guardan localmente y puedes vincularlas a un correo más tarde.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default WelcomePage;
