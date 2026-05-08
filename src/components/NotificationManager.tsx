import { useEffect, useRef } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { format, parse, isBefore, isAfter, addMinutes } from 'date-fns';

const NotificationManager = () => {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  const { tasks } = useTasks({ date: today });
  const lastCheckRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !window.electronAPI) return;

    const checkNotifications = () => {
      const now = new Date();
      const timeStr = format(now, 'HH:mm');
      
      // Prevent multiple triggers in the same minute
      if (lastCheckRef.current === timeStr) return;
      lastCheckRef.current = timeStr;

      const bedtime = localStorage.getItem('adonai_notif_bedtime') || '20:00';
      const streakEnabled = localStorage.getItem('adonai_notif_streak') !== 'false';
      const healthEnabled = localStorage.getItem('adonai_notif_health') !== 'false';

      const completedCount = tasks.filter(t => t.status === 'done').length;
      const pendingCount = tasks.filter(t => t.status === 'pending').length;

      // 1. Streak Protection (6 PM)
      if (streakEnabled && timeStr === '18:00' && completedCount === 0 && tasks.length > 0) {
        window.electronAPI.showNotification(
          "¡Tu racha peligra! 🔥",
          `Aún no has completado ninguna tarea hoy. Haz una rápida para mantener tu racha viva.`,
          'warning'
        );
      }

      // 2. Tomorrow's Plan (Configurable time)
      if (timeStr === bedtime) {
        const message = pendingCount > 0 
          ? `Te quedan ${pendingCount} tareas. ¿Quieres organizarlas para mañana y descansar tranquilo?`
          : "Día despejado. ¿Quieres dedicar 1 min a planificar tus victorias de mañana?";
        
        window.electronAPI.showNotification(
          "Planifica tu éxito 📅",
          message,
          'info'
        );
      }

      // 3. Health Reminders (Example: every 2 hours if app is active)
      // This could be more complex, but let's start simple.
    };

    const timer = setInterval(checkNotifications, 30000); // Check every 30s
    return () => clearInterval(timer);
  }, [user, tasks]);

  return null;
};

export default NotificationManager;
