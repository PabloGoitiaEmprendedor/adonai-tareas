import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays } from 'date-fns';

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

      // Log day_active event
      await supabase.from('usage_events').insert({
        user_id: user.id,
        event_type: 'day_active',
        metadata: { date: today },
      });

      if (!metrics) return;

      const updates: Record<string, unknown> = {
        last_active_date: today,
        updated_at: new Date().toISOString(),
      };

      // Track day usage
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

      // Streak logic
      if (metrics.last_active_date === yesterday) {
        const newStreak = (metrics.streak_current || 0) + 1;
        updates.streak_current = newStreak;
        if (newStreak > (metrics.streak_max || 0)) {
          updates.streak_max = newStreak;
        }
        if (newStreak >= 2) {
          await supabase.from('usage_events').insert({
            user_id: user.id,
            event_type: `streak_${newStreak}` as string,
          });
        }
      } else if (metrics.last_active_date !== today) {
        updates.streak_current = 1;
      }

      await supabase
        .from('experiment_metrics')
        .update(updates)
        .eq('user_id', user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiment_metrics'] });
    },
  });

  return { metrics, trackDayActive };
};
