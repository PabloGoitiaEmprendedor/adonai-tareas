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
    <div className="min-h-screen bg-background selection:bg-primary/20">
      <div className="max-w-[430px] lg:max-w-4xl mx-auto px-6 pt-8 pb-32 space-y-10">
        
        {/* Header Section */}
        <header className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex justify-between items-end px-1">
            <div className="space-y-1.5">
              <h1 className="text-4xl font-black font-headline tracking-tight text-foreground leading-none">
                Planificación
              </h1>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => setAiModalOpen(true)} 
                variant="outline" 
                size="sm" 
                className="h-11 px-6 gap-3 rounded-[22px] border-primary/20 bg-primary/5 text-foreground font-black hover:bg-primary/10 transition-all group overflow-hidden relative shadow-lg shadow-primary/5 border-2"
              >
                <div className="absolute inset-0 bg-primary/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Sparkles className="w-4 h-4 relative z-10 text-primary" />
                <span className="relative z-10">IA Planner</span>
              </Button>
              
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-11 w-11 rounded-[22px] bg-surface-container-low hover:bg-surface-container-high transition-all shadow-md border border-outline-variant/5">
                    <CalendarIcon className="w-4.5 h-4.5 text-primary" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-[48px] p-10 glass-sheet h-auto border-none shadow-2xl">
                  <div className="space-y-8 max-w-md mx-auto">
                    <SheetHeader className="text-center">
                      <SheetTitle className="text-3xl font-black font-headline text-foreground tracking-tight">Seleccionar Fecha</SheetTitle>
                    </SheetHeader>
                    <div className="flex justify-center bg-surface-container-low p-8 rounded-[40px] border border-outline-variant/10 shadow-inner">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDay}
                        onSelect={handleSelectDate}
                        initialFocus
                        locale={es}
                        className="rounded-[32px]"
                      />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Bento Stats & Day Picker Card */}
          <div className="bg-surface-container-low/80 backdrop-blur-md p-8 rounded-[48px] border border-outline-variant/10 space-y-8 shadow-2xl relative overflow-hidden group transition-all">
            
            <div className="grid grid-cols-7 gap-2 relative z-10">
              {days.map((day, idx) => {
                const isSelected = isSameDay(day, selectedDay);
                const isToday = isSameDay(day, today);
                const data = weeklyData[idx];
                
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDay(day)}
                    className={`flex flex-col items-center gap-3 p-3.5 transition-all relative rounded-[28px] group/day ${
                      isSelected 
                        ? 'bg-primary text-primary-foreground shadow-2xl shadow-primary/40 scale-110 z-10' 
                        : 'hover:bg-surface-container-high hover:scale-[1.05] bg-surface-container/50'
                    }`}
                  >
                    <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected ? 'text-primary-foreground/70' : 'text-on-surface-variant/40'}`}>
                      {dayNames[day.getDay()]}
                    </span>
                    <div className="relative">
                      <span className={`text-lg font-black leading-none ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
                        {format(day, 'd')}
                      </span>
                      {isToday && !isSelected && (
                        <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-primary rounded-full ring-2 ring-surface-container-low" />
                      )}
                    </div>
                    
                    <div className="h-1.5 flex gap-0.5 items-end">
                      {data.total > 0 && (
                        <div className={`w-6 h-1 rounded-full overflow-hidden ${isSelected ? 'bg-primary-foreground/20' : 'bg-outline-variant/20'}`}>
                          <div 
                            className={`h-full transition-all duration-500 ${isSelected ? 'bg-primary-foreground' : 'bg-primary'}`}
                            style={{ width: `${data.pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>


          </div>
        </header>

        <section className="space-y-10">
          <div className="flex justify-between items-center px-2">
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-[22px] bg-surface-container-low flex items-center justify-center shadow-md border border-outline-variant/5">
                 <Timer className="w-6 h-6 text-primary" />
               </div>
               <div className="space-y-0.5">
                 <h2 className="text-3xl font-black font-headline text-foreground tracking-tight">
                   {getDayStatusLabel(selectedDay)}
                 </h2>
                 <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Foco del Día</p>
               </div>
             </div>
          </div>

          {orderedTasks.length === 0 ? (
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
              <Button onClick={openCapture} variant="outline" className="h-14 rounded-[28px] border-2 border-primary text-primary font-black hover:bg-primary hover:text-primary-foreground px-10 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/10">
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
