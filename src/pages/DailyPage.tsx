import { useState, useEffect, useCallback } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useProfile } from '@/hooks/useProfile';
import { format, addDays } from 'date-fns';
import { Check, Flag, Plus, Clock, GripVertical, Timer } from 'lucide-react';
import { motion } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import FAB from '@/components/FAB';
import TaskCaptureModal from '@/components/TaskCaptureModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import FullscreenTimer from '@/components/FullscreenTimer';

const DailyPage = () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow'>('today');
  const currentDate = activeTab === 'today' ? today : tomorrow;

  const { tasks, updateTask } = useTasks({ date: currentDate });
  const { goals } = useGoals();
  const { profile } = useProfile();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [timerTask, setTimerTask] = useState<any>(null);
  const [orderedTasks, setOrderedTasks] = useState<any[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    const allTasks = [...tasks].sort((a, b) => {
      const orderA = a.sort_order || 0;
      const orderB = b.sort_order || 0;
      if (orderA !== orderB) return orderA - orderB;
      const scoreA = (a.urgency ? 2 : 0) + (a.importance ? 1 : 0);
      const scoreB = (b.urgency ? 2 : 0) + (b.importance ? 1 : 0);
      return scoreB - scoreA;
    });
    setOrderedTasks(allTasks);
  }, [tasks]);

  const mainGoal = goals.find((g) => g.id === profile?.main_goal_id);
  const completedCount = tasks.filter((t) => t.status === 'done').length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getMotivationalMessage = () => {
    if (activeTab === 'tomorrow') return `${totalCount} tarea${totalCount !== 1 ? 's' : ''} planificada${totalCount !== 1 ? 's' : ''} para mañana`;
    if (completedCount === 0) return 'Empieza tu día con la primera tarea.';
    if (progress < 50) return `Llevas ${completedCount} de ${totalCount}. ¡Sigue!`;
    if (progress < 100) return `Ya vas por el ${progress}%. ¡Cierra el día fuerte!`;
    return '¡Todas las tareas completadas! 🎉';
  };

  const handleComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask.mutate({ id, status: 'done', completed_at: new Date().toISOString() });
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
    <div className="min-h-screen bg-background pb-24 lg:pl-20 lg:pb-6">
      <div className="max-w-[430px] lg:max-w-[800px] mx-auto px-5 pt-6 space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Flag className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs uppercase tracking-widest text-on-surface-variant font-bold">Vista Diaria</span>
          </div>
          {mainGoal && (
            <div className="bg-surface-container-low p-4 rounded-lg">
              <h2 className="text-xl font-bold tracking-tight text-foreground">{mainGoal.title}</h2>
            </div>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex bg-surface-container-low rounded-lg p-0.5">
          <button onClick={() => setActiveTab('today')}
            className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'today' ? 'bg-primary text-primary-foreground' : 'text-on-surface-variant'}`}>
            Hoy
          </button>
          <button onClick={() => setActiveTab('tomorrow')}
            className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'tomorrow' ? 'bg-primary text-primary-foreground' : 'text-on-surface-variant'}`}>
            Mañana
          </button>
        </div>

        {totalCount > 0 && (
          <div>
            <div className="flex justify-between mb-2">
              <p className="text-sm font-medium text-foreground">{getMotivationalMessage()}</p>
              {activeTab === 'today' && <p className="text-xs font-bold text-primary">{progress}%</p>}
            </div>
            {activeTab === 'today' && (
              <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full primary-gradient rounded-full" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        )}

        {orderedTasks.length === 0 ? (
          <div className="bg-surface-container-low p-6 rounded-lg text-center space-y-3">
            <p className="text-on-surface-variant">
              {activeTab === 'today' ? 'Tu día está despejado. ¿Qué quieres lograr?' : 'Planifica tu mañana. Añade tareas para estar listo.'}
            </p>
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
                  {!isDone && <GripVertical className="w-4 h-4 text-on-surface-variant/30 flex-shrink-0 cursor-grab" />}
                  {isDone ? (
                    <div className="w-5 h-5 rounded bg-primary flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  ) : (
                    <button onClick={(e) => handleComplete(task.id, e)}
                      className="w-5 h-5 rounded border-2 border-outline-variant flex items-center justify-center hover:border-primary flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-semibold truncate ${isDone ? 'text-on-surface-variant line-through' : 'text-foreground'}`}>{task.title}</h4>
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

export default DailyPage;
