import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { addDays, format, parseISO } from 'date-fns';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const TIME_PREFIX_REGEX = /^\[T:(\d{2}:\d{2})-(\d{2}:\d{2})\]/;

const parseTaskStart = (description: string | null, dueDate: string | null) => {
  if (!description || !dueDate) return null;
  const match = description.match(TIME_PREFIX_REGEX);
  if (!match) return null;
  return parseISO(`${dueDate}T${match[1]}:00`);
};

const canNotify = () => localStorage.getItem('adonai_notifications_enabled') !== 'false';

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

const NotificationManager = () => {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  const rangeEnd = format(addDays(new Date(), 30), 'yyyy-MM-dd');
  const { tasks } = useTasks({ startDate: today, endDate: rangeEnd });
  const lastMinuteRef = useRef<string | null>(null);
  const firedRemindersRef = useRef<Set<string>>(new Set());

  const { data: adminNotifications = [] } = useQuery({
    queryKey: ['admin-notifications-feed', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .or(`target_type.eq.all,target_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  const eventTasks = useMemo(() => {
    return tasks.filter((task: any) => {
      const metadata = task.metadata as any;
      return metadata?.creation_source === 'event' && metadata?.event_reminder?.enabled;
    });
  }, [tasks]);

  useEffect(() => {
    if (!user) return;

    const checkNotifications = () => {
      if (!canNotify()) return;

      const now = new Date();
      const minuteKey = format(now, 'yyyy-MM-dd HH:mm');
      if (lastMinuteRef.current === minuteKey) return;
      lastMinuteRef.current = minuteKey;

      const bedtime = localStorage.getItem('adonai_notif_bedtime') || '20:00';
      const streakEnabled = localStorage.getItem('adonai_notif_streak') !== 'false';
      const healthEnabled = localStorage.getItem('adonai_notif_health') !== 'false';
      const todayTasks = tasks.filter((task: any) => task.due_date === today);
      const completedCount = todayTasks.filter((task: any) => task.status === 'done').length;
      const pendingCount = todayTasks.filter((task: any) => task.status === 'pending').length;
      const timeStr = format(now, 'HH:mm');

      if (streakEnabled && timeStr === '18:00' && completedCount === 0 && todayTasks.length > 0) {
        sendExternalNotification(
          'Tu racha peligra',
          'Aún no has completado ninguna tarea hoy. Haz una rápida para mantener tu racha viva.',
          'warning'
        );
      }

      if (timeStr === bedtime) {
        const message = pendingCount > 0
          ? `Te quedan ${pendingCount} tareas. ¿Quieres organizarlas para mañana y descansar tranquilo?`
          : 'Día despejado. ¿Quieres dedicar 1 min a planificar tus victorias de mañana?';
        sendExternalNotification('Planifica tu éxito', message, 'info');
      }

      if (healthEnabled && now.getMinutes() === 0 && now.getHours() >= 10 && now.getHours() <= 18 && now.getHours() % 2 === 0) {
        sendExternalNotification('Pausa breve', 'Toma agua, respira y revisa si necesitas un descanso corto.', 'info');
      }

      eventTasks.forEach((task: any) => {
        const reminder = (task.metadata as any)?.event_reminder;
        const start = parseTaskStart(task.description, task.due_date);
        if (!start || !reminder?.minutes_before) return;
        const reminderAt = new Date(start.getTime() - reminder.minutes_before * 60000);
        const diffMs = Math.abs(now.getTime() - reminderAt.getTime());
        const reminderKey = `${task.id}-${format(reminderAt, 'yyyy-MM-dd-HH-mm')}`;

        if (diffMs <= 30000 && !firedRemindersRef.current.has(reminderKey)) {
          firedRemindersRef.current.add(reminderKey);
          sendExternalNotification(
            task.title,
            `Empieza a las ${format(start, 'HH:mm')}.`,
            'info'
          );
        }
      });
    };

    checkNotifications();
    const timer = setInterval(checkNotifications, 30000);
    return () => clearInterval(timer);
  }, [user, tasks, eventTasks, today]);

  useEffect(() => {
    if (!user || !canNotify()) return;

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
