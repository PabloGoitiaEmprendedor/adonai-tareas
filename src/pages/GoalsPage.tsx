import { useState, useCallback, useRef } from 'react';
import { useGoals } from '@/hooks/useGoals';
import { useTasks } from '@/hooks/useTasks';
import { useProfile } from '@/hooks/useProfile';
import { Plus, Check, Trophy, Target, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { dispatchTutorialGoalCreated } from '@/lib/tutorialEvents';
import { usePriorityColors, getPriorityKey } from '@/hooks/usePriorityColors';

const horizonLabels: Record<string, string> = {
  daily: 'Día',
  weekly: 'Semana',
  monthly: 'Mes',
  quarterly: 'Trimestre',
  annual: 'Año',
};

const GoalsPage = () => {
  const { goals, createGoal, updateGoal, deleteGoal } = useGoals();
  const { tasks } = useTasks();
  const { profile, updateProfile } = useProfile();
  const { priorityColors } = usePriorityColors();
  
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newHorizon, setNewHorizon] = useState('monthly');
  const [completedGoalId, setCompletedGoalId] = useState<string | null>(null);
  const [nextGoalTitle, setNextGoalTitle] = useState('');

  const horizons = ['daily', 'weekly', 'monthly', 'quarterly', 'annual'];
  const activeGoals = goals.filter((g) => g.active);
  const completedGoalsCount = goals.filter((g) => !g.active).length;

  const getGoalProgress = (goalId: string) => {
    const goalTasks = tasks.filter((t) => t.goal_id === goalId);
    const completed = goalTasks.filter((t) => t.status === 'done').length;
    return { completed, total: goalTasks.length };
  };

  const getGoalDeadline = (goal: any) => {
    const created = new Date(goal.created_at);
    const h = goal.horizon || 'monthly';
    const deadline = new Date(created);
    switch (h) {
      case 'daily': deadline.setHours(23, 59, 59, 999); break;
      case 'weekly': deadline.setDate(deadline.getDate() + (7 - deadline.getDay())); deadline.setHours(23, 59, 59, 999); break;
      case 'monthly': deadline.setMonth(deadline.getMonth() + 1, 0); deadline.setHours(23, 59, 59, 999); break;
      case 'quarterly': {
        const qEnd = new Date(created.getFullYear(), Math.floor(created.getMonth() / 3) * 3 + 3, 0);
        deadline.setTime(qEnd.getTime());
        deadline.setHours(23, 59, 59, 999);
        break;
      }
      case 'annual': deadline.setFullYear(deadline.getFullYear(), 11, 31); deadline.setHours(23, 59, 59, 999); break;
    }
    return deadline;
  };

  const getTimeRemainingPct = (goal: any) => {
    const created = new Date(goal.created_at);
    const deadline = getGoalDeadline(goal);
    const now = new Date();
    const total = deadline.getTime() - created.getTime();
    const elapsed = now.getTime() - created.getTime();
    const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
    return Math.round(pct);
  };

  const getDaysRemaining = (goal: any) => {
    const deadline = getGoalDeadline(goal);
    const now = new Date();
    return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const handleCreateGoal = async () => {
    if (!newTitle.trim()) { toast.error('Escribe una meta'); return; }
    try {
      await createGoal.mutateAsync({ title: newTitle.trim(), horizon: newHorizon });
      setNewTitle('');
      setShowNewGoal(false);
      dispatchTutorialGoalCreated();
      toast.success('Nueva visión establecida');
    } catch {
      toast.error('Error al proyectar meta');
    }
  };

  const handleCompleteGoal = async (goalId: string) => {
    try {
      await updateGoal.mutateAsync({ id: goalId, active: false });
      if (profile?.main_goal_id === goalId) {
        updateProfile.mutate({ main_goal_id: null });
      }
      setCompletedGoalId(goalId);
      toast.success('¡Nivel superado! 🏆');
    } catch {
      toast.error('Error al cerrar ciclo');
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
      toast.success('Próximo objetivo fijado');
    } catch {
      toast.error('Error al encadenar meta');
    }
  };

  const handleDeleteGoal = (id: string) => {
    if (window.confirm('¿Eliminar esta meta y todas sus tareas vinculadas?')) {
      deleteGoal.mutate(id);
      toast.success('Meta eliminada');
    }
  };

  const renderNewGoalModal = () => (
    <AnimatePresence>
      {showNewGoal && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9998]"
            onClick={() => setShowNewGoal(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-x-4 top-[20%] lg:inset-x-0 lg:w-[420px] lg:mx-auto z-[9999] bg-surface p-6 rounded-2xl border border-outline-variant/20 shadow-2xl space-y-6"
          >
            <div className="text-center">
              <h2 className="text-lg font-black">Nueva Meta</h2>
            </div>

            <div className="space-y-4">
              <input 
                autoFocus 
                value={newTitle} 
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ej: Correr 10km, Leer 5 libros..."
                className="w-full bg-surface-container rounded-xl px-4 py-3 text-foreground font-bold outline-none focus:ring-2 focus:ring-primary/20"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateGoal()} 
              />

              <div className="flex flex-wrap gap-1.5">
                {horizons.map((h) => (
                  <button 
                    key={h} 
                    onClick={() => setNewHorizon(h)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                      newHorizon === h 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-surface-container text-on-surface-variant/50 hover:bg-surface-container-high'
                    }`}
                  >
                    {horizonLabels[h]}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => setShowNewGoal(false)} 
                  className="flex-1 py-3 rounded-xl bg-surface-container text-on-surface-variant font-bold text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCreateGoal} 
                  className="flex-[1.5] py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20"
                >
                  Crear
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-[430px] lg:max-w-6xl mx-auto px-5 pt-6 space-y-6">
        
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black tracking-tight">Metas</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold text-on-surface-variant/50">{completedGoalsCount}</span>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => { setNewTitle(''); setShowNewGoal(true); }}
              className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-md"
            >
              <Plus className="w-4 h-4" strokeWidth={3} />
            </motion.button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeGoals.map((goal, idx) => {
            const { completed, total } = getGoalProgress(goal.id);
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative"
              >
                <div className="bg-surface border border-outline-variant/20 rounded-2xl p-6 h-full flex flex-col hover:border-primary/20 transition-all shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-black tracking-tight leading-tight">
                        {goal.title}
                      </h3>
                    </div>
                    <div className="flex gap-1 ml-3 shrink-0">
                      <button 
                        onClick={() => handleCompleteGoal(goal.id)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                      >
                        <Check className="w-4 h-4" strokeWidth={3} />
                      </button>
                      <button 
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container text-on-surface-variant/40 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-bold text-on-surface-variant/50">
                      {completed}/{total} tareas
                    </span>
                    <div className="flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-auto space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-surface-container rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${getTimeRemainingPct(goal)}%`,
                            backgroundColor: getTimeRemainingPct(goal) > 80 ? '#ef4444' : getTimeRemainingPct(goal) > 50 ? '#f59e0b' : '#22c55e'
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-on-surface-variant/40 whitespace-nowrap">
                        {getDaysRemaining(goal)}d restantes
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {activeGoals.length === 0 && (
            <div className="col-span-full py-16 bg-surface/30 border border-dashed border-outline-variant rounded-2xl text-center px-8 flex flex-col items-center">
              <div className="w-16 h-16 rounded-xl bg-surface-container flex items-center justify-center mb-5">
                <Target className="w-8 h-8 text-on-surface-variant/30" />
              </div>
              <h3 className="text-xl font-black mb-2">Crea tu primera meta</h3>
              <p className="text-sm text-on-surface-variant/50 max-w-[300px] leading-relaxed mb-6">
                Define un objetivo con horizonte de tiempo y empieza a vincular tareas.
              </p>
              <button 
                onClick={() => setShowNewGoal(true)}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-black text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nueva Meta
              </button>
            </div>
          )}
        </div>

        {/* History */}
        {completedGoalsCount > 0 && (
          <div className="pt-8 space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/30">Completadas</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {goals.filter(g => !g.active).map(goal => (
                <div key={goal.id} className="bg-surface-container/20 p-4 rounded-xl border border-outline-variant/10">
                  <h4 className="font-bold text-sm leading-tight truncate">{goal.title}</h4>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {renderNewGoalModal()}

      {/* Completion Dialog */}
      <AnimatePresence>
        {completedGoalId && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9998]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-1/4 lg:inset-x-0 lg:w-[450px] lg:mx-auto z-[9999] bg-surface p-8 rounded-2xl border border-primary/20 shadow-2xl text-center space-y-6"
            >
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                <Trophy className="w-8 h-8 text-primary" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-black">Objetivo Logrado</h2>
                <p className="text-on-surface-variant/60 text-sm">
                  ¿Qué meta quieres perseguir ahora?
                </p>
              </div>

              <div className="space-y-3">
                <input 
                  value={nextGoalTitle} 
                  onChange={(e) => setNextGoalTitle(e.target.value)}
                  placeholder="Tu siguiente meta..."
                  className="w-full bg-surface-container rounded-xl px-4 py-3 text-center font-bold text-base outline-none focus:ring-2 focus:ring-primary/20"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateNextGoal()}
                />
                <div className="flex gap-2">
                  <button 
                    onClick={handleCreateNextGoal}
                    className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20"
                  >
                    Siguiente Meta
                  </button>
                  <button 
                    onClick={() => setCompletedGoalId(null)}
                    className="px-6 py-3 bg-surface-container text-on-surface-variant rounded-xl font-bold"
                  >
                    Después
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GoalsPage;
