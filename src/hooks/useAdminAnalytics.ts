import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays, startOfDay, differenceInDays, parseISO } from 'date-fns';

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
  // General metrics
  totalUsers: number;
  activeToday: number;
  totalTasksCreated: number;
  totalTasksCompleted: number;
  avgTasksPerUserPerDay: number;
  avgSessionMinutes: number;

  // Breakdown by creation method
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

  // Per-user stats
  userStats: UserStat[];

  // Daily trends
  dailyMetrics: DailyMetric[];

  // User growth
  userGrowth: UserGrowthMetric[];

  // Funnel metrics
  funnel: FunnelMetrics;

  // Ecosystem metrics
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

      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');

      const fetchAllPages = async (table: string, select: string, queryModifier: (q: any) => any = q => q) => {
        let allData: any[] = [];
        let page = 0;
        const pageSize = 1000;
        while (true) {
          let query = supabase.from(table).select(select);
          query = queryModifier(query);
          const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
          if (error) break;
          allData = [...allData, ...data];
          if (!data || data.length < pageSize) break;
          page++;
        }
        return allData;
      };

      // 1. Fetch ALL profiles
      const profilesData = await fetchAllPages('profiles', 'user_id, email, name, created_at');
      
      // Identify admin user_id to exclude them from metrics
      const adminProfile = profilesData.find(p => p.email === ADMIN_EMAIL);
      const adminUserId = adminProfile?.user_id;

      const profiles = profilesData.filter(p => p.user_id !== adminUserId && !excludedUserIds.includes(p.user_id));
      const profileMap = new Map(profiles.map(p => [p.user_id, p]));

      // 2. Fetch ALL tasks (including subtasks now)
      const allTasks = await fetchAllPages('tasks', 'id, user_id, status, source_type, importance, urgency, goal_id, recurrence_id, created_at, completed_at, due_date', q => q.neq('status', 'deleted'));
      const tasks = allTasks.filter(t => t.user_id !== adminUserId && !excludedUserIds.includes(t.user_id));

      // 3. Fetch ALL usage_events
      const allEvents = await fetchAllPages('usage_events', 'id, user_id, event_type, metadata, created_at');
      const events = allEvents.filter(e => e.user_id !== adminUserId && !excludedUserIds.includes(e.user_id));

      // 4. Fetch experiment_metrics for streaks
      const allMetrics = await fetchAllPages('experiment_metrics' as any, 'user_id, streak_current, last_active_date');
      const metrics = allMetrics.filter((m: any) => m.user_id !== adminUserId && !excludedUserIds.includes(m.user_id));
      const metricsMap = new Map(metrics.map((m: any) => [m.user_id, m]));

      // 5. Ecosystem Tables
      const allGoals = await fetchAllPages('goals', 'id, user_id, active, created_at');
      const goals = allGoals.filter(g => g.user_id !== adminUserId && !excludedUserIds.includes(g.user_id));

      const allTimeBlocks = await fetchAllPages('time_blocks', 'id, user_id, created_at');
      const timeBlocks = allTimeBlocks.filter(tb => tb.user_id !== adminUserId && !excludedUserIds.includes(tb.user_id));

      const allAchievements = await fetchAllPages('user_achievements', 'id, user_id, unlocked_at');
      const achievements = allAchievements.filter(a => a.user_id !== adminUserId && !excludedUserIds.includes(a.user_id));

      const allImageCaptures = await fetchAllPages('image_captures', 'id, user_id, tasks_extracted, created_at');
      const imageCaptures = allImageCaptures.filter(ic => ic.user_id !== adminUserId && !excludedUserIds.includes(ic.user_id));

      const allFriendships = await fetchAllPages('friendships', 'id, requester_id, addressee_id, status, created_at');
      const friendships = allFriendships.filter(f => f.requester_id !== adminUserId && !excludedUserIds.includes(f.requester_id));

      // Determine date bounds
      let oldestDate = today;
      profiles.forEach(p => {
        if (p.created_at) {
          const d = new Date(p.created_at);
          if (d < oldestDate) oldestDate = d;
        }
      });
      const maxDaysAvailable = Math.max(1, differenceInDays(today, oldestDate) + 1);
      const loopDays = timeRange === 'all' ? maxDaysAvailable : timeRange;
      const startDateStr = format(subDays(today, loopDays - 1), 'yyyy-MM-dd');

      const filteredTasks = timeRange === 'all' ? tasks : tasks.filter(t => (t.created_at || '') >= startDateStr);
      const filteredEvents = timeRange === 'all' ? events : events.filter(e => (e.created_at || '') >= startDateStr);

      // ─── General Metrics ───────────────────────────────────────────────
      // total users is all time, active users is within the day
      const totalUsers = profiles.length;
      
      const todayEvents = filteredEvents.filter(e => e.created_at?.startsWith(todayStr));
      const activeToday = new Set(todayEvents.map(e => e.user_id)).size;

      const totalTasksCreated = filteredTasks.length;
      const totalTasksCompleted = filteredTasks.filter(t => t.status === 'done').length;

      // ─── Breakdown by method ───────────────────────────────────────────
      const tasksByVoice = filteredTasks.filter(t => t.source_type === 'voice').length;
      const tasksByText = filteredTasks.filter(t => t.source_type === 'text' || !t.source_type).length;
      const tasksByImage = filteredTasks.filter(t => t.source_type === 'image').length;
      const tasksByRecurrence = filteredTasks.filter(t => t.recurrence_id).length;
      const tasksWithGoal = filteredTasks.filter(t => t.goal_id).length;
      const tasksImportant = filteredTasks.filter(t => t.importance).length;
      const tasksUrgent = filteredTasks.filter(t => t.urgency).length;

      // Creation source breakdown from usage_events metadata
      const creationEvents = filteredEvents.filter(e => e.event_type?.startsWith('task_created'));
      const getCreationSource = (metadata: any) => {
        if (!metadata || typeof metadata !== 'object') return 'fab';
        return (metadata as any).creation_source || 'fab';
      };

      const tasksByFab = creationEvents.filter(e => getCreationSource(e.metadata) === 'fab').length;
      const tasksBySecondary = creationEvents.filter(e => getCreationSource(e.metadata) === 'secondary').length;
      const tasksByMiniPlus = creationEvents.filter(e => getCreationSource(e.metadata) === 'mini_plus').length;
      const tasksByMiniVoice = creationEvents.filter(e => getCreationSource(e.metadata) === 'mini_voice').length;

      // ─── Session duration ──────────────────────────────────────────────
      const sessionEndEvents = filteredEvents.filter(e => e.event_type === 'session_end');
      let totalSessionMinutes = 0;
      let sessionCount = 0;
      sessionEndEvents.forEach(e => {
        const meta = e.metadata as any;
        if (meta?.duration_minutes && typeof meta.duration_minutes === 'number') {
          totalSessionMinutes += meta.duration_minutes;
          sessionCount++;
        }
      });
      const avgSessionMinutes = sessionCount > 0 ? Math.round(totalSessionMinutes / sessionCount) : 0;

      // ─── Average tasks per user per day ─────────────────────────────────
      const userDays = new Map<string, Set<string>>();
      const userTaskCount = new Map<string, number>();
      filteredTasks.forEach(t => {
        const uid = t.user_id;
        const day = t.created_at?.slice(0, 10) || '';
        if (!userDays.has(uid)) userDays.set(uid, new Set());
        userDays.get(uid)!.add(day);
        userTaskCount.set(uid, (userTaskCount.get(uid) || 0) + 1);
      });
      let totalAvg = 0;
      let avgCount = 0;
      userDays.forEach((days, uid) => {
        const tc = userTaskCount.get(uid) || 0;
        if (days.size > 0) {
          totalAvg += tc / days.size;
          avgCount++;
        }
      });
      const avgTasksPerUserPerDay = avgCount > 0 ? Math.round((totalAvg / avgCount) * 10) / 10 : 0;

      // ─── Per-User Stats ────────────────────────────────────────────────
      const userIds = [...new Set([...filteredTasks.map(t => t.user_id), ...(profiles || []).map(p => p.user_id)])];
      
      const userStats: UserStat[] = userIds.map(uid => {
        const userTasks = filteredTasks.filter(t => t.user_id === uid);
        const userEvents = filteredEvents.filter(e => e.user_id === uid);
        const profile = profileMap.get(uid);
        const metrics = metricsMap.get(uid);
        const userCreationEvents = userEvents.filter(e => e.event_type?.startsWith('task_created'));

        const userDaySet = new Set(userTasks.map(t => t.created_at?.slice(0, 10) || ''));

        return {
          user_id: uid,
          email: profile?.email || null,
          name: profile?.name || null,
          total_tasks: userTasks.length,
          completed_tasks: userTasks.filter(t => t.status === 'done').length,
          voice_tasks: userTasks.filter(t => t.source_type === 'voice').length,
          text_tasks: userTasks.filter(t => t.source_type === 'text' || !t.source_type).length,
          image_tasks: userTasks.filter(t => t.source_type === 'image').length,
          recurrence_tasks: userTasks.filter(t => t.recurrence_id).length,
          fab_tasks: userCreationEvents.filter(e => getCreationSource(e.metadata) === 'fab').length,
          secondary_tasks: userCreationEvents.filter(e => getCreationSource(e.metadata) === 'secondary').length,
          mini_plus_tasks: userCreationEvents.filter(e => getCreationSource(e.metadata) === 'mini_plus').length,
          mini_voice_tasks: userCreationEvents.filter(e => getCreationSource(e.metadata) === 'mini_voice').length,
          tasks_with_goal: userTasks.filter(t => t.goal_id).length,
          tasks_important: userTasks.filter(t => t.importance).length,
          tasks_urgent: userTasks.filter(t => t.urgency).length,
          streak_current: (metrics as any)?.streak_current || 0,
          first_session_date: profile?.created_at?.slice(0, 10) || null,
          last_active_date: (metrics as any)?.last_active_date || null,
          avg_tasks_per_day: userDaySet.size > 0 ? Math.round((userTasks.length / userDaySet.size) * 10) / 10 : 0,
        };
      });

      // Sort by total tasks descending
      userStats.sort((a, b) => b.total_tasks - a.total_tasks);

      // ─── Daily Trends & User Growth ───────────────────────────────────
      const dailyMetrics: DailyMetric[] = [];
      const userGrowth: UserGrowthMetric[] = [];
      
      // Starting cumulative users count before the time window
      let cumulativeUsers = profiles.filter(p => (p.created_at || '') < startDateStr).length;

      for (let i = loopDays - 1; i >= 0; i--) {
        const d = format(subDays(today, i), 'yyyy-MM-dd');
        
        // User growth
        const dayNewUsers = profiles.filter(p => p.created_at?.startsWith(d)).length;
        cumulativeUsers += dayNewUsers;
        userGrowth.push({ date: d, cumulative_users: cumulativeUsers });

        // Daily Trends
        const dayTasks = filteredTasks.filter(t => t.created_at?.startsWith(d));
        const dayCompleted = filteredTasks.filter(t => t.completed_at?.startsWith(d));
        const dayActiveUsers = new Set(filteredEvents.filter(e => e.created_at?.startsWith(d)).map(e => e.user_id)).size;
        
        dailyMetrics.push({
          date: d,
          tasks_created: dayTasks.length,
          tasks_completed: dayCompleted.length,
          active_users: dayActiveUsers,
        });
      }

      // ─── Funnel Metrics ────────────────────────────────────────────────
      // Users with at least 1 task in first session (first day)
      let usersWithFirstTask = 0;
      let usersWithFirstCompletion = 0;
      let usersWithPrioritization = 0;

      userIds.forEach(uid => {
        const profile = profileMap.get(uid);
        if (!profile) return;
        const signupDate = profile.created_at?.slice(0, 10);
        if (!signupDate || signupDate < startDateStr) return; // Only count users who signed up in this time range

        const userTasks = filteredTasks.filter(t => t.user_id === uid);
        const firstDayTasks = userTasks.filter(t => t.created_at?.startsWith(signupDate));
        if (firstDayTasks.length > 0) usersWithFirstTask++;

        const firstDayCompleted = firstDayTasks.filter(t => t.status === 'done');
        if (firstDayCompleted.length > 0) usersWithFirstCompletion++;

        // First week prioritization
        const signupDateObj = parseISO(signupDate);
        const firstWeekEnd = format(subDays(signupDateObj, -7), 'yyyy-MM-dd');
        const firstWeekTasks = userTasks.filter(t => {
          const d = t.created_at?.slice(0, 10) || '';
          return d >= signupDate && d <= firstWeekEnd;
        });
        const hasPrioritized = firstWeekTasks.some(t => t.importance || t.urgency || t.goal_id);
        if (hasPrioritized) usersWithPrioritization++;
      });

      const funnel: FunnelMetrics = {
        total_users: totalUsers,
        users_with_first_task: usersWithFirstTask,
        users_with_first_completion: usersWithFirstCompletion,
        users_with_prioritization: usersWithPrioritization,
      };

      const goalsTotal = timeRange === 'all' ? goals.length : goals.filter(g => (g.created_at || '') >= startDateStr).length;
      const goalsActive = timeRange === 'all' ? goals.filter(g => g.active).length : goals.filter(g => g.active && (g.created_at || '') >= startDateStr).length;
      const timeBlocksTotal = timeRange === 'all' ? timeBlocks.length : timeBlocks.filter(tb => (tb.created_at || '') >= startDateStr).length;
      const achievementsUnlocked = timeRange === 'all' ? achievements.length : achievements.filter(a => (a.unlocked_at || '') >= startDateStr).length;
      
      const filteredImageCaptures = timeRange === 'all' ? imageCaptures : imageCaptures.filter(ic => (ic.created_at || '') >= startDateStr);
      const imageCapturesTotal = filteredImageCaptures.length;
      const tasksExtractedFromImages = filteredImageCaptures.reduce((acc, ic) => acc + (ic.tasks_extracted || 0), 0);

      const friendshipsTotal = timeRange === 'all' ? friendships.length : friendships.filter(f => (f.created_at || '') >= startDateStr).length;

      return {
        totalUsers,
        activeToday,
        totalTasksCreated,
        totalTasksCompleted,
        avgTasksPerUserPerDay,
        avgSessionMinutes,
        tasksByVoice,
        tasksByText,
        tasksByImage,
        tasksByRecurrence,
        tasksByFab,
        tasksBySecondary,
        tasksByMiniPlus,
        tasksByMiniVoice,
        tasksWithGoal,
        tasksImportant,
        tasksUrgent,
        userStats,
        dailyMetrics,
        userGrowth,
        funnel,
        goalsTotal,
        goalsActive,
        timeBlocksTotal,
        achievementsUnlocked,
        imageCapturesTotal,
        tasksExtractedFromImages,
        friendshipsTotal,
      };
    },
    enabled: isAdmin && !!user,
    staleTime: 1000 * 60 * 5, // 5 min cache
    refetchOnWindowFocus: false,
  });
};
