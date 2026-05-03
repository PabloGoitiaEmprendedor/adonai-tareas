import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useSubtasks } from '@/hooks/useSubtasks';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, MoreHorizontal, ChevronRight, Clock, Pause, Plus, Mic, Repeat, Link as LinkIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TaskCaptureModal from '@/components/TaskCaptureModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import QuickRecurrenceFlow from '@/components/QuickRecurrenceFlow';
import { useGamification } from '@/hooks/useGamification';
import { triggerTaskCelebration, triggerDailyCelebration, triggerOnTimeCelebration } from '@/lib/celebrations';
import { usePriorityColors } from '@/hooks/usePriorityColors';
import { useProfile } from '@/hooks/useProfile';

interface MiniTaskWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

const C = {
  bg: 'hsl(var(--background))',
  border: 'hsl(var(--outline-variant))',
  text: 'hsl(var(--foreground))',
  muted: 'hsl(var(--on-surface-variant))',
  accent: 'hsl(var(--primary))',
  accentBg: 'hsl(var(--primary-container))',
  taskBg: 'hsl(var(--surface-container-low))',
  taskBorder: 'hsl(var(--outline-variant))',
  subBg: 'hsl(var(--surface-container-lowest))',
};

function formatTimer(seconds: number): string {
  const isNegative = seconds < 0;
  const absS = Math.abs(seconds);
  const m = Math.floor(absS / 60);
  const s = absS % 60;
  return `${isNegative ? '-' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const SubtaskRow = memo(({ sub, onToggle, onUpdate }: { sub: any; onToggle: (sub: any) => void; onUpdate: (title: string) => void }) => {
  const isDone = sub.status === 'done';
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(sub.title);

  const submitEdit = () => {
    setIsEditing(false);
    if (draftTitle.trim() && draftTitle.trim() !== sub.title) {
      onUpdate(draftTitle.trim());
    } else {
      setDraftTitle(sub.title);
    }
  };

  return (
    <div onClick={() => onToggle(sub)} className="flex items-center gap-2 py-1.5 pl-7 pr-2 rounded-lg cursor-pointer hover:bg-surface-container-low transition-colors" style={{ opacity: isDone ? 0.45 : 1 }}>
      <div onClick={(e) => { e.stopPropagation(); onToggle(sub); }} className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isDone ? 'bg-primary border-primary' : 'border-outline-variant'}`}>
        {isDone && <Check className="w-3 h-3 text-primary-foreground stroke-[3]" />}
      </div>
      {isEditing ? (
        <input
          autoFocus
          value={draftTitle}
          onChange={e => setDraftTitle(e.target.value)}
          onBlur={submitEdit}
          onKeyDown={e => e.key === 'Enter' && submitEdit()}
          onClick={e => e.stopPropagation()}
          className="flex-1 text-xs font-medium bg-transparent border-b border-primary outline-none p-0 text-foreground"
        />
      ) : (
        <span 
          onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
          className={`flex-1 text-xs font-medium ${isDone ? 'text-on-surface-variant line-through' : 'text-foreground'}`}
        >
          {sub.title}
        </span>
      )}
    </div>
  );
});

