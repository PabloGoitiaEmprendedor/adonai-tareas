import { useState, useEffect, useCallback } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useTasks, useEisenhowerSort } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useStreaks } from '@/hooks/useStreaks';
import { format } from 'date-fns';
import { Check, Target, Plus, GripVertical, Timer } from 'lucide-react';
import { motion } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import FAB from '@/components/FAB';
import TaskCaptureModal from '@/components/TaskCaptureModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import FullscreenTimer from '@/components/FullscreenTimer';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
};

const DashboardPage = () => {
  const { profile } = useProfile();
  const { goals } = useGoals();
  const { metrics, trackDayActive } = useStreaks();
  const today = format(new Date(), 'yyyy-MM-dd');
  const { tasks, updateTask } = useTasks({ date: today });
  const [captureOpen, setCaptureOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [timerTask, setTimerTask] = useState<any>(null);
  const [orderedTasks, setOrderedTasks] = useState<any[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const sorted = useEisenhowerSort(pendingTasks);

  // Build unified ordered list: pending (sorted) interspersed with completed in-place
  useEffect(() => {
    // Merge all tasks, sorted by sort_order then Eisenhower priority
    const allTasks = [...tasks].sort((a, b) => {
      // Completed tasks keep their position
      const orderA = a.sort_order || 0;
      const orderB = b.sort_order || 0;
      if (orderA !== orderB) return orderA - orderB;
      // Fall back to Eisenhower
      const scoreA = (a.urgency ? 2 : 0) + (a.importance ? 1 : 0);
      const scoreB = (b.urgency ? 2 : 0) + (b.importance ? 1 : 0);
      return scoreB - scoreA;
    });
    setOrderedTasks(allTasks);
  }, [tasks]);

  const mainGoal = goals.find((g) => g.id === profile?.main_goal_id);
  const completedToday = tasks.filter((t) => t.status === 'done').length;
  const totalToday = tasks.length;
  const progress = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;
  const hasTooMany = pendingTasks.length > 7;

  useEffect(() => { trackDayActive.mutate(); }, []);

  const handleComplete = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask.mutate({ id: taskId, status: 'done', completed_at: new Date().toISOString() });
  };

  const getMotivationalMessage = () => {
    if (completedToday === 0) return '¡Empecemos el día!';
    if (progress < 50) return `Ya llevas ${completedToday}. ¡Sigue así!`;
    if (progress < 100) return `Ya vas por el ${progress}%. ¡Cierra el día fuerte!`;
    return '¡Día completado! 🎉';
  };

  // Drag and drop handlers
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
    // Persist new order
    orderedTasks.forEach((task, idx) => {
      if ((task.sort_order || 0) !== idx) {
        updateTask.mutate({ id: task.id, sort_order: idx });
      }
    });
  };

  // Touch drag support
  const [touchIdx, setTouchIdx] = useState<number | null>(null);
  const [touchY, setTouchY] = useState(0);

  const handleTouchStart = (idx: number, e: React.TouchEvent) => {
    setTouchIdx(idx);
    setTouchY(e.touches[0].clientY);
  };

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchIdx === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchY;
    const itemHeight = 56;
    const steps = Math.round(diff / itemHeight);
    if (steps !== 0) {
      const newIdx = Math.max(0, Math.min(orderedTasks.length - 1, touchIdx + steps));
      if (newIdx !== touchIdx) {
        const newOrder = [...orderedTasks];
        const [moved] = newOrder.splice(touchIdx, 1);
        newOrder.splice(newIdx, 0, moved);
        setOrderedTasks(newOrder);
        setTouchIdx(newIdx);
        setTouchY(currentY);
      }
    }
  }, [touchIdx, touchY, orderedTasks]);

  const handleTouchEnd = () => {
    if (touchIdx !== null) {
      orderedTasks.forEach((task, idx) => {
        if ((task.sort_order || 0) !== idx) {
          updateTask.mutate({ id: task.id, sort_order: idx });
        }
      });
    }
    setTouchIdx(null);
  };

  const handleStartTimer = (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setTimerTask(task);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-[430px] lg:max-w-[800px] mx-auto px-5 pt-6 space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
          <span className="text-on-surface-variant text-xs font-medium uppercase tracking-widest">Dashboard</span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {getGreeting()}, {profile?.name || 'Emprendedor'}
          </h1>
        </motion.div>

        {/* Active Goal */}
        {mainGoal && (
          <div className="bg-surface-container-low p-4 rounded-lg flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-on-surface-variant text-[10px] font-medium uppercase tracking-wider">Meta activa</p>
              <p className="text-foreground font-semibold">{mainGoal.title}</p>
            </div>
            <Target className="w-5 h-5 text-primary" />
          </div>
        )}

        {hasTooMany && (
          <div className="bg-error-container/20 p-3 rounded-lg">
            <p className="text-sm text-tertiary">Tienes muchas tareas. ¿Quieres simplificar tu día?</p>
          </div>
        )}

        {/* Progress */}
        {totalToday > 0 && (
          <div>
            <div className="flex justify-between items-end mb-2">
              <p className="text-sm font-medium text-foreground">{getMotivationalMessage()}</p>
              <p className="text-xs font-bold text-primary">{progress}%</p>
            </div>
            <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
              <motion.div className="h-full primary-gradient rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
            </div>
          </div>
        )}

        {/* Unified Task List */}
        {orderedTasks.length === 0 ? (
          <div className="bg-surface-container-low p-6 rounded-lg text-center space-y-3">
            <p className="text-on-surface-variant">Tu día está despejado. ¿Qué quieres lograr?</p>
            <button onClick={() => setCaptureOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-full primary-gradient text-primary-foreground text-sm font-semibold">
              <Plus className="w-4 h-4" /> Añadir tarea
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {orderedTasks.map((task, idx) => {
              const isDone = task.status === 'done';
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  draggable={!isDone}
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={(e) => !isDone && handleTouchStart(idx, e)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onClick={() => setSelectedTask(task)}
                  className={`p-3.5 rounded-lg flex items-center gap-3 cursor-pointer transition-all ${
                    isDone ? 'opacity-50' : dragIdx === idx || touchIdx === idx ? 'bg-surface-container-high scale-[1.02] shadow-lg' : 'bg-surface-container-low hover:bg-surface-container-high'
                  }`}
                >
                  {!isDone && (
                    <GripVertical className="w-4 h-4 text-on-surface-variant/30 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                  )}
                  {isDone ? (
                    <div className="w-5 h-5 rounded bg-primary flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleComplete(task.id, e)}
                      className="w-5 h-5 rounded border-2 border-outline-variant flex items-center justify-center hover:border-primary flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-semibold truncate ${isDone ? 'text-on-surface-variant line-through' : 'text-foreground'}`}>
                      {task.title}
                    </h4>
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
          </div>
        )}
      </div>

      <FAB onClick={() => setCaptureOpen(true)} />
      <BottomNav />
      <TaskCaptureModal open={captureOpen} onClose={() => setCaptureOpen(false)} />
      <TaskDetailModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
      <FullscreenTimer task={timerTask} open={!!timerTask} onClose={() => setTimerTask(null)} />
    </div>
  );
};

export default DashboardPage;
