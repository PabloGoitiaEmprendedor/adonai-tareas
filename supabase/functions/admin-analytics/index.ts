import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { format, subDays, parseISO } from "https://esm.sh/date-fns@3.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "pablogoitiaemprendedor@gmail.com";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user || user.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const timeRangeParam = body.timeRange || "30";
    const excludedUsersParam = body.excludedUsers || "[]";
    const timeRange = timeRangeParam === "all" ? "all" as const : parseInt(timeRangeParam);
    const excludedUserIds: string[] = JSON.parse(excludedUsersParam);

    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");

    // Fetch all profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, email, name, created_at");
    if (profilesError) throw new Error(`profiles: ${profilesError.message}`);

    const adminProfile = profilesData?.find(p => p.email === ADMIN_EMAIL);
    const adminUserId = adminProfile?.user_id;
    const profiles = (profilesData || []).filter(p => p.user_id !== adminUserId && !excludedUserIds.includes(p.user_id));
    const profileMap = new Map(profiles.map(p => [p.user_id, p]));

    // Fetch all tasks
    const { data: allTasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, user_id, status, source_type, importance, urgency, goal_id, recurrence_id, created_at, completed_at, due_date")
      .neq("status", "deleted");
    if (tasksError) throw new Error(`tasks: ${tasksError.message}`);

    const tasks = (allTasks || []).filter(t => t.user_id !== adminUserId && !excludedUserIds.includes(t.user_id));

    // Fetch all usage_events
    const { data: allEvents, error: eventsError } = await supabase
      .from("usage_events")
      .select("id, user_id, event_type, metadata, created_at");
    if (eventsError) throw new Error(`events: ${eventsError.message}`);

    const events = (allEvents || []).filter(e => e.user_id !== adminUserId && !excludedUserIds.includes(e.user_id));

    // Fetch experiment_metrics for streaks
    const { data: allMetrics, error: metricsError } = await supabase
      .from("experiment_metrics")
      .select("user_id, streak_current, last_active_date");
    if (metricsError) throw new Error(`metrics: ${metricsError.message}`);

    const metrics = (allMetrics || []).filter(m => m.user_id !== adminUserId && !excludedUserIds.includes(m.user_id));
    const metricsMap = new Map(metrics.map(m => [m.user_id, m]));

    // Ecosystem tables
    const [{ data: goals }, { data: timeBlocks }, { data: achievements }, { data: imageCaptures }, { data: friendships }] = await Promise.all([
      supabase.from("goals").select("id, user_id, active, created_at"),
      supabase.from("time_blocks").select("id, user_id, created_at"),
      supabase.from("user_achievements").select("id, user_id, unlocked_at"),
      supabase.from("image_captures").select("id, user_id, tasks_extracted, created_at"),
      supabase.from("friendships").select("id, requester_id, addressee_id, status, created_at"),
    ]);

    const filterAdmin = <T extends { user_id?: string; requester_id?: string }>(arr: T[] | null): T[] =>
      (arr || []).filter(x => (x.user_id || x.requester_id) !== adminUserId && !excludedUserIds.includes(x.user_id || x.requester_id || ""));

    const cleanGoals = filterAdmin(goals);
    const cleanTimeBlocks = filterAdmin(timeBlocks);
    const cleanAchievements = filterAdmin(achievements);
    const cleanImageCaptures = filterAdmin(imageCaptures);
    const cleanFriendships = filterAdmin(friendships);

    // Determine date bounds
    let oldestDate = today;
    profiles.forEach(p => {
      if (p.created_at) {
        const d = new Date(p.created_at);
        if (d < oldestDate) oldestDate = d;
      }
    });
    const maxDays = Math.max(1, Math.floor((today.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const loopDays = timeRange === "all" ? maxDays : timeRange;
    const startDateStr = format(subDays(today, loopDays - 1), "yyyy-MM-dd");

    const filteredTasks = timeRange === "all" ? tasks : tasks.filter(t => (t.created_at || "") >= startDateStr);
    const filteredEvents = timeRange === "all" ? events : events.filter(e => (e.created_at || "") >= startDateStr);

    // General metrics
    const totalUsers = profiles.length;
    const todayEvents = filteredEvents.filter(e => e.created_at?.startsWith(todayStr));
    const activeToday = new Set(todayEvents.map(e => e.user_id)).size;
    const totalTasksCreated = filteredTasks.length;
    const totalTasksCompleted = filteredTasks.filter(t => t.status === "done").length;

    // Breakdown by method
    const tasksByVoice = filteredTasks.filter(t => t.source_type === "voice").length;
    const tasksByText = filteredTasks.filter(t => t.source_type === "text" || !t.source_type).length;
    const tasksByImage = filteredTasks.filter(t => t.source_type === "image").length;
    const tasksByRecurrence = filteredTasks.filter(t => t.recurrence_id).length;
    const tasksWithGoal = filteredTasks.filter(t => t.goal_id).length;
    const tasksImportant = filteredTasks.filter(t => t.importance).length;
    const tasksUrgent = filteredTasks.filter(t => t.urgency).length;

    const getCreationSource = (metadata: any) => {
      if (!metadata || typeof metadata !== "object") return "fab";
      return (metadata as any).creation_source || "fab";
    };

    const creationEvents = filteredEvents.filter(e => e.event_type?.startsWith("task_created"));
    const tasksByFab = creationEvents.filter(e => getCreationSource(e.metadata) === "fab").length;
    const tasksBySecondary = creationEvents.filter(e => getCreationSource(e.metadata) === "secondary").length;
    const tasksByMiniPlus = creationEvents.filter(e => getCreationSource(e.metadata) === "mini_plus").length;
    const tasksByMiniVoice = creationEvents.filter(e => getCreationSource(e.metadata) === "mini_voice").length;

    // Session duration
    const sessionEndEvents = filteredEvents.filter(e => e.event_type === "session_end");
    let totalSessionMinutes = 0;
    let sessionCount = 0;
    sessionEndEvents.forEach(e => {
      const meta = e.metadata as any;
      if (meta?.duration_minutes && typeof meta.duration_minutes === "number") {
        totalSessionMinutes += meta.duration_minutes;
        sessionCount++;
      }
    });
    const avgSessionMinutes = sessionCount > 0 ? Math.round(totalSessionMinutes / sessionCount) : 0;

    // Avg tasks per user per day
    const userDays = new Map<string, Set<string>>();
    const userTaskCount = new Map<string, number>();
    filteredTasks.forEach(t => {
      const uid = t.user_id;
      const day = t.created_at?.slice(0, 10) || "";
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

    // Per-user stats
    const userIds = [...new Set([...filteredTasks.map(t => t.user_id), ...profiles.map(p => p.user_id)])];
    const userStats = userIds.map(uid => {
      const userTasks = filteredTasks.filter(t => t.user_id === uid);
      const userEvents = filteredEvents.filter(e => e.user_id === uid);
      const profile = profileMap.get(uid);
      const m = metricsMap.get(uid);
      const userCreationEvents = userEvents.filter(e => e.event_type?.startsWith("task_created"));
      const userDaySet = new Set(userTasks.map(t => t.created_at?.slice(0, 10) || ""));

      return {
        user_id: uid,
        email: profile?.email || null,
        name: profile?.name || null,
        total_tasks: userTasks.length,
        completed_tasks: userTasks.filter(t => t.status === "done").length,
        voice_tasks: userTasks.filter(t => t.source_type === "voice").length,
        text_tasks: userTasks.filter(t => t.source_type === "text" || !t.source_type).length,
        image_tasks: userTasks.filter(t => t.source_type === "image").length,
        recurrence_tasks: userTasks.filter(t => t.recurrence_id).length,
        fab_tasks: userCreationEvents.filter(e => getCreationSource(e.metadata) === "fab").length,
        secondary_tasks: userCreationEvents.filter(e => getCreationSource(e.metadata) === "secondary").length,
        mini_plus_tasks: userCreationEvents.filter(e => getCreationSource(e.metadata) === "mini_plus").length,
        mini_voice_tasks: userCreationEvents.filter(e => getCreationSource(e.metadata) === "mini_voice").length,
        tasks_with_goal: userTasks.filter(t => t.goal_id).length,
        tasks_important: userTasks.filter(t => t.importance).length,
        tasks_urgent: userTasks.filter(t => t.urgency).length,
        streak_current: (m as any)?.streak_current || 0,
        first_session_date: profile?.created_at?.slice(0, 10) || null,
        last_active_date: (m as any)?.last_active_date || null,
        avg_tasks_per_day: userDaySet.size > 0 ? Math.round((userTasks.length / userDaySet.size) * 10) / 10 : 0,
      };
    });
    userStats.sort((a, b) => b.total_tasks - a.total_tasks);

    // Daily trends & user growth
    const dailyMetrics: Array<{ date: string; tasks_created: number; tasks_completed: number; active_users: number }> = [];
    const userGrowth: Array<{ date: string; cumulative_users: number }> = [];
    let cumulativeUsers = profiles.filter(p => (p.created_at || "") < startDateStr).length;

    for (let i = loopDays - 1; i >= 0; i--) {
      const d = format(subDays(today, i), "yyyy-MM-dd");
      const dayNewUsers = profiles.filter(p => p.created_at?.startsWith(d)).length;
      cumulativeUsers += dayNewUsers;
      userGrowth.push({ date: d, cumulative_users: cumulativeUsers });

      const dayTasks = filteredTasks.filter(t => t.created_at?.startsWith(d));
      const dayCompleted = filteredTasks.filter(t => t.completed_at?.startsWith(d));
      const dayActiveUsers = new Set(filteredEvents.filter(e => e.created_at?.startsWith(d)).map(e => e.user_id)).size;
      dailyMetrics.push({ date: d, tasks_created: dayTasks.length, tasks_completed: dayCompleted.length, active_users: dayActiveUsers });
    }

    // Funnel
    let usersWithFirstTask = 0;
    let usersWithFirstCompletion = 0;
    let usersWithPrioritization = 0;
    userIds.forEach(uid => {
      const profile = profileMap.get(uid);
      if (!profile) return;
      const signupDate = profile.created_at?.slice(0, 10);
      if (!signupDate || signupDate < startDateStr) return;

      const userTasks = filteredTasks.filter(t => t.user_id === uid);
      const firstDayTasks = userTasks.filter(t => t.created_at?.startsWith(signupDate));
      if (firstDayTasks.length > 0) usersWithFirstTask++;
      if (firstDayTasks.some(t => t.status === "done")) usersWithFirstCompletion++;

      const firstWeekEnd = format(new Date(parseISO(signupDate).getTime() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");
      const firstWeekTasks = userTasks.filter(t => {
        const dd = t.created_at?.slice(0, 10) || "";
        return dd >= signupDate && dd <= firstWeekEnd;
      });
      if (firstWeekTasks.some(t => t.importance || t.urgency || t.goal_id)) usersWithPrioritization++;
    });

    // Ecosystem metrics
    const goalsTotal = timeRange === "all" ? cleanGoals.length : cleanGoals.filter(g => (g.created_at || "") >= startDateStr).length;
    const goalsActive = timeRange === "all" ? cleanGoals.filter(g => g.active).length : cleanGoals.filter(g => g.active && (g.created_at || "") >= startDateStr).length;
    const tbTotal = timeRange === "all" ? cleanTimeBlocks.length : cleanTimeBlocks.filter(tb => (tb.created_at || "") >= startDateStr).length;
    const achTotal = timeRange === "all" ? cleanAchievements.length : cleanAchievements.filter(a => (a.unlocked_at || "") >= startDateStr).length;
    const cleanIC = timeRange === "all" ? cleanImageCaptures : cleanImageCaptures.filter(ic => (ic.created_at || "") >= startDateStr);
    const friendshipsTotal = timeRange === "all" ? cleanFriendships.length : cleanFriendships.filter(f => (f.created_at || "") >= startDateStr).length;

    return new Response(JSON.stringify({
      totalUsers, activeToday, totalTasksCreated, totalTasksCompleted,
      avgTasksPerUserPerDay, avgSessionMinutes,
      tasksByVoice, tasksByText, tasksByImage, tasksByRecurrence,
      tasksByFab, tasksBySecondary, tasksByMiniPlus, tasksByMiniVoice,
      tasksWithGoal, tasksImportant, tasksUrgent,
      userStats, dailyMetrics, userGrowth,
      funnel: { total_users: totalUsers, users_with_first_task: usersWithFirstTask, users_with_first_completion: usersWithFirstCompletion, users_with_prioritization: usersWithPrioritization },
      goalsTotal, goalsActive, timeBlocksTotal: tbTotal, achievementsUnlocked: achTotal,
      imageCapturesTotal: cleanIC.length, tasksExtractedFromImages: cleanIC.reduce((acc, ic) => acc + (ic.tasks_extracted || 0), 0),
      friendshipsTotal,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
