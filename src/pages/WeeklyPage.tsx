import { useState, useEffect, useCallback, useRef } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useProfile } from '@/hooks/useProfile';
import { useGlobalVoiceCapture } from '@/hooks/useGlobalVoiceCapture';
import { format, startOfWeek, addDays, subDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarSearch as CalendarIcon, Check, GripVertical, Timer, Plus, Link as LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { triggerTaskCelebration, triggerDailyCelebration, triggerOnTimeCelebration } from '@/lib/celebrations';
import FAB from '@/components/FAB';
import TaskCaptureModal, { type TaskCaptureModalHandle } from '@/components/TaskCaptureModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import FullscreenTimer from '@/components/FullscreenTimer';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { AISchedulerModal } from '@/components/AISchedulerModal';
import SubtasksSection from '@/components/SubtasksSection';
import { TaskCard } from '@/components/TaskCard';
import { Sparkles } from 'lucide-react';
import { EventManager } from '@/components/ui/event-manager';

const WeeklyPage = () => {
  const [captureOpen, setCaptureOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [timerTask, setTimerTask] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const captureModalRef = useRef<TaskCaptureModalHandle>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [view, setView] = useState<'list' | 'calendar'>('list');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const weekStart = startOfWeek(selectedDay, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const startDate = format(weekStart, 'yyyy-MM-dd');
  const endDate = format(weekEnd, 'yyyy-MM-dd');

  const { tasks, updateTask } = useTasks({ startDate, endDate });
  const { goals } = useGoals();
  const { profile } = useProfile();

  const openCapture = useCallback(() => setCaptureOpen(true), []);
  const openCaptureInVoiceMode = useCallback(() => {
    captureModalRef.current?.openInVoiceMode();
    setCaptureOpen(true);
  }, []);
  useGlobalVoiceCapture(captureModalRef, openCapture);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const getDayStatusLabel = (date: Date) => {
    if (isSameDay(date, today)) return 'Hoy';
    if (isSameDay(date, addDays(today, 1))) return 'Mañana';
    if (isSameDay(date, subDays(today, 1))) return 'Ayer';
    
    return format(date, 'EEEE d MMM', { locale: es });
  };

  const handleSelectDate = (date: Date | undefined) => {
    if (date) {
      setViewDate(date);
      setSelectedDay(date);
    }
  };

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const getTasksForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return tasks.filter((t) => t.due_date === dateStr);
  };

  const weeklyData = days.map((d) => {
    const dayTasks = getTasksForDay(d);
    const completed = dayTasks.filter((t) => t.status === 'done').length;
    const total = dayTasks.length;
    return { date: d, completed, total, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
  });

  const totalCompleted = tasks.filter((t) => t.status === 'done').length;
  const totalPlanned = tasks.length;

  const selectedDayTasks = getTasksForDay(selectedDay);
  const [orderedTasks, setOrderedTasks] = useState<any[]>([]);

  useEffect(() => {
    const quadrantRank = (t: any) =>
      t.urgency && t.importance ? 0
      : t.urgency ? 1
      : t.importance ? 2
      : 3;
    const sorted = [...selectedDayTasks].sort((a, b) => {
      const doneA = a.status === 'done' ? 1 : 0;
      const doneB = b.status === 'done' ? 1 : 0;
      if (doneA !== doneB) return doneA - doneB;
      const rankDiff = quadrantRank(a) - quadrantRank(b);
      if (rankDiff !== 0) return rankDiff;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });

    setOrderedTasks((prev) => {
      const newIds = sorted.map(t => t.id).join(',');
      const prevIds = prev.map(t => t.id).join(',');
      if (newIds === prevIds && prev.length > 0) return prev;
      return sorted;
    });
  }, [tasks, selectedDay]);

  const [dragIdx, setDragIdx] = useState<number | null>(null);
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

  const handleComplete = (task: any) => {
    setCompletingTaskId(task.id);

    // If this task had an active timer, close it
    const hadActiveTimer = timerTask?.id === task.id;
    if (hadActiveTimer) {
      setTimerTask(null);
    }

    setTimeout(() => {
      const remainingTasks = selectedDayTasks.filter((t: any) => t.status !== 'done' && t.id !== task.id);
      const isLastTask = selectedDayTasks.length > 0 && remainingTasks.length === 0;

      updateTask.mutate({ 
        id: task.id, 
        status: 'done', 
        completed_at: new Date().toISOString() 
      }, {
        onSuccess: () => {
          setCompletingTaskId(null);
          if (isLastTask) {
            triggerDailyCelebration(profile?.name);
          } else if (hadActiveTimer) {
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

  // TaskCard component replaces inline rendering

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20 flex flex-col">
      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-6 pt-8 pb-32">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-black font-headline tracking-tight text-foreground">
            Planificación
          </h1>
          <div className="flex gap-3">
             <Button 
                onClick={() => setAiModalOpen(true)} 
                variant="outline" 
                size="sm" 
                className="h-11 px-6 gap-3 rounded-[22px] border-primary/10 bg-surface-container hover:bg-surface-container-high text-foreground font-black transition-all"
              >
                <Sparkles className="w-4 h-4 text-primary" />
                <span>IA Planner</span>
              </Button>
          </div>
        </header>

        <div className="flex-1 min-h-0 bg-surface-container-low rounded-[40px] border border-outline-variant/10 overflow-hidden shadow-2xl">
          <EventManager 
            events={tasks.map(t => ({
              id: t.id,
              title: t.title,
              description: t.description || '',
              startTime: new Date(t.due_date + 'T09:00:00'),
              endTime: new Date(t.due_date + 'T10:00:00'),
              color: t.priority === 'high' ? 'red' : t.priority === 'medium' ? 'orange' : 'blue',
              category: 'Tarea'
            }))}
            onEventClick={(event) => {
              const task = tasks.find(t => t.id === event.id);
              if (task) setSelectedTask(task);
            }}
            className="h-full"
          />
        </div>
      </div>

      <FAB 
        onTextClick={() => setCaptureOpen(true)} 
        onVoiceClick={openCaptureInVoiceMode} 
      />
      <TaskCaptureModal 
        ref={captureModalRef} 
        open={captureOpen} 
        onClose={() => setCaptureOpen(false)} 
        creationSource="fab"
      />
      <TaskDetailModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
      <FullscreenTimer task={timerTask} open={!!timerTask} onClose={() => setTimerTask(null)} />
      <AISchedulerModal 
        open={aiModalOpen} 
        onClose={() => setAiModalOpen(false)} 
        selectedDate={selectedDay} 
      />
    </div>
  );
};

export default WeeklyPage;
