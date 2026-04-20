// DailyPage with task visibility and toast removal
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useProfile } from '@/hooks/useProfile';
import { useStreaks } from '@/hooks/useStreaks';
import { useGlobalVoiceCapture } from '@/hooks/useGlobalVoiceCapture';
import { useTimeBlocks } from '@/hooks/useTimeBlocks';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Check, Plus, GripVertical, Timer, Clock, List, CalendarDays, ChevronDown, Trash2, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { triggerTaskCelebration, triggerDailyCelebration } from '@/lib/celebrations';
import FAB from '@/components/FAB';
import TaskCaptureModal, { type TaskCaptureModalHandle } from '@/components/TaskCaptureModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import FullscreenTimer from '@/components/FullscreenTimer';
import { AISchedulerModal } from '@/components/AISchedulerModal';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

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

const CalendarView = ({ tasks, timeBlocks, onTaskClick }: { tasks: any[], timeBlocks: any[], onTaskClick: (t: any) => void }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const getBlockTop = (block: any) => {
    const [sh, sm] = block.start_time.split(':').map(Number);
    return (sh * 60 + sm) * (64 / 60);
  };

  const getBlockHeight = (block: any) => {
    const [sh, sm] = block.start_time.split(':').map(Number);
    const [eh, em] = block.end_time.split(':').map(Number);
    return ((eh * 60 + em) - (sh * 60 + sm)) * (64 / 60);
  };

  const getTaskTop = (task: any) => {
    if (!task.start_time) return null;
    const [h, m] = task.start_time.split(':').map(Number);
    return (h * 60 + m) * (64 / 60);
  };

  const currentTop = currentMinutes * (64 / 60);
  const totalHeight = 24 * 64;
  const tasksInBlocks = tasks.filter(t => t.time_block_id && !t.start_time && t.status !== 'done');
  const tasksWithoutTimeOrBlock = tasks.filter(t => !t.start_time && !t.time_block_id && t.status !== 'done');
  const tasksWithTime = tasks.filter(t => t.start_time && t.status !== 'done');

  return (
    <div className="flex flex-col gap-3">
      {/* "Island" for tasks without time or block — more compact to maximize calendar space */}
      {tasksWithoutTimeOrBlock.length > 0 && (
        <div className="bg-surface-container-low/30 rounded-2xl p-3 border border-outline-variant/5">
          <div className="flex items-center gap-2 mb-2">
             <div className="w-1 h-3 bg-primary/40 rounded-full" />
             <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-[0.15em]">Por agendar</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tasksWithoutTimeOrBlock.map(task => (
              <button
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="px-3 py-1.5 rounded-xl bg-background/50 text-[10px] font-bold text-foreground border border-outline-variant/10 hover:border-primary/30 hover:bg-primary/5 transition-all truncate max-w-[200px] shadow-sm"
              >
                {task.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* The scrollable calendar timeline context — maximized vertical space */}
      <div className="relative overflow-y-auto pr-1 flex-1 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 220px)' }}>
        <div className="relative" style={{ height: totalHeight }}>
          {/* Hour lines */}
          {hours.map(hour => (
            <div key={hour} className="absolute w-full flex items-start" style={{ top: hour * 64 }}>
              <span className="w-12 text-[10px] text-on-surface-variant/30 font-bold text-right pr-3 -mt-2">
                {hour === 0 ? '12am' : hour === 12 ? '12pm' : hour < 12 ? `${hour}am` : `${hour - 12}pm`}
              </span>
              <div className="flex-1 border-t border-outline-variant/5" />
            </div>
          ))}

          {/* Time blocks */}
          {timeBlocks.map(block => {
            const blockTasks = tasksInBlocks.filter(t => t.time_block_id === block.id);
            return (
              <div
                key={block.id}
                className="absolute left-14 right-2 rounded-2xl bg-opacity-10 border-l-4 px-3 py-2 flex flex-col gap-2 transition-all hover:bg-opacity-20"
                style={{
                  top: getBlockTop(block),
                  height: Math.max(getBlockHeight(block), 32),
                  backgroundColor: `${block.color || '#4BE277'}15`,
                  borderLeftColor: block.color || '#4BE277'
                }}
              >
                <div className="flex justify-between items-center opacity-40">
                  <p className="text-[9px] font-black uppercase tracking-widest truncate">{block.title}</p>
                </div>
                
                <div className="flex flex-wrap gap-1.5 overflow-hidden">
                  {blockTasks.map(task => (
                    <button
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/5 border border-white/5 text-white hover:bg-white/10 transition-all truncate max-w-full"
                    >
                      {task.title}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Tasks with start_time */}
          {tasksWithTime.map(task => (
            <div
              key={task.id}
              onClick={() => onTaskClick(task)}
              className="absolute left-14 right-4 rounded-xl bg-primary/10 border-l-2 border-primary px-3 py-1.5 cursor-pointer hover:bg-primary/20 transition-all shadow-sm"
              style={{ top: getTaskTop(task) || 0, minHeight: 40 }}
            >
              <p className="text-xs font-bold text-foreground truncate">{task.title}</p>
            </div>
          ))}

          {/* Current time indicator */}
          {currentTop >= 0 && currentTop <= totalHeight && (
            <div className="absolute left-10 right-0 flex items-center gap-1 z-10" style={{ top: currentTop }}>
              <div className="w-2 h-2 rounded-full bg-error shadow-[0_0_8px_rgba(255,0,0,0.5)]" />
              <div className="flex-1 border-t-2 border-error/50" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DailyPage = () => {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { tasks, updateTask, deleteTask } = useTasks({ date: today });
  const { timeBlocks } = useTimeBlocks(today);
  const { goals } = useGoals();
  const { profile } = useProfile();
  const { metrics, trackDayActive } = useStreaks();
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});
  const [newSubtaskInputs, setNewSubtaskInputs] = useState<Record<string, string>>({});
  const streakCount = metrics?.streak_current || 0;
  const [captureOpen, setCaptureOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [timerTask, setTimerTask] = useState<any>(null);
  const [orderedTasks, setOrderedTasks] = useState<any[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [draggingOverBlockId, setDraggingOverBlockId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ blockId: string | null, globalIdx: number | null } | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const captureModalRef = useRef<TaskCaptureModalHandle>(null);
  const hasTrackedDayRef = useRef(false);
  const [viewMode, setViewMode] = useState<'agenda' | 'calendar'>(() => {
    return (localStorage.getItem('adonai_daily_view') as 'agenda' | 'calendar') || 'agenda';
  });

  const handleSetView = (mode: 'agenda' | 'calendar') => {
    setViewMode(mode);
    localStorage.setItem('adonai_daily_view', mode);
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

  const sortedTasks = useMemo(() => {
    return tasks
      .sort((a: any, b: any) => {
        // First sort by completion status (active first)
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
    
    // Step 1: Trigger local "completing" animation (Check appears -> Line draws)
    setCompletingTaskId(task.id);

    // Step 2: Delay the actual mutation to allow the line animation to visually finish
    setTimeout(() => {
      // Find if this is the last task
      const remainingTasks = tasks.filter((t: any) => t.status !== 'done' && t.id !== task.id);
      const isLastTask = tasks.length > 0 && remainingTasks.length === 0;

      updateTask.mutate({ 
        id: task.id, 
        status: 'done', 
        completed_at: new Date().toISOString() 
      }, {
        onSuccess: () => {
          setCompletingTaskId(null);
          // Step 3: Trigger confetti immediately after the mutation
          if (isLastTask) {
            triggerDailyCelebration(profile?.name);
          } else {
            triggerTaskCelebration(task.title, profile?.name);
          }
        },
        onError: () => setCompletingTaskId(null)
      });
    }, 500); // 500ms delay matches the original slower line animation
  };

  const handleUncomplete = (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask.mutate({ id: task.id, status: 'pending', completed_at: null });
  };

  const toggleSubtaskExpand = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSubtasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleSubtaskComplete = async (task: any, subtaskIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    // Subtasks not yet supported in DB schema — no-op
    return;
  };

  const handleAddSubtask = async (taskId: string, e?: React.FormEvent) => {
    e?.preventDefault();
    const title = newSubtaskInputs[taskId]?.trim();
    if (!title) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Subtasks not yet supported in DB schema — no-op
    setNewSubtaskInputs(prev => ({ ...prev, [taskId]: '' }));
  };

  const handleDeleteTask = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Mover a la papelera?')) {
      deleteTask.mutate(taskId, {
        onSuccess: () => {
          toast.success('Tarea movida a la papelera');
        },
        onError: () => {
          toast.error('No se pudo mover la tarea a la papelera');
        },
      });
    }
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

  const handleDropOnBlock = (e: React.DragEvent, blockId: string | null) => {
    e.preventDefault();
    if (dragIdx === null) return;
    
    const task = orderedTasks[dragIdx];
    const newOrder = [...orderedTasks];
    const [moved] = newOrder.splice(dragIdx, 1);
    
    // If we have a drop indicator, use its position. Otherwise, append to block.
    let targetIdx = dropIndicator?.globalIdx;
    
    if (targetIdx === null && blockId) {
      // Append to the end of this block's tasks
      const blockTasks = orderedTasks.filter(t => t.time_block_id === blockId && t.id !== task.id);
      if (blockTasks.length > 0) {
        const lastTask = blockTasks[blockTasks.length - 1];
        targetIdx = newOrder.findIndex(t => t.id === lastTask.id) + 1;
      } else {
        targetIdx = newOrder.length;
      }
    }

    if (targetIdx !== undefined && targetIdx !== null) {
      newOrder.splice(targetIdx, 0, { ...moved, time_block_id: blockId });
      setOrderedTasks(newOrder.map((t, i) => ({ ...t, sort_order: i })));
      updateTask.mutate({ id: task.id, time_block_id: blockId, sort_order: targetIdx });
    } else if (task.time_block_id !== blockId) {
      setOrderedTasks(prev => prev.map(t => t.id === task.id ? { ...t, time_block_id: blockId } : t));
      updateTask.mutate({ id: task.id, time_block_id: blockId });
    }
    
    setDragIdx(null);
    setDraggingOverBlockId(null);
    setDropIndicator(null);
    toast.success(blockId ? "Tarea agendada" : "Tarea movida fuera del bloque");
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
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-[430px] lg:max-w-4xl mx-auto px-6 pt-2 pb-24 space-y-5">

        {/* Dynamic greeting - centered, single line */}
        <p className="text-center text-sm text-on-surface-variant py-3">{greeting}</p>

        {/* View toggle: Agenda / Calendar + Streak */}
        <div className="flex items-center justify-between py-1">
          {/* Streak badge */}
          {streakCount > 0 ? (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 shadow-[0_0_12px_rgba(249,115,22,0.15)] ring-1 ring-orange-500/5"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500/20" />
              </motion.div>
              <span className="text-[13px] font-black leading-none text-orange-600 dark:text-orange-400 tabular-nums">{streakCount}</span>
            </motion.div>
          ) : <div />}

          <div className="flex items-center gap-1">
            <button
              onClick={() => handleSetView('agenda')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'agenda'
                  ? 'bg-primary/15 text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Agenda
            </button>
            <button
              onClick={() => handleSetView('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'calendar'
                  ? 'bg-primary/15 text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Calendario
            </button>
          </div>
        </div>

        {viewMode === 'calendar' ? (
          <CalendarView
            tasks={orderedTasks}
            timeBlocks={timeBlocks}
            onTaskClick={setSelectedTask}
          />
        ) : orderedTasks.length === 0 && timeBlocks.filter(b => tasks.some(t => t.time_block_id === b.id && t.status !== 'done')).length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-container-low p-10 rounded-3xl text-center space-y-4 border border-primary/10 shadow-sm"
          >
            {tasks.length > 0 && tasks.every(t => t.status === 'done') ? (
              <>
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">🏆</span>
                </div>
                <h2 className="text-2xl font-bold text-foreground">¡Día Superado, {profile?.name || 'Emprendedor'}!</h2>
                <p className="text-on-surface-variant max-w-[280px] mx-auto">
                  Has completado todas tus tareas de hoy. Tu enfoque y disciplina están dando resultados increíbles.
                </p>
                <div className="pt-4">
                   <p className="text-xs font-bold uppercase tracking-widest text-primary">¡Disfruta tu descanso!</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-surface-container-high rounded-full flex items-center justify-center mx-auto opacity-40">
                  <Plus className="w-8 h-8 text-on-surface-variant" />
                </div>
                <p className="text-on-surface-variant font-medium">Tu día está despejado. ¿Qué quieres lograr hoy?</p>
                <button onClick={openCapture} className="inline-flex items-center gap-2 px-6 py-3 rounded-full primary-gradient text-primary-foreground text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95">
                  <Plus className="w-4 h-4" /> Empezar a planificar
                </button>
              </>
            )}
          </motion.div>
        ) : (
          <div className="space-y-6">
            
            {/* Time Blocks Rendering */}
            {timeBlocks.map((block) => {
              const blockTasks = orderedTasks.filter((t) => t.time_block_id === block.id);
              const formatTime = (t: string) => {
                if (!t) return '';
                const [h, m] = t.split(':').map(Number);
                const ampm = h >= 12 ? 'pm' : 'am';
                const h12 = h % 12 || 12;
                return `${h12}:${m.toString().padStart(2, '0')}${ampm}`;
              };
              const blockColor = block.color || '#2196F3';

              return (
                <div
                  key={block.id}
                  onDragOver={(e) => { 
                    e.preventDefault(); 
                    setDraggingOverBlockId(block.id);
                  }}
                  onDragLeave={(e) => {
                    // Only clear if we're actually leaving the block
                    const rect = e.currentTarget.getBoundingClientRect();
                    if (e.clientX < rect.left || e.clientX >= rect.right || e.clientY < rect.top || e.clientY >= rect.bottom) {
                      setDraggingOverBlockId(null);
                      setDropIndicator(null);
                    }
                  }}
                  onDrop={(e) => handleDropOnBlock(e, block.id)}
                  className={`rounded-2xl overflow-hidden shadow-sm transition-all duration-300 relative ${
                    draggingOverBlockId === block.id 
                      ? 'ring-4 ring-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)] scale-[1.01] z-10' 
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: `${blockColor}15` }}
                >
                  {draggingOverBlockId === block.id && (
                    <motion.div 
                      layoutId={`glow-${block.id}`}
                      className="absolute inset-0 bg-primary/10 pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                  <div
                    className="px-4 py-3 flex items-center justify-between"
                    style={{ backgroundColor: blockColor, color: '#ffffff' }}
                  >
                    <h3 className="font-bold text-lg tracking-tight">{block.title}</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold bg-black/20 px-2 py-1 rounded-md">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTime(block.start_time)} - {formatTime(block.end_time)}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveBlockId(block.id);
                          setCaptureOpen(true);
                        }}
                        className="bg-white/20 hover:bg-white/30 p-1 rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                    <div 
                      className={`p-3 pb-8 space-y-2 min-h-[80px] transition-colors ${dragIdx !== null && blockTasks.length === 0 ? 'bg-primary/5' : ''}`}
                      onDragOver={(e) => {
                        // Default to append at the end if hovering the container
                        e.preventDefault();
                        if (draggingOverBlockId === block.id) {
                          setDropIndicator({ blockId: block.id, globalIdx: null });
                        }
                      }}
                    >
                    <AnimatePresence mode="popLayout">
                      {blockTasks.map((task) => {
                        const isDone = task.status === 'done';
                        const globalIdx = orderedTasks.findIndex(t => t.id === task.id);

                        return (
                          <div 
                            key={task.id} 
                            className="relative"
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDropIndicator({ blockId: block.id, globalIdx });
                            }}
                          >
                            {/* Drop Indicator Line */}
                            {dropIndicator?.blockId === block.id && dropIndicator?.globalIdx === globalIdx && (
                              <motion.div 
                                initial={{ scaleX: 0, opacity: 0 }}
                                animate={{ scaleX: 1, opacity: 1 }}
                                className="absolute -top-1 left-0 right-0 h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)] z-20"
                                style={{ transformOrigin: 'left' }}
                              />
                            )}

                          <motion.div
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{
                              opacity: completingTaskId === task.id ? 0.3 : 1,
                              x: 0,
                              scale: completingTaskId === task.id ? 0.98 : 1,
                            }}
                            draggable={!isDone}
                            onDragStart={() => handleDragStart(globalIdx)}
                            onDragEnd={() => {
                              handleDragEnd();
                              setDropIndicator(null);
                            }}
                            onTouchStart={(e) => !isDone && handleTouchStart(globalIdx, e)}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            onClick={() => setSelectedTask(task)}
                            className={`p-3 rounded-xl flex items-start gap-3 cursor-pointer transition-all border ${
                              isDone || completingTaskId === task.id
                                ? 'bg-transparent border-transparent opacity-60' 
                                : dragIdx !== null && orderedTasks[dragIdx]?.id === task.id 
                                  ? 'bg-surface-container-high scale-[1.02] shadow-lg border-primary/20' 
                                  : 'bg-background hover:scale-[1.005] shadow-sm border-black/5'
                            }`}
                          >
                            {isDone || completingTaskId === task.id ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 cursor-pointer"
                                onClick={(e) => handleUncomplete(task, e)}
                              >
                                <Check className="w-5 h-5 text-primary-foreground" strokeWidth={3} />
                              </motion.div>
                            ) : (
                              <button
                                onClick={(e) => handleComplete(task, e)}
                                className="w-8 h-8 rounded-full border-2 border-outline-variant flex items-center justify-center hover:border-primary flex-shrink-0 transition-all group"
                              >
                                <div className="w-4 h-4 rounded-full bg-primary/0 group-hover:bg-primary/10 transition-all" />
                              </button>
                            )}

                            <div className="flex-1 min-w-0 relative flex flex-col justify-center min-h-[32px]">
                              <h4
                                className={`text-base font-bold tracking-tight transition-colors w-fit relative ${
                                  isDone || completingTaskId === task.id 
                                    ? 'text-on-surface-variant/50' 
                                    : 'text-foreground'
                                }`}
                              >
                                <span>{task.title}</span>
                                {(isDone || completingTaskId === task.id) && (
                                  <motion.div
                                    initial={completingTaskId === task.id ? { width: 0 } : { width: '100.5%' }}
                                    animate={{ width: '100.5%' }}
                                    transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                    className="absolute top-[52%] left-[-0.5%] h-[2px] bg-white/40 z-10 pointer-events-none rounded-full"
                                  />
                                )}
                              </h4>

                              {/* Inline Subtasks List - Minimalist */}
                              {!isDone && (
                                <div className="mt-1.5 flex flex-col items-start">
                                  <button
                                    onClick={(e) => toggleSubtaskExpand(task.id, e)}
                                    className="text-[10px] uppercase font-bold text-on-surface-variant/40 hover:text-primary transition-colors flex items-center gap-1.5"
                                  >
                                    {Array.isArray(task.subtasks) && task.subtasks.length > 0 ? (
                                      <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{task.subtasks.length}</span>
                                    ) : null}
                                    Subtareas
                                    <ChevronDown className={`w-3 h-3 transition-transform ${expandedSubtasks[task.id] ? 'rotate-180' : ''}`} />
                                  </button>

                                  <AnimatePresence>
                                    {expandedSubtasks[task.id] && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden w-full pl-2 mt-2 border-l-2 border-outline-variant/10 space-y-1.5"
                                      >
                                        {Array.isArray(task.subtasks) && task.subtasks.map((st: any, i: number) => (
                                          <div key={i} className="flex items-center gap-2.5 group">
                                            <button
                                              onClick={(e) => handleSubtaskComplete(task, i, e)}
                                              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                                                st.completed ? 'bg-primary border-primary' : 'border-outline-variant/50 hover:border-primary'
                                              }`}
                                            >
                                              {st.completed && <Check className="w-2.5 h-2.5 text-primary-foreground mx-auto" />}
                                            </button>
                                            <span className={`text-[11px] font-medium transition-colors ${st.completed ? 'text-on-surface-variant/40 line-through' : 'text-on-surface-variant/80'}`}>
                                              {st.title}
                                            </span>
                                          </div>
                                        ))}
                                        {/* Minimalist Subtask Input */}
                                        <form 
                                          onSubmit={(e) => handleAddSubtask(task.id, e)}
                                          onClick={(e) => e.stopPropagation()}
                                          className="flex items-center gap-2 py-0.5"
                                        >
                                          <div className="w-3.5 h-3.5 flex items-center justify-center">
                                            <Plus className="w-2.5 h-2.5 text-on-surface-variant/30" />
                                          </div>
                                          <input
                                            type="text"
                                            placeholder="Nueva subtarea..."
                                            value={newSubtaskInputs[task.id] || ''}
                                            onChange={(e) => setNewSubtaskInputs(prev => ({ ...prev, [task.id]: e.target.value }))}
                                            className="bg-transparent border-none p-0 text-[11px] text-primary focus:ring-0 placeholder:text-on-surface-variant/20 w-full"
                                          />
                                        </form>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              {!isDone && (
                                <button
                                  onClick={(e) => handleStartTimer(task, e)}
                                  className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                                >
                                  <Timer className="w-3.5 h-3.5 text-primary" />
                                </button>
                              )}
                            </div>
                          </motion.div>
                        </div>
                        );
                      })}
                      {/* Drop Indicator at end of block */}
                      {dropIndicator?.blockId === block.id && dropIndicator?.globalIdx === null && (
                        <motion.div 
                          initial={{ scaleX: 0, opacity: 0 }}
                          animate={{ scaleX: 1, opacity: 1 }}
                          className={`h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)] ${blockTasks.length > 0 ? 'mt-2' : ''}`}
                          style={{ transformOrigin: 'left' }}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}

            <div 
              className="space-y-2 mt-8 min-h-[60px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropOnBlock(e, null)}
            >
              <AnimatePresence mode="popLayout">
                {orderedTasks.filter(t => !t.time_block_id).map((task) => {
                  const idx = orderedTasks.findIndex(t => t.id === task.id);
                  const isDone = task.status === 'done';
                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ 
                        opacity: completingTaskId === task.id ? 0.3 : 1, 
                        y: 0,
                        scale: completingTaskId === task.id ? 0.98 : 1
                      }}
                      exit={{ opacity: 0, x: 20, transition: { duration: 0.3 } }}
                      draggable={!isDone}
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      onTouchStart={(e) => !isDone && handleTouchStart(idx, e)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onClick={() => setSelectedTask(task)}
                      className={`p-3.5 rounded-2xl flex items-start gap-3 cursor-pointer transition-all ${
                        isDone ? 'opacity-50' : dragIdx === idx || touchIdx === idx ? 'bg-surface-container-high scale-[1.02] shadow-lg' : 'bg-surface-container-low hover:bg-surface-container-high'
                      }`}
                    >
                      {!isDone && <GripVertical className="w-4 h-4 text-on-surface-variant/30 flex-shrink-0 cursor-grab mt-0.5" />}
                      {isDone || completingTaskId === task.id ? (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 cursor-pointer"
                          onClick={(e) => handleUncomplete(task, e)}
                        >
                          <Check className="w-5 h-5 text-primary-foreground" strokeWidth={3} />
                        </motion.div>
                      ) : (
                        <button onClick={(e) => handleComplete(task, e)}
                          className="w-8 h-8 rounded-full border-2 border-outline-variant flex items-center justify-center hover:border-primary flex-shrink-0 transition-all group">
                          <div className="w-4 h-4 rounded-full bg-primary/0 group-hover:bg-primary/10 transition-all" />
                        </button>
                      )}
                      <div className="flex-1 min-w-0 relative flex flex-col justify-center min-h-[32px]">
                        <h4 className={`text-base font-bold tracking-tight transition-colors ${
                          isDone || completingTaskId === task.id ? 'text-on-surface-variant/50' : 'text-foreground'
                        }`}>
                          {task.title}
                        </h4>
                        {(isDone || completingTaskId === task.id) && (
                          <motion.div 
                            initial={completingTaskId === task.id ? { width: 0 } : { width: '100%' }}
                            animate={{ width: '100%' }}
                            transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className="absolute top-1/2 left-0 h-[1.5px] bg-white/60 -translate-y-1/2 pointer-events-none"
                          />
                        )}

                        {/* Inline Subtasks List - Minimalist */}
                        {!isDone && (
                          <div className="mt-1.5 flex flex-col items-start">
                            <button
                              onClick={(e) => toggleSubtaskExpand(task.id, e)}
                              className="text-[10px] uppercase font-bold text-on-surface-variant/40 hover:text-primary transition-colors flex items-center gap-1.5"
                            >
                              {Array.isArray(task.subtasks) && task.subtasks.length > 0 ? (
                                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{task.subtasks.length}</span>
                              ) : null}
                              Subtareas
                              <ChevronDown className={`w-3 h-3 transition-transform ${expandedSubtasks[task.id] ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                              {expandedSubtasks[task.id] && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden w-full pl-2 mt-2 border-l-2 border-outline-variant/10 space-y-1.5"
                                >
                                  {Array.isArray(task.subtasks) && task.subtasks.map((st: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2.5 group">
                                      <button
                                        onClick={(e) => handleSubtaskComplete(task, i, e)}
                                        className={`w-3.5 h-3.5 rounded-full border transition-all ${
                                          st.completed ? 'bg-primary border-primary' : 'border-outline-variant/50 hover:border-primary'
                                        }`}
                                      >
                                        {st.completed && <Check className="w-2.5 h-2.5 text-primary-foreground mx-auto" />}
                                      </button>
                                      <span className={`text-[11px] font-medium transition-colors ${st.completed ? 'text-on-surface-variant/40 line-through' : 'text-on-surface-variant/80'}`}>
                                        {st.title}
                                      </span>
                                    </div>
                                  ))}
                                  {/* Minimalist Subtask Input */}
                                  <form 
                                    onSubmit={(e) => handleAddSubtask(task.id, e)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-2 py-0.5"
                                  >
                                    <div className="w-3.5 h-3.5 flex items-center justify-center">
                                      <Plus className="w-2.5 h-2.5 text-on-surface-variant/30" />
                                    </div>
                                    <input
                                      type="text"
                                      placeholder="Nueva subtarea..."
                                      value={newSubtaskInputs[task.id] || ''}
                                      onChange={(e) => setNewSubtaskInputs(prev => ({ ...prev, [task.id]: e.target.value }))}
                                      className="bg-transparent border-none p-0 text-[11px] text-primary focus:ring-0 placeholder:text-on-surface-variant/20 w-full"
                                    />
                                  </form>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!isDone && (
                          <button onClick={(e) => handleStartTimer(task, e)}
                            className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
                            <Timer className="w-3.5 h-3.5 text-primary" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            
          </div>
        )}
      </div>

      <FAB onClick={() => { setActiveBlockId(null); setCaptureOpen(true); }} />
      <TaskCaptureModal 
        ref={captureModalRef} 
        open={captureOpen} 
        timeBlockId={activeBlockId}
        onClose={() => {
          setCaptureOpen(false);
          setActiveBlockId(null);
        }} 
      />
      <AISchedulerModal 
        open={aiModalOpen} 
        onClose={() => setAiModalOpen(false)} 
        selectedDate={new Date(today)} 
      />
      <TaskDetailModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
      <FullscreenTimer task={timerTask} open={!!timerTask} onClose={() => setTimerTask(null)} />
    </div>
  );
};

export default DailyPage;
