import { useMemo, useState, useRef, useCallback } from 'react';
import { useGoals } from '@/hooks/useGoals';
import { useProfile } from '@/hooks/useProfile';
import { useTasks } from '@/hooks/useTasks';
import { Plus, Check, Trophy, Target, Edit3, Trash2, X, Sparkles, Star, Zap, Heart, Flame, CalendarDays, ShieldAlert, ListChecks, Palette } from 'lucide-react';
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
  const normalized = deadline.includes('T') ? deadline :`${deadline}T23:59:59`;
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
  daily: 'Día',
  weekly: 'Semana',
  monthly: 'Mes',
  quarterly: 'Trimestre',
  annual: 'Año',
};

const celebrar = (name: string, goalTitle: string, horizon: string, doneCount: number, totalCount: number, daysSinceCreation: number) => {
  const timeOfDay = () => {
    const h = new Date().getHours();
    if (h < 6) return 'de madrugada';
    if (h < 12) return 'de la mañana';
    if (h < 18) return 'de la tarde';
    if (h < 22) return 'de la noche';
    return 'de madrugada';
  };

  const lines: { message: string; subtitle: string }[] = [
    {
      message:`¡Felicidades, ${name}!`,
      subtitle:`Has conquistado tu meta de ${horizonLabels[horizon]?.toLowerCase() || 'vida'} — "${goalTitle}"`,
    },
    {
      message:`${name}, ¡LO LOGRASTE!`,
      subtitle:`"${goalTitle}" — Completado con éxito. Esto merece celebración.`,
    },
    {
      message:`¡${name}, eres imparable!`,
      subtitle:`Meta de ${horizonLabels[horizon]?.toLowerCase() || 'vida'} alcanzada: "${goalTitle}"`,
    },
    {
      message:`${name}, acabas de hacer historia`,
      subtitle:`"${goalTitle}" — Una meta menos en el tintero. Bien jugado.`,
    },
    {
      message:`¡BOOM! ${name} lo hizo de nuevo.`,
      subtitle:`"${goalTitle}" está oficialmente cumplida. Disfruta este momento.`,
    },
    {
      message:`¡${name}, nivel completado!`,
      subtitle:`"${goalTitle}" — Misión cumplida ${timeOfDay()}. Toma un respiro, te lo mereces.`,
    },
  ];

  const extras: string[] = [];
  if (doneCount > 0) {
    extras.push(doneCount === 1 ? '1 tarea completada' :`${doneCount} tareas completadas`);
  }
  if (daysSinceCreation > 0) {
    extras.push(daysSinceCreation === 0 ? 'en el día' : daysSinceCreation === 1 ? '1 día' :`${daysSinceCreation} días`);
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

const POSTIT_COLORS = [
  { bg: '#FEF3C7', border: '#FCD34D', name: 'yellow' },
  { bg: '#FCE4EC', border: '#F48FB1', name: 'pink' },
  { bg: '#D4EDDA', border: '#6FCF97', name: 'green' },
  { bg: '#D6E8FF', border: '#7CB8FF', name: 'blue' },
  { bg: '#FEE2D5', border: '#F9A67A', name: 'orange' },
  { bg: '#E8D5F5', border: '#CE93D8', name: 'purple' },
];

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
  const [draggingGoalId, setDraggingGoalId] = useState<string | null>(null);
  const [customDaysInput, setCustomDaysInput] = useState<Record<string, string>>({});
  const posRef = useRef<Record<string, { x: number; y: number; w: number }>>({});
  const dragClickGuard = useRef(false);

  const parseDesc = (g: any): any => {
    if (!g?.description) return {};
    try { return JSON.parse(g.description); } catch { return {}; }
  };

  const wizardQuestions = [
    { key: 'title', label: '¿Qué quieres lograr exactamente?', description: 'Una meta clara define el rumbo. Sé específico.', example: 'Correr 5km sin pausa', type: 'input', required: true },
    { key: 'deadline', label: '¿Para cuándo quieres haberlo conseguido?', description: 'Sin fecha, una meta es solo un sueño. Fija un compromiso real.', example: '15 de junio', type: 'date' },
    { key: 'meaningful', label: '¿Cómo mejora esto tu vida?', description: 'Conectar con tu "por qué" te da energía cuando la motivación baja.', example: 'Me sentiré con más energía', type: 'textarea' },
    { key: 'obstacle', label: '¿Cuál es el principal obstáculo interno que podría detenerte?', description: 'Anticipar barreras te permite prepararte para vencerlas.', example: 'Las ganas de quedarme en la cama', type: 'textarea' },
    { key: 'taskTitle', label: '¿Cuál es la primera tarea concreta que te acerca a esta meta?', description: 'El primer paso es el más importante. Hazlo pequeño y accionable.', example: 'Comprar tenis para correr', type: 'input' },
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
      toast.success('Nueva visión establecida');
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
    if (!detailTitle.trim()) { toast.error('El título no puede estar vacío'); return; }
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
    if (window.confirm('¿Eliminar esta meta y todas sus tareas vinculadas?')) {
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

  const extendDeadline = (goal: any, extraDays: number) => {
    const d = parseDesc(goal);
    if (!d.deadline) return;
    const current = new Date(d.deadline);
    current.setDate(current.getDate() + extraDays);
    d.deadline = current.toISOString().split('T')[0];
    updateGoal.mutate({ id: goal.id, description: JSON.stringify(d) });
  };

  const dismissUrgency = (goal: any) => {
    const d = parseDesc(goal);
    d._urgencyDismissed = true;
    updateGoal.mutate({ id: goal.id, description: JSON.stringify(d) });
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3">
            <h1 className="text-[30px] sm:text-[34px] font-black tracking-tight text-foreground drop-shadow-sm">Metas</h1>
            <button
              onClick={() => { setWizardData({ title: '', deadline: '', meaningful: '', obstacle: '', taskTitle: '' }); setWizardStep(0); setWizardOpen(true); }}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              style={{ backgroundColor: '#FEF3C7', border: '2px solid #FCD34D', color: '#92400E', boxShadow: '0 2px 6px rgba(252,211,77,0.3)' }}
            >
              <Plus className="w-5 h-5" strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Active Goals — Post-it notes */}
        {/* Active Goals (móvil) */}
        <div className="sm:hidden grid grid-cols-1 gap-4">
          {activeGoals.length === 0 ? (
            <button
              onClick={() => { setWizardData({ title: '', deadline: '', meaningful: '', obstacle: '', taskTitle: '' }); setWizardStep(0); setWizardOpen(true); }}
              className="w-full rounded-2xl border-2 p-5 text-left cursor-click"
              style={{ backgroundColor: '#FEF3C7', borderColor: '#FCD34D', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
            >
              <p className="font-black text-[#92400E]">Crea tu primera meta</p>
              <p className="text-xs mt-1 text-[#A16207]/70">Escribe aquí tu objetivo...</p>
            </button>
          ) : (
            activeGoals.map((goal) => {
              const stats = getGoalStats(goal);
              const hasDeadline = stats.daysLeft !== null;
              const desc = parseDesc(goal);
              const pin = desc._pin || {};
              const colorIdx = pin.colorIdx ?? 0;
              const postitColor = POSTIT_COLORS[colorIdx % POSTIT_COLORS.length];

              return (
                <div
                  key={goal.id}
                  className="relative mx-auto w-full max-w-[390px] rounded-lg border-2 p-4 active:scale-[0.99] transition-transform cursor-click"
                  style={{
                    backgroundColor: postitColor.bg,
                    borderColor: postitColor.border,
                    boxShadow: '0 12px 28px rgba(0,0,0,0.18), 0 2px 4px rgba(0,0,0,0.08)',
                    transform: `rotate(${(activeGoals.indexOf(goal) % 3) - 1}deg)`,
                  }}
                  onClick={() => setDetailGoal(goal)}
                >
                  <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-zinc-300 bg-zinc-400 shadow-sm" />
                  <div className="pointer-events-none absolute inset-x-4 top-14 bottom-4 opacity-15" style={{ backgroundImage: 'repeating-linear-gradient(180deg, #1f2937 0 1px, transparent 1px 28px)' }} />
                  <div className="flex items-start gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCompleteGoal(goal); }}
                      className="mt-0.5 h-6 w-6 shrink-0 rounded border-2 flex items-center justify-center hover:bg-black/5 transition-colors"
                      style={{ borderColor: postitColor.border }}
                    >
                      <Check className="w-4 h-4 text-transparent hover:text-current transition-colors" strokeWidth={3} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-[15px] font-black leading-snug break-words" style={{ color: '#1f2937' }}>
                          {goal.title}
                        </h3>
                        <div className="flex gap-1 shrink-0 mt-0.5">
                          {POSTIT_COLORS.map((c, i) => (
                            <button
                              key={c.name}
                              onClick={(e) => {
                                e.stopPropagation();
                                const desc = parseDesc(goal);
                                const pin = desc._pin || {};
                                const pos = pin;
                                const newDesc = { ...desc, _pin: { ...pin, colorIdx: i } };
                                updateGoal.mutate({ id: goal.id, description: JSON.stringify(newDesc) });
                              }}
                              className={`w-4 h-4 rounded-full border-2 transition-transform active:scale-125 ${i === colorIdx ? 'border-white scale-125' : 'border-white/60'}`}
                              style={{ backgroundColor: c.bg }}
                            />
                          ))}
                        </div>
                      </div>
                      {hasDeadline && (
                        <div className="mt-3 space-y-1">
                          <div className="relative h-2" style={{ color: '#1f2937' }}>
                            <div className="absolute inset-0 border-b border-dashed opacity-30" style={{ borderColor: '#1f2937', borderBottomWidth: '1.5px' }} />
                            <motion.div
                              initial={false}
                              animate={{ width: `${Math.max(4, stats.progress)}%` }}
                              className="absolute bottom-0 left-0 h-full"
                              style={{
                                background: `repeating-linear-gradient(90deg, ${postitColor.border} 0 2px, transparent 2px 4px)`,
                                borderBottom: '2px solid ' + postitColor.border,
                              }}
                              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-bold" style={{ color: '#4b5563' }}>
                            <span>{stats.progress}%</span>
                            <span>{stats.daysLeft === 0 ? 'Hoy' : `${Math.max(0, stats.daysLeft)} días`}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Active Goals â€” Post-it notes (desktop/tablet) */}
        <div
          className="relative hidden sm:block min-h-[60vh] overflow-x-auto overflow-y-auto overscroll-contain"
          style={{
            WebkitOverflowScrolling: 'touch',
            minWidth: activeGoals.length > 0 ? `${20 + (Math.min(activeGoals.length, 3)) * 280 + 60}px` : undefined,
            minHeight: activeGoals.length > 0 ? `${20 + Math.ceil(activeGoals.length / 3) * 240 + 60}px` : undefined,
          }}
        >
          {activeGoals.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="relative rounded-lg border-2 p-6 w-[280px] cursor-click select-none group"
                onClick={() => { setWizardData({ title: '', deadline: '', meaningful: '', obstacle: '', taskTitle: '' }); setWizardStep(0); setWizardOpen(true); }}
                style={{ backgroundColor: '#FEF3C7', borderColor: '#FCD34D', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              >
                {/* Pin dot */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-zinc-400 border-2 border-zinc-300 shadow-sm" />
                {/* Ruled lines */}
                <div className="absolute inset-x-4 top-12 bottom-4 pointer-events-none opacity-20" style={{
                  backgroundImage: 'repeating-linear-gradient(180deg, #1f2937 0 1px, transparent 1px 28px)',
                }} />
                {/* Content */}
                <div className="relative z-10 pt-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#FDE68A' }}>
                    <Target className="w-6 h-6" style={{ color: '#92400E' }} strokeWidth={2} />
                  </div>
                  <p className="text-center font-bold" style={{ color: '#92400E', fontSize: '13px' }}>Crea tu primera meta</p>
                  <p className="text-center text-xs mt-1" style={{ color: '#A16207', opacity: 0.6 }}>Escribe aquí tu objetivo...</p>
                </div>
              </div>
            </div>
          ) : (
            activeGoals.map((goal) => {
              const stats = getGoalStats(goal);
              const hasDeadline = stats.daysLeft !== null;
              const desc = parseDesc(goal);
              const pin = desc._pin || {};
              const colorIdx = pin.colorIdx ?? 0;
              const postitColor = POSTIT_COLORS[colorIdx % POSTIT_COLORS.length];
              const defaultX = 20 + (activeGoals.indexOf(goal) % 3) * 280;
              const defaultY = 20 + Math.floor(activeGoals.indexOf(goal) / 3) * 240;
              const defaultW = 260;
              const saved = posRef.current[goal.id] || { x: pin.x ?? defaultX, y: pin.y ?? defaultY, w: pin.w ?? defaultW };
              if (!posRef.current[goal.id]) posRef.current[goal.id] = saved;
              const isDragging = draggingGoalId === goal.id;

              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, scale: 0.8, rotate: -2 }}
                  animate={{ opacity: 1, scale: 1, rotate: (pin.rotate ?? (activeGoals.indexOf(goal) % 5 - 2)) }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  style={{
                    position: 'absolute',
                    left: saved.x,
                    top: saved.y,
                    width: saved.w,
                    zIndex: isDragging ? 50 : 10,
                    backgroundColor: postitColor.bg,
                    borderColor: postitColor.border,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
                  }}
                  className="rounded-lg border-2 p-4 cursor-click select-none group"
                  data-postit={goal.id}
                  onClick={() => { const guard = dragClickGuard.current; dragClickGuard.current = false; if (!guard) openDetail(goal); }}
                >
                  {/* Pin dot — drag only from here */}
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 cursor-drag"
                    style={{ touchAction: 'none' }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      dragClickGuard.current = true;
                      setDraggingGoalId(goal.id);
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const startLeft = saved.x;
                      const startTop = saved.y;
                      const el = document.querySelector(`[data-postit="${goal.id}"]`) as HTMLElement;
                      const handleMove = (ev: PointerEvent) => {
                        const dx = ev.clientX - startX;
                        const dy = ev.clientY - startY;
                        posRef.current[goal.id].x = startLeft + dx;
                        posRef.current[goal.id].y = startTop + dy;
                        if (el) { el.style.left = (startLeft + dx) + 'px'; el.style.top = (startTop + dy) + 'px'; }
                      };
                      const handleUp = () => {
                        setDraggingGoalId(null);
                        window.removeEventListener('pointermove', handleMove);
                        window.removeEventListener('pointerup', handleUp);
                        const pos = posRef.current[goal.id];
                        const newDesc = { ...desc, _pin: { ...pin, x: pos.x, y: pos.y, w: pos.w, colorIdx } };
                        updateGoal.mutate({ id: goal.id, description: JSON.stringify(newDesc) });
                      };
                      window.addEventListener('pointermove', handleMove);
                      window.addEventListener('pointerup', handleUp);
                    }}
                  >
                    {/* Visible pin dot */}
                    <div className="w-5 h-5 rounded-full bg-zinc-400 border-[3px] border-zinc-300 shadow-sm" />
                    {/* Invisible larger touch target */}
                    <div className="absolute -inset-2 rounded-full" />
                  </div>

                  {/* Color picker */}
                  <div className="absolute -top-1 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {POSTIT_COLORS.map((c, i) => (
                      <button
                        key={c.name}
                        onClick={(e) => {
                          e.stopPropagation();
                          const pos = posRef.current[goal.id];
                          const newDesc = { ...desc, _pin: { ...pin, x: pos.x, y: pos.y, w: pos.w, colorIdx: i } };
                          updateGoal.mutate({ id: goal.id, description: JSON.stringify(newDesc) });
                        }}
                        className="w-3 h-3 rounded-full border border-white/60 shadow-sm hover:scale-125 transition-transform"
                        style={{ backgroundColor: c.bg }}
                      />
                    ))}
                  </div>

                  {/* Checkbox + Title */}
                  <div className="flex items-start gap-2.5 cursor-click">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCompleteGoal(goal); }}
                      className="w-5 h-5 shrink-0 mt-0.5 rounded border-2 flex items-center justify-center hover:bg-black/5 transition-colors"
                      style={{ borderColor: postitColor.border }}
                    >
                      <Check className="w-3 h-3 text-transparent hover:text-current transition-colors" strokeWidth={3} />
                    </button>
                    <h3 className="text-[15px] font-bold leading-snug break-words cursor-click" style={{ color: '#1f2937' }}>
                      {goal.title}
                    </h3>
                  </div>

                  {/* Pencil progress bar */}
                  {hasDeadline && (
                    <div className="mt-3 space-y-1">
                      <div className="relative h-2" style={{ color: '#1f2937' }}>
                        <div className="absolute inset-0 border-b border-dashed opacity-30" style={{ borderColor: '#1f2937', borderBottomWidth: '1.5px' }} />
                        <motion.div
                          initial={false}
                          animate={{ width: `${Math.max(4, stats.progress)}%` }}
                          className="absolute bottom-0 left-0 h-full"
                          style={{
                            background: `repeating-linear-gradient(90deg, ${postitColor.border} 0 2px, transparent 2px 4px)`,
                            borderBottom: '2px solid ' + postitColor.border,
                          }}
                          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-bold" style={{ color: '#4b5563' }}>
                        <span>{stats.progress}%</span>
                        <span>{stats.daysLeft === 0 ? 'Hoy' : `${Math.max(0, stats.daysLeft)} días`}</span>
                      </div>
                    </div>
                    )}
                    {stats.daysLeft !== null && stats.daysLeft >= 0 && stats.daysLeft <= 3 && stats.progress < 100 && !desc._urgencyDismissed && (
                      <div className="mt-2 p-2 rounded-lg text-[10px] font-bold text-center leading-tight" style={{ backgroundColor: '#FDE68A', color: '#92400E' }}>
                        {stats.daysLeft === 0 ? (
                          <>
                            <p>El día ha llegado. ¿Pides más tiempo o lo intentas hoy?</p>
                            <div className="flex gap-2 mt-1.5 justify-center items-center flex-wrap">
                              <button
                                onClick={(e) => { e.stopPropagation(); extendDeadline(goal, 3); }}
                                className="px-2 py-1 rounded text-[9px] font-black uppercase tracking-wide"
                                style={{ backgroundColor: '#92400E', color: '#FEF3C7' }}
                              >
                                +3 días
                              </button>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={1}
                                  max={365}
                                  placeholder="días"
                                  value={customDaysInput[goal.id] || ''}
                                  onChange={(e) => setCustomDaysInput({ ...customDaysInput, [goal.id]: e.target.value })}
                                  className="w-14 h-6 rounded text-[9px] font-bold text-center outline-none"
                                  style={{ backgroundColor: '#92400E', color: '#FEF3C7' }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                  onClick={(e) => { e.stopPropagation(); const n = parseInt(customDaysInput[goal.id]); if (n > 0) extendDeadline(goal, n); }}
                                  className="px-2 py-1 rounded text-[9px] font-black uppercase tracking-wide"
                                  style={{ backgroundColor: '#92400E', color: '#FEF3C7' }}
                                >
                                  +
                                </button>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); dismissUrgency(goal); }}
                                className="px-2 py-1 rounded text-[9px] font-black uppercase tracking-wide"
                                style={{ backgroundColor: '#92400E', color: '#FEF3C7' }}
                              >
                                Intentarlo hoy
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p>¿El día está por llegar... Asumes el reto o pides 3 días más?</p>
                            <div className="flex gap-2 mt-1.5 justify-center">
                              <button
                                onClick={(e) => { e.stopPropagation(); extendDeadline(goal, 3); }}
                                className="px-2 py-1 rounded text-[9px] font-black uppercase tracking-wide"
                                style={{ backgroundColor: '#92400E', color: '#FEF3C7' }}
                              >
                                +3 días
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); dismissUrgency(goal); }}
                                className="px-2 py-1 rounded text-[9px] font-black uppercase tracking-wide"
                                style={{ backgroundColor: '#92400E', color: '#FEF3C7' }}
                              >
                                Aceptar reto
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                  {/* Resize handle */}
                  <div
                    className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize opacity-30 hover:opacity-60 transition-opacity"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const startX = e.clientX;
                      const startW = saved.w;
                      const handleMouseMove = (ev: MouseEvent) => {
                        const newW = Math.max(180, startW + ev.clientX - startX);
                        posRef.current[goal.id].w = newW;
                        const newDesc = { ...desc, _pin: { ...pin, x: saved.x, y: saved.y, w: newW, colorIdx } };
                        updateGoal.mutate({ id: goal.id, description: JSON.stringify(newDesc) });
                      };
                      const handleMouseUp = () => {
                        window.removeEventListener('mousemove', handleMouseMove);
                        window.removeEventListener('mouseup', handleMouseUp);
                      };
                      window.addEventListener('mousemove', handleMouseMove);
                      window.addEventListener('mouseup', handleMouseUp);
                    }}
                  >
                    <svg viewBox="0 0 10 10" fill="none" stroke="#1f2937" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M2 8l6-6M5 8l3-3M8 8l2-2" />
                    </svg>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <div className="mt-16 space-y-4">
            <p className="text-center text-xs font-bold" style={{ color: '#6b7280' }}>
              {profileName} ha logrado:
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {completedGoals.map((goal, idx) => (
                <div
                  key={goal.id}
                  onClick={() => openDetail(goal)}
                  className="relative rounded-lg border-2 p-3 cursor-click select-none group transition-all hover:opacity-70"
                  style={{
                    backgroundColor: POSTIT_COLORS[idx % POSTIT_COLORS.length].bg,
                    borderColor: POSTIT_COLORS[idx % POSTIT_COLORS.length].border,
                    opacity: 0.55,
                    width: 180,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  }}
                >
                  {/* Mini pin dot */}
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-zinc-400 border-2 border-zinc-300 shadow-sm" />
                  <p className="text-xs font-bold line-through text-center leading-snug pt-1" style={{ color: '#4b5563' }}>
                    {goal.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* New Goal Wizard — post-it style, zero distractions */}
      <AnimatePresence>
        {wizardOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-[9998]"
              onClick={() => setWizardOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotate: 2 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="fixed inset-x-4 top-[8%] lg:inset-x-0 lg:w-[440px] lg:mx-auto z-[9999] max-h-[84vh] flex flex-col"
            >
              <div
                className="flex flex-col max-h-full gap-3 rounded-lg border-2 p-5 shadow-2xl"
                style={{
                  backgroundColor: '#FEF3C7',
                  borderColor: '#FCD34D',
                  color: '#1f2937',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
              >
                {/* Pin dot */}
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-zinc-400 border-[3px] border-zinc-300 shadow-sm z-10" />

                {/* Close button */}
                <div className="shrink-0 flex justify-end relative z-20">
                  <button
                    onClick={() => setWizardOpen(false)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                    style={{ backgroundColor: '#FDE68A', color: '#92400E' }}
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={3} />
                  </button>
                </div>

                {/* Ruled lines */}
                <div className="absolute inset-x-4 top-16 bottom-16 pointer-events-none opacity-10" style={{
                  backgroundImage: 'repeating-linear-gradient(180deg, #1f2937 0 1px, transparent 1px 32px)',
                }} />

                {/* Progress dots */}
                <div className="shrink-0 flex items-center gap-1.5 px-1 relative z-10">
                  {wizardQuestions.map((_, i) => (
                    <div
                      key={i}
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        flex: i === wizardStep ? 2 : 1,
                        backgroundColor: i <= wizardStep ? '#FCD34D' : '#FDE68A',
                        border: '1px solid #FCD34D',
                      }}
                    />
                  ))}
                </div>

                {/* Step content — scrollable */}
                <div className="flex-1 overflow-y-auto min-h-0 space-y-3 relative z-10 py-2">
                  <h2 className="text-lg font-black leading-tight" style={{ color: '#92400E' }}>
                    {wizardQuestions[wizardStep].label}
                  </h2>
                  <p className="text-xs leading-relaxed" style={{ color: '#A16207' }}>
                    {wizardQuestions[wizardStep].description}
                  </p>
                  {wizardQuestions[wizardStep].example && (
                    <p className="text-xs font-bold" style={{ color: '#B45309' }}>
                      Ej: {wizardQuestions[wizardStep].example}
                    </p>
                  )}

                  {wizardQuestions[wizardStep].type === 'input' && (
                    <div className="space-y-2">
                      <input
                        autoFocus
                        value={wizardData[wizardQuestions[wizardStep].key as keyof typeof wizardData] as string}
                        onChange={(e) => setWizardData({ ...wizardData, [wizardQuestions[wizardStep].key]: e.target.value })}
                        placeholder="Escribe aquí..."
                        className="w-full rounded-lg px-4 py-3 font-bold outline-none focus:ring-2 transition-shadow placeholder:opacity-40"
                        style={{ backgroundColor: '#FDE68A', color: '#1f2937' }}
                        onKeyDown={(e) => e.key === 'Enter' && wizardStep < wizardQuestions.length - 1 && setWizardStep(wizardStep + 1)}
                      />
                      {!wizardQuestions[wizardStep].required && wizardData[wizardQuestions[wizardStep].key as keyof typeof wizardData] === '' && (
                        <button
                          onClick={() => setWizardStep(wizardStep + 1)}
                          className="text-[11px] font-bold transition-colors"
                          style={{ color: '#B45309' }}
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
                            className="text-[11px] font-bold transition-colors"
                            style={{ color: '#B45309' }}
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
                        placeholder="Escribe aquí..."
                        rows={2}
                        className="w-full rounded-lg px-4 py-3 font-bold outline-none focus:ring-2 transition-shadow resize-none placeholder:opacity-40"
                        style={{ backgroundColor: '#FDE68A', color: '#1f2937' }}
                      />
                      {wizardData[wizardQuestions[wizardStep].key as keyof typeof wizardData] === '' && (
                        <button
                          onClick={() => setWizardStep(wizardStep + 1)}
                          className="text-[11px] font-bold transition-colors"
                          style={{ color: '#B45309' }}
                        >
                          Saltar esta pregunta
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Navigation buttons */}
                <div className="shrink-0 flex gap-2 pt-2 relative z-10" style={{ borderTop: '1px solid #FDE68A' }}>
                  {wizardStep > 0 ? (
                    <button
                      onClick={() => setWizardStep(wizardStep - 1)}
                      className="flex-1 py-3 rounded-lg font-bold text-sm transition-all hover:opacity-80"
                      style={{ backgroundColor: '#FDE68A', color: '#92400E' }}
                    >
                      Atrás
                    </button>
                  ) : (
                    <button
                      onClick={() => setWizardOpen(false)}
                      className="flex-1 py-3 rounded-lg font-bold text-sm transition-all hover:opacity-80"
                      style={{ backgroundColor: '#FDE68A', color: '#92400E' }}
                    >
                      Cancelar
                    </button>
                  )}
                  {wizardStep < wizardQuestions.length - 1 ? (
                    <button
                      onClick={() => setWizardStep(wizardStep + 1)}
                      className="flex-[1.5] py-3 rounded-lg font-bold text-sm transition-all hover:opacity-80"
                      style={{ backgroundColor: '#FCD34D', color: '#92400E', boxShadow: '0 2px 8px rgba(252,211,77,0.4)' }}
                    >
                      Siguiente
                    </button>
                  ) : (
                    <button
                      onClick={handleCreateGoal}
                      className="flex-[1.5] py-3 rounded-lg font-bold text-sm transition-all hover:opacity-80"
                      style={{ backgroundColor: '#FCD34D', color: '#92400E', boxShadow: '0 2px 8px rgba(252,211,77,0.4)' }}
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

                {/* Status badge — live from current detail state */}
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
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/30">Fecha límite</p>
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
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/30">¿Cómo mejora tu vida?</p>
                      <textarea
                        value={detailMeaningful}
                        onChange={(e) => setDetailMeaningful(e.target.value)}
                        rows={2}
                        placeholder="Escribe aquí..."
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
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/30">Obstáculo interno</p>
                      <textarea
                        value={detailObstacle}
                        onChange={(e) => setDetailObstacle(e.target.value)}
                        rows={2}
                        placeholder="Escribe aquí..."
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
                        <p className="text-[9px] text-on-surface-variant/30 mt-1 font-medium">Tarea existente vinculada a esta meta</p>
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
                  initial={{ x:`${15 + (i * 7) % 70}%`, y:`${10 + (i * 9) % 75}%`, scale: 0, opacity: 0 }}
                  animate={{
                    y: [`${10 + (i * 9) % 75}%`,`${5 + (i * 11) % 70}%`,`${15 + (i * 8) % 75}%`],
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
                        {celebration.extras.join(' · ')}
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
