import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_API_KEY");
const APP_URL = Deno.env.get("APP_URL") || "https://webadonai.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIME_PREFIX_REGEX = /^\[T:(\d{2}:\d{2})-(\d{2}:\d{2})\]/;

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

const todayKey = (value: Date) => value.toISOString().slice(0, 10);

const parseTaskStart = (description: string | null, dueDate: string | null) => {
  if (!description || !dueDate) return null;
  const match = description.match(TIME_PREFIX_REGEX);
  if (!match) return null;
  return new Date(`${dueDate}T${match[1]}:00`);
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
  `${kind}:${id}:${todayKey(reminderAt)}:${String(reminderAt.getHours()).padStart(2, "0")}:${String(reminderAt.getMinutes()).padStart(2, "0")}:${minutesBefore}`;

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

const sendOneSignalPush = async (externalId: string, title: string, body: string, url: string) => {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) return false;

  const response = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${ONESIGNAL_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_aliases: { external_id: [externalId] },
      target_channel: "push",
      headings: { en: title },
      contents: { en: body },
      url,
      web_url: url,
    }),
  });

  return response.ok;
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: usersToRemind, error: usersError } = await supabase
      .from("settings")
      .select("user_id, notifications_enabled, email_notifications_enabled")
      .or("notifications_enabled.is.null,notifications_enabled.eq.true");

    if (usersError) throw usersError;

    const results: Array<Record<string, unknown>> = [];
    const now = new Date();

    for (const settings of usersToRemind ?? []) {
      const userId = settings.user_id as string;
      const pushEnabled = settings.notifications_enabled !== false;
      const emailEnabled = settings.email_notifications_enabled !== false;

      const [{ data: profile }, { data: tasks }, { data: timeBlocks }] = await Promise.all([
        supabase
          .from("profiles")
          .select("email, name")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("tasks")
          .select("id, title, description, due_date, status, metadata")
          .eq("user_id", userId)
          .eq("status", "pending"),
        supabase
          .from("time_blocks")
          .select("id, title, block_date, start_time, is_recurring, days_of_week, metadata")
          .eq("user_id", userId),
      ]);

      const reminders: Array<{
        id: string;
        kind: "task" | "event";
        title: string;
        reminderAt: Date;
        minutesBefore: number;
        metadata: Record<string, unknown> | null;
        pushBody: string;
      }> = [];

      for (const task of (tasks ?? []) as TaskRow[]) {
        const reminder = normalizeReminder(task.metadata);
        const start = parseTaskStart(task.description, task.due_date);
        if (!reminder || !start) continue;

        const reminderAt = new Date(start.getTime() - reminder.minutes_before * 60000);
        const key = buildReminderKey("task", task.id, reminderAt, reminder.minutes_before);
        if (!isDueInWindow(now, reminderAt) || hasBeenSent(task.metadata, key)) continue;

        reminders.push({
          id: task.id,
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
          const todayDay = now.getDay();
          if (!block.days_of_week.includes(todayDay)) continue;
        }

        const blockDate = block.block_date || todayKey(now);
        const start = new Date(`${blockDate}T${String(block.start_time).slice(0, 5)}:00`);
        if (Number.isNaN(start.getTime())) continue;

        const reminderAt = new Date(start.getTime() - reminder.minutes_before * 60000);
        const key = buildReminderKey("event", block.id, reminderAt, reminder.minutes_before);
        if (!isDueInWindow(now, reminderAt) || hasBeenSent(block.metadata, key)) continue;

        reminders.push({
          id: block.id,
          kind: "event",
          title: block.title,
          reminderAt,
          minutesBefore: reminder.minutes_before,
          metadata: block.metadata,
          pushBody: `${block.title}. ${reminder.minutes_before === 0 ? "Es ahora." : `Empieza en ${reminder.minutes_before} min.`}`,
        });
      }

      if (reminders.length === 0) continue;

      const sent: Array<Record<string, unknown>> = [];
      for (const reminder of reminders) {
        const key = buildReminderKey(reminder.kind, reminder.id, reminder.reminderAt, reminder.minutesBefore);
        const pushTitle = reminder.kind === "task" ? `Tarea: ${reminder.title}` : reminder.title;
        const pushUrl = `${APP_URL}/daily`;

        let pushSent = false;
        if (pushEnabled) {
          pushSent = await sendOneSignalPush(userId, pushTitle, reminder.pushBody, pushUrl);
        }

        let emailSent = false;
        if (emailEnabled && profile?.email) {
          emailSent = await sendEmailReminder(
            profile.email,
            (profile as { name?: string | null } | null)?.name ?? null,
            pushTitle,
            reminder.pushBody
          );
        }

        if (pushSent || emailSent) {
          const nextMetadata = attachReminderKey(reminder.metadata, key);
          const table = reminder.kind === "task" ? "tasks" : "time_blocks";
          const { error: updateError } = await supabase
            .from(table)
            .update({ metadata: nextMetadata })
            .eq("id", reminder.id);

          if (updateError) {
            sent.push({ id: reminder.id, pushSent, emailSent, updateError: updateError.message });
          } else {
            sent.push({ id: reminder.id, pushSent, emailSent });
          }
        } else {
          sent.push({ id: reminder.id, pushSent, emailSent, skipped: true });
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
