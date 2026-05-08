import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const ToastPage = () => {
  const [toast, setToast] = useState<{ title: string; body: string; type?: 'info' | 'success' | 'warning' } | null>(null);

  useEffect(() => {
    // Listen for toast data from the main process
    if ((window as any).electronAPI) {
      (window as any).electronAPI.onCustomToast((_event: any, data: any) => {
        setToast(data);
        // Auto-close sound or logic could go here
      });
    }

    // Default test state if opened manually
    const params = new URLSearchParams(window.location.search);
    if (params.get('test')) {
      setToast({
        title: "¡Logro Desbloqueado! 🏆",
        body: "Has completado todas tus tareas prioritarias.",
        type: 'success'
      });
    }
  }, []);

  if (!toast) return null;

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      default: return <Bell className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center p-4 overflow-hidden bg-transparent">
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ x: 400, opacity: 0, scale: 0.8 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: 400, opacity: 0, scale: 0.8 }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
          className="w-full max-w-[340px] bg-surface/80 backdrop-blur-xl border border-outline-variant/30 rounded-[24px] p-4 shadow-2xl flex items-start gap-4 relative overflow-hidden group"
        >
          {/* Animated Glow Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex-shrink-0 w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center shadow-inner">
            {getIcon()}
          </div>

          <div className="relative z-10 flex-1 min-w-0">
            <h4 className="text-[14px] font-black text-foreground tracking-tight truncate">
              {toast.title}
            </h4>
            <p className="text-[12px] text-on-surface-variant font-medium leading-relaxed line-clamp-2 mt-0.5">
              {toast.body}
            </p>
          </div>

          {/* Progress bar for auto-close */}
          <motion.div 
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 5, ease: "linear" }}
            className="absolute bottom-0 left-0 h-1 bg-primary/30"
          />
        </motion.div>
      </AnimatePresence>
      
      <style>{`
        body { background: transparent !important; margin: 0; padding: 0; overflow: hidden; }
        * { user-select: none; -webkit-app-region: no-drag; }
      `}</style>
    </div>
  );
};

export default ToastPage;
