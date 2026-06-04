import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { addDays, format, parseISO } from 'date-fns';
import { useTasks } from '@/hooks/useTasks';
import { useTimeBlocks } from '@/hooks/useTimeBlocks';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { getReminderLabel, getReminderSettings } from '@/lib/reminders';
import { playReminderSound } from '@/lib/soundEffects';

const TIME_PREFIX_REGEX = /^\[T:(\d{2}:\d{2})-(\d{2}:\d{2})\]/;

type AdminNotification = Database['public']['Tables']['admin_notifications']['Row'];

type NotificationTask = {
  id: string;
  title: string;
  description: string | null;
  link: string | null;
  due_date: string | null;
  status: string | null;
  metadata?: Record<string, unknown> | null;
};

type NotificationTimeBlock = {
  id: string;
  title: string;
  block_date: string | null;
  start_time: string;
  is_recurring: boolean | null;
  days_of_week: number[] | null;
  metadata?: Record<string, unknown> | null;
};

type ScheduledReminder = {
  id: string;
  title: string;
  start: Date;
  reminder: { enabled: boolean; minutes_before: number };
  kind: 'task' | 'event';
  link?: string;
};

type DesktopReminderPayload = {
  id: string;
  title: string;
  body: string;
  type: 'info';
  fireAt: string;
  enabled: boolean;
  durationMs: number;
  link?: string;
};

type RuntimeReminderPayload = {
  id: string;
  title: string;
  kind: 'task' | 'event';
  start: string;
  minutes_before: number;
  enabled: boolean;
  link?: string;
};

const parseTaskStart = (description: string | null, dueDate: string | null) => {
  if (!description || !dueDate) return null;
  const match = description.match(TIME_PREFIX_REGEX);
  if (!match) return null;
  return parseISO(`${dueDate}T${match[1]}:00`);
};

const canNotify = () => localStorage.getItem('adonai_notifications_enabled') !== 'false';

