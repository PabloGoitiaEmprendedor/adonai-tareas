// DailyPage — Dark mode, no time blocks, no calendar view
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useProfile } from '@/hooks/useProfile';
import { useStreaks } from '@/hooks/useStreaks';
import { useGlobalVoiceCapture } from '@/hooks/useGlobalVoiceCapture';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, Plus, GripVertical, Timer, Flame, Link as LinkIcon, ExternalLink, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { triggerTaskCelebration, triggerDailyCelebration, triggerOnTimeCelebration } from '@/lib/celebrations';
import FAB from '@/components/FAB';
import TaskCaptureModal, { type TaskCaptureModalHandle } from '@/components/TaskCaptureModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import FullscreenTimer from '@/components/FullscreenTimer';
import GamificationBar from '@/components/GamificationBar';
import SubtasksSection from '@/components/SubtasksSection';
import { useGamification } from '@/hooks/useGamification';
import { TaskCard } from '@/components/TaskCard';
import { openDownloadDialog } from '@/lib/desktopApp';
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
  const timerDurationRef = useRef(0);
  const captureModalRef = useRef<TaskCaptureModalHandle>(null);
  const hasTrackedDayRef = useRef(false);
  const [miniWidgetOpen, setMiniWidgetOpen] = useState(() => !!window.electronAPI);

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
      { title, due_date: today, source_type: 'text', creation_source: 'secondary' },
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
  // - Electron desktop app: open the real floating window
  // - Any browser (desktop or mobile): show download dialog — the floating
  //   window is a native-only feature.
  const toggleMiniWidget = useCallback(() => {
    if (window.electronAPI) {
      window.electronAPI.toggleMiniWindow();
      setMiniWidgetOpen(prev => !prev);
      return;
    }
    // Browser (desktop or mobile): prompt to download the native app.
    openDownloadDialog();
  }, []);

  // Eisenhower quadrant rank: lower = shown first
  // 0 = urgent + important (green)
  // 1 = urgent only        (orange)
  // 2 = important only     (yellow)
  // 3 = neither            (gray)
  const quadrantRank = (t: any) =>
    t.urgency && t.importance ? 0
    : t.urgency ? 1
    : t.importance ? 2
    : 3;

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a: any, b: any) => {
      const doneA = a.status === 'done' ? 1 : 0;
      const doneB = b.status === 'done' ? 1 : 0;
      if (doneA !== doneB) return doneA - doneB;

      const rankDiff = quadrantRank(a) - quadrantRank(b);
      if (rankDiff !== 0) return rankDiff;

      return (a.sort_order || 0) - (b.sort_order || 0);
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

    // If this task is being timed, use the current elapsed duration
    const isCurrentlyTiming = timerTask?.id === task.id;
    const finalDuration = isCurrentlyTiming ? timerDurationRef.current : task.actual_duration_seconds;

    // If this task had an active timer, close it
    if (isCurrentlyTiming) {
      setTimerTask(null);
    }

    setTimeout(() => {
      const remainingTasks = tasks.filter((t: any) => t.status !== 'done' && t.id !== task.id);
      const isLastTask = tasks.length > 0 && remainingTasks.length === 0;

      updateTask.mutate({ 
        id: task.id, 
        status: 'done', 
        completed_at: new Date().toISOString(),
        actual_duration_seconds: Number(finalDuration) || 0
      }, {
        onSuccess: () => {
          setCompletingTaskId(null);
          checkAndUnlock.mutate({ type: 'task_completed' });
          if (isLastTask) {
            triggerDailyCelebration(profile?.name);
          } else if (isCurrentlyTiming) {
            triggerOnTimeCelebration(task.title, profile?.name);
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

  // Drag & touch reordering disabled per user request — keep no-op handlers
  // so child components keep their props contract.
  const handleDragStart = (_idx: number) => {};
  const handleDragOver = (_e: React.DragEvent, _idx: number) => {};
  const handleDragEnd = () => {};
  const touchIdx: number | null = null;
  const handleTouchStart = (_idx: number, _e: React.TouchEvent) => {};
  const handleTouchMove = (_e: React.TouchEvent) => {};
  const handleTouchEnd = () => {};

  const handleStartTimer = (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setTimerTask(task);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      <div className="max-w-[430px] lg:max-w-4xl mx-auto px-6 pt-4 pb-32 space-y-6 relative">
        
        {/* Header — just time + date centered, menu is provided by NavigationWrapper */}
        <div className="flex items-center justify-between pt-2 pb-4">
          {/* Left: placeholder to keep center alignment (NavigationWrapper provides the global menu) */}
          <div className="w-10 h-10" />

          <div className="flex flex-col items-center">
            <span className="text-[44px] font-black tracking-tighter tabular-nums text-foreground font-headline leading-none">
              {format(currentTime, 'h:mm')}
              <span className="text-xl ml-1 text-on-surface-variant/40">{format(currentTime, 'a')}</span>
            </span>
            <span className="text-[10px] uppercase tracking-[0.3em] font-black text-on-surface-variant/40 mt-1">
              {format(currentTime, "EEEE d 'de' MMMM", { locale: es })}
            </span>
          </div>

          {/* Right: empty space to keep center alignment */}
          <div className="w-10 h-10" />
        </div>

        <div className="flex flex-col items-center justify-center">

          {streakCount > 0 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              className="mt-8 flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-foreground text-background shadow-md border border-foreground"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Flame className="w-4 h-4 text-primary fill-primary/40" />
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

          <FloatingActionMenu
            className="relative"
            options={[
              {
                label: "Nueva tarea",
                icon: <Plus className="w-4 h-4" />,
                onClick: () => setCaptureOpen(true),
              },
              {
                label: miniWidgetOpen ? "Cerrar pestaña" : "Pestaña flotante",
                icon: <ExternalLink className="w-4 h-4" />,
                onClick: toggleMiniWidget,
              },
            ]}
          />
        </div>

        {orderedTasks.length > 0 ? (
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
        ) : null}

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
              className="text-xs font-black uppercase tracking-[0.2em] bg-foreground text-background px-5 py-2.5 rounded-[16px] hover:opacity-90 transition-all shadow-md active:scale-95"
            >
              Añadir
            </motion.button>
          )}
        </form>
      </div>

      <TaskCaptureModal 
        ref={captureModalRef} 
        open={captureOpen} 
        onClose={() => setCaptureOpen(false)} 
        creationSource="fab"
      />
      <TaskDetailModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
      <FullscreenTimer 
        task={timerTask} 
        open={!!timerTask} 
        onClose={() => setTimerTask(null)} 
        durationRef={timerDurationRef}
      />
      {!window.electronAPI && (
        <MiniTaskWidget isOpen={miniWidgetOpen} onClose={() => setMiniWidgetOpen(false)} />
      )}
    </div>
  );
};

export default DailyPage;