const TaskRow = memo(({ task, onToggle, onDetail, activeTimerId, onTimerToggle, updateTask }: any) => {
  const isDone = task.status === 'done';
  const [open, setOpen] = useState(false);
  const { subtasks, toggleSubtask, updateSubtask } = useSubtasks(task.id);
  const hasSubtasks = subtasks.length > 0;
  const doneSubCount = subtasks.filter((s: any) => s.status === 'done').length;
  const isTimerActive = activeTimerId === task.id;
  const { colors: priorityColors } = usePriorityColors();

  const getPriorityColor = () => {
    if (task.urgency && task.importance) return priorityColors.p1;
    if (task.urgency && !task.importance) return priorityColors.p2;
    if (!task.urgency && task.importance) return priorityColors.p3;
    return priorityColors.p4;
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-1">
      <div 
        onClick={() => onDetail(task)}
        className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border ${
          isDone ? 'bg-transparent border-transparent opacity-50' : isTimerActive ? 'bg-primary-container border-primary' : 'bg-surface-container-low border-outline-variant/10'
        }`}
      >
        <div 
          onClick={(e) => { e.stopPropagation(); onToggle(task); }} 
          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${isDone ? 'bg-primary border-primary' : 'border-2 border-outline'}`}
        >
          {isDone && <Check className="w-3.5 h-3.5 text-primary-foreground stroke-[3]" />}
        </div>

        <div className="flex-1 flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getPriorityColor() }} />
            <span className={`text-[13px] font-bold leading-tight ${isDone ? 'text-on-surface-variant line-through' : 'text-foreground'}`}>
              {task.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!isDone && (
            <button
              onClick={(e) => { e.stopPropagation(); onTimerToggle(task.id, task.estimated_minutes || 30); }}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                isTimerActive ? 'bg-primary/20 text-primary border border-primary/30' : 'text-on-surface-variant/40 hover:text-on-surface-variant/60'
              }`}
            >
              {isTimerActive ? <Pause className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            </button>
          )}
          {hasSubtasks && (
            <div 
              onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }} 
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 text-[10px] font-black text-primary"
            >
              {doneSubCount}/{subtasks.length}
              <span className={`text-[14px] font-black transition-transform ${open ? 'rotate-45' : ''}`}>
                +
              </span>
            </div>
          )}
        </div>
      </div>
      <AnimatePresence>
        {open && hasSubtasks && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            {subtasks.map((sub: any) => (
              <SubtaskRow key={sub.id} sub={sub}
                onToggle={(s) => toggleSubtask.mutate({ id: s.id, done: s.status !== 'done' })}
                onUpdate={(title) => updateSubtask.mutate({ id: sub.id, title })} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

const MiniTaskWidget = ({ isOpen, onClose }: MiniTaskWidgetProps) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const today = format(new Date(), 'yyyy-MM-dd');
  const { tasks, updateTask, isLoading } = useTasks({ date: today });
  const { checkAndUnlock } = useGamification();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [completingId, setCompletingId] = useState<string | null>(null);
  
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState<'text' | 'voice'>('text');
  const [captureCreationSource, setCaptureCreationSource] = useState<'mini_plus' | 'mini_voice'>('mini_plus');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [recurrenceFlowOpen, setRecurrenceFlowOpen] = useState(false);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartRef = useRef<number>(0);

  const handleTimerToggle = useCallback((taskId: string, estimatedMinutes: number = 30) => {
    if (activeTimerId) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      const activeTask = tasks.find((t: any) => t.id === activeTimerId);
      if (activeTask) {
        const sessionElapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
        const newTotal = (activeTask.actual_duration_seconds || 0) + sessionElapsed;
        updateTask.mutate({ id: activeTimerId, actual_duration_seconds: newTotal });
      }
      const wasSameTask = activeTimerId === taskId;
      setActiveTimerId(null);
      setTimerSeconds(0);
      if (wasSameTask) return;
    }

    const targetTask = tasks.find((t: any) => t.id === taskId);
    if (!targetTask) return;
    setActiveTimerId(taskId);
    sessionStartRef.current = Date.now();
    const initialDisplay = (estimatedMinutes * 60) - (targetTask.actual_duration_seconds || 0);
    setTimerSeconds(initialDisplay);
    timerRef.current = setInterval(() => setTimerSeconds(s => s - 1), 1000);
  }, [activeTimerId, tasks, updateTask]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a: any, b: any) => {
      const doneA = a.status === 'done' ? 1 : 0;
      const doneB = b.status === 'done' ? 1 : 0;
      if (doneA !== doneB) return doneA - doneB;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
  }, [tasks]);

  const completedCount = tasks.filter((t: any) => t.status === 'done').length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleToggle = useCallback((task: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const userName = profile?.name || 'Emprendedor';
    if (task.status === 'done') {
      updateTask.mutate({ id: task.id, status: 'pending', completed_at: null });
    } else {
      setCompletingId(task.id);
      let finalDuration = task.actual_duration_seconds || 0;
      if (activeTimerId === task.id) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        finalDuration += Math.floor((Date.now() - sessionStartRef.current) / 1000);
        setActiveTimerId(null);
        setTimerSeconds(0);
      }
      const estimatedSeconds = (task.estimated_minutes || 0) * 60;
      const isOnTime = estimatedSeconds > 0 && finalDuration <= estimatedSeconds;

      setTimeout(() => {
        const remainingTasks = tasks.filter((t: any) => t.status !== 'done' && t.id !== task.id);
        const isLastTask = tasks.length > 0 && remainingTasks.length === 0;
        updateTask.mutate(
          { id: task.id, status: 'done', completed_at: new Date().toISOString(), actual_duration_seconds: finalDuration },
          { onSuccess: () => {
            setCompletingId(null);
            checkAndUnlock.mutate({ type: 'task_completed' });
            if (isLastTask) triggerDailyCelebration(userName);
            else if (isOnTime) triggerOnTimeCelebration(task.title, userName);
            else triggerTaskCelebration(task.title, userName);
          }}
        );
      }, 350);
    }
  }, [updateTask, tasks, checkAndUnlock, profile?.name, activeTimerId]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[9999] font-inter">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.div
            key="pill"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={() => setIsExpanded(true)}
            className={`h-12 rounded-full bg-background border flex items-center justify-center gap-3 px-4 shadow-2xl cursor-pointer hover:bg-surface-container-low transition-all ${
              activeTimerId ? 'min-w-[140px] border-primary/30' : 'w-12 border-outline-variant/30'
            }`}
          >
            {activeTimerId ? (
              <>
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-black text-primary font-mono tracking-wider">
                  {formatTimer(timerSeconds)}
                </span>
              </>
            ) : (
              <MoreHorizontal className="w-6 h-6 text-on-surface-variant/50" />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.95, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-[340px] max-h-[520px] bg-background border border-outline-variant/20 rounded-[24px] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  onClick={() => setIsExpanded(false)}
                  className="h-7 px-2 bg-surface-container rounded-full flex items-center justify-center gap-1 cursor-pointer border border-outline-variant/30 hover:bg-surface-container-high transition-all"
                >
                  {activeTimerId ? (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="text-[10px] font-black text-primary font-mono">{formatTimer(timerSeconds)}</span>
                    </>
                  ) : (
                    <MoreHorizontal className="w-4 h-4 text-on-surface-variant/50" />
                  )}
                </div>
                
                <button
                  onClick={() => { setCaptureMode('voice'); setCaptureCreationSource('mini_voice'); setCaptureOpen(true); }}
                  className="w-8 h-7 bg-primary rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <Mic className="w-3.5 h-3.5 text-primary-foreground" />
                </button>
                <button
                  onClick={() => setRecurrenceFlowOpen(true)}
                  className="w-8 h-7 bg-surface-container rounded-full flex items-center justify-center border border-outline-variant/30 hover:bg-surface-container-high transition-all"
                >
                  <Repeat className="w-3.5 h-3.5 text-on-surface-variant/60" />
                </button>
                <button
                  onClick={() => { setCaptureMode('text'); setCaptureCreationSource('mini_plus'); setCaptureOpen(true); }}
                  className="w-8 h-7 bg-surface-container rounded-full flex items-center justify-center border border-outline-variant/30 hover:bg-surface-container-high transition-all"
                >
                  <Plus className="w-4 h-4 text-on-surface-variant/60" />
                </button>
              </div>

              <div className="text-right">
                <div className="text-lg font-black tracking-tight leading-none text-foreground">
                  {format(new Date(), 'h:mm')}
                  <span className="text-[10px] font-bold text-on-surface-variant/40 ml-1 uppercase">{format(new Date(), 'a')}</span>
                </div>
                <div className="text-[9px] font-black text-on-surface-variant/30 uppercase tracking-widest mt-1">
                  {format(new Date(), 'EEE d MMM', { locale: es })}
                </div>
              </div>
            </div>

            {/* Progress */}
            {totalCount > 0 && (
              <div className="h-[3px] bg-surface-container-high mx-4 rounded-full overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-primary"
                />
              </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar min-h-[100px]">
              {isLoading ? (
                <div className="flex justify-center p-8 opacity-20">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : sortedTasks.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-3xl block mb-2">🎉</span>
                  <p className="text-sm font-black text-foreground">¡Día despejado!</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {sortedTasks.map((task: any) => (
                    <TaskRow 
                      key={task.id}
                      task={completingId === task.id ? { ...task, status: 'done' } : task}
                      onToggle={handleToggle}
                      onDetail={(t: any) => { setSelectedTask(t); setDetailOpen(true); }}
                      activeTimerId={activeTimerId}
                      onTimerToggle={handleTimerToggle}
                      updateTask={updateTask}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
            
            {/* Footer / Close */}
            <div className="p-3 bg-surface-container-lowest border-t border-outline-variant/10 flex justify-center">
              <button 
                onClick={onClose}
                className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/30 hover:text-on-surface-variant/60 transition-colors"
              >
                Cerrar Widget
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <TaskCaptureModal
        open={captureOpen}
        onClose={() => setCaptureOpen(false)}
        initialMode={captureMode}
        creationSource={captureCreationSource}
      />
      <TaskDetailModal task={selectedTask} open={detailOpen} onClose={() => setDetailOpen(false)} />
      <QuickRecurrenceFlow open={recurrenceFlowOpen} onClose={() => setRecurrenceFlowOpen(false)} />
    </div>,
    document.body
  );
};

export default MiniTaskWidget;
