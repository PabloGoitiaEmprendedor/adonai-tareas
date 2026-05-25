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

export const WeeklySummaryModal = ({ enabled = false }: { enabled?: boolean }) => {
    const { user } = useAuth();
    const { data: metrics, isLoading } = useWeeklySummary();
    const saveSummary = useSaveWeeklySummary();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!enabled) return;
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
    }, [enabled, user, metrics]);

    if (!enabled || !metrics) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/90 backdrop-blur-2xl">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-[420px] bg-surface-container border border-outline-variant/30 rounded-[32px] shadow-[0_40px_100px_rgba(0,0,0,0.4)] max-h-[85vh] flex flex-col"
                    >
                        {/* Fixed close button at top-right outside scroll */}
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/10 hover:bg-black/20 transition-colors text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Scrollable content */}
                        <div className="overflow-y-auto p-5 space-y-4">
                            {/* Compact Header */}
                            <div className="flex items-center gap-3 pr-8">
                                <div className="w-10 h-10 rounded-[14px] primary-gradient flex items-center justify-center shadow-lg shrink-0">
                                    <Sparkles className="w-5 h-5 text-primary-foreground" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black tracking-tight">Tu Reporte de Poder</h2>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Resumen de la Semana</p>
                                </div>
                            </div>

                            {/* Summary */}
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                Capturaste <span className="font-black text-foreground">{metrics.capturedTasks} tareas</span> en segundos.
                                En apps tradicionales, te hubiera tomado <span className="text-primary font-black">~{metrics.timeSavedMinutes} min</span> de gestión.
                            </p>

                            {/* Stats Row */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-surface-container-low p-3 rounded-[20px] border border-outline-variant/10 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                        <Brain className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-black">{metrics.energySavedPercent}%</p>
                                        <p className="text-[8px] uppercase font-bold text-muted-foreground/60 tracking-wider leading-tight">Energía Ahorrada</p>
                                    </div>
                                </div>
                                <div className="bg-surface-container-low p-3 rounded-[20px] border border-outline-variant/10 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                                        {metrics.comparisonPercent >= 0 ? (
                                            <TrendingUp className="w-4 h-4 text-secondary" />
                                        ) : (
                                            <TrendingDown className="w-4 h-4 text-muted-foreground/40" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-lg font-black">{Math.abs(metrics.comparisonPercent)}%</p>
                                        <p className="text-[8px] uppercase font-bold text-muted-foreground/60 tracking-wider leading-tight">
                                            {metrics.comparisonPercent >= 0 ? 'vs semana pasada' : 'vs semana pasada'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Efficiency */}
                            <div className="bg-surface-container-low p-4 rounded-[24px] border border-outline-variant/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Target className="w-4 h-4 text-muted-foreground" />
                                        <p className="font-black text-xs uppercase tracking-widest">Ejecución</p>
                                    </div>
                                    <p className="text-lg font-black text-primary">{metrics.efficiencyScore}%</p>
                                </div>
                                <div className="h-2.5 bg-background rounded-full overflow-hidden border border-outline-variant/10">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${metrics.efficiencyScore}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className="h-full primary-gradient rounded-full" 
                                    />
                                </div>
                                <p className="text-xs italic text-muted-foreground leading-relaxed">
                                    "{metrics.productivityTip}"
                                </p>
                            </div>

                            {/* CTA */}
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="w-full h-12 bg-foreground text-background rounded-[20px] font-black text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
                            >
                                Preparar próxima semana <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
