import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ADMIN_EMAIL = 'pablogoitiaemprendedor@gmail.com';

export const useIsAdmin = () => {
  const { user } = useAuth();
  return user?.email === ADMIN_EMAIL;
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface UserStat {
  user_id: string;
  email: string | null;
  name: string | null;
  total_tasks: number;
  completed_tasks: number;
  voice_tasks: number;
  text_tasks: number;
  image_tasks: number;
  recurrence_tasks: number;
  fab_tasks: number;
  secondary_tasks: number;
  mini_plus_tasks: number;
  mini_voice_tasks: number;
  tasks_with_goal: number;
  tasks_important: number;
  tasks_urgent: number;
  streak_current: number;
  first_session_date: string | null;
  last_active_date: string | null;
  avg_tasks_per_day: number;
}

interface DailyMetric {
  date: string;
  tasks_created: number;
  tasks_completed: number;
  active_users: number;
}

interface UserGrowthMetric {
  date: string;
  cumulative_users: number;
}

interface FunnelMetrics {
  total_users: number;
  users_with_first_task: number;
  users_with_first_completion: number;
  users_with_prioritization: number;
}

interface AdminAnalytics {
  totalUsers: number;
  activeToday: number;
  totalTasksCreated: number;
  totalTasksCompleted: number;
  avgTasksPerUserPerDay: number;
  avgSessionMinutes: number;
  tasksByVoice: number;
  tasksByText: number;
  tasksByImage: number;
  tasksByRecurrence: number;
  tasksByFab: number;
  tasksBySecondary: number;
  tasksByMiniPlus: number;
  tasksByMiniVoice: number;
  tasksWithGoal: number;
  tasksImportant: number;
  tasksUrgent: number;
  userStats: UserStat[];
  dailyMetrics: DailyMetric[];
  userGrowth: UserGrowthMetric[];
  funnel: FunnelMetrics;
  goalsTotal: number;
  goalsActive: number;
  timeBlocksTotal: number;
  achievementsUnlocked: number;
  imageCapturesTotal: number;
  tasksExtractedFromImages: number;
  friendshipsTotal: number;
}

export const useAdminAnalytics = (timeRange: number | 'all' = 30, excludedUserIds: string[] = []) => {
  const isAdmin = useIsAdmin();
  const { user } = useAuth();

  return useQuery<AdminAnalytics | null>({
    queryKey: ['admin-analytics', user?.id, timeRange, excludedUserIds],
    queryFn: async () => {
      if (!isAdmin || !user) return null;

      const { data, error } = await supabase.functions.invoke('admin-analytics', {
        body: {
          timeRange: timeRange.toString(),
          excludedUsers: JSON.stringify(excludedUserIds),
        },
      });

      if (error) {
        console.error('admin-analytics function error:', error);
        return null;
      }

      if (data?.error) {
        console.error('admin-analytics returned error:', data.error);
        return null;
      }

      return data as AdminAnalytics;
    },
    enabled: isAdmin && !!user,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};
