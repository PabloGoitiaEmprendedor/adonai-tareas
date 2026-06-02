import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { addDays, format, parseISO } from 'date-fns';
import { useTasks } from '@/hooks/useTasks';
import { useTimeBlocks } from '@/hooks/useTimeBlocks';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getReminderLabel, getReminderSettings } from '@/lib/reminders';

const TIME_PREFIX_REGEX = /^\[T:(\d{2}:\d{2})-(\d{2}:\d{2})\]/;

const parseTaskStart = (description: string | null, dueDate: string | null) => {
  if (!description || !dueDate) return null;
  const match = description.match(TIME_PREFIX_REGEX);
  if (!match) return null;
  return parseISO(`${dueDate}T${match[1]}:00`);
};

const canNotify = () => localStorage.getItem('adonai_notifications_enabled') !== 'false';

const isMissingAdminNotificationsTable = (error: { code?: string; message?: string } | null) =>
  error?.code === 'PGRST205'
  || error?.code === '42P01'
  || Boolean(error?.message?.includes('admin_notifications') && error.message.includes('schema cache'));

const sendExternalNotification = async (title: string, body: string, type: 'info' | 'warning' | 'success' = 'info') => {
  if (!canNotify()) return false;

  window.dispatchEvent(new CustomEvent('adonai:notify', {
    detail: { title, message: body, type },
  }));

  const shouldShowNative = !!window.electronAPI?.showNotification && document.visibilityState !== 'visible';
  if (shouldShowNative) {
    window.electronAPI.showNotification(title, body, type);
    return true;
  }

  if (window.electronAPI?.showNotification) return true;

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

const NotificationManager = () => {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  const rangeEnd = format(addDays(new Date(), 30), 'yyyy-MM-dd');
  const { tasks } = useTasks({ startDate: today, endDate: rangeEnd });
  const { timeBlocks } = useTimeBlocks(today, rangeEnd);
  const lastMinuteRef = useRef<string | null>(null);
  const firedRemindersRef = useRef<Set<string>>(new Set());
  const permissionRequestedRef = useRef(false);
  const adminNotificationsUnavailableRef = useRef(false);

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
      .map((task: any) => {
        const kind = (task.metadata as any)?.creation_source === 'event' ? 'event' : 'task';
        const reminder = getReminderSettings(task.metadata, kind);
        const start = parseTaskStart(task.description, task.due_date);
        if (!reminder || !start || task.status !== 'pending') return null;
        return {
          id: `task-${task.id}`,
          title: task.title,
          start,
          reminder,
          kind,
        };
      })
      .filter(Boolean);

    const blockReminders = timeBlocks
      .map((block: any) => {
        const reminder = getReminderSettings(block.metadata, 'event');
        if (!reminder) return null;
        if (block.is_recurring && Array.isArray(block.days_of_week) && block.days_of_week.length > 0) {
          const todayDay = new Date(`${today}T12:00:00`).getDay();
          if (!block.days_of_week.includes(todayDay)) return null;
        }

        const blockDate = block.block_date || today;
        const start = parseISO(`${blockDate}T${String(block.start_time).slice(0, 5)}:00`);
        return {
          id: `block-${block.id}-${format(start, 'yyyy-MM-dd')}`,
          title: block.title,
          start,
          reminder,
          kind: 'event' as const,
        };
      })
      .filter(Boolean);

    return [...taskReminders, ...blockReminders] as Array<{
      id: string;
      title: string;
      start: Date;
      reminder: { enabled: boolean; minutes_before: number };
      kind: 'task' | 'event';
    }>;
  }, [tasks, timeBlocks, today]);

  useEffect(() => {
    if (!user) return;

    const checkNotifications = () => {
      if (!canNotify()) return;

      const now = new Date();
      const minuteKey = format(now, 'yyyy-MM-dd HH:mm');
      if (lastMinuteRef.current === minuteKey) return;
      lastMinuteRef.current = minuteKey;

      scheduledReminders.forEach((item) => {
        const reminderAt = new Date(item.start.getTime() - item.reminder.minutes_before * 60000);
        const diffMs = now.getTime() - reminderAt.getTime();
        const reminderKey = `${item.id}-${format(reminderAt, 'yyyy-MM-dd-HH-mm')}`;

        if (diffMs >= 0 && diffMs <= 15 * 60 * 1000 && !firedRemindersRef.current.has(reminderKey)) {
          firedRemindersRef.current.add(reminderKey);
          sendExternalNotification(
            item.kind === 'event' ? item.title : `Tarea: ${item.title}`,
            `${getReminderLabel(item.reminder.minutes_before)}. Empieza a las ${format(item.start, 'HH:mm')}.`,
            'info'
          );
        }
      });
    };

    checkNotifications();
    const timer = setInterval(checkNotifications, 30000);
    return () => clearInterval(timer);
  }, [user, tasks, scheduledReminders, today]);

  useEffect(() => {
    if (!user || !canNotify()) return;

    if (!permissionRequestedRef.current && !window.electronAPI?.showNotification && 'Notification' in window && Notification.permission === 'default') {
      permissionRequestedRef.current = true;
      Notification.requestPermission().catch(() => {});
    }

    const seenKey = `adonai_admin_notifications_seen_${user.id}`;
    const seen = new Set<string>(JSON.parse(localStorage.getItem(seenKey) || '[]'));
    const unseen = adminNotifications
      .filter((notification: any) => !seen.has(notification.id))
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    unseen.forEach((notification: any) => {
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
