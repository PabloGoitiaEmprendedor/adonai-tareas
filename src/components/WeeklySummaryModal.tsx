import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWeeklySummary, useSaveWeeklySummary } from '@/hooks/useWeeklySummary';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
    TrendingUp, 
    TrendingDown, 
    Zap, 
    Clock, 
    Brain, 
    Sparkles, 
    X, 
    ArrowRight, 
    Calendar,
    Target
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const WeeklySummaryModal = () => {
    const { user } = useAuth();
    const { data: metrics, isLoading } = useWeeklySummary();
    const saveSummary = useSaveWeeklySummary();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Trigger on Sunday
        const today = new Date();
        const isSunday = today.getDay() === 0;
        
        if (!isSunday || !user || !metrics) return;

        const checkShown = async () => {
            const todayStr = format(today, 'yyyy-MM-dd');
            const { data } = await supabase
                .from('usage_events')
                .select('*')
                .eq('user_id', user.id)
                .eq('event_type', 'weekly_summary_shown')
                .gte('created_at', todayStr + 'T00:00:00')
                .maybeSingle();

            if (!data) {
                setIsOpen(true);
                // First mark as shown
                await supabase.from('usage_events').insert({
                    user_id: user.id,
                    event_type: 'weekly_summary_shown'
                });
                // Then save the metrics for historical view in profile
                await saveSummary(metrics);
            }
        };

        checkShown();
    }, [user, metrics]);

    if (!metrics) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-background/90 backdrop-blur-2xl">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 40 }}
                        className="w-full max-w-[500px] bg-surface-container border border-outline-variant/30 rounded-[48px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.4)] relative"
                    >
                        {/* Header Image/Gradient */}
                        <div className="h-48 primary-gradient relative flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 opacity-20">
                                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
                            </div>
                            <motion.div 
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="relative z-10 text-center"
                            >
                                <div className="w-20 h-20 rounded-[32px] bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center mx-auto mb-4 shadow-2xl">
                                    <Sparkles className="w-10 h-10 text-primary-foreground" />
                                </div>
                                <h2 className="text-2xl font-black text-primary-foreground tracking-tight">Tu Reporte de Poder</h2>
                            </motion.div>
                            
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="absolute top-8 right-8 p-2 rounded-full bg-black/10 hover:bg-black/20 transition-colors text-primary-foreground/60"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-10 space-y-10">
                            {/* Summary Text */}
                            <div className="space-y-2">
                                <p className="text-on-surface-variant font-bold uppercase tracking-[0.2em] text-[10px]">Resumen de la Semana</p>
                                <p className="text-xl font-medium leading-relaxed">
                                    Esta semana capturaste <span className="font-black text-foreground">{metrics.capturedTasks} tareas</span> en segundos.
                                    En apps tradicionales como Notion o agendas, te hubiera tomado <span className="text-primary font-black">~{metrics.timeSavedMinutes} minutos</span> de gestión innecesaria.
                                </p>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-surface-container-low p-6 rounded-[32px] border border-outline-variant/10 space-y-3">
                                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                                        <Brain className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black">{metrics.energySavedPercent}%</p>
                                        <p className="text-[10px] uppercase font-bold text-on-surface-variant/60 tracking-wider">Energía Mental Ahorrada</p>
                                    </div>
                                </div>

                                <div className="bg-surface-container-low p-6 rounded-[32px] border border-outline-variant/10 space-y-3">
                                    <div className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center">
                                        {metrics.comparisonPercent >= 0 ? (
                                            <TrendingUp className="w-5 h-5 text-secondary" />
                                        ) : (
                                            <TrendingDown className="w-5 h-5 text-on-surface-variant/40" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black">{Math.abs(metrics.comparisonPercent)}%</p>
                                        <p className="text-[10px] uppercase font-bold text-on-surface-variant/60 tracking-wider">
                                            {metrics.comparisonPercent >= 0 ? 'Más enfoque que la semana pasada' : 'Menos actividad que la pasada'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Progress Indicator */}
                            <div className="bg-surface-container-highest/30 p-8 rounded-[40px] border border-outline-variant/10 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-foreground/5 flex items-center justify-center">
                                            <Target className="w-4 h-4 text-foreground" />
                                        </div>
                                        <p className="font-black text-sm uppercase tracking-widest">Nivel de Ejecución</p>
                                    </div>
                                    <p className="text-2xl font-black text-primary">{metrics.efficiencyScore}%</p>
                                </div>
                                <div className="h-4 bg-background rounded-full overflow-hidden p-1 border border-outline-variant/10">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${metrics.efficiencyScore}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className="h-full primary-gradient rounded-full" 
                                    />
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl">
                                    <p className="text-xs italic text-on-surface-variant leading-relaxed">
                                        "{metrics.productivityTip}"
                                    </p>
                                </div>
                            </div>

                            {/* CTA */}
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="w-full h-20 bg-foreground text-background rounded-[28px] font-black text-xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl"
                            >
                                Preparar próxima semana <ArrowRight className="w-6 h-6" />
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
