import { useState, useEffect, useCallback, useRef } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useTasks, useEisenhowerSort } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useStreaks } from '@/hooks/useStreaks';
import { useGlobalVoiceCapture } from '@/hooks/useGlobalVoiceCapture';
import { format } from 'date-fns';
import { Check, Target, Plus, GripVertical, Timer } from 'lucide-react';
import { motion } from 'framer-motion';
import FAB from '@/components/FAB';
import TaskCaptureModal, { type TaskCaptureModalHandle } from '@/components/TaskCaptureModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import FullscreenTimer from '@/components/FullscreenTimer';
import { TUTORIAL_CLOSE_CAPTURE_MODAL_EVENT } from '@/lib/tutorialEvents';

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
  const captureModalRef = useRef<TaskCaptureModalHandle>(null);

  const openCapture = useCallback(() => setCaptureOpen(true), []);
  const openCaptureInVoiceMode = useCallback(() => {
    captureModalRef.current?.openInVoiceMode();
    setCaptureOpen(true);
  }, []);
  useGlobalVoiceCapture(captureModalRef, openCapture);

  useEffect(() => {
    const handleCloseModal = () => setCaptureOpen(false);
    window.addEventListener(TUTORIAL_CLOSE_CAPTURE_MODAL_EVENT, handleCloseModal);
    return () => window.removeEventListener(TUTORIAL_CLOSE_CAPTURE_MODAL_EVENT, handleCloseModal);
  }, []);

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const sorted = useEisenhowerSort(pendingTasks);

  useEffect(() => {
    const quadrantRank = (t: any) =>
      t.urgency && t.importance ? 0
      : t.urgency ? 1
      : t.importance ? 2
      : 3;
    const allTasks = [...tasks].sort((a, b) => {
      const rankDiff = quadrantRank(a) - quadrantRank(b);
      if (rankDiff !== 0) return rankDiff;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
    setOrderedTasks(allTasks);
  }, [tasks]);

  const mainGoal = goals.find((g) => g.id === profile?.main_goal_id);
  
  

  useEffect(() => { trackDayActive.mutate(); }, []);

  const handleComplete = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask.mutate({ id: taskId, status: 'done', completed_at: new Date().toISOString() });
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
    <div className="min-h-screen bg-background">
      <div className="max-w-[430px] lg:max-w-4xl mx-auto px-6 pt-4 pb-24 space-y-6">

        {/* Content starts below the global header */}
        <div className="space-y-1 py-2">
          <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">{getGreeting()}</p>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">
            {profile?.name || 'Emprendedor'}
          </h1>
        </div>


        {mainGoal && (
          <div className="bg-surface-container-low p-4 rounded-lg flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-on-surface-variant text-[10px] font-medium uppercase tracking-wider">Meta activa</p>
              <p className="text-foreground font-semibold">{mainGoal.title}</p>
            </div>
            <Target className="w-5 h-5 text-primary" />
          </div>
        )}


        {orderedTasks.length === 0 ? (
          <div className="bg-surface-container-low p-6 rounded-lg text-center space-y-3">
            <p className="text-on-surface-variant">Tu día está despejado. ¿Qué quieres lograr?</p>
            <button onClick={openCapture} className="inline-flex items-center gap-2 px-4 py-2 rounded-full primary-gradient text-primary-foreground text-sm font-semibold">
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

      <FAB onClick={openCaptureInVoiceMode} />
      <TaskCaptureModal ref={captureModalRef} open={captureOpen} onClose={() => setCaptureOpen(false)} creationSource="fab" />
      <TaskDetailModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
      <FullscreenTimer task={timerTask} open={!!timerTask} onClose={() => setTimerTask(null)} />
    </div>
  );
};

export default DashboardPage;
