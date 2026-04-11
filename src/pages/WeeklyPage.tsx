import { useState, useEffect, useCallback, useRef } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useProfile } from '@/hooks/useProfile';
import { useGlobalVoiceCapture } from '@/hooks/useGlobalVoiceCapture';
import { useTimeBlocks } from '@/hooks/useTimeBlocks';
import { format, startOfWeek, addDays, subDays, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp, Calendar as CalendarIcon, Check, GripVertical, Timer, ChevronLeft, ChevronRight, Filter, Clock, Trash2, MoreVertical, Settings, Edit2, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import FAB from '@/components/FAB';
import TaskCaptureModal, { type TaskCaptureModalHandle } from '@/components/TaskCaptureModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import FullscreenTimer from '@/components/FullscreenTimer';
import { TimeBlockModal } from '@/components/TimeBlockModal';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const WeeklyPage = () => {
  const [captureOpen, setCaptureOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [timerTask, setTimerTask] = useState<any>(null);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const captureModalRef = useRef<TaskCaptureModalHandle>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const weekStart = startOfWeek(viewDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const startDate = format(weekStart, 'yyyy-MM-dd');
  const endDate = format(weekEnd, 'yyyy-MM-dd');

  const { tasks, updateTask } = useTasks({ startDate, endDate });
  const { goals } = useGoals();
  const { profile } = useProfile();
  const { timeBlocks, deleteBlock } = useTimeBlocks(format(selectedDay, 'yyyy-MM-dd'));

  const openCapture = useCallback(() => setCaptureOpen(true), []);
  const openCaptureInVoiceMode = useCallback(() => {
    captureModalRef.current?.openInVoiceMode();
    setCaptureOpen(true);
  }, []);
  useGlobalVoiceCapture(captureModalRef, openCapture);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const handlePrevDay = () => setSelectedDay(subDays(selectedDay, 1));
  const handleNextDay = () => setSelectedDay(addDays(selectedDay, 1));
  const handleSelectDate = (date: Date | undefined) => {
    if (date) {
      setViewDate(date);
      setSelectedDay(date);
    }
  };

  const dayNames = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  const getDateLabel = (date: Date) => {
    if (isSameDay(date, today)) return 'Hoy';
    if (isSameDay(date, addDays(today, 1))) return 'Mañana';
    if (isSameDay(date, subDays(today, 1))) return 'Ayer';
    return format(date, 'EEEE', { locale: es });
  };

  const getTasksForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return tasks.filter((t) => t.due_date === dateStr);
  };

  const mainGoal = goals.find((g) => g.id === profile?.main_goal_id);
  const totalCompleted = tasks.filter((t) => t.status === 'done').length;
  const totalPlanned = tasks.length;

  const weeklyData = days.map((d) => {
    const dayTasks = getTasksForDay(d);
    const completed = dayTasks.filter((t) => t.status === 'done').length;
    const total = dayTasks.length;
    return { date: d, completed, total, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
  });

  const weekRange = `${format(weekStart, 'd')} — ${format(addDays(weekStart, 6), 'd MMMM', { locale: es })}`;

  const selectedDayTasks = getTasksForDay(selectedDay);
  const [orderedTasks, setOrderedTasks] = useState<any[]>([]);

  useEffect(() => {
    const sorted = [...selectedDayTasks].sort((a, b) => {
      const orderA = a.sort_order || 0;
      const orderB = b.sort_order || 0;
      if (orderA !== orderB) return orderA - orderB;
      const scoreA = (a.urgency ? 2 : 0) + (a.importance ? 1 : 0);
      const scoreB = (b.urgency ? 2 : 0) + (b.importance ? 1 : 0);
      return scoreB - scoreA;
    });
    setOrderedTasks(sorted);
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

  const handleDropOnBlock = (e: React.DragEvent, blockId: string | null) => {
    e.preventDefault();
    if (dragIdx === null) return;
    
    const task = orderedTasks[dragIdx];
    if (task.time_block_id !== blockId) {
      updateTask.mutate({ id: task.id, time_block_id: blockId });
    }
    setDragIdx(null);
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

  const handleComplete = (taskId: string) => {
    updateTask.mutate({ id: taskId, status: 'done', completed_at: new Date().toISOString() });
  };

  const handleStartTimer = (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setTimerTask(task);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[430px] lg:max-w-4xl mx-auto px-6 pt-4 pb-24 space-y-6">
        <div className="flex justify-between items-center bg-surface-container-low p-2 rounded-2xl border border-outline-variant/10">
          <Sheet>
             <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-surface-container-high transition-all">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                </Button>
             </SheetTrigger>
             <SheetContent side="bottom" className="rounded-t-[32px] p-6 glass-sheet h-auto">
                <div className="space-y-6">
                  <div className="flex justify-between items-center px-2">
                    <h3 className="text-lg font-bold">Seleccionar fecha</h3>
                    <Filter className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex justify-center bg-surface-container px-2 py-4 rounded-[28px]">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDay}
                      onSelect={handleSelectDate}
                      initialFocus
                      locale={es}
                    />
                  </div>
                </div>
             </SheetContent>
          </Sheet>

          <div className="flex-1 overflow-x-auto no-scrollbar py-2">
            <div className="flex gap-2 min-w-max px-2">
              {days.map((day) => {
                const isSelected = isSameDay(day, selectedDay);
                const isToday = isSameDay(day, today);
                const label = getDateLabel(day);
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    className={`flex flex-col items-center min-w-[70px] py-3 px-2 rounded-2xl transition-all duration-300 ${
                      isSelected 
                        ? 'bg-primary text-primary-foreground shadow-lg scale-105' 
                        : isToday 
                          ? 'bg-primary/10 text-primary border border-primary/20' 
                          : 'hover:bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-tighter mb-1">
                      {label === 'Hoy' || label === 'Mañana' || label === 'Ayer' ? label : format(day, 'EEE', { locale: es })}
                    </span>
                    <span className="text-lg font-bold">{format(day, 'd')}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <section className="space-y-3">
          <div className="flex justify-end items-center px-1">
            <Button onClick={() => setBlockModalOpen(true)} variant="outline" size="sm" className="h-8 text-xs px-3 gap-1.5 rounded-xl border-primary/30 text-primary font-bold hover:bg-primary/5 shadow-sm">
               <Plus className="w-3.5 h-3.5" /> Nuevo Bloque
            </Button>
          </div>

          {orderedTasks.length === 0 && timeBlocks.length === 0 ? (
            <div className="bg-surface-container-low p-5 rounded-lg text-center space-y-3">
              <p className="text-on-surface-variant text-sm">Sin tareas para este día.</p>
              <button onClick={openCapture} className="text-primary text-sm font-semibold">+ Añadir tarea</button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Time Blocks Rendering */}
              {timeBlocks.map((block) => {
                const blockTasks = orderedTasks.filter(t => t.time_block_id === block.id);
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
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropOnBlock(e, block.id)}
                    className="rounded-2xl overflow-hidden shadow-sm transition-all"
                    style={{ backgroundColor: `${blockColor}15` }}
                  >
                    <div 
                      className="px-4 py-3 flex items-center justify-between group"
                      style={{ backgroundColor: blockColor, color: '#ffffff' }}
                    >
                      <h3 className="font-bold text-lg tracking-tight flex items-center gap-2">
                        {block.title}
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold bg-black/20 px-2 py-1 rounded-md">
                            <Clock className="w-3 h-3" />
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
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="hover:bg-white/20 p-1.5 rounded-lg transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass-sheet rounded-xl border-outline-variant/30">
                            <DropdownMenuItem 
                              onClick={() => {
                                setEditingBlock(block);
                                setBlockModalOpen(true);
                              }}
                              className="gap-2 font-medium"
                            >
                              <Edit2 className="w-4 h-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                if (confirm('¿Eliminar este bloque de tiempo?')) {
                                  deleteBlock.mutate(block.id);
                                }
                              }}
                              className="gap-2 font-medium text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    <div className="p-3 space-y-2 relative">
                      {/* Time Indicator Line */}
                      {(() => {
                        if (!isSameDay(selectedDay, today)) return null;
                        
                        const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
                        const startMin = timeToMinutes(block.start_time);
                        const endMin = timeToMinutes(block.end_time);
                        
                        if (nowMinutes >= startMin && nowMinutes <= endMin) {
                          const percent = ((nowMinutes - startMin) / (endMin - startMin)) * 100;
                          return (
                            <div 
                              className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
                              style={{ top: `${percent}%` }}
                            >
                              <div className="w-full h-[2px] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                              <div className="absolute -left-1 w-2.5 h-2.5 bg-red-500 rounded-full shadow-lg" />
                              <span className="absolute -left-12 text-[10px] font-bold text-red-500 bg-background/80 px-1 rounded">
                                {format(currentTime, 'HH:mm')}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {blockTasks.length === 0 && (
                        <p className="text-sm p-2 text-foreground/50 italic">Área libre (sin tareas agendadas)</p>
                      )}
                      {blockTasks.map((task, idx) => {
                        const isDone = task.status === 'done';
                        return (
                          <motion.div key={task.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                            draggable={!isDone}
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDragEnd={handleDragEnd}
                            onTouchStart={(e) => !isDone && handleTouchStart(idx, e)}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            onClick={() => setSelectedTask(task)}
                            className={`p-3 rounded-xl flex items-start gap-3 cursor-pointer transition-all border border-black/5 ${
                              isDone ? 'opacity-50 bg-background/40' : dragIdx === idx || touchIdx === idx ? 'bg-surface-container-high scale-[1.02] shadow-lg' : 'bg-background hover:scale-[1.01] shadow-sm'
                            }`}>
                            {!isDone && <GripVertical className="w-4 h-4 text-on-surface-variant/30 flex-shrink-0 cursor-grab mt-1" />}
                            {isDone ? (
                              <div className="w-5 h-5 rounded bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Check className="w-3 h-3 text-primary-foreground" />
                              </div>
                            ) : (
                              <button onClick={(e) => { e.stopPropagation(); handleComplete(task.id); }}
                                className="w-5 h-5 rounded border-2 border-outline-variant flex items-center justify-center hover:border-primary flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0 flex items-center mt-0.5">
                              <h4 className={`text-sm font-semibold break-words ${isDone ? 'text-on-surface-variant line-through' : 'text-foreground'}`}>{task.title}</h4>
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
                  </div>
                );
              })}

              {/* Unscheduled Tasks */}
              <div 
                className="space-y-2 mt-8 min-h-[50px]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropOnBlock(e, null)}
              >
                {orderedTasks.filter(t => !t.time_block_id).length > 0 && (
                  <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider px-2 mb-3">
                    Tareas sin bloque ({orderedTasks.filter(t => !t.time_block_id).length})
                  </h3>
                )}
                {orderedTasks.filter(t => !t.time_block_id).map((task, idx) => {
                  const isDone = task.status === 'done';
                  return (
                    <motion.div key={task.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      draggable={!isDone}
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      onTouchStart={(e) => !isDone && handleTouchStart(idx, e)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onClick={() => setSelectedTask(task)}
                      className={`p-3.5 rounded-xl flex items-start gap-3 cursor-pointer transition-all ${
                        isDone ? 'opacity-50' : dragIdx === idx || touchIdx === idx ? 'bg-surface-container-high scale-[1.02] shadow-lg' : 'bg-surface-container-low hover:bg-surface-container-high shadow-sm'
                      }`}>
                      {!isDone && <GripVertical className="w-4 h-4 text-on-surface-variant/30 flex-shrink-0 cursor-grab mt-0.5" />}
                      {isDone ? (
                        <div className="w-5 h-5 rounded bg-primary flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); handleComplete(task.id); }}
                          className="w-5 h-5 rounded border-2 border-outline-variant flex items-center justify-center hover:border-primary flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0 flex items-center">
                        <h4 className={`text-sm font-semibold break-words ${isDone ? 'text-on-surface-variant line-through' : 'text-foreground'}`}>{task.title}</h4>
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
            </div>
          )}
        </section>

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
      <TimeBlockModal 
        open={blockModalOpen} 
        onClose={() => {
          setBlockModalOpen(false);
          setEditingBlock(null);
        }} 
        selectedDate={selectedDay} 
        block={editingBlock}
      />
    </div>
  );
};

export default WeeklyPage;
