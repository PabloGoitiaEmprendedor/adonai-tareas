import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const APP_URL = Deno.env.get("APP_URL") || "https://webadonai.com";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIME_PREFIX_REGEX = /^\[T:(\d{2}:\d{2})-(\d{2}:\d{2})\]/;
const DEFAULT_TIME_ZONE = "America/Caracas";

type ReminderSettings = {
  enabled?: boolean;
  minutes_before?: number;
};

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string | null;
  metadata: Record<string, unknown> | null;
};

type TimeBlockRow = {
  id: string;
  title: string;
  block_date: string | null;
  start_time: string;
  is_recurring: boolean | null;
  days_of_week: number[] | null;
  metadata: Record<string, unknown> | null;
};

type ProfileRow = {
  user_id: string;
  email: string | null;
  name: string | null;
  timezone?: string | null;
};

type SettingsRow = {
  user_id: string;
  notifications_enabled: boolean | null;
  email_notifications_enabled: boolean | null;
};

type GoogleCalendarTokenRow = {
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
  calendar_id: string | null;
};

type GoogleCalendarEvent = {
  id: string;
  title: string;
  start: string;
  reminders: { useDefault?: boolean; overrides?: { method: string; minutes: number }[] } | null;
};

const getZonedParts = (value: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
};

const getLocalDateKey = (value: Date, timeZone: string) => {
  const { year, month, day } = getZonedParts(value, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const getLocalWeekday = (value: Date, timeZone: string) => {
  const { year, month, day } = getZonedParts(value, timeZone);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

const localDateTimeToUtc = (date: string, time: string, timeZone: string) => {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.slice(0, 5).split(":").map(Number);
  if ([year, month, day, hour, minute].some((value) => !Number.isFinite(value))) return null;

  const localTimestamp = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = new Date(localTimestamp);

  // Recalculate once to account for DST transitions in zones that observe them.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const zoned = getZonedParts(candidate, timeZone);
    const renderedTimestamp = Date.UTC(
      zoned.year,
      zoned.month - 1,
      zoned.day,
      zoned.hour,
      zoned.minute,
      zoned.second
    );
    candidate = new Date(candidate.getTime() + localTimestamp - renderedTimestamp);
  }

  return candidate;
};

const parseTaskStart = (description: string | null, dueDate: string | null, timeZone: string) => {
  if (!description || !dueDate) return null;
  const match = description.match(TIME_PREFIX_REGEX);
  if (!match) return null;
  return localDateTimeToUtc(dueDate, match[1], timeZone);
};

const normalizeReminder = (metadata: Record<string, unknown> | null | undefined): ReminderSettings | null => {
  if (!metadata || typeof metadata !== "object") return null;
  const source = metadata as Record<string, unknown>;
  const reminder = source.reminder as ReminderSettings | undefined
    || source.task_reminder as ReminderSettings | undefined
    || source.event_reminder as ReminderSettings | undefined;

  if (!reminder?.enabled) return null;
  const minutesBefore = Number(reminder.minutes_before);
  return {
    enabled: true,
    minutes_before: Number.isFinite(minutesBefore) ? minutesBefore : 15,
  };
};

const buildReminderKey = (kind: "task" | "event", id: string, reminderAt: Date, minutesBefore: number) =>
  `${kind}:${id}:${reminderAt.toISOString()}:${minutesBefore}`;

const hasBeenSent = (metadata: Record<string, unknown> | null | undefined, key: string) =>
  Boolean(metadata && typeof metadata.notification_key === "string" && metadata.notification_key === key);

const attachReminderKey = (metadata: Record<string, unknown> | null | undefined, key: string) => {
  const next = metadata && typeof metadata === "object" ? { ...metadata } : {};
  next.notification_key = key;
  next.notification_sent_at = new Date().toISOString();
  return next;
};

const isDueInWindow = (now: Date, reminderAt: Date) => {
  const diffMs = now.getTime() - reminderAt.getTime();
  return diffMs >= 0 && diffMs <= 15 * 60 * 1000;
};

const sendEmailReminder = async (email: string, name: string | null, title: string, body: string) => {
  if (!RESEND_API_KEY) return false;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Adonai <notificaciones@tu-dominio.com>",
      to: [email],
      subject: title,
      html: `
        <h1>Hola ${name || "usuario"},</h1>
        <p>${body}</p>
        <p>Abre Adonai para verlo en contexto.</p>
      `,
    }),
  });

  return res.ok;
};

