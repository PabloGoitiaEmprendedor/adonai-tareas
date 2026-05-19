import { useMemo, useState } from 'react';
import { useGoals } from '@/hooks/useGoals';
import { useProfile } from '@/hooks/useProfile';
import { useTasks } from '@/hooks/useTasks';
import { Plus, Check, Trophy, Target, Edit3, Trash2, X, Sparkles, Star, Zap, Heart, Flame, CalendarDays, ShieldAlert, ListChecks } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { dispatchTutorialGoalCreated } from '@/lib/tutorialEvents';
import confetti from 'canvas-confetti';
import { CalendarRac } from '@/components/ui/calendar-rac';
import { parseDate } from '@internationalized/date';

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const parseGoalDesc = (goal: any) => {
  if (!goal?.description) return {};
  try {
    return JSON.parse(goal.description);
  } catch {
    return {};
  }
};

const getDeadlineDate = (deadline?: string | null) => {
  if (!deadline) return null;
  const normalized = deadline.includes('T') ? deadline : `${deadline}T23:59:59`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getGoalStats = (goal: any) => {
  const desc = parseGoalDesc(goal);
  const deadlineDate = getDeadlineDate(desc.deadline);
  const createdAt = new Date(goal.created_at);
  const now = new Date();
  const deadlineTs = deadlineDate?.getTime() ?? Number.POSITIVE_INFINITY;
  const daysLeft = deadlineDate ? Math.ceil((deadlineDate.getTime() - now.getTime()) / 86400000) : null;
  const spanMs = deadlineDate ? Math.max(1, deadlineDate.getTime() - createdAt.getTime()) : null;
  const elapsedMs = deadlineDate ? clamp(now.getTime() - createdAt.getTime(), 0, spanMs ?? 0) : null;
  const progress = spanMs ? clamp(Math.round(((elapsedMs ?? 0) / spanMs) * 100)) : 0;

  let focusState = 'SIN FECHA';
  if (daysLeft !== null) {
    if (daysLeft <= 0) focusState = 'HOY';
    else if (daysLeft <= 3) focusState = 'FOCO';
    else if (daysLeft <= 7) focusState = 'RITMO';
    else focusState = 'EN MARCHA';
  }

  const urgencyTone =
    daysLeft === null
      ? 'muted'
      : daysLeft <= 0
        ? 'critical'
        : daysLeft <= 3
          ? 'hot'
          : daysLeft <= 7
            ? 'warm'
            : 'cool';

  return {
    desc,
    createdAt,
    deadlineDate,
    deadlineTs,
    daysLeft,
    progress,
    focusState,
    urgencyTone,
  };
};

const horizonLabels: Record<string, string> = {
  daily: 'DÃ­a',
  weekly: 'Semana',
  monthly: 'Mes',
  quarterly: 'Trimestre',
  annual: 'AÃ±o',
};

const celebrar = (name: string, goalTitle: string, horizon: string, doneCount: number, totalCount: number, daysSinceCreation: number) => {
  const timeOfDay = () => {
    const h = new Date().getHours();
    if (h < 6) return 'de madrugada';
    if (h < 12) return 'de la maÃ±ana';
    if (h < 18) return 'de la tarde';
    if (h < 22) return 'de la noche';
    return 'de madrugada';
  };

  const lines: { message: string; subtitle: string }[] = [
    {
      message: `Â¡Felicidades, ${name}!`,
      subtitle: `Has conquistado tu meta de ${horizonLabels[horizon]?.toLowerCase() || 'vida'} â€” "${goalTitle}"`,
    },
    {
      message: `${name}, Â¡LO LOGRASTE! ðŸ”¥`,
      subtitle: `"${goalTitle}" â€” Completado con Ã©xito. Esto merece celebraciÃ³n.`,
    },
    {
      message: `Â¡${name}, eres imparable! ðŸš€`,
      subtitle: `Meta de ${horizonLabels[horizon]?.toLowerCase() || 'vida'} alcanzada: "${goalTitle}"`,
    },
    {
      message: `${name}, acabas de hacer historia âœ¨`,
      subtitle: `"${goalTitle}" â€” Una meta menos en el tintero. Bien jugado.`,
    },
    {
      message: `Â¡BOOM! ${name} lo hizo de nuevo. ðŸ’¥`,
      subtitle: `"${goalTitle}" estÃ¡ oficialmente cumplida. Disfruta este momento.`,
    },
    {
      message: `Â¡${name}, nivel completado! â­`,
      subtitle: `"${goalTitle}" â€” MisiÃ³n cumplida ${timeOfDay()}. Toma un respiro, te lo mereces.`,
    },
  ];

  const extras: string[] = [];
  if (doneCount > 0) {
    extras.push(doneCount === 1 ? '1 tarea completada' : `${doneCount} tareas completadas`);
  }
  if (daysSinceCreation > 0) {
    extras.push(daysSinceCreation === 0 ? 'en el dÃ­a' : daysSinceCreation === 1 ? '1 dÃ­a' : `${daysSinceCreation} dÃ­as`);
  }

  const idx = Math.floor(Math.random() * lines.length);
  return { ...lines[idx], extras };
};

function playCelebrationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.5);
    });
  } catch {}
}

