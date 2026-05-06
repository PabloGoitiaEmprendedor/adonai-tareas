import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfWeek, endOfWeek, subWeeks, format } from 'date-fns';

export interface WeeklyMetrics {
    capturedTasks: number;
    completedTasks: number;
    timeSavedMinutes: number;
    energySavedPercent: number;
    comparisonPercent: number; // vs previous week
    efficiencyScore: number;
    topCategory?: string;
    productivityTip: string;
}

export const useWeeklySummary = (userId?: string) => {
    const { user: currentUser } = useAuth();
    const targetUserId = userId || currentUser?.id;

    return useQuery({
        queryKey: ['weekly-summary', targetUserId],
        queryFn: async (): Promise<WeeklyMetrics | null> => {
            if (!targetUserId) return null;

            // First, try to fetch the latest SAVED report from usage_events
            const { data: savedReport } = await supabase
                .from('usage_events')
                .select('*')
                .eq('user_id', targetUserId)
                .eq('event_type', 'weekly_summary_saved')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (savedReport) {
                return savedReport.metadata as unknown as WeeklyMetrics;
            }

            const now = new Date();
            const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
            const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 });
            const startOfLastWeek = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
            const endOfLastWeek = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

            // 1. Captured Tasks (This Week)
            const { count: capturedThisWeek } = await supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', targetUserId)
                .gte('created_at', startOfThisWeek.toISOString())
                .lte('created_at', endOfThisWeek.toISOString());

            // 2. Completed Tasks (This Week)
            const { count: completedThisWeek } = await supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', targetUserId)
                .eq('status', 'done')
                .gte('completed_at', startOfThisWeek.toISOString())
                .lte('completed_at', endOfThisWeek.toISOString());

            // 3. Captured Tasks (Last Week)
            const { count: capturedLastWeek } = await supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', targetUserId)
                .gte('created_at', startOfLastWeek.toISOString())
                .lte('created_at', endOfLastWeek.toISOString());

            // Calculation Constants
            const SECONDS_PER_ADONAI_CAPTURE = 10;
            const SECONDS_PER_TRADITIONAL_CAPTURE = 120;
            const SAVED_SECONDS_PER_TASK = SECONDS_PER_TRADITIONAL_CAPTURE - SECONDS_PER_ADONAI_CAPTURE;

            const tasksCount = capturedThisWeek || 0;
            const timeSavedMinutes = Math.round((tasksCount * SAVED_SECONDS_PER_TASK) / 60);
            
            // Energy saved is a psychological proxy
            const energySavedPercent = Math.min(95, Math.round((tasksCount / (tasksCount + 5)) * 100));

            const lastWeekCount = capturedLastWeek || 0;
            const comparisonPercent = lastWeekCount > 0 
                ? Math.round(((tasksCount - lastWeekCount) / lastWeekCount) * 100)
                : 100;

            const completionRate = tasksCount > 0 ? (completedThisWeek || 0) / tasksCount : 0;
            const efficiencyScore = Math.round(completionRate * 100);

            // Dynamic Productivity Tip
            let tip = "Tu ritmo es excelente. La próxima semana, intenta capturar las tareas apenas aparezcan en tu mente.";
            if (completionRate < 0.4) {
                tip = "Has capturado mucho, pero pocas tareas se cerraron. Intenta dividir tus tareas urgentes en pasos de 5 minutos.";
            } else if (completionRate > 0.8) {
                tip = "¡Estás en estado de Flow! El reto de la próxima semana es delegar o eliminar lo que no sea esencial.";
            }

            return {
                capturedTasks: tasksCount,
                completedTasks: completedThisWeek || 0,
                timeSavedMinutes,
                energySavedPercent,
                comparisonPercent,
                efficiencyScore,
                productivityTip: tip
            };
        },
        enabled: !!targetUserId,
    });
};

export const useSaveWeeklySummary = () => {
    const { user } = useAuth();

    return async (metrics: WeeklyMetrics) => {
        if (!user) return;
        
        await supabase.from('usage_events').insert({
            user_id: user.id,
            event_type: 'weekly_summary_saved',
            metadata: metrics as any
        });
    };
};
