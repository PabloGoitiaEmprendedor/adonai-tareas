import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// XP curve: level N requires N*100 cumulative XP (level 1 = 0, level 2 = 100, etc.)
export const xpForLevel = (level: number) => Math.max(0, (level - 1) * 100);
export const levelForXp = (xp: number) => Math.max(1, Math.floor(xp / 100) + 1);
export const xpProgressInLevel = (xp: number) => {
  const level = levelForXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { current: xp - base, needed: next - base, level, percent: ((xp - base) / (next - base)) * 100 };
};

const XP_PER_TASK = 10;

export const useGamification = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: achievements = [] } = useQuery({
    queryKey: ['achievements_catalog'],
    queryFn: async () => {
      const { data } = await supabase.from('achievements').select('*').order('xp_reward');
      return data || [];
    },
    enabled: !!user,
  });

  const { data: unlocked = [] } = useQuery({
    queryKey: ['user_achievements', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('user_achievements')
        .select('*, achievements(*)')
        .eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const unlockedCodes = new Set(unlocked.map((u: any) => u.achievements?.code).filter(Boolean));

  const checkAndUnlock = useMutation({
    mutationFn: async (event: { type: 'task_completed' | 'streak' | 'level' | 'block_created' | 'goal_created'; value?: number }) => {
      if (!user) return;

      // Fetch latest metrics
      const { data: metrics } = await supabase
        .from('experiment_metrics')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!metrics) return;

      const codes: string[] = [];

      if (event.type === 'task_completed') {
        const total = (metrics.tasks_completed_total || 0) + 1;
        if (total === 1) codes.push('first_task');
        if (total === 10) codes.push('tasks_10');
        if (total === 50) codes.push('tasks_50');
        if (total === 100) codes.push('tasks_100');

        const newXp = (metrics.xp_total || 0) + XP_PER_TASK;
        const newLevel = levelForXp(newXp);
        const oldLevel = metrics.level || 1;

        await supabase
          .from('experiment_metrics')
          .update({
            tasks_completed_total: total,
            xp_total: newXp,
            level: newLevel,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (newLevel > oldLevel) {
          toast.success(`¡Subiste a nivel ${newLevel}!`, { duration: 3000 });
          if (newLevel >= 5 && !unlockedCodes.has('level_5')) codes.push('level_5');
          if (newLevel >= 10 && !unlockedCodes.has('level_10')) codes.push('level_10');
        }
      }

      if (event.type === 'streak' && event.value) {
        if (event.value >= 3) codes.push('streak_3');
        if (event.value >= 7) codes.push('streak_7');
        if (event.value >= 30) codes.push('streak_30');
      }

      if (event.type === 'block_created') codes.push('first_block');
      if (event.type === 'goal_created') codes.push('first_goal');

      // Filter out already unlocked
      const newCodes = codes.filter(c => !unlockedCodes.has(c));
      if (newCodes.length === 0) return;

      const { data: catalog } = await supabase
        .from('achievements')
        .select('*')
        .in('code', newCodes);

      for (const ach of catalog || []) {
        const { error } = await supabase.from('user_achievements').insert({
          user_id: user.id,
          achievement_id: ach.id,
        });
        if (!error) {
          toast.success(`🏆 Logro desbloqueado: ${ach.name}`, {
            description: `+${ach.xp_reward} XP — ${ach.description}`,
            duration: 4000,
          });
          // Add bonus XP
          await supabase.rpc('noop' as any).then(() => {}, () => {});
          const { data: m2 } = await supabase
            .from('experiment_metrics')
            .select('xp_total, level')
            .eq('user_id', user.id)
            .maybeSingle();
          if (m2) {
            const xp = (m2.xp_total || 0) + ach.xp_reward;
            await supabase
              .from('experiment_metrics')
              .update({ xp_total: xp, level: levelForXp(xp) })
              .eq('user_id', user.id);
          }
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['experiment_metrics'] });
      qc.invalidateQueries({ queryKey: ['user_achievements'] });
    },
  });

  return { achievements, unlocked, unlockedCodes, checkAndUnlock };
};
