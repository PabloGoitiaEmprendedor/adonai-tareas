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

    // Fetch auth users (authoritative source for email)
    const { data: authData } = await supabase.auth.admin.listUsers();
    const authUserMap = new Map(
      (authData?.users || []).map(u => [u.id, u])
    );

    // Fetch all tasks
    const { data: allTasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, user_id, status, source_type, importance, urgency, goal_id, recurrence_id, created_at, completed_at, due_date")
      .is("deleted_at", null);
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
      .select("user_id, streak_current, streak_max, last_active_date");
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
    // Users who opened the app today (any event)
    const activeTodayOpened = new Set(todayEvents.map(e => e.user_id)).size;
    // Users who did a REAL action today (task_created, task_completed, session_start)
    const REAL_ACTION_TYPES = new Set([
      "task_created_text", 
      "task_created_voice", 
      "task_created_image", 
      "task_completed",
      "day_active",
      "session_start"
    ]);
    const activeTodayAction = new Set(
      todayEvents.filter(e => REAL_ACTION_TYPES.has(e.event_type || "")).map(e => e.user_id)
    ).size;
    const activeToday = activeTodayOpened; // keep for backward compat
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

    // ─── NEW: WAU (Weekly Active Users) — users with valid activity in last 7 days ───
    const sevenDaysAgoStr = format(subDays(today, 7), "yyyy-MM-dd");
    const VALID_ACTIVITY_EVENTS = new Set([
      "task_created_text", 
      "task_created_voice", 
      "task_created_image", 
      "task_completed",
      "day_active",
      "session_start"
    ]);
    const recentValidEvents = events.filter(e => {
      const eventDate = e.created_at?.slice(0, 10) || "";
      return eventDate >= sevenDaysAgoStr && VALID_ACTIVITY_EVENTS.has(e.event_type || "");
    });
    const wau = new Set(recentValidEvents.map(e => e.user_id)).size;

    // Per-user stats — with "status" field (activo / en_riesgo / churned)
    const userIds = [...new Set([...tasks.map(t => t.user_id), ...profiles.map(p => p.user_id)])];
    const userStats = userIds.map(uid => {
      const userTasks = tasks.filter(t => t.user_id === uid);
      const userEvents = events.filter(e => e.user_id === uid);
      const profile = profileMap.get(uid);
      const m = metricsMap.get(uid);
      const userCreationEvents = userEvents.filter(e => e.event_type?.startsWith("task_created"));
      const userDaySet = new Set(userTasks.map(t => t.created_at?.slice(0, 10) || ""));

      // Determine user status based on last valid activity
      const allUserEvents = events.filter(e => e.user_id === uid && VALID_ACTIVITY_EVENTS.has(e.event_type || ""));
      let lastValidDate: string | null = null;
      allUserEvents.forEach(e => {
        const d = e.created_at?.slice(0, 10) || "";
        if (!lastValidDate || d > lastValidDate) lastValidDate = d;
      });
      // Also check task dates as fallback
      const allUserTasks = userTasks;
      allUserTasks.forEach(t => {
        const cd = t.created_at?.slice(0, 10) || "";
        const compd = t.completed_at?.slice(0, 10) || "";
        if (cd && (!lastValidDate || cd > lastValidDate)) lastValidDate = cd;
        if (compd && (!lastValidDate || compd > lastValidDate)) lastValidDate = compd;
      });

      let status: "activo" | "en_riesgo" | "churned" = "churned";
      if (lastValidDate) {
        const lastDate = parseISO(lastValidDate);
        const daysSinceLast = Math.floor((today.getTime() - lastDate.getTime()) / 86400000);
        if (daysSinceLast <= 2) status = "activo";
        else if (daysSinceLast <= 6) status = "en_riesgo";
        else status = "churned";
      }

      return {
        user_id: uid,
        email: authUserMap.get(uid)?.email || profile?.email || null,
        name: profile?.name || null,
        is_anonymous: !authUserMap.get(uid)?.email,
        registration_date: authUserMap.get(uid)?.email ? (authUserMap.get(uid)?.created_at?.slice(0, 10) || null) : null,
        first_event_date: (() => {
          let earliest: string | null = null;
          userTasks.forEach(t => {
            const d = t.created_at?.slice(0, 10);
            if (d && (!earliest || d < earliest)) earliest = d;
          });
          return earliest;
        })(),
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
        last_active_date: (m as any)?.last_active_date || lastValidDate || null,
        avg_tasks_per_day: userDaySet.size > 0 ? Math.round((userTasks.length / userDaySet.size) * 10) / 10 : 0,
        status,
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

    // ═══════════════════════════════════════════════════════════════════════
    // COHORT RETENTION — CORRECTED
    // Anchor: Día 0 = profiles.created_at (registration date)
    // Activity: task_created, task_edited, task_completed events
    //   PLUS tasks table: created_at and completed_at dates
    // Retention Day N: calendar day registered_at + N
    // Anti double-counting: DISTINCT(user_id, DATE(event_at))
    // ═══════════════════════════════════════════════════════════════════════

    const getMonday = (d: Date) => {
      const day = d.getDay() || 7;
      const mon = new Date(d);
      if (day !== 1) mon.setHours(-24 * (day - 1));
      return format(mon, "yyyy-MM-dd");
    };

    // Pre-index tasks by user_id for O(1) lookups
    const tasksByUser = new Map<string, typeof tasks>();
    tasks.forEach(t => {
      if (!tasksByUser.has(t.user_id)) tasksByUser.set(t.user_id, []);
      tasksByUser.get(t.user_id)!.push(t);
    });

    // Valid activity events for cohort retention
    const COHORT_VALID_EVENT_TYPES = new Set([
      "task_created_text", "task_created_voice", "task_created_image",
      "task_completed",
    ]);

    // Pre-index valid events by user_id
    const validEventsByUser = new Map<string, typeof events>();
    events.forEach(e => {
      if (COHORT_VALID_EVENT_TYPES.has(e.event_type || "")) {
        if (!validEventsByUser.has(e.user_id)) validEventsByUser.set(e.user_id, []);
        validEventsByUser.get(e.user_id)!.push(e);
      }
    });

    // Count tasks created on registration day (Day 0) for subcohort segmentation
    const userTasksOnDay0 = new Map<string, number>();

    const cohortsMap = new Map<string, { 
      all: { users: string[], activeDays: { [uid: string]: Set<number> } },
      sub_1_2: { users: string[], activeDays: { [uid: string]: Set<number> } },
      sub_3_plus: { users: string[], activeDays: { [uid: string]: Set<number> } }
    }>();

    profiles.forEach(p => {
      // Anchor = registration date (profiles.created_at)
      if (!p.created_at) return;
      const registrationDate = parseISO(p.created_at.slice(0, 10));
      const registrationStr = format(registrationDate, "yyyy-MM-dd");
      const registrationTime = registrationDate.getTime();

      const mondayStr = getMonday(registrationDate);
      if (!cohortsMap.has(mondayStr)) {
        cohortsMap.set(mondayStr, { 
          all: { users: [], activeDays: {} },
          sub_1_2: { users: [], activeDays: {} },
          sub_3_plus: { users: [], activeDays: {} }
        });
      }
      
      const cohort = cohortsMap.get(mondayStr)!;

      // Collect all active calendar dates for this user
      // Sources: valid events + task created_at + task completed_at
      const userActiveDates = new Set<string>();

      // From valid events (task_created_*, task_completed)
      const userValidEvents = validEventsByUser.get(p.user_id) || [];
      userValidEvents.forEach(e => {
        if (e.created_at) userActiveDates.add(e.created_at.slice(0, 10));
      });

      // From tasks table as fallback (created_at = task_created, completed_at = task_completed)
      const userTasks = tasksByUser.get(p.user_id) || [];
      userTasks.forEach(t => {
        if (t.created_at) userActiveDates.add(t.created_at.slice(0, 10));
        if (t.completed_at) userActiveDates.add(t.completed_at.slice(0, 10));
      });

      // Count tasks on Day 0 (registration date) for subcohort segmentation
      const day0Tasks = userTasks.filter(t => t.created_at?.slice(0, 10) === registrationStr).length;
      userTasksOnDay0.set(p.user_id, day0Tasks);

      // Convert calendar dates → day indices relative to registration
      // Day N = calendar day, NOT 24h blocks
      const dayIndices = new Set<number>();
      userActiveDates.forEach(dateStr => {
        const d = parseISO(dateStr);
        const diffDays = Math.floor((d.getTime() - registrationTime) / 86400000);
        if (diffDays >= 0 && diffDays <= 30) {
          dayIndices.add(diffDays);
        }
      });

      // Add to cohort groups
      cohort.all.users.push(p.user_id);
      cohort.all.activeDays[p.user_id] = dayIndices;

      if (day0Tasks >= 3) {
        cohort.sub_3_plus.users.push(p.user_id);
        cohort.sub_3_plus.activeDays[p.user_id] = dayIndices;
      } else {
        cohort.sub_1_2.users.push(p.user_id);
        cohort.sub_1_2.activeDays[p.user_id] = dayIndices;
      }
    });

    const processCohortGroup = (group: { users: string[], activeDays: { [uid: string]: Set<number> } }) => {
      const totalUsers = group.users.length;
      const retention: { [day: number]: number } = {};
      for (let i = 0; i <= 30; i++) {
        let activeCount = 0;
        group.users.forEach(uid => {
          const days = group.activeDays[uid];
          if (days && days.has(i)) activeCount++;
        });
        retention[i] = totalUsers > 0 ? Math.round((activeCount / totalUsers) * 100) : 0;
      }
      if (totalUsers > 0) retention[0] = 100;
      
      const userDetails = group.users.map(uid => ({
        uid,
        activeDaysCount: group.activeDays[uid]?.size || 0,
        days: Array.from(group.activeDays[uid] || [])
      }));

      return { users: totalUsers, retention, userDetails };
    };

    const cohortRetention = Array.from(cohortsMap.entries())
      .filter(([monday]) => monday >= "2026-04-20")
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([monday, data]) => ({
        cohort: `Semana del ${monday}`,
        ...processCohortGroup(data.all),
        subcohorts: {
          "1-2 tareas": processCohortGroup(data.sub_1_2),
          "3+ tareas": processCohortGroup(data.sub_3_plus)
        }
      }));

    // ─── NEW: Global D1, D7 retention ────────────────────────────────────
    let totalD1 = 0, countD1 = 0, totalD7 = 0, countD7 = 0;
    cohortRetention.forEach(c => {
      if (c.users > 0) {
        if (c.retention[1] !== undefined) { totalD1 += c.retention[1]; countD1++; }
        if (c.retention[7] !== undefined) { totalD7 += c.retention[7]; countD7++; }
      }
    });
    const retentionD1 = countD1 > 0 ? Math.round(totalD1 / countD1) : 0;
    const retentionD7 = countD7 > 0 ? Math.round(totalD7 / countD7) : 0;

    // ═══════════════════════════════════════════════════════════════════════
    // FEATURE RETENTION CORRELATION
    // For each feature/action, compare retention of users who used it
    // vs users who didn't. "Retained" = has valid activity in last 7 days.
    // ═══════════════════════════════════════════════════════════════════════
    const retainedUserIds = new Set(recentValidEvents.map(e => e.user_id));
    const allUserIds = profiles.map(p => p.user_id);

    // Pre-index data per user for fast lookups
    const userTasksMap = new Map<string, typeof tasks>();
    tasks.forEach(t => {
      if (!userTasksMap.has(t.user_id)) userTasksMap.set(t.user_id, []);
      userTasksMap.get(t.user_id)!.push(t);
    });
    const userEventsMap = new Map<string, typeof events>();
    events.forEach(e => {
      if (!userEventsMap.has(e.user_id)) userEventsMap.set(e.user_id, []);
      userEventsMap.get(e.user_id)!.push(e);
    });
    const goalsPerUser = new Set(cleanGoals.map(g => g.user_id));
    const tbPerUser = new Set(cleanTimeBlocks.map(tb => tb.user_id));
    const achPerUser = new Set(cleanAchievements.map(a => a.user_id));
    const imgPerUser = new Set(cleanImageCaptures.map(ic => ic.user_id));
    const friendPerUser = new Set([
      ...cleanFriendships.map(f => f.requester_id),
      ...cleanFriendships.map(f => f.addressee_id),
    ].filter(Boolean));

    // Feature definitions: [label, emoji, predicate(userId) => boolean]
    type FeaturePredicate = (uid: string) => boolean;
    const featureDefinitions: Array<{ key: string; label: string; emoji: string; check: FeaturePredicate }> = [
      {
        key: "completed_task", label: "Completó ≥1 tarea", emoji: "✅",
        check: (uid) => (userTasksMap.get(uid) || []).some(t => t.status === "done"),
      },
      {
        key: "voice_task", label: "Creó tarea por voz", emoji: "🎤",
        check: (uid) => (userTasksMap.get(uid) || []).some(t => t.source_type === "voice"),
      },
      {
        key: "image_task", label: "Creó tarea por imagen", emoji: "📸",
        check: (uid) => (userTasksMap.get(uid) || []).some(t => t.source_type === "image"),
      },
      {
        key: "set_goal", label: "Creó una meta", emoji: "🎯",
        check: (uid) => goalsPerUser.has(uid),
      },
      {
        key: "used_priority", label: "Usó priorización", emoji: "⚡",
        check: (uid) => (userTasksMap.get(uid) || []).some(t => t.importance || t.urgency),
      },
      {
        key: "recurrent_task", label: "Creó tarea recurrente", emoji: "🔁",
        check: (uid) => (userTasksMap.get(uid) || []).some(t => t.recurrence_id),
      },
      {
        key: "time_block", label: "Usó bloques de tiempo", emoji: "📅",
        check: (uid) => tbPerUser.has(uid),
      },
      {
        key: "achievement", label: "Desbloqueó un logro", emoji: "🏆",
        check: (uid) => achPerUser.has(uid),
      },
      {
        key: "friendship", label: "Agregó un amigo", emoji: "👥",
        check: (uid) => friendPerUser.has(uid),
      },
      {
        key: "mini_window", label: "Usó ventana mini", emoji: "🖥️",
        check: (uid) => (userEventsMap.get(uid) || []).some(e => {
          const src = (e.metadata as any)?.creation_source;
          return src === "mini_plus" || src === "mini_voice";
        }),
      },
      {
        key: "3plus_tasks_day0", label: "3+ tareas el primer día", emoji: "🚀",
        check: (uid) => {
          const profile = profileMap.get(uid);
          if (!profile?.created_at) return false;
          const regDate = profile.created_at.slice(0, 10);
          return (userTasksMap.get(uid) || []).filter(t => t.created_at?.slice(0, 10) === regDate).length >= 3;
        },
      },
      {
        key: "completed_onboarding", label: "Completó onboarding", emoji: "📋",
        check: (uid) => (userEventsMap.get(uid) || []).some(e => e.event_type === "onboarding_completed"),
      },
      {
        key: "linked_goal_to_task", label: "Vinculó meta a tarea", emoji: "🔗",
        check: (uid) => (userTasksMap.get(uid) || []).some(t => t.goal_id),
      },
      {
        key: "5plus_tasks_total", label: "5+ tareas creadas total", emoji: "📝",
        check: (uid) => (userTasksMap.get(uid) || []).length >= 5,
      },
    ];

    const featureRetention = featureDefinitions.map(feat => {
      const usersWho = allUserIds.filter(uid => feat.check(uid));
      const usersWhoNot = allUserIds.filter(uid => !feat.check(uid));

      const retainedWho = usersWho.filter(uid => retainedUserIds.has(uid)).length;
      const retainedWhoNot = usersWhoNot.filter(uid => retainedUserIds.has(uid)).length;
      const churnedWhoNot = usersWhoNot.length - retainedWhoNot;

      const pctRetainedWho = usersWho.length > 0 ? Math.round((retainedWho / usersWho.length) * 100) : 0;
      const pctRetainedWhoNot = usersWhoNot.length > 0 ? Math.round((retainedWhoNot / usersWhoNot.length) * 100) : 0;
      const pctChurnedWhoNot = usersWhoNot.length > 0 ? Math.round((churnedWhoNot / usersWhoNot.length) * 100) : 0;
      const delta = pctRetainedWho - pctRetainedWhoNot;

      return {
        key: feat.key,
        label: feat.label,
        emoji: feat.emoji,
        usersWho: usersWho.length,
        usersWhoNot: usersWhoNot.length,
        retainedWho,
        retainedWhoNot,
        churnedWhoNot,
        pctRetainedWho,
        pctRetainedWhoNot,
        pctChurnedWhoNot,
        delta,
      };
    });

    // Sort by delta descending (most impactful first)
    featureRetention.sort((a, b) => b.delta - a.delta);

    return new Response(JSON.stringify({
      totalUsers, activeToday, activeTodayOpened, activeTodayAction,
      totalTasksCreated, totalTasksCompleted,
      avgTasksPerUserPerDay, avgSessionMinutes,
      tasksByVoice, tasksByText, tasksByImage, tasksByRecurrence,
      tasksByFab, tasksBySecondary, tasksByMiniPlus, tasksByMiniVoice,
      tasksWithGoal, tasksImportant, tasksUrgent,
      userStats, dailyMetrics, userGrowth,
      funnel: { total_users: totalUsers, users_with_first_task: usersWithFirstTask, users_with_first_completion: usersWithFirstCompletion, users_with_prioritization: usersWithPrioritization },
      goalsTotal, goalsActive, timeBlocksTotal: tbTotal, achievementsUnlocked: achTotal,
      imageCapturesTotal: cleanIC.length, tasksExtractedFromImages: cleanIC.reduce((acc, ic) => acc + (ic.tasks_extracted || 0), 0),
      friendshipsTotal,
      cohortRetention,
      // New cohort KPIs
      retentionD1,
      retentionD7,
      wau,
      featureRetention,
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
