import { useState, useCallback, useRef } from 'react';
import { useGoals } from '@/hooks/useGoals';
import { useTasks } from '@/hooks/useTasks';
import { useProfile } from '@/hooks/useProfile';
import { useGlobalVoiceCapture } from '@/hooks/useGlobalVoiceCapture';
import { Flag, Plus, ChevronRight, Check, Trophy, Sparkles, Target, Zap, Layout } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FAB from '@/components/FAB';
import TaskCaptureModal, { type TaskCaptureModalHandle } from '@/components/TaskCaptureModal';
import { toast } from 'sonner';
import { dispatchTutorialGoalCreated } from '@/lib/tutorialEvents';

const horizonLabels: Record<string, string> = {
  daily: 'Día',
  weekly: 'Semana',
  monthly: 'Mes',
  quarterly: 'Trimestre',
  annual: 'Año',
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
    captureModalRef.current?.openInVoiceMode();
    setCaptureOpen(true);
  }, []);
  useGlobalVoiceCapture(captureModalRef, openCapture);

  const horizons = ['daily', 'weekly', 'monthly', 'quarterly', 'annual'];
  const activeGoals = goals.filter((g) => g.active);
  const completedGoalsCount = goals.filter((g) => !g.active).length;

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

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-32 space-y-12">
        
        {/* Hero Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-border/40 pb-8">
          <div className="space-y-2">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-primary font-bold tracking-[0.2em] text-[10px] uppercase"
            >
              <Target className="w-3 h-3" />
              <span>Arquitectura de Vida</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl sm:text-5xl font-black tracking-tight leading-[0.9] sm:max-w-md"
            >
              Tus Metas <span className="text-on-surface-variant/40">Elevadas.</span>
            </motion.h1>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-4"
          >
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Progreso Global</p>
              <p className="text-2xl font-black text-primary leading-none">{completedGoalsCount} <span className="text-sm font-medium text-on-surface-variant/60">Logradas</span></p>
            </div>
            <button 
              onClick={() => setShowNewGoal(true)}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              Nueva Visión
            </button>
          </motion.div>
        </header>

        {/* Dynamic Bento Content */}
        <main className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Create Goal Card - Inline */}
          <AnimatePresence>
            {showNewGoal && (
              <motion.div 
                layoutId="new-goal-card"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="col-span-12 md:col-span-6 lg:col-span-4 bg-surface-container-low border-2 border-primary/20 p-6 rounded-[2.5rem] shadow-xl shadow-primary/5 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black">Proyectar Futuro</h3>
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-4">
                  <input 
                    autoFocus
                    value={newTitle} 
                    onChange={(e) => setNewTitle(e.target.value)} 
                    placeholder="¿Qué quieres conquistar?"
                    className="w-full bg-surface-container-lowest text-lg font-bold p-4 rounded-2xl border-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-on-surface-variant/30"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateGoal()}
                  />
                  <div className="flex flex-wrap gap-2">
                    {horizons.map((h) => (
                      <button 
                        key={h} 
                        onClick={() => setNewHorizon(h)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          newHorizon === h 
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                          : 'bg-surface-container-high text-on-surface-variant/60 hover:bg-surface-container-highest'
                        }`}
                      >
                        {horizonLabels[h]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={handleCreateGoal} className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-2xl font-black text-sm hover:opacity-90 transition-opacity">Confirmar</button>
                  <button onClick={() => setShowNewGoal(false)} className="px-5 py-3 bg-surface-container-high text-on-surface-variant rounded-2xl font-black text-sm">Cerrar</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Celebration Card */}
          <AnimatePresence>
            {completedGoalId && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="col-span-12 md:col-span-6 lg:col-span-4 bg-primary p-1 rounded-[2.5rem]"
              >
                <div className="bg-surface-container-lowest p-8 rounded-[2.2rem] space-y-6">
                  <div className="relative mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                    <Trophy className="w-10 h-10 text-primary" />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute inset-0 bg-primary/20 rounded-full -z-10"
                    />
                  </div>
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black leading-tight">Ciclo Completado</h2>
                    <p className="text-sm text-on-surface-variant leading-relaxed">Has trascendido esta meta. No te detengas, mantén el momentum.</p>
                  </div>
                  <input 
                    value={nextGoalTitle} 
                    onChange={(e) => setNextGoalTitle(e.target.value)}
                    placeholder="Tu siguiente gran paso..."
                    className="w-full p-4 bg-surface-container-low rounded-2xl text-center font-bold border-none focus:ring-2 focus:ring-primary/40 transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateNextGoal()}
                  />
                  <div className="flex gap-3">
                    <button onClick={handleCreateNextGoal} className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-black text-sm shadow-lg shadow-primary/20">Continuar</button>
                    <button onClick={() => setCompletedGoalId(null)} className="px-6 py-4 bg-surface-container-high text-on-surface-variant rounded-2xl font-black text-sm">Pausa</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Goals Bento Grid */}
          <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {horizons.map((h) => (
              <div key={h} className="contents">
                {groupedGoals[h].map((goal, idx) => {
                  const { completed, total } = getGoalProgress(goal.id);
                  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                  const isLarge = idx === 0 && h === 'annual'; // Example logic for varied sizes
                  
                  return (
                    <motion.div 
                      layout
                      key={goal.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`group relative bg-surface-container-low border border-border/40 p-6 rounded-[2.5rem] hover:bg-surface-container transition-all hover:shadow-2xl hover:shadow-black/5 flex flex-col gap-6 ${
                        isLarge ? 'md:col-span-2 lg:row-span-2' : ''
                      }`}
                    >
                      {/* Top Meta */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-highest rounded-full">
                          <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">{horizonLabels[h]}</span>
                        </div>
                        <div className="p-2 bg-primary/10 rounded-xl text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          <Zap className="w-4 h-4 fill-current" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-2">
                        <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">{goal.title}</h3>
                        <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant/40">
                          <Layout className="w-3 h-3" />
                          <span>{total} hitos definidos</span>
                        </div>
                      </div>

                      {/* Progress Section */}
                      <div className="space-y-4">
                        <div className="flex items-end justify-between">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Ejecución</p>
                            <p className="text-2xl font-black leading-none">{pct}%</p>
                          </div>
                          <p className="text-xs font-bold text-on-surface-variant/60">{completed}/{total}</p>
                        </div>
                        
                        <div className="relative h-2.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            className="absolute inset-0 bg-primary rounded-full"
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                        <button 
                          onClick={() => { setTargetGoalId(goal.id); setCaptureOpen(true); }}
                          className="flex-1 py-3 bg-surface-container-highest text-foreground rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-border transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Hito
                        </button>
                        <button 
                          onClick={() => handleCompleteGoal(goal.id)}
                          className="flex-1 py-3 bg-primary/10 text-primary rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" /> Lograr
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Empty State / Philosophy */}
          {activeGoals.length === 0 && !showNewGoal && !completedGoalId && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-12 py-24 flex flex-col items-center text-center space-y-8"
            >
              <div className="w-24 h-24 bg-surface-container-low rounded-full flex items-center justify-center border border-border/40">
                <Target className="w-10 h-10 text-on-surface-variant/20" />
              </div>
              <div className="space-y-3 max-w-sm">
                <h2 className="text-3xl font-black">El lienzo está en blanco.</h2>
                <p className="text-on-surface-variant/60 leading-relaxed text-sm">
                  Sin metas, las tareas son solo ruido. Define tu intención y deja que el sistema organice el caos.
                </p>
              </div>
              <button 
                onClick={() => setShowNewGoal(true)}
                className="px-8 py-4 bg-primary text-primary-foreground rounded-[2rem] font-black text-sm shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
              >
                <Plus className="w-5 h-5" />
                Establecer Primer Horizonte
              </button>
            </motion.div>
          )}

        </main>

        {/* History Section */}
        {completedGoalsCount > 0 && (
          <section className="space-y-6 pt-12 border-t border-border/40">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-on-surface-variant/20" />
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-on-surface-variant/40">Salón de Conquistas</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {goals.filter(g => !g.active).map(goal => (
                <div key={goal.id} className="bg-surface-container-low/50 p-4 rounded-3xl border border-border/20 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all">
                  <h4 className="font-black text-sm truncate">{goal.title}</h4>
                  <p className="text-[10px] font-bold text-on-surface-variant/40 mt-1 uppercase tracking-widest">{horizonLabels[goal.horizon || 'monthly']}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <FAB 
        onTextClick={openCapture} 
        onVoiceClick={openCaptureInVoiceMode} 
      />
      <TaskCaptureModal 
        ref={captureModalRef} 
        open={captureOpen} 
        onClose={() => { setCaptureOpen(false); setTargetGoalId(null); }} 
        goalId={targetGoalId}
        creationSource="fab"
      />
    </div>
  );
};

export default GoalsPage;
