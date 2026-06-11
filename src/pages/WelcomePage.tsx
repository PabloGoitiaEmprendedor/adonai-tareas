import { motion } from 'framer-motion';
import { BrandLogo } from '@/components/BrandLogo';
import { ClerkAuthControls } from '@/components/ClerkAuthControls';

const WelcomePage = () => {
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
            <h1 className="page-title">Adonai</h1>
            <p className="text-on-surface-variant font-medium text-base max-w-xs mx-auto leading-relaxed">
              Recupera el control de tu semana
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <p className="text-center text-on-surface-variant/60 text-sm font-bold uppercase tracking-[0.15em]">
            Tu primera descarga mental
          </p>

          <div className="space-y-3">
            <ClerkAuthControls mobile />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default WelcomePage;
