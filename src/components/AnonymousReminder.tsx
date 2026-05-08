import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, Sparkles, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';

const AnonymousReminder = () => {
  const { isAnonymous, user } = useAuth();
  const [show, setShow] = useState(false);
  const [stats, setStats] = useState({ taskCount: 0, streak: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAnonymous || !user) return;

    const checkThresholds = async () => {
      // Check task count
      const { count, error: taskError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (taskError) return;

      // Check streak (simplified: consecutive days with usage_events)
      const { data: events, error: eventError } = await supabase
        .from('usage_events')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (eventError) return;

      const uniqueDays = new Set(events?.map(e => new Date(e.created_at).toDateString()));
      const streak = uniqueDays.size;

      setStats({ taskCount: count || 0, streak });

      // Thresholds: 10 tasks or 3 days streak
      const hasReachedThreshold = (count || 0) >= 10 || streak >= 3;
      
      // Don't show if already dismissed in this session
      const dismissed = sessionStorage.getItem('adonai_anon_dismissed');
      
      if (hasReachedThreshold && !dismissed) {
        setShow(true);
      }
    };

    checkThresholds();
  }, [isAnonymous, user]);

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem('adonai_anon_dismissed', 'true');
  };

  const handleRegister = () => {
    setShow(false);
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
            className="w-full max-w-[400px] bg-surface-container border border-outline-variant rounded-[32px] overflow-hidden shadow-2xl relative"
          >
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2 text-on-surface-variant hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8 space-y-6">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center rotate-3">
                    <ShieldCheck className="w-10 h-10 text-primary" />
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute -top-2 -right-2"
                  >
                    <Sparkles className="w-6 h-6 text-primary" />
                  </motion.div>
                </div>
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black tracking-tight text-foreground">
                  {stats.streak >= 3 ? '¡Vaya racha!' : '¡Increíble progreso!'}
                </h2>
                <p className="text-on-surface-variant text-sm font-medium leading-relaxed">
                  {stats.streak >= 3 
                    ? `Llevas ${stats.streak} días seguidos mejorando tu vida.` 
                    : `Has creado ${stats.taskCount} tareas y estás dominando tu día.`}
                  {" "}Protege tu información para no perderla nunca.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 py-2">
                <div className="bg-surface-container-high rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Tareas</p>
                  <p className="text-xl font-black text-primary">{stats.taskCount}</p>
                </div>
                <div className="bg-surface-container-high rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Racha</p>
                  <p className="text-xl font-black text-primary">{stats.streak}d</p>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleRegister}
                  className="w-full h-14 bg-primary text-black font-black text-lg rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
                >
                  Guardar mi cuenta
                </Button>
                <button
                  onClick={handleDismiss}
                  className="w-full h-12 text-on-surface-variant/60 font-bold text-xs hover:text-foreground transition-colors"
                >
                  Continuar como invitado
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AnonymousReminder;
