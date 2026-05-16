import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { BrandLogo } from '@/components/BrandLogo';

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
            <BrandLogo className="h-24 w-24 drop-shadow-[0_0_20px_rgba(91,124,250,0.3)]" />
          </div>

          <div className="space-y-3">
            <h1 className="page-title">
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
