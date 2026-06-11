import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

const AccountRequiredPage = () => {
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
        className="relative z-10 w-full max-w-[400px] space-y-10 text-center"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-center mx-auto">
            <BrandLogo className="h-20 w-20 drop-shadow-[0_0_20px_rgba(91,124,250,0.3)]" />
          </div>

          <div className="space-y-2">
            <h1 className="page-title !text-3xl">Tu cuenta te espera</h1>
            <p className="text-on-surface-variant font-medium text-base leading-relaxed max-w-sm mx-auto">
              Ya tienes tareas y progreso guardados. Crea una cuenta para no perderlos.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Link
            to="/auth?mode=signup"
            className="w-full h-16 rounded-[24px] bg-primary text-black font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <UserPlus className="w-5 h-5" />
            Crear cuenta
          </Link>

          <Link
            to="/auth"
            className="w-full h-16 rounded-[24px] bg-surface-container text-foreground font-bold text-base flex items-center justify-center gap-3 border border-outline-variant/30 hover:bg-surface-container-high active:scale-[0.98] transition-all"
          >
            Ya tengo cuenta
          </Link>
        </div>

        <p className="text-on-surface-variant/40 text-xs leading-relaxed max-w-xs mx-auto">
          Tus tareas, metas y progreso se migraran automaticamente a tu nueva cuenta.
        </p>
      </motion.div>
    </div>
  );
};

export default AccountRequiredPage;
