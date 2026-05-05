import { useState, useCallback, useRef } from 'react';
import { useGoals } from '@/hooks/useGoals';
import { useTasks } from '@/hooks/useTasks';
import { useProfile } from '@/hooks/useProfile';
import { useGlobalVoiceCapture } from '@/hooks/useGlobalVoiceCapture';
import { Flag, Plus, ChevronRight, Check, Trophy, Sparkles, Target, Zap, Layout, ArrowLeft, Trash2, Settings, X } from 'lucide-react';
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
  const { goals, createGoal, updateGoal, deleteGoal } = useGoals();
  const { tasks } = useTasks();
  const { profile, updateProfile } = useProfile();
  
  const [captureOpen, setCaptureOpen] = useState(false);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newHorizon, setNewHorizon] = useState('monthly');
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

  const getGoalProgress = (goalId: string) => {
    const goalTasks = tasks.filter((t) => t.goal_id === goalId);
    const completed = goalTasks.filter((t) => t.status === 'done').length;
    return { completed, total: goalTasks.length };
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
            initial={{ opacity: 0, scale: 0.9, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-x-4 top-[20%] lg:inset-x-0 lg:w-[450px] lg:mx-auto z-[9999] bg-surface p-8 rounded-[40px] border border-outline-variant/30 shadow-2xl space-y-8"
          >
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-black font-headline tracking-tight">Proyectar Meta</h2>
              <p className="text-sm text-on-surface-variant/60">Define tu próximo gran objetivo.</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 ml-1">Título</p>
                <input 
                  autoFocus 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Correr 10km, Leer 5 libros..."
                  className="w-full bg-surface-container rounded-[24px] px-6 py-4 text-foreground font-black text-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateGoal()} 
                />
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 ml-1">Horizonte</p>
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

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowNewGoal(false)} 
                  className="flex-1 py-4 rounded-[20px] bg-surface-container text-on-surface-variant font-black text-sm hover:bg-surface-container-high transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCreateGoal} 
                  className="flex-[1.5] py-4 rounded-[20px] bg-primary text-primary-foreground font-black text-sm shadow-lg shadow-primary/20"
                >
                  Establecer
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 pb-32">
      <div className="max-w-[430px] lg:max-w-6xl mx-auto px-6 pt-12 space-y-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-1 bg-primary rounded-full" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/60">
                Enfoque Estratégico
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight font-headline">
              Grandes <span className="opacity-20">Metas.</span>
            </h1>
          </div>

          <div className="flex items-center gap-6 self-start md:self-end">
            <div className="text-right">
              <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] mb-1">Logros Totales</p>
              <div className="flex items-center justify-end gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                <span className="text-3xl font-black text-foreground">{completedGoalsCount}</span>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setNewTitle(''); setShowNewGoal(true); }}
              className="w-16 h-16 rounded-[24px] bg-primary text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/10 group"
            >
              <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" strokeWidth={3} />
            </motion.button>
          </div>
        </div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <div 
                  className="absolute inset-0 rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity blur-2xl -z-10"
                  style={{ backgroundColor: `var(--primary)10` }}
                />
                <div className="bg-surface border border-outline-variant/50 rounded-[32px] p-8 h-full flex flex-col justify-between hover:border-primary/30 transition-colors shadow-sm">
                  <div className="space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                          {horizonLabels[goal.horizon || 'monthly']}
                        </span>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="p-2 rounded-xl bg-surface-container hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xl font-black tracking-tight font-headline group-hover:text-primary transition-colors leading-tight">
                        {goal.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1">
                          {[1, 2, 3].map(i => (
                            <div key={i} className={`w-4 h-4 rounded-full border-2 border-surface ${i <= completed ? 'bg-primary' : 'bg-primary/10'}`} />
                          ))}
                        </div>
                        <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
                          {completed} / {total} Hitos
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-20">Progreso</span>
                      <span className="text-xl font-black font-headline">{pct}%</span>
                    </div>
                    <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                      />
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                      <button 
                        onClick={() => { setTargetGoalId(goal.id); setCaptureOpen(true); }}
                        className="flex-1 py-4 bg-surface-container rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-all"
                      >
                        Añadir Hito
                      </button>
                      <button 
                        onClick={() => handleCompleteGoal(goal.id)}
                        className="w-14 h-14 flex items-center justify-center bg-primary/10 text-primary rounded-2xl hover:bg-primary hover:text-primary-foreground transition-all"
                      >
                        <Check className="w-6 h-6" strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {activeGoals.length === 0 && (
            <div className="col-span-full py-20 bg-surface/30 border border-dashed border-outline-variant rounded-[40px] text-center px-8 flex flex-col items-center">
              <div className="w-20 h-20 rounded-[32px] bg-surface-container flex items-center justify-center mb-6">
                <Target className="w-10 h-10 opacity-20" />
              </div>
              <h3 className="text-2xl font-black font-headline mb-3">Define tu Futuro</h3>
              <p className="text-sm text-on-surface-variant/60 max-w-[320px] leading-relaxed">
                Sin metas claras, el esfuerzo no tiene dirección. Comienza definiendo tu primer gran objetivo para este periodo.
              </p>
              <button 
                onClick={() => setShowNewGoal(true)}
                className="mt-8 px-8 py-4 bg-foreground text-background rounded-full font-black text-sm shadow-xl hover:opacity-90 transition-all flex items-center gap-3"
              >
                <Plus className="w-5 h-5" />
                Nueva Meta
              </button>
            </div>
          )}
        </div>

        {/* History / Achievements */}
        {completedGoalsCount > 0 && (
          <div className="pt-20 space-y-8">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 opacity-20" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40">Historial de Logros</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {goals.filter(g => !g.active).map(goal => (
                <div key={goal.id} className="bg-surface-container/30 p-5 rounded-[24px] border border-outline-variant/10 group hover:bg-surface-container transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center mb-3">
                    <Trophy className="w-4 h-4 text-primary/40 group-hover:text-primary transition-colors" />
                  </div>
                  <h4 className="font-black text-sm leading-tight mb-1 truncate">{goal.title}</h4>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-20">{horizonLabels[goal.horizon || 'monthly']}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <FAB onTextClick={openCapture} onVoiceClick={openCaptureInVoiceMode} />
      
      {renderNewGoalModal()}

      <TaskCaptureModal 
        ref={captureModalRef} 
        open={captureOpen} 
        onClose={() => { setCaptureOpen(false); setTargetGoalId(null); }} 
        goalId={targetGoalId || undefined}
        creationSource="fab" 
      />

      {/* Completion Dialog */}
      <AnimatePresence>
        {completedGoalId && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-background/90 backdrop-blur-md z-[9998]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className="fixed inset-x-6 top-1/4 lg:inset-x-0 lg:w-[500px] lg:mx-auto z-[9999] bg-surface p-10 rounded-[50px] border border-primary/20 shadow-2xl text-center space-y-8"
            >
              <div className="relative mx-auto w-24 h-24">
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 4 }}
                  className="w-full h-full bg-primary/10 rounded-[35px] flex items-center justify-center"
                >
                  <Trophy className="w-12 h-12 text-primary" />
                </motion.div>
                <div className="absolute -top-4 -right-4 bg-primary text-primary-foreground w-10 h-10 rounded-full flex items-center justify-center font-black">
                  +1
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-2xl font-black font-headline tracking-tight">¡Objetivo Logrado!</h2>
                <p className="text-on-surface-variant/60 leading-relaxed text-sm">
                  Has completado este ciclo con éxito. La constancia es la clave del crecimiento. ¿Qué sigue ahora?
                </p>
              </div>

              <div className="space-y-4">
                <input 
                  value={nextGoalTitle} 
                  onChange={(e) => setNextGoalTitle(e.target.value)}
                  placeholder="Tu siguiente gran meta..."
                  className="w-full bg-surface-container rounded-[24px] px-6 py-4 text-center font-black text-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateNextGoal()}
                />
                <div className="flex gap-3">
                  <button 
                    onClick={handleCreateNextGoal}
                    className="flex-1 py-5 bg-primary text-primary-foreground rounded-[24px] font-black shadow-lg shadow-primary/20"
                  >
                    Siguiente Meta
                  </button>
                  <button 
                    onClick={() => setCompletedGoalId(null)}
                    className="px-8 py-5 bg-surface-container text-on-surface-variant rounded-[24px] font-black"
                  >
                    Pausa
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
