// DailyPage — Dark mode, no time blocks, no calendar view
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useProfile } from '@/hooks/useProfile';
import { useStreaks } from '@/hooks/useStreaks';
import { useGlobalVoiceCapture } from '@/hooks/useGlobalVoiceCapture';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, Plus, GripVertical, Timer, Flame, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { triggerTaskCelebration, triggerDailyCelebration } from '@/lib/celebrations';
import FAB from '@/components/FAB';
import TaskCaptureModal, { type TaskCaptureModalHandle } from '@/components/TaskCaptureModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import FullscreenTimer from '@/components/FullscreenTimer';
import GamificationBar from '@/components/GamificationBar';
import SubtasksSection from '@/components/SubtasksSection';
import { useGamification } from '@/hooks/useGamification';
import { TaskCard } from '@/components/TaskCard';
import MiniTaskWidget from '@/components/MiniTaskWidget';

const getDynamicGreeting = (
  name: string,
  completedCount: number,
  totalCount: number,
  mainGoalTitle?: string,
) => {
  const h = new Date().getHours();
  const progress = totalCount > 0 ? completedCount / totalCount : 0;
  const greetings: string[] = [];

  if (h < 6) {
    greetings.push(
      `Madrugando, ${name}. El silencio es tuyo.`,
      `Noche productiva, ${name}?`,
      `El mundo duerme, tú avanzas.`,
    );
  } else if (h < 12) {
    if (totalCount === 0) {
      greetings.push(
        `Buenos días, ${name}. Día en blanco, todo es posible.`,
        `Nuevo día, nuevas victorias, ${name}.`,
      );
    } else if (completedCount === 0) {
      greetings.push(
        `Buenos días, ${name}. ${totalCount} tarea${totalCount > 1 ? 's' : ''} te esperan.`,
        `Arranca fuerte, ${name}.`,
      );
    } else {
      greetings.push(
        `Buen ritmo, ${name}. Ya llevas ${completedCount}.`,
        `Sigue así, ${name}. Vas por buen camino.`,
      );
    }
  } else if (h < 18) {
    if (progress >= 1) {
      greetings.push(
        `Todo listo, ${name}. Tarde libre merecida.`,
        `Misión cumplida hoy, ${name}. 🎉`,
      );
    } else if (progress > 0.5) {
      greetings.push(
        `Más de la mitad hecho, ${name}. Cierra fuerte.`,
        `La tarde es tuya, ${name}. Quedan pocas.`,
      );
    } else {
      greetings.push(
        `Buenas tardes, ${name}. Aún hay tiempo.`,
        `La tarde empieza, ${name}. Tú decides el ritmo.`,
      );
    }
  } else {
    if (progress >= 1) {
      greetings.push(
        `Día redondo, ${name}. Descansa bien.`,
        `Todo hecho. Buenas noches, ${name}.`,
      );
    } else if (totalCount > 0) {
      greetings.push(
        `Buenas noches, ${name}. ¿Un último empujón?`,
        `La noche es joven, ${name}. Quedan ${totalCount - completedCount}.`,
      );
    } else {
      greetings.push(
        `Buenas noches, ${name}. Mañana será un gran día.`,
      );
    }
  }

  if (mainGoalTitle && Math.random() > 0.5) {
    greetings.push(`Cada tarea te acerca a "${mainGoalTitle}", ${name}.`);
  }

  const seed = new Date().getDate() + h;
  return greetings[seed % greetings.length];
};

