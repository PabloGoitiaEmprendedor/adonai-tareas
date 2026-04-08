import { useState, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useTasks, useEisenhowerSort } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useStreaks } from '@/hooks/useStreaks';
import { format } from 'date-fns';
import { Check, Target, Plus, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import FAB from '@/components/FAB';
import TaskCaptureModal from '@/components/TaskCaptureModal';
import TaskDetailModal from '@/components/TaskDetailModal';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
};

const DashboardPage = () => {
  const { profile } = useProfile();
  const { goals } = useGoals();
  const { metrics, trackDayActive } = useStreaks();
  const today = format(new Date(), 'yyyy-MM-dd');
  const { tasks, updateTask } = useTasks({ date: today });
  const [captureOpen, setCaptureOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const sorted = useEisenhowerSort(pendingTasks);
  const completedTasks = tasks.filter((t) => t.status === 'done');

  // Eisenhower quadrants
  const q1 = sorted.filter((t) => t.urgency && t.importance);
  const q2 = sorted.filter((t) => !t.urgency && t.importance);
  const q3 = sorted.filter((t) => t.urgency && !t.importance);
  const q4 = sorted.filter((t) => !t.urgency && !t.importance);

  const mainGoal = goals.find((g) => g.id === profile?.main_goal_id);
  const completedToday = completedTasks.length;
  const totalToday = tasks.length;
  const progress = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;
  const hasTooMany = pendingTasks.length > 7;

  useEffect(() => { trackDayActive.mutate(); }, []);

  const handleComplete = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask.mutate({ id: taskId, status: 'done', completed_at: new Date().toISOString() });
  };

  const getMotivationalMessage = () => {
    if (completedToday === 0) return '¡Empecemos el día!';
    if (progress < 50) return `Ya llevas ${completedToday}. ¡Sigue así!`;
    if (progress < 100) return `Ya vas por el ${progress}%. ¡Cierra el día fuerte!`;
    return '¡Día completado! 🎉';
  };

  const TaskItem = ({ task, accent }: { task: any; accent?: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => setSelectedTask(task)}
      className={`p-3.5 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${accent ? 'bg-surface-container border-l-2 border-primary' : 'bg-surface-container-low'} hover:bg-surface-container-high`}
    >
      <button
        onClick={(e) => handleComplete(task.id, e)}
        className="w-5 h-5 rounded border-2 border-outline-variant flex items-center justify-center hover:border-primary flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <h4 className="text-foreground font-semibold text-sm truncate">{task.title}</h4>
        <div className="flex items-center gap-2 mt-0.5">
          {task.contexts && <span className="text-[10px] text-on-surface-variant">{(task.contexts as any).name}</span>}
          {task.estimated_minutes && (
            <span className="text-[10px] text-on-surface-variant flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{task.estimated_minutes}m</span>
          )}
        </div>
      </div>
      {task.urgency && task.importance && (
        <span className="bg-error/10 text-error text-[9px] px-1.5 py-0.5 rounded-full font-bold">P1</span>
      )}
      {task.importance && !task.urgency && (
        <span className="bg-primary/10 text-primary text-[9px] px-1.5 py-0.5 rounded-full font-bold">P2</span>
      )}
      {task.urgency && !task.importance && (
        <span className="bg-tertiary/10 text-tertiary text-[9px] px-1.5 py-0.5 rounded-full font-bold">P3</span>
      )}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-[430px] mx-auto px-5 pt-6 space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
          <span className="text-on-surface-variant text-xs font-medium uppercase tracking-widest">Dashboard</span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {getGreeting()}, {profile?.name || 'Emprendedor'}
          </h1>
        </motion.div>

        {/* Active Goal */}
        {mainGoal && (
          <div className="bg-surface-container-low p-4 rounded-lg flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-on-surface-variant text-[10px] font-medium uppercase tracking-wider">Meta activa</p>
              <p className="text-foreground font-semibold">{mainGoal.title}</p>
            </div>
            <Target className="w-5 h-5 text-primary" />
          </div>
        )}

        {hasTooMany && (
          <div className="bg-error-container/20 p-3 rounded-lg">
            <p className="text-sm text-tertiary">Tienes muchas tareas. ¿Quieres simplificar tu día?</p>
          </div>
        )}

        {/* Progress */}
        {totalToday > 0 && (
          <div>
            <div className="flex justify-between items-end mb-2">
              <p className="text-sm font-medium text-foreground">{getMotivationalMessage()}</p>
              <p className="text-xs font-bold text-primary">{progress}%</p>
            </div>
            <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
              <motion.div className="h-full primary-gradient rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
            </div>
          </div>
        )}

        {/* Tasks by Eisenhower */}
        {pendingTasks.length === 0 ? (
          <div className="bg-surface-container-low p-6 rounded-lg text-center space-y-3">
            <p className="text-on-surface-variant">Tu día está despejado. ¿Qué quieres lograr?</p>
            <button onClick={() => setCaptureOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-full primary-gradient text-primary-foreground text-sm font-semibold">
              <Plus className="w-4 h-4" /> Añadir tarea
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {q1.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-xs font-bold text-error uppercase tracking-wider">🔴 Urgente e Importante</h2>
                {q1.map((t) => <TaskItem key={t.id} task={t} accent />)}
              </section>
            )}
            {q2.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-xs font-bold text-primary uppercase tracking-wider">🟢 Importante</h2>
                {q2.map((t) => <TaskItem key={t.id} task={t} />)}
              </section>
            )}
            {q3.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-xs font-bold text-tertiary uppercase tracking-wider">🟡 Urgente</h2>
                {q3.map((t) => <TaskItem key={t.id} task={t} />)}
              </section>
            )}
            {q4.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">⚪ Otras tareas</h2>
                {q4.map((t) => <TaskItem key={t.id} task={t} />)}
              </section>
            )}
          </div>
        )}

        {/* Completed */}
        {completedTasks.length > 0 && (
          <section className="space-y-2 opacity-60">
            <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">✅ Completadas ({completedTasks.length})</h2>
            {completedTasks.map((t) => (
              <div key={t.id} onClick={() => setSelectedTask(t)} className="p-3 rounded-lg bg-surface-container-low flex items-center gap-3 cursor-pointer">
                <div className="w-5 h-5 rounded bg-primary flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
                <span className="text-on-surface-variant text-sm line-through truncate">{t.title}</span>
              </div>
            ))}
          </section>
        )}
      </div>

      <FAB onClick={() => setCaptureOpen(true)} />
      <BottomNav />
      <TaskCaptureModal open={captureOpen} onClose={() => setCaptureOpen(false)} />
      <TaskDetailModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
    </div>
  );
};

export default DashboardPage;
