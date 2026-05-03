// DailyPage — Dark mode, no time blocks, no calendar view
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useProfile } from '@/hooks/useProfile';
import { useStreaks } from '@/hooks/useStreaks';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalVoiceCapture } from '@/hooks/useGlobalVoiceCapture';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Flame, Monitor, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerTaskCelebration, triggerDailyCelebration, triggerOnTimeCelebration } from '@/lib/celebrations';
import FAB from '@/components/FAB';
import TaskCaptureModal, { type TaskCaptureModalHandle } from '@/components/TaskCaptureModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import FullscreenTimer from '@/components/FullscreenTimer';
import GamificationBar from '@/components/GamificationBar';
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

  const { user } = useAuth();
  const { tasks, updateTask, isLoading } = useTasks({ date: today });
  const { createTask } = useTasks();
  const { goals } = useGoals();
  const { profile } = useProfile();
  const { metrics, trackDayActive } = useStreaks();
  const { checkAndUnlock } = useGamification();
  const streakCount = metrics?.streak_current || 0;
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState<'text' | 'voice' | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [timerTask, setTimerTask] = useState<any>(null);
  const [orderedTasks, setOrderedTasks] = useState<any[]>([]);
  const [dragIdx] = useState<number | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const timerDurationRef = useRef(0);
  const captureModalRef = useRef<TaskCaptureModalHandle>(null);
  const hasTrackedDayRef = useRef(false);
  const [miniWidgetOpen, setMiniWidgetOpen] = useState(() => !!window.electronAPI);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 30_000);
    
    if (window.electronAPI) {
      window.electronAPI.onMiniWindowClosed(() => {
        setMiniWidgetOpen(false);
      });
    }
    
    return () => clearInterval(t);
  }, []);


  const openCapture = useCallback(() => {
    setCaptureMode('text');
    setCaptureOpen(true);
  }, []);
  
  const openCaptureInVoiceMode = useCallback(() => {
    setCaptureMode('voice');
    setCaptureOpen(true);
  }, []);
  
  useGlobalVoiceCapture(captureModalRef, openCaptureInVoiceMode);

  useEffect(() => {
    if (hasTrackedDayRef.current) return;
    hasTrackedDayRef.current = true;
    trackDayActive.mutate();
  }, [trackDayActive]);

  const toggleMiniWidget = useCallback(() => {
    if (window.electronAPI) {
      window.electronAPI.toggleMiniWindow();
      setMiniWidgetOpen(prev => !prev);
      return;
    }
    openDownloadDialog();
  }, []);

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

  const completedCount = tasks.filter((t) => t.status === 'done').length;

  const greeting = getDynamicGreeting(
    profile?.name || user?.user_metadata?.full_name || (user?.email?.split('@')[0]) || 'Emprendedor',
    completedCount,
    orderedTasks.length,
    profile?.main_goal_id ? goals.find((g: any) => g.id === profile.main_goal_id)?.title : undefined
  );

  const handleComplete = async (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletingTaskId(task.id);

    const isCurrentlyTiming = timerTask?.id === task.id;
    const finalDuration = isCurrentlyTiming ? timerDurationRef.current : task.actual_duration_seconds;

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

  const handleStartTimer = (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setTimerTask(task);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      <div className="max-w-[430px] lg:max-w-4xl mx-auto px-6 pt-4 pb-32 space-y-6 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pt-2 pb-4">
          <div className="w-10 h-10" />

          <div className="flex flex-col items-center">
            <div className="relative">
              <motion.div
                key={format(currentTime, 'h:mm')}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[48px] font-black tracking-[-0.05em] tabular-nums text-foreground font-headline leading-none flex items-end gap-1"
              >
                {format(currentTime, 'h:mm')}
                <span className="text-[11px] mb-1 font-black text-primary uppercase tracking-tight opacity-40">
                  {format(currentTime, 'a')}
                </span>
              </motion.div>
            </div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-4 mt-4"
            >
              <div className="h-px w-8 bg-primary/20" />
              <div className="flex items-center gap-4">
                <span className="text-[11px] uppercase tracking-[0.2em] font-black text-on-surface-variant/40">
                  {format(currentTime, "EEEE, d 'de' MMMM", { locale: es })}
                </span>
              </div>
              <div className="h-px w-6 bg-primary/10" />
            </motion.div>
          </div>

          <div className="w-10 h-10" />
        </div>

        <div className="flex flex-col items-center justify-center space-y-4">

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={toggleMiniWidget}
            className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-surface-container/50 border border-outline-variant/20 hover:border-primary/30 transition-all shadow-sm group"
          >
            <Monitor className={`w-4 h-4 transition-colors ${miniWidgetOpen ? 'text-red-400' : 'text-primary'}`} />
            <span className="text-[11px] font-black uppercase tracking-[0.1em] text-on-surface-variant group-hover:text-foreground">
              {miniWidgetOpen ? 'Desactivar ventana flotante' : 'Activar ventana flotante'}
            </span>
          </motion.button>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center px-4"
        >
          <p className="text-[16px] font-black text-foreground font-headline tracking-tight leading-tight">
            {greeting}
          </p>
        </motion.div>

        <div className="pt-2 space-y-3">
          <GamificationBar completedCount={completedCount} totalCount={orderedTasks.length} /> 

          <FAB 
            onTextClick={openCapture} 
            onVoiceClick={openCaptureInVoiceMode} 
          />
        </div>

        {isLoading ? (
          <div className="space-y-4 py-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-surface/50 border border-outline-variant rounded-[24px] animate-pulse" />
            ))}
          </div>
        ) : orderedTasks.length > 0 ? (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {orderedTasks.map((task, idx) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  taskIdx={idx}
                  isDone={task.status === 'done'}
                  completingTaskId={completingTaskId}
                  dragIdx={dragIdx}
                  touchIdx={null}
                  handleDragStart={() => {}}
                  handleDragOver={() => {}}
                  handleDragEnd={() => {}}
                  handleTouchStart={() => {}}
                  handleTouchMove={() => {}}
                  handleTouchEnd={() => {}}
                  setSelectedTask={setSelectedTask}
                  handleComplete={handleComplete}
                  handleUncomplete={handleUncomplete}
                  handleStartTimer={handleStartTimer}
                  view="daily"
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 px-6 text-center bg-surface/30 border border-dashed border-outline-variant rounded-[32px] mt-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-primary/40" />
            </div>
            <h3 className="text-lg font-black mb-2">Todo en orden</h3>
            <p className="text-sm text-muted-foreground max-w-[240px]">
              No hay tareas para hoy. Es un buen momento para planificar o descansar.
            </p>
          </motion.div>
        )}

      </div>

      <TaskCaptureModal 
        ref={captureModalRef} 
        open={captureOpen} 
        onClose={() => {
          setCaptureOpen(false);
          setCaptureMode(null);
        }} 
        initialMode={captureMode}
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
