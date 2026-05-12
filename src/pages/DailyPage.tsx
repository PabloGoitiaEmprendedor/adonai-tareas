// DailyPage — Dark mode, no time blocks, no calendar view
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useFolders } from '@/hooks/useFolders';
import { useProfile } from '@/hooks/useProfile';
import { useStreaks } from '@/hooks/useStreaks';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalVoiceCapture } from '@/hooks/useGlobalVoiceCapture';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bell, Flame, Monitor, Sparkles, Folder, FolderOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerTaskCelebration, triggerDailyCelebration, triggerOnTimeCelebration } from '@/lib/celebrations';
import FAB from '@/components/FAB';
import TaskCaptureModal, { type TaskCaptureModalHandle } from '@/components/TaskCaptureModal';
import QuickRecurrenceFlow from '@/components/QuickRecurrenceFlow';
import TaskDetailModal from '@/components/TaskDetailModal';
import FullscreenTimer from '@/components/FullscreenTimer';
import GamificationBar from '@/components/GamificationBar';
import { useGamification } from '@/hooks/useGamification';
import { TaskCard } from '@/components/TaskCard';
import { openDownloadDialog } from '@/lib/desktopApp';
import MiniTaskWidget from '@/components/MiniTaskWidget';
import { ChaosBuddiesTrigger } from '@/components/ChaosBuddiesTrigger';
import { WeeklySummaryModal } from '@/components/WeeklySummaryModal';

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
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const tasksFilter = useMemo(() => ({ date: today, excludeEvents: true }), [today]);

  const { user } = useAuth();
  const { tasks, updateTask, isLoading } = useTasks(tasksFilter);
  const { createTask } = useTasks();
  const { goals } = useGoals();
  const { folders } = useFolders();
  const { profile } = useProfile();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const { metrics, trackDayActive } = useStreaks();
  const { checkAndUnlock } = useGamification();
  const streakCount = metrics?.streak_current || 0;
  const [captureOpen, setCaptureOpen] = useState(false);
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState<'text' | 'voice' | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [timerTask, setTimerTask] = useState<any>(null);
  const [dragIdx] = useState<number | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const timerDurationRef = useRef(0);
  const captureModalRef = useRef<TaskCaptureModalHandle>(null);
  const hasTrackedDayRef = useRef(false);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const completedCountRef = useRef(0);
  completedCountRef.current = tasks.filter((t) => t.status === 'done').length;
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

  const sortedTasks = useMemo(() => {
    const filtered = !selectedFolderId
      ? tasks.filter((t: any) => !t.folder_id)
      : tasks.filter((t: any) => t.folder_id === selectedFolderId);
    return [...filtered].sort((a: any, b: any) => {
      const rankA = a.urgency && a.importance ? 0 : a.urgency ? 1 : a.importance ? 2 : 3;
      const rankB = b.urgency && b.importance ? 0 : b.urgency ? 1 : b.importance ? 2 : 3;
      const rankDiff = rankA - rankB;
      if (rankDiff !== 0) return rankDiff;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
  }, [tasks, selectedFolderId]);

  const completedCount = useMemo(() => tasks.filter((t) => t.status === 'done').length, [tasks]);

  const greeting = useMemo(() => getDynamicGreeting(
    profile?.name || user?.user_metadata?.full_name || (user?.email?.split('@')[0]) || 'Emprendedor',
    completedCount,
    sortedTasks.length,
    profile?.main_goal_id ? goals.find((g: any) => g.id === profile.main_goal_id)?.title : undefined
  ), [profile, user, completedCount, sortedTasks.length, goals]);

  const profileName = useMemo(() => profile?.name, [profile?.name]);

  const handleComplete = useCallback(async (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletingTaskId(task.id);

    const isCurrentlyTiming = timerTask?.id === task.id;
    const finalDuration = isCurrentlyTiming ? timerDurationRef.current : task.actual_duration_seconds;

    if (isCurrentlyTiming) {
      setTimerTask(null);
    }

    setTimeout(() => {
      const currentTasks = tasksRef.current;
      const remainingTasks = currentTasks.filter((t: any) => t.status !== 'done' && t.id !== task.id);
      const isLastTask = currentTasks.length > 0 && remainingTasks.length === 0;

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
            triggerDailyCelebration(profileName);
            if (window.electronAPI) {
              window.electronAPI.showNotification(
                "¡Misión Cumplida! 🎉",
                `Has terminado todas tus tareas de hoy, ${profileName || 'Emprendedor'}. ¡Disfruta tu descanso!`,
                'success'
              );
            }
          } else if (isCurrentlyTiming) {
            triggerOnTimeCelebration(task.title, profileName);
          } else {
            triggerTaskCelebration(task.title, profileName);
            if (completedCountRef.current + 1 === 5 && window.electronAPI) {
              window.electronAPI.showNotification(
                "¡Estás en racha! 🔥",
                "Llevas 5 tareas completadas hoy. Sigue así.",
                'info'
              );
            }
          }
        },
        onError: () => setCompletingTaskId(null)
      });
    }, 500);
  }, [timerTask, updateTask, checkAndUnlock, profileName]);

  const handleUncomplete = useCallback((task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask.mutate({ id: task.id, status: 'pending', completed_at: null });
  }, [updateTask]);

  const handleStartTimer = useCallback((task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setTimerTask(task);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      <div className="max-w-[430px] lg:max-w-4xl mx-auto px-6 pt-4 pb-32 space-y-6 relative">
        
        {/* Header */}
        <div className="flex items-start justify-between pt-4 pb-2">
          <div className="w-12 h-12 flex-shrink-0" />

          <div id="app-logo" className="flex flex-col items-center">
            <motion.div
              key={format(currentTime, 'h:mm')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center"
            >
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black tracking-[-0.05em] tabular-nums text-foreground">
                  {format(currentTime, 'h:mm')}
                </span>
                <span className="text-sm font-black text-on-surface-variant uppercase tracking-widest">
                  {format(currentTime, 'a')}
                </span>
              </div>
              <div className="mt-2 flex flex-col items-center gap-1">
                <span className="text-xs uppercase tracking-[0.2em] font-bold text-on-surface-variant/60">
                  {format(currentTime, "EEEE, d 'de' MMMM", { locale: es })}
                </span>
                <p className="text-sm font-black text-foreground/80">
                  {greeting}
                </p>
              </div>
            </motion.div>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              id="mini-window-btn"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={toggleMiniWidget}
              className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border ${
                miniWidgetOpen
                  ? 'bg-primary/15 text-primary border-primary/30 shadow-sm'
                  : 'bg-surface-container text-on-surface-variant/70 hover:text-primary border-outline-variant/20 hover:border-primary/30'
              }`}
            >
              {miniWidgetOpen ? 'Desactivar' : 'Activar mini ventana'}
            </motion.button>
          </div>
        </div>

        {/* Folder filter bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
          <motion.button
            onClick={() => setSelectedFolderId(null)}
            whileTap={{ scale: 0.95 }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
              !selectedFolderId
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-surface-container text-on-surface-variant/70 hover:text-primary border-outline-variant/20 hover:border-primary/30'
            }`}
          >
            General
          </motion.button>
          {folders.map((folder: any) => {
            const isSelected = selectedFolderId === folder.id;
            return (
              <motion.button
                key={folder.id}
                onClick={() => setSelectedFolderId(isSelected ? null : folder.id)}
                whileTap={{ scale: 0.95 }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-surface-container text-on-surface-variant/70 hover:text-primary border-outline-variant/20 hover:border-primary/30'
                }`}
              >
                <motion.div
                  key={isSelected ? 'open' : 'closed'}
                  initial={{ rotateY: isSelected ? 180 : -180, scale: 0.8 }}
                  animate={{ rotateY: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  style={{ display: 'flex' }}
                >
                  {isSelected ? (
                    <FolderOpen className="w-3.5 h-3.5" />
                  ) : (
                    <Folder className="w-3.5 h-3.5" />
                  )}
                </motion.div>
                {folder.name}
              </motion.button>
            );
          })}
        </div>

        <div className="pt-2 space-y-3">
          <GamificationBar completedCount={completedCount} totalCount={sortedTasks.length} /> 

          <FAB 
            onTextClick={openCapture} 
            onVoiceClick={openCaptureInVoiceMode} 
            onRecurrenceClick={() => setRecurrenceOpen(true)}
          />

          <QuickRecurrenceFlow 
            open={recurrenceOpen}
            onClose={() => setRecurrenceOpen(false)}
          />
        </div>

        {isLoading ? (
          <div className="space-y-4 py-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-surface/50 border border-outline-variant rounded-[24px] animate-pulse" />
            ))}
          </div>
        ) : sortedTasks.length > 0 ? (
          <div className="space-y-4">
            <AnimatePresence>
              {sortedTasks.map((task, idx) => (
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
      <ChaosBuddiesTrigger />
      <WeeklySummaryModal />
    </div>
  );
};

export default DailyPage;
