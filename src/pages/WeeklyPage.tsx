import { useState, useEffect, useCallback, useRef } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useProfile } from '@/hooks/useProfile';
import { useGlobalVoiceCapture } from '@/hooks/useGlobalVoiceCapture';
import { usePriorityColors } from '@/hooks/usePriorityColors';
import { format, startOfWeek, addDays, subDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarSearch as CalendarIcon, Check, GripVertical, Timer, Plus, Link as LinkIcon, LayoutList, Lock } from 'lucide-react';
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
import AdonaiCalendarView from '@/components/calendar/AdonaiCalendarView';
import QuickRecurrenceFlow from '@/components/QuickRecurrenceFlow';

const WeeklyPage = () => {
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState<'text' | 'voice' | null>(null);
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [timerTask, setTimerTask] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const captureModalRef = useRef<TaskCaptureModalHandle>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [view, setView] = useState<'list' | 'calendar'>('calendar');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // ... rest of state and logic ...

  const weekStart = startOfWeek(selectedDay, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const startDate = format(weekStart, 'yyyy-MM-dd');
  const endDate = format(weekEnd, 'yyyy-MM-dd');

  const { tasks, updateTask } = useTasks({ startDate, endDate });
  const { goals } = useGoals();
  const { profile } = useProfile();

  const openCapture = useCallback(() => {
    setCaptureOpen(true);
    setTimeout(() => {
      captureModalRef.current?.openInTextMode();
    }, 10);
  }, []);

  const openCaptureInVoiceMode = useCallback(() => {
    setCaptureOpen(true);
    setTimeout(() => {
      captureModalRef.current?.openInVoiceMode();
    }, 10);
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
        if ((task.sort_order || 0) !== idx) updateTask.mutate({ id: task.id, status: task.status, sort_order: idx });
      });
    }
    setTouchIdx(null);
  };

  const handleComplete = (task: any) => {
    setCompletingTaskId(task.id);
    const hadActiveTimer = timerTask?.id === task.id;
    if (hadActiveTimer) setTimerTask(null);

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
          if (isLastTask) triggerDailyCelebration(profile?.name);
          else if (hadActiveTimer) triggerOnTimeCelebration(task.title, profile?.name);
          else triggerTaskCelebration(task.title, profile?.name);
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

  const { colors: priorityColors } = usePriorityColors();

  return (
      <div className="max-w-full mx-auto px-4 pt-2 pb-10 space-y-4">
              {/* Sticky Header Container */}
        <div className="bg-background/60 backdrop-blur-3xl pb-4 -mx-6 px-6 pt-4 border-b border-outline-variant/5">
          {/* Source Switcher - Adonai 360 active, Google Coming Soon */}
          <div className="flex justify-center">
            <div className="flex bg-surface-container-high/30 backdrop-blur-2xl rounded-[20px] p-1 border border-outline-variant/5 shadow-xl">
              <button 
                className="px-6 py-2.5 rounded-[16px] text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-300 bg-primary text-primary-foreground shadow-lg"
              >
                Calendario
              </button>
              <div className="relative">
                <button 
                  disabled
                  className="px-6 py-2.5 rounded-[16px] text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-300 text-on-surface-variant/20 cursor-not-allowed flex items-center gap-1.5"
                >
                  <Lock className="w-2.5 h-2.5" />
                  Google
                </button>
                <span className="absolute -top-1.5 -right-1 bg-primary/20 text-primary text-[6px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border border-primary/20">
                  Pronto
                </span>
              </div>
            </div>
          </div>
        </div>

        <section id="weekly-calendar-main" className="space-y-4 pt-2">
          {/* Adonai 360 Calendar — fully interactive, persists to Supabase */}
          <AdonaiCalendarView
            selectedDate={selectedDay}
            onSelectDate={setSelectedDay}
          />
        </section>

        <FAB 
          onTextClick={openCapture} 
          onVoiceClick={openCaptureInVoiceMode} 
          onRecurrenceClick={() => setRecurrenceOpen(true)}
        />
        <QuickRecurrenceFlow 
          open={recurrenceOpen}
          onClose={() => setRecurrenceOpen(false)}
        />
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