const normalizeReminderLink = (value: unknown) => {
  const rawLink = Array.isArray(value)
    ? value.find((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : value;

  if (typeof rawLink !== 'string') return undefined;

  const candidate = rawLink
    .split(/\s+/)
    .map((part) => part.trim().replace(/[.,;:!?)]+$/, ''))
    .find((part) => /^https?:\/\//i.test(part));

  if (!candidate) return undefined;

  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
};

const getMetadataReminderLink = (metadata?: Record<string, unknown> | null) => {
  if (!metadata) return undefined;
  return normalizeReminderLink(metadata.link)
    || normalizeReminderLink(metadata.links)
    || normalizeReminderLink(metadata.htmlLink)
    || normalizeReminderLink(metadata.url);
};

const sendInAppNotification = (title: string, body: string, type: 'info' | 'warning' | 'success' = 'info') => {
  window.dispatchEvent(new CustomEvent('adonai:notify', {
    detail: {
      type,
      title,
      message: body,
    },
  }));
};

const isMissingAdminNotificationsTable = (error: { code?: string; message?: string } | null) =>
  error?.code === 'PGRST205'
  || error?.code === '42P01'
  || Boolean(error?.message?.includes('admin_notifications') && error.message.includes('schema cache'));

const sendExternalNotification = async (title: string, body: string, type: 'info' | 'warning' | 'success' = 'info') => {
  if (!canNotify()) return false;

  if (window.electronAPI?.showNotification) {
    window.electronAPI.showNotification(title, body, type);
    return true;
  }

  if (!('Notification' in window)) return false;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
  if (Notification.permission !== 'granted') return false;

  new Notification(title, {
    body,
    tag: `adonai-${title}-${body}`,
    requireInteraction: false,
  });
  return true;
};

const buildReminderNotification = (item: ScheduledReminder) => {
  const reminderAt = new Date(item.start.getTime() - item.reminder.minutes_before * 60000);
  const reminderKey = `${item.id}-${format(reminderAt, 'yyyy-MM-dd-HH-mm')}`;
  const title = item.kind === 'event' ? item.title : `Tarea: ${item.title}`;
  const body = `${getReminderLabel(item.reminder.minutes_before)}. Empieza a las ${format(item.start, 'HH:mm')}.`;

  return { reminderAt, reminderKey, title, body };
};

const buildDesktopReminderPayload = (item: ScheduledReminder): DesktopReminderPayload | null => {
  const { reminderAt, reminderKey, title, body } = buildReminderNotification(item);

  if (Date.now() - reminderAt.getTime() > 15 * 60 * 1000) {
    return null;
  }

  return {
    id: reminderKey,
    title,
    body,
    type: 'info',
    fireAt: reminderAt.toISOString(),
    enabled: item.reminder.enabled,
    durationMs: 7000,
    link: item.link,
  };
};

const NotificationManager = () => {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  const rangeEnd = format(addDays(new Date(), 30), 'yyyy-MM-dd');
  const { tasks } = useTasks({ startDate: today, endDate: rangeEnd });
  const { timeBlocks } = useTimeBlocks(today, rangeEnd);
  const lastMinuteRef = useRef<string | null>(null);
  const firedRemindersRef = useRef<Set<string>>(new Set());
  const runtimeReminderTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const runtimeReminderKeysRef = useRef<Map<string, string>>(new Map());
  const desktopScheduledKeysRef = useRef<Set<string>>(new Set());
  const permissionRequestedRef = useRef(false);
  const adminNotificationsUnavailableRef = useRef(false);

  const fireReminderIfDue = useCallback((item: ScheduledReminder, now = new Date()) => {
    const { reminderAt, reminderKey, title, body } = buildReminderNotification(item);
    const diffMs = now.getTime() - reminderAt.getTime();

    if (diffMs < 0 || diffMs > 15 * 60 * 1000 || firedRemindersRef.current.has(reminderKey)) {
      return false;
    }

    firedRemindersRef.current.add(reminderKey);
    if (!window.electronAPI?.showNotification) {
      playReminderSound();
    }
    sendInAppNotification(title, body, 'info');
    sendExternalNotification(title, body, 'info');
    return true;
  }, []);

  const { data: adminNotifications = [] } = useQuery({
    queryKey: ['admin-notifications-feed', user?.id],
    queryFn: async () => {
      if (!user || adminNotificationsUnavailableRef.current) return [];
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .or(`target_type.eq.all,target_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(20);
      if (isMissingAdminNotificationsTable(error)) {
        adminNotificationsUnavailableRef.current = true;
        console.warn('[notifications] Admin notifications are disabled until the Supabase migration is applied.');
        return [];
      }
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    refetchInterval: () => adminNotificationsUnavailableRef.current ? false : 60000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const scheduledReminders = useMemo(() => {
    const taskReminders = tasks
      .map((task: NotificationTask) => {
        const kind = task.metadata?.creation_source === 'event' ? 'event' : 'task';
        const reminder = getReminderSettings(task.metadata, kind);
        const start = parseTaskStart(task.description, task.due_date);
        if (!reminder || !start || task.status !== 'pending') return null;
        return {
          id: `task-${task.id}`,
          title: task.title,
          start,
          reminder,
          kind,
          link: normalizeReminderLink(task.link) || getMetadataReminderLink(task.metadata),
        };
      })
      .filter(Boolean);

    const blockReminders = timeBlocks
      .map((block: NotificationTimeBlock) => {
        const reminder = getReminderSettings(block.metadata, 'event');
        if (!reminder) return null;
        if (block.is_recurring && Array.isArray(block.days_of_week) && block.days_of_week.length > 0) {
          const todayDay = new Date(`${today}T12:00:00`).getDay();
          if (!block.days_of_week.includes(todayDay)) return null;
        }

        const blockDate = block.block_date || today;
        const start = parseISO(`${blockDate}T${String(block.start_time).slice(0, 5)}:00`);
        return {
          id: `block-${block.id}`,
          title: block.title,
          start,
          reminder,
          kind: 'event' as const,
          link: getMetadataReminderLink(block.metadata),
        };
      })
      .filter(Boolean);

    return [...taskReminders, ...blockReminders] as ScheduledReminder[];
  }, [tasks, timeBlocks, today]);

  const scheduleElectronReminder = useCallback((item: ScheduledReminder) => {
    if (!window.electronAPI?.scheduleReminder || !canNotify()) return null;

    const payload = buildDesktopReminderPayload(item);
    if (!payload) return null;

    window.electronAPI.scheduleReminder(payload);
    return payload.id;
  }, []);

  useEffect(() => {
    if (!window.electronAPI?.scheduleReminder) return;

    if (!user || !canNotify()) {
      desktopScheduledKeysRef.current.forEach((id) => window.electronAPI?.cancelReminder?.(id));
      desktopScheduledKeysRef.current.clear();
      return;
    }

    const nextKeys = new Set<string>();
    scheduledReminders.forEach((item) => {
      const key = scheduleElectronReminder(item);
      if (key) nextKeys.add(key);
    });

    desktopScheduledKeysRef.current.forEach((id) => {
      if (!nextKeys.has(id)) {
        window.electronAPI?.cancelReminder?.(id);
      }
    });
    desktopScheduledKeysRef.current = nextKeys;
  }, [scheduleElectronReminder, scheduledReminders, user]);

  useEffect(() => {
    if (!user || window.electronAPI?.scheduleReminder) return;

    const checkNotifications = () => {
      const now = new Date();
      const minuteKey = format(now, 'yyyy-MM-dd HH:mm');
      const shouldRunMinuteSweep = lastMinuteRef.current !== minuteKey;
      if (shouldRunMinuteSweep) {
        lastMinuteRef.current = minuteKey;
      }

      scheduledReminders.forEach((item) => {
        fireReminderIfDue(item, now);
      });
    };

    checkNotifications();
    const timer = setInterval(checkNotifications, 15000);
    return () => clearInterval(timer);
  }, [user, fireReminderIfDue, scheduledReminders]);

  useEffect(() => {
    const runtimeTimers = runtimeReminderTimersRef.current;
    const runtimeKeys = runtimeReminderKeysRef.current;

    const clearRuntimeTimer = (id: string) => {
      const timer = runtimeTimers.get(id);
      if (timer) clearTimeout(timer);
      runtimeTimers.delete(id);

      const desktopKey = runtimeKeys.get(id);
      if (desktopKey) {
        window.electronAPI?.cancelReminder?.(desktopKey);
        runtimeKeys.delete(id);
      }
    };

    const handleRuntimeReminder = (event: Event) => {
      const detail = (event as CustomEvent<RuntimeReminderPayload>).detail;
      if (!detail?.id) return;

      clearRuntimeTimer(detail.id);
      if (!detail.enabled) return;

      const start = parseISO(detail.start);
      if (Number.isNaN(start.getTime())) return;

      const minutesBefore = Number(detail.minutes_before);
      const item: ScheduledReminder = {
        id: detail.id,
        title: detail.title || 'Recordatorio',
        start,
        reminder: {
          enabled: true,
          minutes_before: Number.isFinite(minutesBefore) ? minutesBefore : 15,
        },
        kind: detail.kind || 'event',
        link: normalizeReminderLink(detail.link),
      };

      if (window.electronAPI?.scheduleReminder) {
        const desktopKey = scheduleElectronReminder(item);
        if (desktopKey) {
          runtimeKeys.set(detail.id, desktopKey);
        }
        return;
      }

      const reminderAt = new Date(item.start.getTime() - item.reminder.minutes_before * 60000);
      const delayMs = reminderAt.getTime() - Date.now();

      if (delayMs <= 0) {
        fireReminderIfDue(item);
        return;
      }

      const timer = setTimeout(() => {
        runtimeTimers.delete(detail.id);
        fireReminderIfDue(item);
      }, delayMs);
      runtimeTimers.set(detail.id, timer);
    };

    window.addEventListener('adonai:runtime-reminder-upsert', handleRuntimeReminder);
    return () => {
      window.removeEventListener('adonai:runtime-reminder-upsert', handleRuntimeReminder);
      runtimeTimers.forEach((timer) => clearTimeout(timer));
      runtimeTimers.clear();
      runtimeKeys.forEach((desktopKey) => window.electronAPI?.cancelReminder?.(desktopKey));
      runtimeKeys.clear();
    };
  }, [fireReminderIfDue, scheduleElectronReminder]);

  useEffect(() => {
    if (!user || !canNotify()) return;

    if (!permissionRequestedRef.current && !window.electronAPI?.showNotification && 'Notification' in window && Notification.permission === 'default') {
      permissionRequestedRef.current = true;
      Notification.requestPermission().catch(() => {});
    }

    const seenKey = `adonai_admin_notifications_seen_${user.id}`;
    const seen = new Set<string>(JSON.parse(localStorage.getItem(seenKey) || '[]'));
    const unseen = adminNotifications
      .filter((notification: AdminNotification) => !seen.has(notification.id))
      .sort((a: AdminNotification, b: AdminNotification) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    unseen.forEach((notification: AdminNotification) => {
      sendInAppNotification(notification.title, notification.body, 'info');
      sendExternalNotification(notification.title, notification.body, 'info');
      seen.add(notification.id);
      supabase
        .rpc('mark_admin_notification_sent', { notification_id: notification.id })
        .then(({ error }) => {
          if (error) console.error('[notifications] Error updating sent_count:', error);
        });
    });

    if (unseen.length > 0) {
      localStorage.setItem(seenKey, JSON.stringify(Array.from(seen).slice(-200)));
    }
  }, [adminNotifications, user]);

  return null;
};

export default NotificationManager;
