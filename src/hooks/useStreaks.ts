import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type MetricsUpdate = Database['public']['Tables']['experiment_metrics']['Update'];

export const useStreaks = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: metrics } = useQuery({
    queryKey: ['experiment_metrics', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('experiment_metrics')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user,
  });

  const trackDayActive = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const today = format(new Date(), 'yyyy-MM-dd');
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      const twoDaysAgo = format(subDays(new Date(), 2), 'yyyy-MM-dd');

      // Fetch fresh metrics to avoid race conditions with hook state
      const { data: freshMetrics, error: fetchError } = await supabase
        .from('experiment_metrics')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching metrics', fetchError);
        return;
      }

      if (!freshMetrics) {
        console.log('[useStreaks] First time user, initializing metrics');
        await supabase.from('usage_events').insert({
          user_id: user.id,
          event_type: 'day_active',
          metadata: { date: today, initial: true },
        });

        const { data: initialized, error: initError } = await supabase
          .from('experiment_metrics')
          .insert({
            user_id: user.id,
            last_active_date: today,
            streak_current: 1,
            streak_max: 1,
            day_1_used: true
          })
          .select()
          .single();

        if (initError) throw initError;
        return 1;
      }

      await supabase.from('usage_events').insert({
        user_id: user.id,
        event_type: 'day_active',
        metadata: { date: today },
      });

      const updates: MetricsUpdate = {
        last_active_date: today,
        updated_at: new Date().toISOString(),
      };

      if (!freshMetrics.day_1_used) {
        updates.day_1_used = true;
      } else if (!freshMetrics.day_2_used && freshMetrics.last_active_date === yesterday) {
        updates.day_2_used = true;
        await supabase.from('usage_events').insert({
          user_id: user.id,
          event_type: 'return_next_day',
        });
      } else if (!freshMetrics.day_3_used && freshMetrics.day_2_used) {
        updates.day_3_used = true;
        updates.user_retained = true;
      }

      if (freshMetrics.last_active_date === yesterday) {
        const newStreak = (freshMetrics.streak_current || 0) + 1;
        updates.streak_current = newStreak;
        if (newStreak > (freshMetrics.streak_max || 0)) {
          updates.streak_max = newStreak;
        }
      } else if (freshMetrics.last_active_date === twoDaysAgo) {
        // Grace period: streak is maintained if they missed 1 day
        updates.streak_current = freshMetrics.streak_current;
      } else if (freshMetrics.last_active_date !== today) {
        // Reset only if more than 2 days have passed
        updates.streak_current = 1;
      }

      const { error: updateError } = await supabase
        .from('experiment_metrics')
        .update(updates)
        .eq('user_id', user.id);

      if (updateError) throw updateError;
      
      const finalStreak = updates.streak_current ?? freshMetrics.streak_current ?? 0;

      // Unlock streak achievements
      const streakCodes: string[] = [];
      if (finalStreak >= 3) streakCodes.push('streak_3');
      if (finalStreak >= 7) streakCodes.push('streak_7');
      if (finalStreak >= 30) streakCodes.push('streak_30');

      if (streakCodes.length > 0) {
        const { data: existing } = await supabase
          .from('user_achievements')
          .select('achievement_id, achievements(code)')
          .eq('user_id', user.id);
        const have = new Set((existing || []).map((e: any) => e.achievements?.code));
        const toUnlock = streakCodes.filter(c => !have.has(c));
        if (toUnlock.length > 0) {
          const { data: catalog } = await supabase
            .from('achievements').select('*').in('code', toUnlock);
          for (const ach of catalog || []) {
            const { error } = await supabase.from('user_achievements').insert({
              user_id: user.id,
              achievement_id: ach.id,
            });
            if (!error) {
              toast.success(`🏆 ${ach.name}`, { description: ach.description });
            }
          }
        }
      }

      return finalStreak;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiment_metrics'] });
      queryClient.invalidateQueries({ queryKey: ['user_achievements'] });
    },
  });

  return { metrics, trackDayActive };
};