function fireConfetti() {
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };
  confetti({ ...defaults, particleCount: 80, origin: { x: 0.5, y: 0.4 } });
  confetti({ ...defaults, particleCount: 40, origin: { x: 0.2, y: 0.5 }, angle: 60 });
  confetti({ ...defaults, particleCount: 40, origin: { x: 0.8, y: 0.5 }, angle: 120 });
  setTimeout(() => confetti({ ...defaults, particleCount: 60, origin: { x: 0.5, y: 0.3 }, colors: ['#F4B860', '#EB5757', '#6FCF97', '#5B7CFA'] }), 300);
}

const GoalsPage = () => {
  const { goals, createGoal, updateGoal, deleteGoal } = useGoals();
  const { tasks, createTask, updateTask } = useTasks();
  const { profile, updateProfile } = useProfile();
  const profileName = profile?.name || profile?.email?.split('@')[0] || 'Anon';

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardData, setWizardData] = useState({ title: '', deadline: '', meaningful: '', obstacle: '', taskTitle: '' });

  const [detailGoal, setDetailGoal] = useState<any>(null);
  const [detailTitle, setDetailTitle] = useState('');
  const [detailDeadline, setDetailDeadline] = useState('');
  const [detailMeaningful, setDetailMeaningful] = useState('');
  const [detailObstacle, setDetailObstacle] = useState('');
  const [detailTaskTitle, setDetailTaskTitle] = useState('');
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  const [completedGoal, setCompletedGoal] = useState<any>(null);
  const [celebration, setCelebration] = useState<{ message: string; subtitle: string; extras: string[] } | null>(null);

  const parseDesc = (g: any): any => {
    if (!g?.description) return {};
    try { return JSON.parse(g.description); } catch { return {}; }
  };

  const wizardQuestions = [
    { key: 'title', label: 'Â¿QuÃ© quieres lograr exactamente?', description: 'Una meta clara define el rumbo. SÃ© especÃ­fico.', example: 'Correr 5km sin pausa', type: 'input', required: true },
    { key: 'deadline', label: 'Â¿Para cuÃ¡ndo quieres haberlo conseguido?', description: 'Sin fecha, una meta es solo un sueÃ±o. Fija un compromiso real.', example: '15 de junio', type: 'date' },
    { key: 'meaningful', label: 'Â¿CÃ³mo mejora esto tu vida?', description: 'Conectar con tu "por quÃ©" te da energÃ­a cuando la motivaciÃ³n baja.', example: 'Me sentirÃ© con mÃ¡s energÃ­a', type: 'textarea' },
    { key: 'obstacle', label: 'Â¿CuÃ¡l es el principal obstÃ¡culo interno que podrÃ­a detenerte?', description: 'Anticipar barreras te permite prepararte para vencerlas.', example: 'Las ganas de quedarme en la cama', type: 'textarea' },
    { key: 'taskTitle', label: 'Â¿CuÃ¡l es la primera tarea concreta que te acerca a esta meta?', description: 'El primer paso es el mÃ¡s importante. Hazlo pequeÃ±o y accionable.', example: 'Comprar tenis para correr', type: 'input' },
  ];
  const activeGoals = useMemo(() => {
    return [...goals.filter((g) => g.active)].sort((a, b) => {
      const aStats = getGoalStats(a);
      const bStats = getGoalStats(b);

      if (aStats.deadlineTs !== bStats.deadlineTs) return aStats.deadlineTs - bStats.deadlineTs;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [goals]);
  const completedGoals = goals.filter((g) => !g.active);

  const handleCreateGoal = async () => {
    if (!wizardData.title.trim()) { toast.error('Escribe una meta'); return; }
    const desc: any = {};
    if (wizardData.deadline) desc.deadline = wizardData.deadline;
    if (wizardData.meaningful.trim()) desc.meaningful = wizardData.meaningful.trim();
    if (wizardData.obstacle.trim()) desc.obstacle = wizardData.obstacle.trim();
    const hasTask = wizardData.taskTitle.trim().length > 0;
    desc.status = wizardData.obstacle.trim() && hasTask ? 'blindada' : 'borrador';
    try {
      const newGoal = await createGoal.mutateAsync({ title: wizardData.title.trim(), description: JSON.stringify(desc) });
      if (hasTask) {
        await createTask.mutateAsync({ title: wizardData.taskTitle.trim(), goal_id: newGoal.id });
      }
      setWizardData({ title: '', deadline: '', meaningful: '', obstacle: '', taskTitle: '' });
      setWizardOpen(false);
      setWizardStep(0);
      dispatchTutorialGoalCreated();
      toast.success('Nueva visiÃ³n establecida');
    } catch {
      toast.error('Error al proyectar meta');
    }
  };

  const handleCompleteGoal = async (goal: any) => {
    try {
      await updateGoal.mutateAsync({ id: goal.id, active: false });
      if (profile?.main_goal_id === goal.id) {
        updateProfile.mutate({ main_goal_id: null });
      }
      const goalTasks = tasks.filter((t: any) => t.goal_id === goal.id);
      const doneCount = goalTasks.filter((t: any) => t.status === 'done').length;
      const totalCount = goalTasks.length;
      const daysSince = Math.floor((Date.now() - new Date(goal.created_at).getTime()) / 86400000);
      const msg = celebrar(profileName, goal.title, goal.horizon || 'monthly', doneCount, totalCount, daysSince);
      setCelebration(msg);
      setCompletedGoal(goal);
      playCelebrationSound();
      fireConfetti();
      setTimeout(() => {
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999';
        document.body.appendChild(canvas);
        const myConfetti = confetti.create(canvas, { resize: true });
        myConfetti({ particleCount: 200, spread: 180, origin: { y: 0.6 } });
        setTimeout(() => {
          myConfetti({ particleCount: 100, spread: 120, origin: { y: 0.4 }, colors: ['#fbbf24', '#fff'] });
        }, 400);
        setTimeout(() => document.body.removeChild(canvas), 3000);
      }, 800);
    } catch {
      toast.error('Error al cerrar ciclo');
    }
  };

  const openDetail = (goal: any) => {
    setDetailGoal(goal);
    setDetailTitle(goal.title);
    const d = parseDesc(goal);
    setDetailDeadline(d.deadline || '');
    setDetailMeaningful(d.meaningful || '');
    setDetailObstacle(d.obstacle || '');
    const linkedTask = tasks.find((t: any) => t.goal_id === goal.id);
    setDetailTaskTitle(linkedTask?.title || '');
    setDetailTaskId(linkedTask?.id || null);
  };

  const handleSaveDetail = async () => {
    if (!detailTitle.trim()) { toast.error('El tÃ­tulo no puede estar vacÃ­o'); return; }
    try {
      const desc: any = {};
      if (detailDeadline) desc.deadline = detailDeadline;
      if (detailMeaningful.trim()) desc.meaningful = detailMeaningful.trim();
      if (detailObstacle.trim()) desc.obstacle = detailObstacle.trim();
      const old = parseDesc(detailGoal);
      if (old.microAction) desc.microAction = old.microAction;
      desc.status = detailObstacle.trim() && (detailTaskTitle.trim() || detailTaskId) ? 'blindada' : 'borrador';

      await updateGoal.mutateAsync({ id: detailGoal.id, title: detailTitle.trim(), description: JSON.stringify(desc) });

      if (detailTaskTitle.trim()) {
        if (detailTaskId) {
          await updateTask.mutateAsync({ id: detailTaskId, title: detailTaskTitle.trim() });
        } else {
          const newTask = await createTask.mutateAsync({ title: detailTaskTitle.trim(), goal_id: detailGoal.id });
          setDetailTaskId(newTask.id);
        }
      }

      setDetailGoal(null);
      toast.success('Meta actualizada');
    } catch {
      toast.error('Error al actualizar');
    }
  };

  const handleDeleteFromDetail = () => {
    if (window.confirm('Â¿Eliminar esta meta y todas sus tareas vinculadas?')) {
      deleteGoal.mutate(detailGoal.id);
      setDetailGoal(null);
      toast.success('Meta eliminada');
    }
  };

  const handleCreateNextGoal = async () => {
    if (!completedGoal) return;
    try {
      await createGoal.mutateAsync({
        title: (document.getElementById('next-goal-input') as HTMLInputElement)?.value?.trim() || completedGoal.title + ' II',
      });
      setCompletedGoal(null);
    } catch {
      toast.error('Error al crear siguiente meta');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="page-title">Metas</h1>
            <p className="text-sm text-on-surface-variant/50 mt-1">
              {activeGoals.length} activa{activeGoals.length !== 1 && 's'} Â· {completedGoals.length} completa{completedGoals.length !== 1 && 's'}
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { setWizardData({ title: '', deadline: '', meaningful: '', obstacle: '', taskTitle: '' }); setWizardStep(0); setWizardOpen(true); }}
            className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
          >
            <Plus className="w-5 h-5" strokeWidth={3} />
          </motion.button>
        </div>

        {/* Active Goals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeGoals.map((goal, idx) => {
            const stats = getGoalStats(goal);
            const isBlindada = stats.desc.status === 'blindada';
            const hasDeadline = stats.daysLeft !== null;
            const chipTone =
              stats.urgencyTone === 'critical'
                ? 'bg-destructive/15 text-destructive border-destructive/20'
                : stats.urgencyTone === 'hot'
                  ? 'bg-orange-500/15 text-orange-500 border-orange-500/20'
                  : stats.urgencyTone === 'warm'
                    ? 'bg-amber-500/15 text-amber-500 border-amber-500/20'
                    : 'bg-primary/10 text-primary border-primary/20';

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, type: 'spring', stiffness: 300, damping: 25 }}
                className="group"
              >
                <div
                  onClick={() => openDetail(goal)}
                  className={`relative overflow-hidden rounded-2xl p-5 cursor-pointer border-2 select-none transition-all duration-200 ${
                    isBlindada
                      ? 'bg-gradient-to-br from-primary/12 via-primary/6 to-primary/14 border-primary/25 shadow-md shadow-primary/15 hover:border-primary/45 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0'
                      : 'bg-surface-container/30 border-outline-variant/10 shadow-none hover:border-outline-variant/25 hover:shadow-sm hover:shadow-black/5 hover:-translate-y-0.5 active:translate-y-0 active:shadow-none'
                  }`}
                >
                  {isBlindada && (
                    <>
                      <div className="absolute -top-px -right-px w-24 h-24 overflow-hidden pointer-events-none">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-[100%]" />
                      </div>
                      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />
                    </>
                  )}

                  <div className="relative z-[1] space-y-4">
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCompleteGoal(goal); }}
                        className={`relative w-7 h-7 shrink-0 rounded-lg border-2 flex items-center justify-center active:scale-90 transition-all duration-200 group/check ${
                          isBlindada
                            ? 'border-primary/40 bg-primary/10 hover:border-primary hover:bg-primary/20'
                            : 'border-outline-variant/20 bg-surface-container/40 hover:border-outline-variant/40'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 text-transparent group-hover/check:text-current transition-colors" strokeWidth={3} />
                        <div className={`absolute inset-0 rounded-lg transition-colors ${isBlindada ? 'bg-primary/0 group-hover/check:bg-primary/10' : 'bg-transparent'}`} />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-base font-bold tracking-tight leading-snug break-words pr-1">{goal.title}</h3>
                          <div className={`w-6 h-6 shrink-0 rounded-lg flex items-center justify-center transition-all duration-200 ${
                            isBlindada
                              ? 'bg-primary/15 text-primary/60 group-hover:bg-primary/25 group-hover:text-primary'
                              : 'bg-surface-container/40 text-on-surface-variant/30 group-hover:text-on-surface-variant/50'
                          }`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5" strokeWidth={2.5}>
                              <path d="M9 18l6-6-6-6" />
                            </svg>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.14em] border ${chipTone}`}>
                            {hasDeadline ? stats.focusState : 'SIN FECHA'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="h-2.5 rounded-full bg-surface-container/60 overflow-hidden border border-outline-variant/10">
                        <motion.div
                          className={`h-full rounded-full ${
                            stats.urgencyTone === 'critical'
                              ? 'bg-gradient-to-r from-destructive to-orange-500'
                              : stats.urgencyTone === 'hot'
                                ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                                : stats.urgencyTone === 'warm'
                                  ? 'bg-gradient-to-r from-amber-400 to-primary'
                                  : 'bg-gradient-to-r from-primary/70 to-primary'
                          }`}
                          initial={false}
                          animate={{ width: `${hasDeadline ? Math.max(8, stats.progress) : 12}%` }}
                          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-on-surface-variant/45">
                        <span>{hasDeadline ? `${stats.progress}%` : 'Sin fecha'}</span>
                        {hasDeadline && (
                          <span>{stats.daysLeft === 0 ? 'Hoy' : `${Math.max(0, stats.daysLeft ?? 0)} dÃ­as`}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {activeGoals.length === 0 && (
            <div className="col-span-full py-20 bg-surface/30 border border-dashed border-outline-variant/20 rounded-2xl text-center px-8 flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mb-5">
                <Target className="w-8 h-8 text-on-surface-variant/30" />
              </div>
              <h3 className="text-xl font-black mb-2">Crea tu primera meta</h3>
              <p className="text-sm text-on-surface-variant/50 max-w-[300px] leading-relaxed mb-6">
                Define un objetivo con horizonte de tiempo y empieza a vincular tareas.
              </p>
              <button
            onClick={() => { setWizardData({ title: '', deadline: '', meaningful: '', obstacle: '', taskTitle: '' }); setWizardStep(0); setWizardOpen(true); }}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-black text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nueva Meta
              </button>
            </div>
          )}
        </div>

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <div className="mt-12 space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/30">
              Completadas Â· {completedGoals.length}
            </h2>
            <div className="flex flex-wrap gap-2">
              {completedGoals.map((goal) => (
                <div
                  key={goal.id}
                  onClick={() => openDetail(goal)}
                  className="px-4 py-2.5 bg-surface-container/20 rounded-xl border border-outline-variant/10 text-sm font-medium text-on-surface-variant/60 cursor-pointer hover:bg-surface-container/40 hover:text-on-surface-variant/80 transition-all break-words"
                >
                  <span className="line-through decoration-1 decoration-on-surface-variant/30">{goal.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* New Goal Wizard */}
      <AnimatePresence>
        {wizardOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9998]"
              onClick={() => setWizardOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-[10%] lg:inset-x-0 lg:w-[480px] lg:mx-auto z-[9999] max-h-[80vh] flex flex-col"
            >
              <div className="bg-surface p-5 rounded-2xl border border-outline-variant/20 shadow-2xl flex flex-col max-h-full gap-3">
                {/* Close button */}
                <div className="shrink-0 flex justify-end">
                  <button
                    onClick={() => setWizardOpen(false)}
                    className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="shrink-0 w-full h-1 bg-surface-container rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: `${(wizardStep / wizardQuestions.length) * 100}%` }}
                    animate={{ width: `${((wizardStep + 1) / wizardQuestions.length) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  />
                </div>

                {/* Step content â€” scrollable */}
                <div className="flex-1 overflow-y-auto min-h-0 space-y-3">
                  <h2 className="text-lg font-black leading-tight">
                    {wizardQuestions[wizardStep].label}
                  </h2>
                  <p className="text-xs text-on-surface-variant/50 leading-relaxed">
                    {wizardQuestions[wizardStep].description}
                  </p>
                  {wizardQuestions[wizardStep].example && (
                    <p className="text-xs font-bold text-on-surface-variant/30">
                      Ej: {wizardQuestions[wizardStep].example}
                    </p>
                  )}

                  {wizardQuestions[wizardStep].type === 'input' && (
                    <div className="space-y-2">
                      <input
                        autoFocus
                        value={wizardData[wizardQuestions[wizardStep].key as keyof typeof wizardData] as string}
                        onChange={(e) => setWizardData({ ...wizardData, [wizardQuestions[wizardStep].key]: e.target.value })}
                        placeholder="Escribe aquÃ­..."
                        className="w-full bg-surface-container rounded-xl px-4 py-3 text-foreground font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                        onKeyDown={(e) => e.key === 'Enter' && wizardStep < wizardQuestions.length - 1 && setWizardStep(wizardStep + 1)}
                      />
                      {!wizardQuestions[wizardStep].required && wizardData[wizardQuestions[wizardStep].key as keyof typeof wizardData] === '' && (
                        <button
                          onClick={() => setWizardStep(wizardStep + 1)}
                          className="text-[11px] font-bold text-on-surface-variant/40 hover:text-on-surface-variant/70 transition-colors"
                        >
                          Saltar esta pregunta
                        </button>
                      )}
                    </div>
                  )}

                  {wizardQuestions[wizardStep].type === 'date' && (
                    <div className="space-y-1">
                      <div className="flex justify-center">
                        <CalendarRac
                          value={wizardData.deadline ? parseDate(wizardData.deadline) : undefined}
                          onChange={(d) => setWizardData({ ...wizardData, deadline: d.toString() })}
                          className="p-1 bg-transparent border-0 shadow-none rounded-none [&_td>div]:size-8 [&_td>div]:text-xs"
                        />
                      </div>
                      {wizardData.deadline === '' && (
                        <div className="flex justify-center pt-1">
                          <button
                            onClick={() => setWizardStep(wizardStep + 1)}
                            className="text-[11px] font-bold text-on-surface-variant/40 hover:text-on-surface-variant/70 transition-colors"
                          >
                            Saltar esta pregunta
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {wizardQuestions[wizardStep].type === 'textarea' && (
                    <div className="space-y-2">
                      <textarea
                        autoFocus
                        value={wizardData[wizardQuestions[wizardStep].key as keyof typeof wizardData] as string}
                        onChange={(e) => setWizardData({ ...wizardData, [wizardQuestions[wizardStep].key]: e.target.value })}
                        placeholder="Escribe aquÃ­..."
                        rows={2}
                        className="w-full bg-surface-container rounded-xl px-4 py-3 text-foreground font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-shadow resize-none"
                      />
                      {wizardData[wizardQuestions[wizardStep].key as keyof typeof wizardData] === '' && (
                        <button
                          onClick={() => setWizardStep(wizardStep + 1)}
                          className="text-[11px] font-bold text-on-surface-variant/40 hover:text-on-surface-variant/70 transition-colors"
                        >
                          Saltar esta pregunta
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Navigation â€” always at bottom */}
                <div className="shrink-0 flex gap-2 pt-3 border-t border-outline-variant/10">
                  {wizardStep > 0 ? (
                    <button
                      onClick={() => setWizardStep(wizardStep - 1)}
                      className="flex-1 py-3 rounded-xl bg-surface-container text-on-surface-variant font-bold text-sm"
                    >
                      AtrÃ¡s
                    </button>
                  ) : (
                    <button
                      onClick={() => setWizardOpen(false)}
                      className="flex-1 py-3 rounded-xl bg-surface-container text-on-surface-variant font-bold text-sm"
                    >
                      Cancelar
                    </button>
                  )}
                  {wizardStep < wizardQuestions.length - 1 ? (
                    <button
                      onClick={() => setWizardStep(wizardStep + 1)}
                      className="flex-[1.5] py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20"
                    >
                      Siguiente
                    </button>
                  ) : (
                    <button
                      onClick={handleCreateGoal}
                      className="flex-[1.5] py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20"
                    >
                      Crear Meta
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Goal Detail Modal */}
      <AnimatePresence>
        {detailGoal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9998]"
              onClick={() => setDetailGoal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-[8%] lg:inset-x-0 lg:w-[460px] lg:mx-auto z-[9999] max-h-[85vh] flex flex-col"
            >
              <div className="bg-surface p-6 rounded-2xl border border-outline-variant/20 shadow-2xl space-y-5 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-on-surface-variant/40" />
                    <h2 className="text-lg font-black">Detalle de Meta</h2>
                  </div>
                  <button
                    onClick={() => setDetailGoal(null)}
                    className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <input
                  value={detailTitle}
                  onChange={(e) => setDetailTitle(e.target.value)}
                  className="w-full bg-surface-container rounded-xl px-4 py-3 text-foreground font-bold text-lg outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                />

                {/* Status badge â€” live from current detail state */}
                {(() => {
                  const detailStats = getGoalStats(detailGoal);
                  const toneClass =
                    detailStats.focusState === "FOCO" || detailStats.focusState === "HOY"
                      ? "bg-destructive/10 border-destructive/20 text-destructive"
                      : detailStats.focusState === "RITMO"
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                        : "bg-primary/10 border-primary/20 text-primary";

                  return (
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-sm shadow-primary/10 ${toneClass}`}>
                      <div className="w-2.5 h-2.5 rounded-full bg-current animate-pulse shadow-[0_0_18px_currentColor]" />
                      <span className="text-[10px] font-black uppercase tracking-[0.15em]">
                        {detailStats.hasDeadline ? detailStats.focusState : "SIN FECHA"}
                      </span>
                    </div>
                  );
                })()}

                {/* Editable SMART + WOOP fields */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/30">Detalles de la meta</p>

                  {/* Deadline */}
                  <div className="flex items-start gap-3 bg-surface-container/40 rounded-xl px-4 py-3 border border-outline-variant/10">
                    <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center shrink-0 text-sky-500/70">
                      <CalendarDays className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/30">Fecha lÃ­mite</p>
                      <input
                        type="date"
                        value={detailDeadline}
                        onChange={(e) => setDetailDeadline(e.target.value)}
                        className="w-full bg-transparent text-sm font-bold mt-0.5 text-foreground outline-none [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  {/* Meaningful */}
                  <div className="flex items-start gap-3 bg-surface-container/40 rounded-xl px-4 py-3 border border-outline-variant/10">
                    <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center shrink-0 text-pink-500/70">
                      <Heart className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/30">Â¿CÃ³mo mejora tu vida?</p>
                      <textarea
                        value={detailMeaningful}
                        onChange={(e) => setDetailMeaningful(e.target.value)}
                        rows={2}
                        placeholder="Escribe aquÃ­..."
                        className="w-full bg-transparent text-sm font-bold mt-0.5 text-foreground outline-none resize-none"
                      />
                    </div>
                  </div>

                  {/* Obstacle */}
                  <div className="flex items-start gap-3 bg-surface-container/40 rounded-xl px-4 py-3 border border-outline-variant/10">
                    <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center shrink-0 text-rose-500/70">
                      <ShieldAlert className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/30">ObstÃ¡culo interno</p>
                      <textarea
                        value={detailObstacle}
                        onChange={(e) => setDetailObstacle(e.target.value)}
                        rows={2}
                        placeholder="Escribe aquÃ­..."
                        className="w-full bg-transparent text-sm font-bold mt-0.5 text-foreground outline-none resize-none"
                      />
                    </div>
                  </div>

                  {/* Linked task */}
                  <div className="flex items-start gap-3 bg-surface-container/40 rounded-xl px-4 py-3 border border-outline-variant/10">
                    <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center shrink-0 text-amber-500/70">
                      <ListChecks className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/30">Tarea vinculada</p>
                      <input
                        value={detailTaskTitle}
                        onChange={(e) => setDetailTaskTitle(e.target.value)}
                        placeholder="Escribe una tarea..."
                        className="w-full bg-transparent text-sm font-bold mt-0.5 text-foreground outline-none"
                      />
                      {detailTaskId && (
                        <p className="text-[9px] text-on-surface-variant/30 mt-1 font-medium">âœ“ Tarea existente vinculada a esta meta</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/30">
                  Creada el {new Date(detailGoal.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>

                <div className="flex gap-2 pt-2 border-t border-outline-variant/10">
                  <button
                    onClick={handleDeleteFromDetail}
                    className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-destructive/10 text-destructive font-bold text-sm hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => setDetailGoal(null)}
                    className="px-5 py-3 rounded-xl bg-surface-container text-on-surface-variant font-bold text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveDetail}
                    className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Celebration Overlay */}
      <AnimatePresence>
        {completedGoal && celebration && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gradient-to-b from-background via-background to-background/95 backdrop-blur-xl z-[10000] flex items-center justify-center overflow-hidden"
            >
              {/* Floating background particles */}
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute text-amber-400/10"
                  initial={{ x: `${15 + (i * 7) % 70}%`, y: `${10 + (i * 9) % 75}%`, scale: 0, opacity: 0 }}
                  animate={{
                    y: [`${10 + (i * 9) % 75}%`, `${5 + (i * 11) % 70}%`, `${15 + (i * 8) % 75}%`],
                    scale: [0, 1, 0.8, 1.2, 0],
                    opacity: [0, 0.3, 0.2, 0.4, 0],
                  }}
                  transition={{ duration: 4 + (i % 3), delay: i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {i % 3 === 0 ? <Star className="w-4 h-4" /> : i % 3 === 1 ? <Zap className="w-3 h-3" /> : <Sparkles className="w-5 h-5" />}
                </motion.div>
              ))}

              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 10 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                className="text-center px-8 max-w-md relative"
              >
                {/* Trophy */}
                <motion.div
                  initial={{ y: -60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 10, delay: 0.2 }}
                  className="mb-6"
                >
                  <motion.div
                    animate={{ rotate: [0, -10, 12, -10, 8, -5, 0], scale: [1, 1.2, 1.1, 1.2, 1.05, 1.1, 1] }}
                    transition={{ duration: 1.2, delay: 0.5, ease: 'easeInOut' }}
                    className="inline-flex"
                  >
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-amber-400/20 via-yellow-500/15 to-amber-600/20 border-2 border-amber-400/30 flex items-center justify-center shadow-2xl shadow-amber-500/25 relative">
                      <Trophy className="w-14 h-14 sm:w-16 sm:h-16 text-amber-400" strokeWidth={1.5} />
                      {/* Glow */}
                      <div className="absolute inset-0 rounded-3xl bg-amber-400/5 animate-pulse" />
                    </div>
                  </motion.div>
                </motion.div>

                {/* Text */}
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6, type: 'spring', stiffness: 120, damping: 12 }}
                  className="space-y-4"
                >
                  <h2 className="text-3xl sm:text-4xl font-black leading-tight tracking-tight">
                    {celebration.message}
                  </h2>

                  <p className="text-base sm:text-lg font-semibold text-on-surface-variant/70 leading-relaxed">
                    {celebration.subtitle}
                  </p>

                  <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 1.0, type: 'spring', stiffness: 200, damping: 12 }}
                    className="inline-block px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400/15 via-yellow-500/10 to-amber-400/15 border border-amber-400/20"
                  >
                    <span className="text-xl sm:text-2xl font-black text-amber-400">{completedGoal.title}</span>
                  </motion.div>

                  {celebration.extras.length > 0 && (
                    <motion.div
                      initial={{ y: 15, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 1.3 }}
                      className="flex items-center justify-center gap-2 pt-1"
                    >
                      <Flame className="w-4 h-4 text-amber-400/60" />
                      <span className="text-sm font-bold text-on-surface-variant/50">
                        {celebration.extras.join(' Â· ')}
                      </span>
                      <Heart className="w-4 h-4 text-rose-400/60" />
                    </motion.div>
                  )}
                </motion.div>

                {/* Continue button */}
                <motion.div
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1.8 }}
                  className="mt-10"
                >
                  <button
                    onClick={() => { setCompletedGoal(null); setCelebration(null); }}
                    className="px-10 py-3.5 rounded-2xl bg-primary text-primary-foreground font-black text-sm shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 hover:opacity-90 transition-all"
                  >
                    Seguir adelante
                  </button>
                </motion.div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GoalsPage;
