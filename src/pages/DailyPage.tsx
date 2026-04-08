import { useState } from 'react';
import { useTasks, useEisenhowerSort } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useProfile } from '@/hooks/useProfile';
import { format } from 'date-fns';
import { Check, ChevronDown, ChevronRight, Flag, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import FAB from '@/components/FAB';
import TaskCaptureModal from '@/components/TaskCaptureModal';

const DailyPage = () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { tasks, updateTask } = useTasks({ date: today });
  const { goals } = useGoals();
  const { profile } = useProfile();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);
  const [showSkipped, setShowSkipped] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const pending = tasks.filter((t) => t.status === 'pending');
  const sorted = useEisenhowerSort(pending);
  const top3 = sorted.slice(0, 3);
  const secondary = sorted.slice(3);
  const skipped = tasks.filter((t) => t.status === 'skipped');
  const completed = tasks.filter((t) => t.status === 'done');

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

  const handleComplete = (id: string) => {
    updateTask.mutate({ id, status: 'done', completed_at: new Date().toISOString() });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-[430px] mx-auto px-5 pt-6 space-y-6">
        {/* Header */}
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

        {/* Progress bar */}
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

        {/* Top 3 */}
        <section className="space-y-3">
          <h3 className="text-base font-bold tracking-tight flex items-center gap-2">
            Top 3 Prioridades
            <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">Top</span>
          </h3>
          {top3.length === 0 ? (
            <div className="bg-surface-container-low p-6 rounded-lg text-center space-y-3">
              <p className="text-on-surface-variant">Tu día está despejado. ¿Qué quieres lograr?</p>
              <button onClick={() => setCaptureOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-full primary-gradient text-primary-foreground text-sm font-semibold">
                <Plus className="w-4 h-4" /> Añadir tarea
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {top3.map((task, i) => (
                <div key={task.id} className="bg-surface-container-low p-4 rounded-lg flex items-center gap-3 border-l-4 border-primary/40 first:border-primary">
                  <button
                    onClick={() => handleComplete(task.id)}
                    className="w-5 h-5 rounded border-2 border-outline-variant flex items-center justify-center hover:border-primary flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Prioridad {String(i + 1).padStart(2, '0')}</span>
                    <h4 className="text-foreground font-bold truncate">{task.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Collapsible sections */}
        {secondary.length > 0 && (
          <CollapsibleSection title="Tareas secundarias" count={secondary.length} open={showSecondary} onToggle={() => setShowSecondary(!showSecondary)}>
            {secondary.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-2">
                <button onClick={() => handleComplete(t.id)} className="w-5 h-5 rounded border-2 border-outline-variant flex-shrink-0" />
                <span className="text-foreground text-sm">{t.title}</span>
              </div>
            ))}
          </CollapsibleSection>
        )}

        {skipped.length > 0 && (
          <CollapsibleSection title="Tareas pospuestas" count={skipped.length} open={showSkipped} onToggle={() => setShowSkipped(!showSkipped)}>
            {skipped.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-2 opacity-60">
                <span className="text-foreground text-sm line-through">{t.title}</span>
              </div>
            ))}
          </CollapsibleSection>
        )}

        {completed.length > 0 && (
          <CollapsibleSection title="Tareas completadas" count={completed.length} open={showCompleted} onToggle={() => setShowCompleted(!showCompleted)}>
            {completed.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-2">
                <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
                <span className="text-on-surface-variant text-sm line-through">{t.title}</span>
              </div>
            ))}
          </CollapsibleSection>
        )}
      </div>

      <FAB onClick={() => setCaptureOpen(true)} />
      <BottomNav />
      <TaskCaptureModal open={captureOpen} onClose={() => setCaptureOpen(false)} />
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
