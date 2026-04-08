import { useState, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useTasks, useEisenhowerSort } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useStreaks } from '@/hooks/useStreaks';
import { format } from 'date-fns';
import { Check, ChevronRight, Target, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import FAB from '@/components/FAB';
import TaskCaptureModal from '@/components/TaskCaptureModal';

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
  const allTasks = useTasks();
  const [captureOpen, setCaptureOpen] = useState(false);

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const sorted = useEisenhowerSort(pendingTasks);
  const top3 = sorted.slice(0, 3);
  const lowPriority = sorted.filter((t) => !t.urgency && !t.importance);
  const nextAction = sorted[0];

  const mainGoal = goals.find((g) => g.id === profile?.main_goal_id);
  const completedToday = tasks.filter((t) => t.status === 'done').length;
  const totalToday = tasks.length;
  const progress = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  const hasTooMany = pendingTasks.length > 7;

  useEffect(() => {
    trackDayActive.mutate();
  }, []);

  const handleComplete = (taskId: string) => {
    updateTask.mutate({ id: taskId, status: 'done', completed_at: new Date().toISOString() });
  };

  const handleSkip = (taskId: string) => {
    updateTask.mutate({ id: taskId, status: 'skipped' });
  };

  const getMotivationalMessage = () => {
    if (completedToday === 0) return '¡Empecemos el día!';
    if (progress < 50) return `Ya llevas ${completedToday}. ¡Sigue así!`;
    if (progress < 100) return `Ya vas por el ${progress}%. ¡Cierra el día fuerte!`;
    return '¡Día completado! 🎉';
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-[430px] mx-auto px-5 pt-6 space-y-6">
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

        {/* Too many tasks banner */}
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
              <motion.div
                className="h-full primary-gradient rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}

        {/* Top 3 Priorities */}
        <section className="space-y-3">
          <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
            Tus 3 prioridades de hoy
            <span className="h-1 w-1 rounded-full bg-primary" />
          </h2>
          {top3.length === 0 ? (
            <div className="bg-surface-container-low p-6 rounded-lg text-center space-y-3">
              <p className="text-on-surface-variant">Tu día está despejado. ¿Qué quieres lograr?</p>
              <button
                onClick={() => setCaptureOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full primary-gradient text-primary-foreground text-sm font-semibold"
              >
                <Plus className="w-4 h-4" /> Añadir tarea
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {top3.map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-surface-container p-4 rounded-lg flex items-center gap-3 group hover:bg-surface-container-high transition-colors"
                >
                  <button
                    onClick={() => handleComplete(task.id)}
                    className="w-6 h-6 rounded-md border-2 border-outline-variant flex items-center justify-center hover:border-primary hover:bg-primary/10 transition-all flex-shrink-0"
                  >
                    {task.status === 'done' && <Check className="w-4 h-4 text-primary" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-foreground font-semibold text-sm truncate">{task.title}</h3>
                    {task.contexts && <p className="text-on-surface-variant text-xs">{(task.contexts as any).name}</p>}
                  </div>
                  {task.urgency && (
                    <span className="bg-error/10 text-error text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Urgente</span>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Next best action */}
        {nextAction && (
          <section className="space-y-3">
            <h2 className="text-base font-bold tracking-tight text-foreground">Siguiente mejor acción</h2>
            <div className="relative overflow-hidden primary-gradient p-6 rounded-lg">
              <div className="relative z-10 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-primary-foreground text-xl font-extrabold leading-tight">{nextAction.title}</h3>
                </div>
                <button
                  onClick={() => handleComplete(nextAction.id)}
                  className="bg-primary-foreground text-primary px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 hover:scale-105 transition-transform"
                >
                  Hacer esto ahora
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-foreground/5 rounded-full blur-2xl" />
            </div>
          </section>
        )}

        {/* Low priority */}
        {lowPriority.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-bold tracking-tight text-on-surface-variant">Puedes mover esto</h2>
            <div className="space-y-1">
              {lowPriority.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-surface-container-low/50 rounded-lg">
                  <span className="text-on-surface-variant text-sm">{task.title}</span>
                  <button
                    onClick={() => handleSkip(task.id)}
                    className="text-xs text-on-surface-variant/50 hover:text-foreground"
                  >
                    Posponer
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <FAB onClick={() => setCaptureOpen(true)} />
      <BottomNav />
      <TaskCaptureModal open={captureOpen} onClose={() => setCaptureOpen(false)} />
    </div>
  );
};

export default DashboardPage;
