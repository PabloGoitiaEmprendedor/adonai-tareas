import { useState, useEffect, useCallback, useRef } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useProfile } from '@/hooks/useProfile';
import { useGlobalVoiceCapture } from '@/hooks/useGlobalVoiceCapture';
import { format, startOfWeek, addDays, subDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarSearch as CalendarIcon, Check, GripVertical, Timer, Plus, Link as LinkIcon, LayoutList } from 'lucide-react';
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
  const [captureMode, setCaptureMode] = useState<'text' | 'voice' | null>(null);
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [selectedTask, setSelectedTask] = useState<any>(null);
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

  return (
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-32 space-y-10">
        <header className="flex flex-col items-center justify-center space-y-4 px-2 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-[24px] bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
              <CalendarIcon className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <h1 className="text-[32px] font-black font-headline tracking-tight text-foreground leading-none">
                Calendario
              </h1>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                <p className="text-[11px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em]">Vista Mensual</p>
              </div>
            </div>
          </div>
        </header>

        <section className="space-y-10">
          {view === 'calendar' ? (
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
              className="animate-in fade-in zoom-in-95 duration-500"
            />
          ) : orderedTasks.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              className="bg-surface-container-low/50 p-16 rounded-[60px] text-center border-2 border-dashed border-outline-variant/20 space-y-8 shadow-sm backdrop-blur-sm"
            >
              <div className="w-24 h-24 bg-card rounded-[36px] mx-auto flex items-center justify-center shadow-xl border border-outline-variant/10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-primary/5 scale-0 group-hover:scale-150 transition-transform duration-1000 rounded-full" />
                <CalendarIcon className="w-12 h-12 text-outline-variant/40 relative z-10" />
              </div>
              <div className="space-y-3">
                <p className="text-3xl font-black font-headline text-foreground">Hoja en Blanco</p>
                <p className="text-on-surface-variant/60 text-base font-medium max-w-[280px] mx-auto">Toda una jornada para diseñar a tu manera. ¿Por dónde empezamos?</p>
              </div>
              <Button onClick={() => { setCaptureMode('text'); setCaptureOpen(true); }} variant="outline" className="h-14 rounded-[28px] border-2 border-primary text-primary font-black hover:bg-primary hover:text-primary-foreground px-10 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/10">
                + Crear primera tarea
              </Button>
            </motion.div>
          ) : (
            <div className="grid gap-5">
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
                  view="weekly"
                />
              ))}
            </div>
          )}
        </section>

        <FAB 
          onTextClick={openCapture} 
          onVoiceClick={openCaptureInVoiceMode} 
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
