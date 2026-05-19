// DailyPage — Dark mode, no time blocks, no calendar view
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useFolders } from '@/hooks/useFolders';
import { useProfile } from '@/hooks/useProfile';
import { useStreaks } from '@/hooks/useStreaks';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bell, Flame, Monitor, Sparkles, Folder, FolderOpen, Trophy, Snowflake } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerTaskCelebration, triggerDailyCelebration, triggerOnTimeCelebration } from '@/lib/celebrations';
import { usePriorityColors, getPriorityKey } from '@/hooks/usePriorityColors';
import TaskDetailModal from '@/components/TaskDetailModal';
import FullscreenTimer from '@/components/FullscreenTimer';
import GamificationBar from '@/components/GamificationBar';
import { useGamification, xpProgressInLevel } from '@/hooks/useGamification';
import { TaskCard } from '@/components/TaskCard';
import { openDownloadDialog } from '@/lib/desktopApp';
import MiniTaskWidget from '@/components/MiniTaskWidget';
import { ChaosBuddiesTrigger } from '@/components/ChaosBuddiesTrigger';
import { WeeklySummaryModal } from '@/components/WeeklySummaryModal';
import { compareTasksWithinQuadrants, getTaskManualOrderGroupKey } from '@/lib/taskOrdering';

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
  const tasksFilter = useMemo(() => ({ date: today, excludeEvents: false }), [today]);

  const { user } = useAuth();
  const { tasks, updateTask, isLoading } = useTasks(tasksFilter);
  const { createTask } = useTasks();
  const { goals } = useGoals();
  const { folders } = useFolders();
  const { profile } = useProfile();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const { metrics, trackDayActive } = useStreaks();
  const { checkAndUnlock, unlocked } = useGamification();

  // Calculate if streak is frozen (missed days)
  const isStreakFrozen = useMemo(() => {
    if (!metrics?.last_active_date) return false;
    const lastActive = parseISO(metrics.last_active_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastActive.setHours(0, 0, 0, 0);
    const diff = differenceInDays(today, lastActive);
    return diff >= 2;
  }, [metrics?.last_active_date]);

  const { priorityColors } = usePriorityColors();
  const streakCount = metrics?.streak_current || 0;
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [timerTask, setTimerTask] = useState<any>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [orderedTasks, setOrderedTasks] = useState<any[]>([]);
  const [touchIdx, setTouchIdx] = useState<number | null>(null);
  const [touchY, setTouchY] = useState(0);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const levelProgress = useMemo(() => {
    if (!metrics?.xp_total) return 0;
    return xpProgressInLevel(metrics.xp_total).percent;
  }, [metrics?.xp_total]);
  const timerDurationRef = useRef(0);
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
    let filtered = tasks;
    if (selectedFolderId !== 'all') {
      filtered = !selectedFolderId
        ? tasks.filter((t: any) => !t.folder_id)
        : tasks.filter((t: any) => t.folder_id === selectedFolderId);
    }
    
    return [...filtered].sort(compareTasksWithinQuadrants);
  }, [tasks, selectedFolderId]);

  useEffect(() => {
    setOrderedTasks(sortedTasks);
  }, [sortedTasks]);

  const persistVisibleOrder = useCallback((nextOrder: any[]) => {
    nextOrder.forEach((task, idx) => {
      if (task.status !== 'done' && (task.sort_order ?? 0) !== idx) {
        updateTask.mutate({ id: task.id, sort_order: idx });
      }
    });
  }, [updateTask]);

  const handleDragStart = useCallback((idx: number) => {
    if (orderedTasks[idx]?.status === 'done') return;
    setDragIdx(idx);
  }, [orderedTasks]);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const dragged = orderedTasks[dragIdx];
    const target = orderedTasks[idx];
    if (!dragged || !target || dragged.status === 'done' || target.status === 'done') return;
    if (getTaskManualOrderGroupKey(dragged) !== getTaskManualOrderGroupKey(target)) return;

    const next = [...orderedTasks];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    setOrderedTasks(next);
    setDragIdx(idx);
  }, [dragIdx, orderedTasks]);

  const handleDragEnd = useCallback(() => {
    if (dragIdx !== null) persistVisibleOrder(orderedTasks);
    setDragIdx(null);
  }, [dragIdx, orderedTasks, persistVisibleOrder]);

  const handleTouchStart = useCallback((idx: number, e: React.TouchEvent) => {
    if (orderedTasks[idx]?.status === 'done') return;
    setTouchIdx(idx);
    setTouchY(e.touches[0].clientY);
  }, [orderedTasks]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchIdx === null) return;
    const steps = Math.round((e.touches[0].clientY - touchY) / 72);
    if (steps === 0) return;
    const nextIdx = Math.max(0, Math.min(orderedTasks.length - 1, touchIdx + steps));
    const dragged = orderedTasks[touchIdx];
    const target = orderedTasks[nextIdx];
    if (!dragged || !target || dragged.status === 'done' || target.status === 'done') return;
    if (getTaskManualOrderGroupKey(dragged) !== getTaskManualOrderGroupKey(target)) return;

    const next = [...orderedTasks];
    const [moved] = next.splice(touchIdx, 1);
    next.splice(nextIdx, 0, moved);
    setOrderedTasks(next);
    setTouchIdx(nextIdx);
    setTouchY(e.touches[0].clientY);
  }, [orderedTasks, touchIdx, touchY]);

  const handleTouchEnd = useCallback(() => {
    if (touchIdx !== null) persistVisibleOrder(orderedTasks);
    setTouchIdx(null);
  }, [orderedTasks, persistVisibleOrder, touchIdx]);

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
        <div className="flex items-center justify-center pt-2 pb-0 relative">
          <div id="app-logo" className="flex flex-col items-center flex-1 md:flex-none">
            {/* Desktop-only greeting/logo in header */}
            <motion.div
              key={format(currentTime, 'h:mm')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="hidden md:flex flex-col items-center"
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
              </div>
            </motion.div>

            {/* Mobile-only prominent stats in header */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="md:hidden flex items-center gap-5 px-4 py-1.5 rounded-2xl bg-surface-container-highest/40 backdrop-blur-xl border border-outline-variant/15 shadow-sm"
            >
              <div className="flex items-center gap-2 pr-3 border-r border-outline-variant/20">
                {isStreakFrozen ? (
                  <motion.div
                    animate={{ x: [-0.5, 0.5, -0.5, 0.5, 0], scale: [1, 1.02, 1] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="flex items-center gap-1.5"
                  >
                    <div className="relative flex items-center justify-center">
                      <motion.div 
                        className="absolute inset-0 bg-cyan-400/30 blur-md rounded-full"
                        animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.8, 1.2, 0.8] }}
                        transition={{ repeat: Infinity, duration: 3 }}
                      />
                      <Snowflake className="relative z-10 w-4 h-4 text-cyan-400 fill-cyan-400/20" />
                    </div>
                    <span className="text-xs font-black text-cyan-400">{metrics?.streak_current || 0}d 😢</span>
                  </motion.div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex items-center justify-center w-5 h-5">
                      {/* Fire Glow - Mobile */}
                      <motion.div 
                        className="absolute inset-0 bg-[#E65100]/40 blur-lg rounded-full"
                        animate={{ 
                          opacity: [0.4, 0.8, 0.4],
                          scale: [0.9, 1.4, 0.9],
                        }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                      />

                      {/* Floating Embers - Mobile */}
                      {[...Array(2)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-0.5 h-0.5 bg-[#FFD54F] rounded-full"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ 
                            opacity: [0, 1, 0],
                            y: [-5, -15],
                            x: [(i - 0.5) * 6],
                          }}
                          transition={{ 
                            repeat: Infinity, 
                            duration: 1.2, 
                            delay: i * 0.6,
                            ease: "easeOut"
                          }}
                        />
                      ))}

                      {/* Flame Layers - Mobile */}
                      <motion.div
                        className="relative z-10 flex items-center justify-center"
                        animate={{ 
                          y: [0, -1, 0],
                          scaleY: [1, 1.1, 1],
                          rotate: [-2, 2, -2]
                        }}
                        transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
                      >
                        <Flame className="w-4 h-4 text-[#E65100] fill-[#E65100]/40 filter drop-shadow-[0_0_5px_rgba(230,81,0,0.4)]" />
                        
                        <motion.div
                          className="absolute inset-0 flex items-center justify-center"
                          animate={{ 
                            scale: [0.5, 0.6, 0.55],
                            opacity: [1, 0.8, 1]
                          }}
                          transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }}
                        >
                          <Flame className="w-3 h-3 text-[#FFC107] fill-[#FFC107] filter blur-[0.3px]" />
                        </motion.div>
                      </motion.div>
                    </div>
                    <span className="text-xs font-black text-foreground">{metrics?.streak_current || 0}d</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex items-center justify-center">
                  <motion.div 
                    className="absolute inset-0 bg-[#FFD700]/40 blur-lg rounded-full"
                    animate={{ 
                      opacity: [0.3, 0.7, 0.3],
                      scale: [0.8, 1.2, 0.8]
                    }}
                    transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                  />
                  <Trophy className="relative z-10 w-4 h-4 text-[#FFD700] fill-[#FFD700]/30 filter drop-shadow-[0_0_8px_rgba(255,215,0,0.4)]" />
                </div>
                <span className="text-xs font-black text-foreground">Lvl {metrics?.level || 1}</span>
              </div>
            </motion.div>
          </div>
 
          {/* Date Box on top-right for mobile - Fixed to match menu trigger */}
          <div className={`md:hidden fixed z-[70] flex flex-shrink-0 flex-col items-center justify-center bg-surface-container-high/60 backdrop-blur-md border border-outline-variant/20 rounded-xl px-2 py-1 min-w-[40px] right-4 ${
             (window as any).electronAPI ? 'top-12' : 'top-4'
           }`}>
             <span className="text-lg font-black leading-none text-primary">
               {format(new Date(), 'd')}
             </span>
             <span className="text-[8px] font-black uppercase tracking-wider text-on-surface-variant/60 leading-none mt-0.5">
               {format(new Date(), 'MMM', { locale: es }).replace('.', '')}
             </span>
           </div>

          {/* PC Control Center - Only Mini Window Toggle remains */}
          <div className="hidden md:flex absolute top-4 right-6 flex-col items-end gap-2 z-[80]">
            <div className="flex items-center gap-3 bg-surface-container-highest/30 backdrop-blur-md px-4 py-2 rounded-full border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group">
              <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/70">Mini Ventana</span>
              <button
                id="mini-window-btn"
                onClick={toggleMiniWidget}
                className={`relative w-10 h-5 rounded-full transition-all border flex items-center px-0.5 ${
                  miniWidgetOpen 
                    ? 'bg-primary/20 border-primary/30' 
                    : 'bg-surface-container-highest border-outline-variant/30'
                }`}
              >
                <motion.div
                  animate={{ x: miniWidgetOpen ? 20 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={`w-3.5 h-3.5 rounded-full shadow-sm ${
                    miniWidgetOpen ? 'bg-primary' : 'bg-on-surface-variant/40'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Greeting - Centered and visible only on mobile */}
        <div className="md:hidden flex justify-center py-2">
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-black text-foreground/80 text-center px-6"
          >
            {greeting}
          </motion.p>
        </div>

        {/* Compact Stats Bar - Centered for Desktop */}
        <div className="hidden md:flex justify-center mb-6">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-8 bg-surface-container-highest/30 backdrop-blur-xl px-10 py-4 rounded-[32px] border border-outline-variant/15 shadow-lg"
          >
            {/* Streak Section */}
            <div className="flex items-center gap-4 pr-8 border-r border-outline-variant/20">
              {isStreakFrozen ? (
                <motion.div 
                  animate={{ x: [-1, 1, -1, 1, 0], scale: [1, 1.02, 1] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="flex items-center gap-4"
                >
                  <div className="relative w-12 h-12 flex items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                    <Snowflake className="w-6 h-6 text-cyan-400 fill-cyan-400/20" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400/70">Racha Congelada</span>
                    <span className="text-base font-black text-cyan-400 leading-tight">{metrics?.streak_current || 0} días 😢</span>
                  </div>
                </motion.div>
              ) : (
                <div className="flex items-center gap-4">
                  <motion.div 
                    className="relative w-12 h-12 flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#E65100]/20 to-[#FF3D00]/5 border border-[#E65100]/20"
                    animate={{ 
                      rotate: [-0.5, 0.5, -0.5],
                      scale: [1, 1.02, 1],
                    }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  >
                    {/* Fire Glow - Enhanced vibrancy */}
                    <motion.div 
                      className="absolute inset-0 bg-[#E65100]/30 blur-2xl rounded-full"
                      animate={{ 
                        opacity: [0.4, 0.8, 0.4],
                        scale: [0.9, 1.3, 0.9],
                      }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    />
                    
                    {/* Floating Embers */}
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-[#FFD54F] rounded-full blur-[1px]"
                        initial={{ opacity: 0, y: 10, x: 0 }}
                        animate={{ 
                          opacity: [0, 1, 0],
                          y: [-10, -30],
                          x: [0, (i - 1) * 10],
                        }}
                        transition={{ 
                          repeat: Infinity, 
                          duration: 1.5 + i * 0.5, 
                          delay: i * 0.4,
                          ease: "easeOut"
                        }}
                      />
                    ))}

                    {/* Outer Flame - Liquid motion */}
                    <motion.div 
                      className="relative z-10"
                      animate={{ 
                        y: [0, -2, 0],
                        scaleY: [1, 1.1, 1],
                        rotate: [-2, 2, -2]
                      }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
                    >
                      <Flame className="w-6 h-6 text-[#E65100] fill-[#E65100]/40 filter drop-shadow-[0_0_8px_rgba(230,81,0,0.5)]" />
                    </motion.div>

                    {/* Inner Core - Intense heat */}
                    <motion.div
                      className="absolute inset-0 z-20 flex items-center justify-center"
                      animate={{ 
                        scale: [0.45, 0.55, 0.5],
                        opacity: [1, 0.8, 1],
                      }}
                      transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }}
                    >
                      <Flame className="w-5 h-5 text-[#FFC107] fill-[#FFC107] filter blur-[0.5px]" />
                    </motion.div>
                  </motion.div>
                  
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#E65100]/80">Racha</span>
                    <span className="text-base font-black text-foreground tracking-tight leading-tight">{metrics?.streak_current || 0} días</span>
                  </div>
                </div>
              )}
            </div>

            {/* Level Section - Regal Gold Aura */}
            <div className="flex items-center gap-4">
              <motion.div 
                className="relative w-12 h-12 flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFD700]/20 to-[#FFA000]/5 border border-[#FFD700]/20"
                whileHover={{ scale: 1.05 }}
              >
                {/* Majestic Gold Glow */}
                <motion.div 
                  className="absolute inset-0 bg-[#FFD700]/25 blur-2xl rounded-full"
                  animate={{ 
                    opacity: [0.3, 0.6, 0.3],
                    scale: [0.8, 1.1, 0.8]
                  }}
                  transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                />
                
                {/* Floating Gold Sparkles */}
                <motion.div
                  className="absolute inset-0"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                >
                  <div className="absolute top-0 left-1/2 w-0.5 h-0.5 bg-[#FFD700] rounded-full blur-[0.5px]" />
                  <div className="absolute bottom-0 left-1/2 w-0.5 h-0.5 bg-[#FFD700] rounded-full blur-[0.5px]" />
                </motion.div>

                <Trophy className="relative z-10 w-6 h-6 text-[#FFD700] fill-[#FFD700]/30 filter drop-shadow-[0_0_10px_rgba(255,215,0,0.4)]" />
              </motion.div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#FFD700]/80">Nivel</span>
                <span className="text-base font-black text-foreground tracking-tight leading-tight">Nivel {metrics?.level || 1}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Folder filter bar */}

        {/* Desktop Task Island - Unifying Folders and Tasks */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden md:flex flex-col bg-surface-container/40 backdrop-blur-3xl border border-outline-variant/15 rounded-[48px] p-10 shadow-2xl shadow-black/20"
        >


          {/* Folder Filter Bar - Integrated into Desktop Island */}
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-6 mb-2 border-b border-outline-variant/10">
            <motion.button
              onClick={() => setSelectedFolderId(null)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border ${
                selectedFolderId === null
                  ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
                  : 'bg-surface-container-high/50 text-on-surface-variant/70 hover:text-primary border-outline-variant/15 hover:border-primary/30'
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
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex-shrink-0 flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
                      : 'bg-surface-container-high/50 text-on-surface-variant/70 hover:text-primary border-outline-variant/15 hover:border-primary/30'
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
                      <FolderOpen className="w-4 h-4" />
                    ) : (
                      <Folder className="w-4 h-4" />
                    )}
                  </motion.div>
                  {folder.name}
                </motion.button>
              );
            })}
          </div>

          {/* Task List - Inside Desktop Island */}
          <div className="mt-8">
            {isLoading ? (
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-surface-container-highest/20 border border-outline-variant/10 rounded-[32px] animate-pulse" />
                ))}
              </div>
            ) : sortedTasks.length > 0 ? (
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
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-20 px-6 text-center bg-surface-container-highest/10 border border-dashed border-outline-variant/20 rounded-[40px]"
              >
                <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-6">
                  <Sparkles className="w-10 h-10 text-primary/30" />
                </div>
                <h3 className="text-xl font-black mb-2 text-foreground/80">Todo en orden</h3>
                <p className="text-sm text-muted-foreground max-w-[280px] font-medium leading-relaxed">
                  Tu isla de tareas está despejada. Es el momento perfecto para enfocarte en lo que sigue o disfrutar el progreso.
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Mobile Task Island */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden flex flex-col bg-surface-container/30 backdrop-blur-2xl border border-outline-variant/10 rounded-[32px] p-5 shadow-xl shadow-black/10"
        >
          {/* Mobile Folders - Centered */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 justify-center border-b border-outline-variant/10 pb-4 mb-4">
            <motion.button
              onClick={() => setSelectedFolderId(null)}
              whileTap={{ scale: 0.95 }}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                selectedFolderId === null
                  ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                  : 'bg-surface-container-high/40 text-on-surface-variant/70 border-outline-variant/20'
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
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                      : 'bg-surface-container-high/40 text-on-surface-variant/70 border-outline-variant/20'
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

          {/* Mobile Task List */}
          <div>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-surface-container-highest/10 border border-outline-variant/10 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : sortedTasks.length > 0 ? (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {orderedTasks.map((task, idx) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      taskIdx={idx}
                      isDone={task.status === 'done'}
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
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12 px-4 text-center bg-surface-container-highest/5 border border-dashed border-outline-variant/20 rounded-3xl"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-primary/30" />
                </div>
                <h3 className="text-base font-black mb-1 text-foreground/80">Todo en orden</h3>
                <p className="text-xs text-muted-foreground max-w-[200px] leading-relaxed">
                  No hay tareas para hoy. Es un buen momento para descansar.
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>

      </div>

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