const DailyPage = () => {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { tasks, updateTask, deleteTask } = useTasks({ date: today });
  const { createTask } = useTasks();
  const { goals } = useGoals();
  const { profile } = useProfile();
  const { metrics, trackDayActive } = useStreaks();
  const { checkAndUnlock } = useGamification();
  const streakCount = metrics?.streak_current || 0;
  const [captureOpen, setCaptureOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [timerTask, setTimerTask] = useState<any>(null);
  const [orderedTasks, setOrderedTasks] = useState<any[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const captureModalRef = useRef<TaskCaptureModalHandle>(null);
  const hasTrackedDayRef = useRef(false);
  const [miniWidgetOpen, setMiniWidgetOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 30_000);
    
    // Electron IPC listener
    if (window.electronAPI) {
      window.electronAPI.onMiniWindowClosed(() => {
        setMiniWidgetOpen(false);
      });
    }
    
    return () => clearInterval(t);
  }, []);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const title = quickAddTitle.trim();
    if (!title) return;
    createTask.mutate(
      { title, due_date: today, source_type: 'text' },
      {
        onSuccess: () => setQuickAddTitle(''),
        onError: () => toast.error('No se pudo crear la tarea'),
      }
    );
  };

  const openCapture = useCallback(() => setCaptureOpen(true), []);
  const openCaptureInVoiceMode = useCallback(() => {
    captureModalRef.current?.openInVoiceMode();
    setCaptureOpen(true);
  }, []);
  useGlobalVoiceCapture(captureModalRef, openCapture);

  useEffect(() => {
    if (hasTrackedDayRef.current) return;
    hasTrackedDayRef.current = true;
    trackDayActive.mutate();
  }, [trackDayActive]);

  // Toggle floating mini-window (Electron independent window)
  const toggleMiniWidget = useCallback(() => {
    if (window.electronAPI) {
      window.electronAPI.toggleMiniWindow();
      setMiniWidgetOpen(prev => !prev);
    } else {
      // Fallback for browser if not running in Electron
      setMiniWidgetOpen(prev => !prev);
    }
  }, []);

  const sortedTasks = useMemo(() => {
    return tasks
      .sort((a: any, b: any) => {
        const doneA = a.status === 'done' ? 1 : 0;
        const doneB = b.status === 'done' ? 1 : 0;
        if (doneA !== doneB) return doneA - doneB;

        const orderA = a.sort_order || 0;
        const orderB = b.sort_order || 0;
        if (orderA !== orderB) return orderA - orderB;
        const scoreA = (a.urgency ? 2 : 0) + (a.importance ? 1 : 0);
        const scoreB = (b.urgency ? 2 : 0) + (b.importance ? 1 : 0);
        return scoreB - scoreA;
      });
  }, [tasks]);

  useEffect(() => {
    setOrderedTasks(prev => {
      const ids = sortedTasks.map((t: any) => t.id).join(',');
      const prevIds = prev.map((t: any) => t.id).join(',');
      if (ids === prevIds && prev.length > 0) return prev;
      return sortedTasks;
    });
  }, [sortedTasks]);

  const mainGoal = goals.find((g) => g.id === profile?.main_goal_id);
  const completedCount = tasks.filter((t) => t.status === 'done').length;
  const totalCount = tasks.length;

  const greeting = useMemo(
    () => getDynamicGreeting(profile?.name || 'Emprendedor', completedCount, totalCount, mainGoal?.title),
    [profile?.name, completedCount, totalCount, mainGoal?.title]
  );

  const handleComplete = async (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletingTaskId(task.id);

    setTimeout(() => {
      const remainingTasks = tasks.filter((t: any) => t.status !== 'done' && t.id !== task.id);
      const isLastTask = tasks.length > 0 && remainingTasks.length === 0;

      updateTask.mutate({ 
        id: task.id, 
        status: 'done', 
        completed_at: new Date().toISOString() 
      }, {
        onSuccess: () => {
          setCompletingTaskId(null);
          checkAndUnlock.mutate({ type: 'task_completed' });
          if (isLastTask) {
            triggerDailyCelebration(profile?.name);
          } else {
            triggerTaskCelebration(task.title, profile?.name);
          }
        },
        onError: () => setCompletingTaskId(null)
      });
    }, 500);
  };

  const handleUncomplete = (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask.mutate({ id: task.id, status: 'pending', completed_at: null });
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const newOrder = [...orderedTasks];
    const [moved] = newOrder.splice(dragIdx, 1);
    newOrder.splice(idx, 0, moved);
    setOrderedTasks(newOrder);
    setDragIdx(idx);
  };
  const handleDragEnd = () => {
    setDragIdx(null);
    orderedTasks.forEach((task, idx) => {
      if ((task.sort_order || 0) !== idx) {
        updateTask.mutate({ id: task.id, sort_order: idx });
      }
    });
  };

  const [touchIdx, setTouchIdx] = useState<number | null>(null);
  const [touchY, setTouchY] = useState(0);
  const handleTouchStart = (idx: number, e: React.TouchEvent) => { setTouchIdx(idx); setTouchY(e.touches[0].clientY); };
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchIdx === null) return;
    const diff = e.touches[0].clientY - touchY;
    const steps = Math.round(diff / 56);
    if (steps !== 0) {
      const newIdx = Math.max(0, Math.min(orderedTasks.length - 1, touchIdx + steps));
      if (newIdx !== touchIdx) {
        const newOrder = [...orderedTasks];
        const [moved] = newOrder.splice(touchIdx, 1);
        newOrder.splice(newIdx, 0, moved);
        setOrderedTasks(newOrder);
        setTouchIdx(newIdx);
        setTouchY(e.touches[0].clientY);
      }
    }
  }, [touchIdx, touchY, orderedTasks]);
  const handleTouchEnd = () => {
    if (touchIdx !== null) {
      orderedTasks.forEach((task, idx) => {
        if ((task.sort_order || 0) !== idx) updateTask.mutate({ id: task.id, sort_order: idx });
      });
    }
    setTouchIdx(null);
  };

  const handleStartTimer = (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setTimerTask(task);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      <div className="max-w-[430px] lg:max-w-4xl mx-auto px-6 pt-4 pb-32 space-y-8 relative">

        <div className="flex flex-col items-center justify-center pt-10 pb-6 text-center">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center leading-none"
          >
            <span className="text-[80px] font-black tracking-tighter tabular-nums text-foreground font-headline leading-[0.8] mb-4">
              {format(currentTime, 'h:mm a')}
            </span>
            <span className="text-[12px] uppercase tracking-[0.4em] font-black text-on-surface-variant/40">
              {format(currentTime, "EEEE d 'de' MMMM", { locale: es })}
            </span>
          </motion.div>

          {streakCount > 0 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              className="mt-8 flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-primary/25 text-primary shadow-sm border border-primary/20"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Flame className="w-4 h-4 fill-primary/20" />
              </motion.div>
              <span className="text-[13px] font-black leading-none tabular-nums tracking-tight">
                {streakCount} días imparable
              </span>
            </motion.div>
          )}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center px-4"
        >
          <p className="text-2xl font-black text-foreground font-headline tracking-tight leading-tight">
            {greeting}
          </p>
        </motion.div>

        <div className="pt-2 space-y-3">
          <GamificationBar />

          {/* Mini Widget toggle */}
          <button
            onClick={toggleMiniWidget}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 transition-all text-sm font-black tracking-tight ${
              miniWidgetOpen
                ? 'bg-primary/20 border-primary/40 text-primary'
                : 'bg-surface-container-high border-outline-variant/30 text-on-surface-variant/60 hover:border-primary/30 hover:text-primary'
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            {miniWidgetOpen ? 'Cerrar Mini Widget' : 'Abrir Mini Widget'}
          </button>
        </div>

        {orderedTasks.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card p-12 rounded-[48px] text-center space-y-6 border border-outline-variant/10 shadow-xl"
          >
            {tasks.length > 0 && tasks.every(t => t.status === 'done') ? (
              <>
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-5xl">🏆</span>
                </div>
                <h2 className="text-3xl font-black text-foreground font-headline tracking-tight">¡Día Superado, {profile?.name || 'Emprendedor'}!</h2>
                <p className="text-on-surface-variant/60 max-w-[300px] mx-auto text-lg font-medium leading-relaxed">
                  Has completado todas tus tareas de hoy. Tu enfoque y disciplina están dando resultados increíbles.
                </p>
                <div className="pt-6">
                   <p className="text-sm font-black uppercase tracking-[0.2em] text-foreground">¡Disfruta tu descanso!</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-surface-container-high rounded-[32px] flex items-center justify-center mx-auto opacity-60 rotate-3">
                  <Plus className="w-10 h-10 text-primary" />
                </div>
                <p className="text-on-surface-variant/60 text-xl font-bold font-headline">Tu día está despejado. ¿Qué quieres lograr hoy?</p>
                <button onClick={openCapture} className="inline-flex items-center gap-3 px-8 py-4 rounded-[24px] bg-primary text-primary-foreground text-base font-black shadow-xl hover:shadow-2xl transition-all active:scale-95">
                  <Plus className="w-5 h-5" /> Empezar a planificar
                </button>
              </>
            )}
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {orderedTasks.map((task) => {
                const idx = orderedTasks.findIndex(t => t.id === task.id);
                const isDone = task.status === 'done';
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    taskIdx={idx}
                    isDone={isDone}
                    completingTaskId={completingTaskId}
                    dragIdx={dragIdx}
                    touchIdx={touchIdx}
                    handleDragStart={handleDragStart}
                    handleDragOver={handleDragOver}
                    handleDragEnd={handleDragEnd}
                    handleTouchStart={handleTouchStart}
                    handleTouchMove={handleTouchMove}
                    handleTouchEnd={handleTouchEnd}
                    setSelectedTask={setSelectedTask}
                    handleComplete={handleComplete}
                    handleUncomplete={handleUncomplete}
                    handleStartTimer={handleStartTimer}
                    view="daily"
                  />
                );
              })}
            </AnimatePresence>
          </div>
        )}

        <form
          onSubmit={handleQuickAdd}
          className="flex items-center gap-3 p-4 rounded-[32px] bg-card border-4 border-outline-variant/10 shadow-xl focus-within:border-primary transition-all duration-500"
        >
          <div className="w-10 h-10 rounded-[14px] bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Plus className="w-5 h-5 text-primary" strokeWidth={3} />
          </div>
          <input
            type="text"
            value={quickAddTitle}
            onChange={(e) => setQuickAddTitle(e.target.value)}
            placeholder="Nueva tarea para hoy…"
            className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-lg font-bold text-foreground placeholder:text-on-surface-variant/20 font-headline"
          />
          {quickAddTitle.trim() && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              type="submit"
              className="text-xs font-black uppercase tracking-[0.2em] bg-primary text-primary-foreground px-5 py-2.5 rounded-[16px] hover:opacity-90 transition-all shadow-md active:scale-95"
            >
              Añadir
            </motion.button>
          )}
        </form>
      </div>

      <FAB onClick={() => setCaptureOpen(true)} />
      <TaskCaptureModal 
        ref={captureModalRef} 
        open={captureOpen} 
        onClose={() => setCaptureOpen(false)} 
      />
      <TaskDetailModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
      <FullscreenTimer task={timerTask} open={!!timerTask} onClose={() => setTimerTask(null)} />
      {!window.electronAPI && (
        <MiniTaskWidget isOpen={miniWidgetOpen} onClose={() => setMiniWidgetOpen(false)} />
      )}
    </div>
  );
};

export default DailyPage;
