import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStreaks } from '@/hooks/useStreaks';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Users, Gift, Sparkles, X, ArrowRight, Zap, Heart } from 'lucide-react';
import { toast } from 'sonner';

export const ChaosBuddiesTrigger = () => {
  const { user } = useAuth();
  const { metrics } = useStreaks();
  const [showModal, setShowModal] = useState(false);
  const [hasShownThisSession, setHasShownThisSession] = useState(false);

  useEffect(() => {
    if (!metrics || !user || hasShownThisSession) return;

    // Trigger on Day 3
    if (metrics.streak_current === 3 && !metrics.day_3_used) {
        // We check if we already logged the chaos_buddies_offered event
        const checkOffered = async () => {
            const { data } = await supabase
                .from('usage_events')
                .select('*')
                .eq('user_id', user.id)
                .eq('event_type', 'chaos_buddies_offered')
                .maybeSingle();
            
            if (!data) {
                setShowModal(true);
                setHasShownThisSession(true);
                await supabase.from('usage_events').insert({
                    user_id: user.id,
                    event_type: 'chaos_buddies_offered'
                });
            }
        };
        checkOffered();
    }
  }, [metrics, user, hasShownThisSession]);

  const handleGift = async () => {
    toast.success('¡Increíble! Ahora puedes elegir a un amigo para regalarle una semana de Zero Distracción.', {
        description: 'Se habilitará vuestra Carpeta Compartida de Enfoque.'
    });
    setShowModal(false);
    // In a real app, we'd open a friend selector. 
    // For now, we'll log the intention.
    await supabase.from('usage_events').insert({
        user_id: user?.id || '',
        event_type: 'chaos_buddies_gift_intent'
    });
  };

  return (
    <AnimatePresence>
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/80 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-[400px] bg-surface-container border border-outline-variant/30 rounded-[40px] p-8 shadow-2xl relative overflow-hidden"
          >
            {/* Background Sparkles */}
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <Sparkles className="w-32 h-32 text-primary" />
            </div>

            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-surface-container-highest transition-colors"
            >
              <X className="w-5 h-5 text-on-surface-variant/40" />
            </button>

            <div className="space-y-8 relative z-10">
              <div className="w-20 h-20 rounded-[32px] bg-primary/10 flex items-center justify-center">
                <Users className="w-10 h-10 text-primary" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">Día 3 Alcanzado</span>
                </div>
                <h2 className="text-3xl font-black tracking-tight leading-tight">
                  ¡Enhorabuena! <br />
                  Tienes un <span className="text-primary">Amigo de Enfoque.</span>
                </h2>
                <p className="text-on-surface-variant leading-relaxed">
                  Llevas 3 días con el control total. Como premio, puedes invitar a alguien que también necesite calma y regalarle una 
                  <span className="font-bold text-foreground"> "Semana de Enfoque Total"</span>.
                </p>
              </div>

              <div className="bg-surface-container-low rounded-3xl p-6 border border-outline-variant/10 space-y-4">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                        <Gift className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                        <p className="text-sm font-bold">Carpeta Compartida</p>
                        <p className="text-xs text-on-surface-variant/60">Podréis asignaros tareas mutuamente para salir juntos del caos.</p>
                    </div>
                </div>
              </div>

              <button 
                onClick={handleGift}
                className="w-full h-16 primary-gradient text-primary-foreground rounded-[24px] font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Regalar Enfoque <Heart className="w-5 h-5 fill-current" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
