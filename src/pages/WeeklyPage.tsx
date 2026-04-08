import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useProfile } from '@/hooks/useProfile';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp, Calendar, Check, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import FAB from '@/components/FAB';
import TaskCaptureModal from '@/components/TaskCaptureModal';
import TaskDetailModal from '@/components/TaskDetailModal';

const WeeklyPage = () => {
  const { tasks, updateTask } = useTasks();
  const { goals } = useGoals();
  const { profile } = useProfile();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [selectedTask, setSelectedTask] = useState<any>(null);

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
  const selectedDayTasks = getTasksForDay(selectedDay);
  const selectedPending = selectedDayTasks.filter((t) => t.status === 'pending');
  const selectedDone = selectedDayTasks.filter((t) => t.status === 'done');

  const handleComplete = (taskId: string) => {
    updateTask.mutate({ id: taskId, status: 'done', completed_at: new Date().toISOString() });
  };

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

        {/* 7 day grid - selectable */}
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day, i) => {
            const isToday = isSameDay(day, today);
            const isSelected = isSameDay(day, selectedDay);
            const data = weeklyData[i];
            return (
              <button key={i} onClick={() => setSelectedDay(day)}
                className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                  isSelected ? 'bg-primary/20 ring-2 ring-primary' : isToday ? 'bg-primary/10 ring-1 ring-primary/20' : 'bg-surface-container-low'
                }`}>
                <span className={`text-[10px] font-bold ${isSelected || isToday ? 'text-primary' : 'text-on-surface-variant'}`}>{dayNames[i]}</span>
                <span className={`text-base font-bold mt-0.5 ${isSelected || isToday ? 'text-primary' : ''}`}>{format(day, 'd')}</span>
                <div className={`w-1.5 h-1.5 rounded-full mt-1 ${data.completed > 0 ? 'bg-primary' : data.total > 0 ? 'bg-tertiary' : 'bg-surface-container-highest'}`} />
                {data.total > 0 && <span className="text-[8px] text-on-surface-variant mt-0.5">{data.completed}/{data.total}</span>}
              </button>
            );
          })}
        </div>

        {/* Selected day tasks */}
        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold tracking-tight capitalize">
              {isSameDay(selectedDay, today) ? 'Hoy' : isSameDay(selectedDay, addDays(today, 1)) ? 'Mañana' : format(selectedDay, 'EEEE d', { locale: es })}
            </h2>
            <span className="text-xs text-on-surface-variant">{selectedDayTasks.length} tareas</span>
          </div>

          {selectedDayTasks.length === 0 ? (
            <div className="bg-surface-container-low p-5 rounded-lg text-center space-y-3">
              <p className="text-on-surface-variant text-sm">Sin tareas para este día.</p>
              <button onClick={() => setCaptureOpen(true)} className="text-primary text-sm font-semibold">+ Añadir tarea</button>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedPending.map((task) => (
                <motion.div key={task.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedTask(task)}
                  className="bg-surface-container-low p-3.5 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-surface-container-high transition-colors">
                  <button onClick={(e) => { e.stopPropagation(); handleComplete(task.id); }}
                    className="w-5 h-5 rounded border-2 border-outline-variant flex items-center justify-center hover:border-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-foreground font-semibold text-sm truncate">{task.title}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.contexts && <span className="text-[10px] text-on-surface-variant">{(task.contexts as any).name}</span>}
                      {task.estimated_minutes && (
                        <span className="text-[10px] text-on-surface-variant flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{task.estimated_minutes}m</span>
                      )}
                    </div>
                  </div>
                  {task.urgency && task.importance && <span className="bg-error/10 text-error text-[9px] px-1.5 py-0.5 rounded-full font-bold">P1</span>}
                </motion.div>
              ))}
              {selectedDone.map((task) => (
                <div key={task.id} onClick={() => setSelectedTask(task)}
                  className="bg-surface-container-low/50 p-3 rounded-lg flex items-center gap-3 opacity-50 cursor-pointer">
                  <div className="w-5 h-5 rounded bg-primary flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                  <span className="text-on-surface-variant text-sm line-through truncate">{task.title}</span>
                </div>
              ))}
            </div>
          )}
        </section>

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
              <div className="h-full primary-gradient rounded-full" style={{ width: `${totalPlanned > 0 ? (totalCompleted / totalPlanned) * 100 : 0}%` }} />
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
              <div key={i} className="flex-1 bg-primary/20 rounded-t-md transition-all"
                style={{ height: `${Math.max(d.pct, 5)}%`, opacity: d.pct > 0 ? 0.3 + (d.pct / 100) * 0.7 : 0.15 }} />
            ))}
          </div>
        </div>
      </div>

      <FAB onClick={() => setCaptureOpen(true)} />
      <BottomNav />
      <TaskCaptureModal open={captureOpen} onClose={() => setCaptureOpen(false)} />
      <TaskDetailModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
    </div>
  );
};

export default WeeklyPage;
