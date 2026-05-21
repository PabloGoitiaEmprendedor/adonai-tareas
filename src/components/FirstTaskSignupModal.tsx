import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FirstTaskSignupModal = () => {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => {
      if (localStorage.getItem('adonai_first_task_prompt_shown')) return;
      setShow(true);
    };
    window.addEventListener('adonai:first-task-created', handler);
    return () => window.removeEventListener('adonai:first-task-created', handler);
  }, []);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('adonai_first_task_prompt_shown', 'true');
  };

  const handleRegister = () => {
    setShow(false);
    localStorage.setItem('adonai_first_task_prompt_shown', 'true');
    navigate('/auth');
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-[360px] bg-surface-container border border-outline-variant rounded-[32px] overflow-hidden shadow-2xl relative"
          >
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2 text-on-surface-variant hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8 space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-xl font-black tracking-tight text-foreground">
                  Guarda tu progreso
                </h2>
                <p className="text-on-surface-variant text-sm font-medium leading-relaxed">
                  Tu primera tarea está segura. Crea una cuenta gratis y no pierdas nada.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={handleRegister}
                  className="w-full h-[52px] bg-primary text-black font-black text-base rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
                >
                  Registrarme con email
                </button>
                <button
                  onClick={handleDismiss}
                  className="w-full h-11 text-on-surface-variant/60 font-bold text-xs hover:text-foreground transition-colors"
                >
                  Seguir como invitado
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default FirstTaskSignupModal;