const refreshGoogleAccessToken = async (refreshToken: string) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) return null;

  return {
    access_token: data.access_token as string,
    expires_in: Number(data.expires_in) || 3600,
  };
};

const fetchVisibleGoogleCalendarIds = async (accessToken: string, fallbackCalendarId: string) => {
  const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) return [fallbackCalendarId];

  const data = await response.json().catch(() => ({}));
  const ids = (data.items || [])
    .filter((calendar: any) => calendar?.selected !== false && calendar?.accessRole !== "freeBusyReader")
    .map((calendar: any) => calendar.id)
    .filter(Boolean);

  return ids.length > 0 ? ids : [fallbackCalendarId];
};

const fetchGoogleCalendarEvents = async (
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleCalendarEvent[]> => {
  const items: any[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "2500",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) return [];

    const data = await response.json().catch(() => ({}));
    items.push(...(data.items || []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return items
    .filter((event) => event?.status !== "cancelled")
    .map((event) => ({
      id: `${calendarId}:${event.id}`,
      title: event.summary || "(Sin título)",
      start: event.start?.dateTime || event.start?.date,
      reminders: event.reminders || null,
    }))
    .filter((event) => Boolean(event.start));
};

const getGoogleReminderSettings = (reminders: GoogleCalendarEvent["reminders"]): ReminderSettings[] => {
  const overrides = reminders?.overrides
    ?.filter((reminder) => Number.isFinite(Number(reminder.minutes)))
    .map((reminder) => ({
      enabled: true,
      minutes_before: Number(reminder.minutes),
    }));

  if (overrides && overrides.length > 0) return overrides;
  if (reminders?.useDefault) return [{ enabled: true, minutes_before: 15 }];
  return [];
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method === "GET") {
      return new Response(JSON.stringify({
        ready: true,
        message: "Task reminders function is running (push notifications disabled, email only)",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const [{ data: profiles, error: profilesError }, { data: settingsRows, error: settingsError }] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, email, name, timezone"),
      supabase
        .from("settings")
        .select("user_id, notifications_enabled, email_notifications_enabled"),
    ]);

    if (profilesError) throw profilesError;
    if (settingsError) throw settingsError;

    const settingsByUserId = new Map(
      ((settingsRows ?? []) as SettingsRow[]).map((settings) => [settings.user_id, settings])
    );

    const usersToRemind = ((profiles ?? []) as ProfileRow[]).filter((profile) => {
      const settings = settingsByUserId.get(profile.user_id);
      return settings?.notifications_enabled !== false;
    });

    const results: Array<Record<string, unknown>> = [];
    const now = new Date();

    for (const profile of usersToRemind) {
      const userId = profile.user_id;
      const settings = settingsByUserId.get(userId);
      const emailEnabled = settings?.email_notifications_enabled !== false;

      const [{ data: tasks }, { data: timeBlocks }, { data: googleToken }] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, title, description, due_date, status, metadata")
          .eq("user_id", userId)
          .eq("status", "pending"),
        supabase
          .from("time_blocks")
          .select("id, title, block_date, start_time, is_recurring, days_of_week, metadata")
          .eq("user_id", userId),
        supabase
          .from("google_calendar_tokens")
          .select("user_id, access_token, refresh_token, expires_at, calendar_id")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);
      const timeZone = profile.timezone || DEFAULT_TIME_ZONE;

      const reminders: Array<{
        id: string;
        source: "task" | "time_block" | "google";
        kind: "task" | "event";
        title: string;
        reminderAt: Date;
        minutesBefore: number;
        metadata: Record<string, unknown> | null;
        pushBody: string;
      }> = [];

      for (const task of (tasks ?? []) as TaskRow[]) {
        const reminder = normalizeReminder(task.metadata);
        const start = parseTaskStart(task.description, task.due_date, timeZone);
        if (!reminder || !start) continue;

        const reminderAt = new Date(start.getTime() - reminder.minutes_before * 60000);
        const key = buildReminderKey("task", task.id, reminderAt, reminder.minutes_before);
        if (!isDueInWindow(now, reminderAt) || hasBeenSent(task.metadata, key)) continue;

        reminders.push({
          id: task.id,
          source: "task",
          kind: "task",
          title: task.title,
          reminderAt,
          minutesBefore: reminder.minutes_before,
          metadata: task.metadata,
          pushBody: `${task.title}. ${reminder.minutes_before === 0 ? "Es ahora." : `Empieza en ${reminder.minutes_before} min.`}`,
        });
      }

      for (const block of (timeBlocks ?? []) as TimeBlockRow[]) {
        const reminder = normalizeReminder(block.metadata);
        if (!reminder) continue;

        if (block.is_recurring && Array.isArray(block.days_of_week) && block.days_of_week.length > 0) {
          const todayDay = getLocalWeekday(now, timeZone);
          if (!block.days_of_week.includes(todayDay)) continue;
        }

        const blockDate = block.block_date || getLocalDateKey(now, timeZone);
        const start = localDateTimeToUtc(blockDate, String(block.start_time), timeZone);
        if (!start) continue;

        const reminderAt = new Date(start.getTime() - reminder.minutes_before * 60000);
        const key = buildReminderKey("event", block.id, reminderAt, reminder.minutes_before);
        if (!isDueInWindow(now, reminderAt) || hasBeenSent(block.metadata, key)) continue;

        reminders.push({
          id: block.id,
          source: "time_block",
          kind: "event",
          title: block.title,
          reminderAt,
          minutesBefore: reminder.minutes_before,
          metadata: block.metadata,
          pushBody: `${block.title}. ${reminder.minutes_before === 0 ? "Es ahora." : `Empieza en ${reminder.minutes_before} min.`}`,
        });
      }

      const googleTokenRow = googleToken as GoogleCalendarTokenRow | null;
      if (googleTokenRow) {
        let accessToken = googleTokenRow.access_token;
        if (new Date(googleTokenRow.expires_at) <= now && googleTokenRow.refresh_token) {
          const refreshed = await refreshGoogleAccessToken(googleTokenRow.refresh_token);
          if (refreshed) {
            accessToken = refreshed.access_token;
            await supabase
              .from("google_calendar_tokens")
              .update({
                access_token: refreshed.access_token,
                expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
              })
              .eq("user_id", userId);
          }
        }

        const timeMin = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
        const timeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const calendarIds = await fetchVisibleGoogleCalendarIds(accessToken, googleTokenRow.calendar_id || "primary");
        const googleEvents = (await Promise.all(
          calendarIds.map((calendarId) => fetchGoogleCalendarEvents(accessToken, calendarId, timeMin, timeMax))
        )).flat();

        for (const event of googleEvents) {
          const start = event.start.includes("T")
            ? new Date(event.start)
            : localDateTimeToUtc(event.start, "09:00", timeZone);
          if (!start || Number.isNaN(start.getTime())) continue;

          for (const reminder of getGoogleReminderSettings(event.reminders)) {
            const minutesBefore = Number(reminder.minutes_before);
            const reminderAt = new Date(start.getTime() - minutesBefore * 60000);
            if (!isDueInWindow(now, reminderAt)) continue;

            reminders.push({
              id: `google:${event.id}`,
              source: "google",
              kind: "event",
              title: event.title,
              reminderAt,
              minutesBefore,
              metadata: null,
              pushBody: `${event.title}. ${minutesBefore === 0 ? "Es ahora." : `Empieza en ${minutesBefore} min.`}`,
            });
          }
        }
      }

      if (reminders.length === 0) continue;

      const sent: Array<Record<string, unknown>> = [];
      for (const reminder of reminders) {
        const key = buildReminderKey(reminder.kind, reminder.id, reminder.reminderAt, reminder.minutesBefore);
        const reminderTitle = reminder.kind === "task" ? `Tarea: ${reminder.title}` : reminder.title;

        let emailSent = false;
        if (emailEnabled && profile?.email) {
          emailSent = await sendEmailReminder(
            profile.email,
            (profile as { name?: string | null } | null)?.name ?? null,
            reminderTitle,
            reminder.pushBody
          );
        }

        if (emailSent && reminder.source === "google") {
          sent.push({ id: reminder.id, source: reminder.source, emailSent });
        } else if (emailSent) {
          const nextMetadata = attachReminderKey(reminder.metadata, key);
          const table = reminder.source === "task" ? "tasks" : "time_blocks";
          const { error: updateError } = await supabase
            .from(table)
            .update({ metadata: nextMetadata })
            .eq("id", reminder.id);

          if (updateError) {
            sent.push({ id: reminder.id, source: reminder.source, emailSent, updateError: updateError.message });
          } else {
            sent.push({ id: reminder.id, source: reminder.source, emailSent });
          }
        } else {
          sent.push({ id: reminder.id, source: reminder.source, emailSent, skipped: true });
        }
      }

      results.push({
        user_id: userId,
        reminders: sent,
      });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
