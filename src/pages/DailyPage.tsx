import { useState } from 'react';
import { useTasks, useEisenhowerSort } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useProfile } from '@/hooks/useProfile';
import { format } from 'date-fns';
import { Check, ChevronDown, ChevronRight, Flag, Plus, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import FAB from '@/components/FAB';
import TaskCaptureModal from '@/components/TaskCaptureModal';
import TaskDetailModal from '@/components/TaskDetailModal';

const DailyPage = () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { tasks, updateTask } = useTasks({ date: today });
  const { goals } = useGoals();
  const { profile } = useProfile();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showSkipped, setShowSkipped] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const pending = tasks.filter((t) => t.status === 'pending');
  const sorted = useEisenhowerSort(pending);
  const skipped = tasks.filter((t) => t.status === 'skipped');
  const completed = tasks.filter((t) => t.status === 'done');

  const q1 = sorted.filter((t) => t.urgency && t.importance);
  const q2 = sorted.filter((t) => !t.urgency && t.importance);
  const q3 = sorted.filter((t) => t.urgency && !t.importance);
  const q4 = sorted.filter((t) => !t.urgency && !t.importance);

  const mainGoal = goals.find((g) => g.id === profile?.main_goal_id);
  const completedCount = completed.length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getMotivationalMessage = () => {
    if (completedCount === 0) return 'Empieza tu día con la primera tarea.';
    if (progress < 50) return `Llevas ${completedCount} de ${totalCount}. ¡Sigue!`;
    if (progress < 100) return `Ya vas por el ${progress}%. ¡Cierra el día fuerte!`;
    return '¡Todas las tareas completadas! 🎉';
  };

  const handleComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask.mutate({ id, status: 'done', completed_at: new Date().toISOString() });
  };

  const TaskRow = ({ task, accent }: { task: any; accent?: boolean }) => (
    <div onClick={() => setSelectedTask(task)}
      className={`p-3.5 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${accent ? 'bg-surface-container-low border-l-2 border-primary' : 'bg-surface-container-low'} hover:bg-surface-container-high`}>
      <button onClick={(e) => handleComplete(task.id, e)}
        className="w-5 h-5 rounded border-2 border-outline-variant flex items-center justify-center hover:border-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <h4 className="text-foreground font-bold text-sm truncate">{task.title}</h4>
        <div className="flex items-center gap-2 mt-0.5">
          {task.contexts && <span className="text-[10px] text-on-surface-variant">{(task.contexts as any).name}</span>}
          {task.estimated_minutes && (
            <span className="text-[10px] text-on-surface-variant flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{task.estimated_minutes}m</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-[430px] mx-auto px-5 pt-6 space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Flag className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs uppercase tracking-widest text-on-surface-variant font-bold">Vista Diaria</span>
          </div>
          {mainGoal && (
            <div className="bg-surface-container-low p-4 rounded-lg">
              <h2 className="text-xl font-bold tracking-tight text-foreground">{mainGoal.title}</h2>
              <p className="text-on-surface-variant text-sm mt-1">{progress}% completado hoy</p>
            </div>
          )}
        </div>

        {totalCount > 0 && (
          <div>
            <div className="flex justify-between mb-2">
              <p className="text-sm font-medium text-foreground">{getMotivationalMessage()}</p>
              <p className="text-xs font-bold text-primary">{progress}%</p>
            </div>
            <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full primary-gradient rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Eisenhower groups */}
        {pending.length === 0 ? (
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
                <h3 className="text-xs font-bold text-error uppercase tracking-wider">🔴 Urgente e Importante</h3>
                {q1.map((t) => <TaskRow key={t.id} task={t} accent />)}
              </section>
            )}
            {q2.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider">🟢 Importante</h3>
                {q2.map((t) => <TaskRow key={t.id} task={t} />)}
              </section>
            )}
            {q3.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-xs font-bold text-tertiary uppercase tracking-wider">🟡 Urgente</h3>
                {q3.map((t) => <TaskRow key={t.id} task={t} />)}
              </section>
            )}
            {q4.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">⚪ Otras tareas</h3>
                {q4.map((t) => <TaskRow key={t.id} task={t} />)}
              </section>
            )}
          </div>
        )}

        {/* Collapsible sections */}
        {skipped.length > 0 && (
          <CollapsibleSection title="Tareas pospuestas" count={skipped.length} open={showSkipped} onToggle={() => setShowSkipped(!showSkipped)}>
            {skipped.map((t) => (
              <div key={t.id} onClick={() => setSelectedTask(t)} className="flex items-center gap-3 p-2 opacity-60 cursor-pointer">
                <span className="text-foreground text-sm line-through">{t.title}</span>
              </div>
            ))}
          </CollapsibleSection>
        )}

        {completed.length > 0 && (
          <CollapsibleSection title="Completadas" count={completed.length} open={showCompleted} onToggle={() => setShowCompleted(!showCompleted)}>
            {completed.map((t) => (
              <div key={t.id} onClick={() => setSelectedTask(t)} className="flex items-center gap-3 p-2 cursor-pointer">
                <div className="w-5 h-5 rounded bg-primary flex items-center justify-center"><Check className="w-3 h-3 text-primary-foreground" /></div>
                <span className="text-on-surface-variant text-sm line-through">{t.title}</span>
              </div>
            ))}
          </CollapsibleSection>
        )}
      </div>

      <FAB onClick={() => setCaptureOpen(true)} />
      <BottomNav />
      <TaskCaptureModal open={captureOpen} onClose={() => setCaptureOpen(false)} />
      <TaskDetailModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
    </div>
  );
};

const CollapsibleSection = ({ title, count, open, onToggle, children }: {
  title: string; count: number; open: boolean; onToggle: () => void; children: React.ReactNode;
}) => (
  <div>
    <button onClick={onToggle} className="w-full flex items-center justify-between p-3 bg-surface-container-low rounded-lg">
      <div className="flex items-center gap-2">
        {open ? <ChevronDown className="w-4 h-4 text-on-surface-variant" /> : <ChevronRight className="w-4 h-4 text-on-surface-variant" />}
        <span className="font-bold tracking-tight text-sm">{title}</span>
        <span className="text-xs text-on-surface-variant/60">{count}</span>
      </div>
    </button>
    {open && (
      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="overflow-hidden bg-surface-container-low/50 rounded-b-lg p-3 -mt-1 space-y-1">
        {children}
      </motion.div>
    )}
  </div>
);

export default DailyPage;
