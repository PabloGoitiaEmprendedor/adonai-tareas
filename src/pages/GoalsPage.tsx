import { useState, useCallback, useRef } from 'react';
import { useGoals } from '@/hooks/useGoals';
import { useTasks } from '@/hooks/useTasks';
import { useProfile } from '@/hooks/useProfile';
import { useGlobalVoiceCapture } from '@/hooks/useGlobalVoiceCapture';
import { Flag, Plus, ChevronRight, Check, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FAB from '@/components/FAB';
import TaskCaptureModal, { type TaskCaptureModalHandle } from '@/components/TaskCaptureModal';
import { toast } from 'sonner';

const horizonLabels: Record<string, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  annual: 'Anual',
};

const GoalsPage = () => {
  const { goals, createGoal, updateGoal } = useGoals();
  const { tasks } = useTasks();
  const { profile, updateProfile } = useProfile();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newHorizon, setNewHorizon] = useState('monthly');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [completedGoalId, setCompletedGoalId] = useState<string | null>(null);
  const [nextGoalTitle, setNextGoalTitle] = useState('');
  const [targetGoalId, setTargetGoalId] = useState<string | null>(null);
  const captureModalRef = useRef<TaskCaptureModalHandle>(null);


  const openCapture = useCallback(() => setCaptureOpen(true), []);
  const openCaptureInVoiceMode = useCallback(() => {
    setCaptureOpen(true);
    window.requestAnimationFrame(() => {
      captureModalRef.current?.openInVoiceMode();
    });
  }, []);
  useGlobalVoiceCapture(captureModalRef, openCapture);

  const horizons = ['daily', 'weekly', 'monthly', 'quarterly', 'annual'];
  const activeGoals = goals.filter((g) => g.active);
  const completedGoals = goals.filter((g) => !g.active);

  const groupedGoals = horizons.reduce((acc, h) => {
    acc[h] = activeGoals.filter((g) => g.horizon === h);
    return acc;
  }, {} as Record<string, typeof goals>);

  const getGoalProgress = (goalId: string) => {
    const goalTasks = tasks.filter((t) => t.goal_id === goalId);
    const completed = goalTasks.filter((t) => t.status === 'done').length;
    return { completed, total: goalTasks.length };
  };

  const handleCreateGoal = async () => {
    if (!newTitle.trim()) return;
    try {
      await createGoal.mutateAsync({ title: newTitle.trim(), horizon: newHorizon });
      setNewTitle('');
      setShowNewGoal(false);
      toast.success('Meta creada');
    } catch {
      toast.error('Error al crear meta');
    }
  };

  const handleCompleteGoal = async (goalId: string) => {
    try {
      await updateGoal.mutateAsync({ id: goalId, active: false });
      if (profile?.main_goal_id === goalId) {
        updateProfile.mutate({ main_goal_id: null });
      }
      setCompletedGoalId(goalId);
      toast.success('¡Meta lograda! 🎉');
    } catch {
      toast.error('Error al completar meta');
    }
  };

  const handleCreateNextGoal = async () => {
    if (!nextGoalTitle.trim()) return;
    const completedGoal = goals.find(g => g.id === completedGoalId);
    try {
      const newGoal = await createGoal.mutateAsync({
        title: nextGoalTitle.trim(),
        horizon: completedGoal?.horizon || 'monthly',
      });
      updateProfile.mutate({ main_goal_id: newGoal.id });
      setNextGoalTitle('');
      setCompletedGoalId(null);
      toast.success('Nueva meta establecida');
    } catch {
      toast.error('Error al crear meta');
    }
  };

  const selectedGoal = goals.find((g) => g.id === selectedGoalId);
  const selectedGoalTasks = selectedGoalId ? tasks.filter((t) => t.goal_id === selectedGoalId) : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[430px] lg:max-w-4xl mx-auto px-6 pt-4 pb-24 space-y-6">
        <div className="space-y-1 py-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Tu Visión</p>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">Fragmentada.</h1>
        </div>


        <AnimatePresence>
          {completedGoalId && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="bg-surface-container-low p-5 rounded-lg space-y-4">
              <div className="text-center space-y-2">
                <Trophy className="w-10 h-10 text-primary mx-auto" />
                <h3 className="text-lg font-bold text-foreground">¡Felicidades!</h3>
                <p className="text-sm text-on-surface-variant">Has logrado tu meta. ¿Cuál es tu siguiente objetivo?</p>
              </div>
              <input value={nextGoalTitle} onChange={(e) => setNextGoalTitle(e.target.value)}
                placeholder="Tu próxima meta..."
                className="w-full h-12 px-4 bg-surface-container-lowest rounded-lg text-foreground placeholder:text-on-surface-variant/40 focus:outline-none border-none"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateNextGoal()} />
              <div className="flex gap-2">
                <button onClick={handleCreateNextGoal} className="flex-1 py-2.5 rounded-lg primary-gradient text-primary-foreground font-bold text-sm">Crear</button>
                <button onClick={() => setCompletedGoalId(null)} className="px-4 py-2.5 rounded-lg bg-surface-container-high text-on-surface-variant text-sm">Después</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {activeGoals.length === 0 && !showNewGoal && !completedGoalId && (
          <div className="bg-surface-container-low p-6 rounded-lg text-center space-y-3">
            <p className="text-on-surface-variant">Define tu norte. Las metas dan sentido a las tareas.</p>
            <button onClick={() => setShowNewGoal(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-full primary-gradient text-primary-foreground text-sm font-semibold">
              <Plus className="w-4 h-4" /> Crear meta
            </button>
          </div>
        )}

        {showNewGoal && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface-container-low p-5 rounded-lg space-y-4">
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Título de la meta"
              className="w-full h-12 px-4 bg-surface-container-lowest rounded-lg text-foreground placeholder:text-on-surface-variant/40 focus:outline-none border-none" />
            <div className="flex flex-wrap gap-2">
              {horizons.map((h) => (
                <button key={h} onClick={() => setNewHorizon(h)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold ${newHorizon === h ? 'primary-gradient text-primary-foreground' : 'bg-surface-container-high text-on-surface-variant'}`}>
                  {horizonLabels[h]}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreateGoal} className="flex-1 py-2.5 rounded-lg primary-gradient text-primary-foreground font-bold text-sm">Crear</button>
              <button onClick={() => setShowNewGoal(false)} className="px-4 py-2.5 rounded-lg bg-surface-container-high text-on-surface-variant text-sm">Cancelar</button>
            </div>
          </motion.div>
        )}

        {horizons.map((h) => {
          const hGoals = groupedGoals[h];
          if (hGoals.length === 0) return null;
          return (
            <section key={h} className="space-y-2">
              <div className="flex items-center gap-2">
                <Flag className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{horizonLabels[h]}</span>
              </div>
              {hGoals.map((goal) => {
                const { completed, total } = getGoalProgress(goal.id);
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                return (
                  <div key={goal.id} className="w-full bg-surface-container-low rounded-lg overflow-hidden">
                    <button onClick={() => setSelectedGoalId(goal.id === selectedGoalId ? null : goal.id)}
                      className="w-full p-4 text-left hover:bg-surface-container transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground truncate">{goal.title}</h3>
                          <p className="text-xs text-on-surface-variant mt-0.5">{completed}/{total} tareas</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-primary">{pct}%</span>
                          <ChevronRight className={`w-4 h-4 text-on-surface-variant transition-transform ${selectedGoalId === goal.id ? 'rotate-90' : ''}`} />
                        </div>
                      </div>
                      {total > 0 && (
                        <div className="w-full h-1 bg-surface-container-highest rounded-full mt-2 overflow-hidden">
                          <div className="h-full primary-gradient rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </button>
                    <div className="px-4 pb-3 flex gap-2">
                       <button onClick={() => { setTargetGoalId(goal.id); setCaptureOpen(true); }}
                        className="flex-1 py-2 rounded-lg bg-surface-container-high text-foreground text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-surface-container-highest transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Tarea
                      </button>
                      <button onClick={() => handleCompleteGoal(goal.id)}
                        className="flex-1 py-2 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-primary/20 transition-colors">
                        <Check className="w-3.5 h-3.5" /> Logrado
                      </button>
                    </div>

                  </div>
                );
              })}
            </section>
          );
        })}

        {selectedGoal && selectedGoalTasks.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-on-surface-variant">Tareas de "{selectedGoal.title}"</h3>
            {selectedGoalTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg">
                <div className={`w-4 h-4 rounded ${t.status === 'done' ? 'bg-primary' : 'border-2 border-outline-variant'}`} />
                <span className={`text-sm ${t.status === 'done' ? 'text-on-surface-variant line-through' : 'text-foreground'}`}>{t.title}</span>
              </div>
            ))}
          </section>
        )}

        {completedGoals.length > 0 && (
          <section className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Logradas</span>
            {completedGoals.map((goal) => (
              <div key={goal.id} className="bg-surface-container-low p-4 rounded-lg opacity-60">
                <h3 className="font-bold text-on-surface-variant line-through">{goal.title}</h3>
                <p className="text-xs text-on-surface-variant/60 mt-0.5">{horizonLabels[goal.horizon || 'monthly']}</p>
              </div>
            ))}
          </section>
        )}

        {activeGoals.length > 0 && (
          <button onClick={() => setShowNewGoal(true)} className="w-full py-3 rounded-lg bg-surface-container-low text-on-surface-variant font-semibold text-sm flex items-center justify-center gap-2 hover:bg-surface-container transition-colors">
            <Plus className="w-4 h-4" /> Nueva meta
          </button>
        )}
      </div>

      <FAB onClick={openCaptureInVoiceMode} />
      <TaskCaptureModal 
        ref={captureModalRef} 
        open={captureOpen} 
        onClose={() => { setCaptureOpen(false); setTargetGoalId(null); }} 
        goalId={targetGoalId}
      />

    </div>
  );
};

export default GoalsPage;
