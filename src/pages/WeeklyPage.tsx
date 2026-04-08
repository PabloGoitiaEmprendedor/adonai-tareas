import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useProfile } from '@/hooks/useProfile';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp, Calendar } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import FAB from '@/components/FAB';
import TaskCaptureModal from '@/components/TaskCaptureModal';

const WeeklyPage = () => {
  const { tasks } = useTasks();
  const { goals } = useGoals();
  const { profile } = useProfile();
  const [captureOpen, setCaptureOpen] = useState(false);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const dayNames = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];

  const getTasksForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return tasks.filter((t) => t.due_date === dateStr);
  };

  const mainGoal = goals.find((g) => g.id === profile?.main_goal_id);
  const totalCompleted = tasks.filter((t) => t.status === 'done').length;
  const totalPlanned = tasks.length;

  const weeklyData = days.map((d) => {
    const dayTasks = getTasksForDay(d);
    const completed = dayTasks.filter((t) => t.status === 'done').length;
    const total = dayTasks.length;
    return { date: d, completed, total, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
  });

  const weekRange = `${format(weekStart, 'd')} — ${format(addDays(weekStart, 6), 'd MMMM', { locale: es })}`;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-[430px] mx-auto px-5 pt-6 space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Resumen Semanal</span>
            <h1 className="text-2xl font-bold tracking-tight mt-1">Tu Progreso</h1>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low rounded-full">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium capitalize">{weekRange}</span>
          </div>
        </div>

        {/* 7 day grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day, i) => {
            const isToday = isSameDay(day, today);
            const data = weeklyData[i];
            return (
              <div
                key={i}
                className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                  isToday ? 'bg-primary/10 ring-1 ring-primary/20' : 'bg-surface-container-low'
                }`}
              >
                <span className={`text-[10px] font-bold ${isToday ? 'text-primary' : 'text-on-surface-variant'}`}>{dayNames[i]}</span>
                <span className={`text-base font-bold mt-0.5 ${isToday ? 'text-primary' : ''}`}>{format(day, 'd')}</span>
                <div className={`w-1.5 h-1.5 rounded-full mt-1 ${data.completed > 0 ? 'bg-primary' : 'bg-surface-container-highest'}`} />
              </div>
            );
          })}
        </div>

        {/* Goal progress */}
        {mainGoal && (
          <div className="bg-surface-container-low rounded-lg p-5 space-y-4">
            <div className="flex justify-between items-start">
              <span className="px-2 py-0.5 bg-secondary-container text-on-surface-variant text-[10px] font-bold uppercase rounded-full">Meta Activa</span>
              <span className="text-primary font-bold text-sm">
                {totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0}%
              </span>
            </div>
            <h3 className="text-xl font-bold tracking-tight">{mainGoal.title}</h3>
            <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
              <div
                className="h-full primary-gradient rounded-full"
                style={{ width: `${totalPlanned > 0 ? (totalCompleted / totalPlanned) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Trend */}
        <div className="bg-surface-container-low rounded-lg p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Tendencia</h3>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-end justify-between gap-1.5 h-24">
            {weeklyData.map((d, i) => (
              <div
                key={i}
                className="flex-1 bg-primary/20 rounded-t-md transition-all"
                style={{ height: `${Math.max(d.pct, 5)}%`, opacity: d.pct > 0 ? 0.3 + (d.pct / 100) * 0.7 : 0.15 }}
              />
            ))}
          </div>
        </div>

        {/* Tasks list */}
        <div className="bg-surface-container-low rounded-lg overflow-hidden">
          <div className="p-4 flex justify-between items-center">
            <h3 className="font-bold">Tareas Semanales</h3>
            <div className="flex gap-3 text-xs font-bold uppercase tracking-wider">
              <span className="text-primary">Completadas ({totalCompleted})</span>
              <span className="text-on-surface-variant/50">Total ({totalPlanned})</span>
            </div>
          </div>
        </div>
      </div>

      <FAB onClick={() => setCaptureOpen(true)} />
      <BottomNav />
      <TaskCaptureModal open={captureOpen} onClose={() => setCaptureOpen(false)} />
    </div>
  );
};

export default WeeklyPage;
