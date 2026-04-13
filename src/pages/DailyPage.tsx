import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useProfile } from '@/hooks/useProfile';
import { useStreaks } from '@/hooks/useStreaks';
import { useGlobalVoiceCapture } from '@/hooks/useGlobalVoiceCapture';
import { useTimeBlocks } from '@/hooks/useTimeBlocks';
import { format } from 'date-fns';
import { Check, Plus, GripVertical, Timer, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { triggerTaskCelebration, triggerDailyCelebration } from '@/lib/celebrations';
import FAB from '@/components/FAB';
import TaskCaptureModal, { type TaskCaptureModalHandle } from '@/components/TaskCaptureModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import FullscreenTimer from '@/components/FullscreenTimer';

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

  const { tasks, updateTask } = useTasks({ date: today });
  const { timeBlocks } = useTimeBlocks(today);
  const { goals } = useGoals();
  const { profile } = useProfile();
  const { trackDayActive } = useStreaks();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [timerTask, setTimerTask] = useState<any>(null);
  const [orderedTasks, setOrderedTasks] = useState<any[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const captureModalRef = useRef<TaskCaptureModalHandle>(null);

  const openCapture = useCallback(() => setCaptureOpen(true), []);
  const openCaptureInVoiceMode = useCallback(() => {
    captureModalRef.current?.openInVoiceMode();
    setCaptureOpen(true);
  }, []);
  useGlobalVoiceCapture(captureModalRef, openCapture);

  useEffect(() => { trackDayActive.mutate(); }, []);

  const sortedTasks = useMemo(() => {
    return tasks
      .filter((t: any) => t.status !== 'done')
      .sort((a: any, b: any) => {
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
    
    // Step 1: Trigger local "completing" animation
    setCompletingTaskId(task.id);

    // Step 2: Delay the actual mutation to allow animation to play
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
          if (isLastTask) {
            const message = triggerDailyCelebration(profile?.name);
            toast.success(message, {
              duration: 6000,
              icon: '🎉',
            });
          } else {
            const message = triggerTaskCelebration(task.title, profile?.name);
            toast.success(message, {
              duration: 4000,
              icon: '🚀',
            });
          }
        },
        onError: () => setCompletingTaskId(null)
      });
    }, 800); // 800ms for strike + check animation
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
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-[430px] lg:max-w-4xl mx-auto px-6 pt-2 pb-24 space-y-5">

        {/* Dynamic greeting - centered, single line */}
        <p className="text-center text-sm text-on-surface-variant py-3">{greeting}</p>

        {orderedTasks.length === 0 && timeBlocks.filter(b => tasks.some(t => t.time_block_id === b.id && t.status !== 'done')).length === 0 ? (
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
                  className="rounded-2xl overflow-hidden shadow-sm transition-all"
                  style={{ backgroundColor: `${blockColor}15` }}
                >
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

                  <div className="p-3 space-y-2">
                    {blockTasks.length === 0 && (
                      <p className="text-sm p-2 text-foreground/50 italic">Área libre (sin tareas agendadas)</p>
                    )}

                    <AnimatePresence mode="popLayout">
                      {blockTasks.map((task) => {
                        const isDone = task.status === 'done';

                        return (
                          <motion.div
                            key={task.id}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{
                              opacity: completingTaskId === task.id ? 0.3 : 1,
                              x: 0,
                              scale: completingTaskId === task.id ? 0.98 : 1,
                            }}
                            exit={{ opacity: 0, x: 20, transition: { duration: 0.3 } }}
                            onClick={() => setSelectedTask(task)}
                            className={`p-3 rounded-xl flex items-start gap-3 cursor-pointer transition-all border border-black/5 ${
                              isDone ? 'opacity-50 bg-background/40' : 'bg-background hover:scale-[1.01] shadow-sm'
                            }`}
                          >
                            {isDone || completingTaskId === task.id ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-5 h-5 rounded bg-primary flex items-center justify-center flex-shrink-0 mt-0.5"
                              >
                                <Check className="w-3 h-3 text-primary-foreground" />
                              </motion.div>
                            ) : (
                              <button
                                onClick={(e) => handleComplete(task, e)}
                                className="w-5 h-5 rounded border-2 border-outline-variant flex items-center justify-center hover:border-primary flex-shrink-0 mt-0.5"
                              />
                            )}

                            <div className="flex-1 min-w-0 relative">
                              <h4
                                className={`text-sm font-semibold break-words transition-colors ${
                                  isDone || completingTaskId === task.id ? 'text-on-surface-variant' : 'text-foreground'
                                }`}
                              >
                                {task.title}
                              </h4>
                              {(isDone || completingTaskId === task.id) && (
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: '100%' }}
                                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                                  className="absolute top-1/2 left-0 h-[2px] bg-primary/40 -translate-y-1/2"
                                />
                              )}
                            </div>

                            {!isDone && (
                              <button
                                onClick={(e) => handleStartTimer(task, e)}
                                className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 flex-shrink-0 transition-colors"
                              >
                                <Timer className="w-3.5 h-3.5 text-primary" />
                              </button>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}

            {/* Unscheduled Tasks Rendering */}
            <div className="space-y-2 mt-8">
              {timeBlocks.length > 0 && orderedTasks.filter(t => !t.time_block_id).length > 0 && (
                <h3 className="font-bold text-lg text-foreground px-1 pb-2">Tareas sin bloque asignado</h3>
              )}
              <AnimatePresence mode="popLayout">
                {orderedTasks.filter(t => !t.time_block_id).map((task, idx) => {
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
                          className="w-5 h-5 rounded bg-primary flex items-center justify-center flex-shrink-0 mt-0.5"
                        >
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </motion.div>
                      ) : (
                        <button onClick={(e) => handleComplete(task, e)}
                          className="w-5 h-5 rounded border-2 border-outline-variant flex items-center justify-center hover:border-primary flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0 relative">
                        <h4 className={`text-sm font-semibold break-words transition-colors ${
                          isDone || completingTaskId === task.id ? 'text-on-surface-variant' : 'text-foreground'
                        }`}>
                          {task.title}
                        </h4>
                        {(isDone || completingTaskId === task.id) && (
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            className="absolute top-1/2 left-0 h-[2px] bg-primary/40 -translate-y-1/2"
                          />
                        )}
                      </div>
                      {!isDone && (
                        <button onClick={(e) => handleStartTimer(task, e)}
                          className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 flex-shrink-0 transition-colors">
                          <Timer className="w-3.5 h-3.5 text-primary" />
                        </button>
                      )}
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
      <TaskDetailModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
      <FullscreenTimer task={timerTask} open={!!timerTask} onClose={() => setTimerTask(null)} />
    </div>
  );
};

export default DailyPage;
