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
        .single();
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

      await supabase.from('usage_events').insert({
        user_id: user.id,
        event_type: 'day_active',
        metadata: { date: today },
      });

      if (!metrics) return;

      const updates: MetricsUpdate = {
        last_active_date: today,
        updated_at: new Date().toISOString(),
      };

      if (!metrics.day_1_used) {
        updates.day_1_used = true;
      } else if (!metrics.day_2_used && metrics.last_active_date === yesterday) {
        updates.day_2_used = true;
        await supabase.from('usage_events').insert({
          user_id: user.id,
          event_type: 'return_next_day',
        });
      } else if (!metrics.day_3_used && metrics.day_2_used) {
        updates.day_3_used = true;
        updates.user_retained = true;
      }

      if (metrics.last_active_date === yesterday) {
        const newStreak = (metrics.streak_current || 0) + 1;
        updates.streak_current = newStreak;
        if (newStreak > (metrics.streak_max || 0)) {
          updates.streak_max = newStreak;
        }
      } else if (metrics.last_active_date !== today) {
        updates.streak_current = 1;
      }

      await supabase
        .from('experiment_metrics')
        .update(updates)
        .eq('user_id', user.id);

      // Unlock streak achievements
      const finalStreak = updates.streak_current ?? metrics.streak_current ?? 0;
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiment_metrics'] });
      queryClient.invalidateQueries({ queryKey: ['user_achievements'] });
    },
  });

  return { metrics, trackDayActive };
};
