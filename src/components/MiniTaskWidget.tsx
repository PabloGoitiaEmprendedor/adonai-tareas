import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTasks } from '@/hooks/useTasks';
import { useFolders } from '@/hooks/useFolders';
import { format, parseISO, addMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { Flame, X, Folder, Link as LinkIcon, Paperclip, GripHorizontal, ChevronsUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePriorityColors } from '@/hooks/usePriorityColors';
import AdonaiCalendarView from '@/components/calendar/AdonaiCalendarView';
import { TaskCheckbox } from '@/components/TaskCheckbox';
import { compareTasksWithinQuadrants, getTaskManualOrderGroupKey } from '@/lib/taskOrdering';

interface MiniTaskWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MiniTaskWidget = ({ isOpen, onClose }: MiniTaskWidgetProps) => {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const today = format(selectedDate, 'yyyy-MM-dd');
  const { tasks, updateTask } = useTasks({ date: today });
  const { folders } = useFolders();
  const { colors: priorityColors } = usePriorityColors();
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showFolderBar, setShowFolderBar] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [orderedTasks, setOrderedTasks] = useState<any[]>([]);
  const [reorderIdx, setReorderIdx] = useState<number | null>(null);
  const calendarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const TIME_PREFIX_REGEX = /^\[T:(\d{2}:\d{2})-(\d{2}:\d{2})\]/;
  const parseTimeFromDescription = (desc: string | null) => {
    if (!desc) return null;
    const match = desc.match(TIME_PREFIX_REGEX);
    if (!match) return null;
    return { start: match[1], end: match[2] };
  };

  const buildCalendarEvent = useCallback((task: any) => {
    const parsed = parseTimeFromDescription(task.description);
    const dateStr = task.due_date || format(selectedDate, 'yyyy-MM-dd');
    const startTime = parsed
      ? parseISO(`${dateStr}T${parsed.start}:00`)
      : parseISO(`${dateStr}T08:00:00`);
    const endTime = parsed
      ? parseISO(`${dateStr}T${parsed.end}:00`)
      : addMinutes(startTime, 30);

    let color = priorityColors.p4;
    if (task.urgency && task.importance) color = priorityColors.p1;
    else if (task.urgency && !task.importance) color = priorityColors.p2;
    else if (!task.urgency && task.importance) color = priorityColors.p3;

    return {
      id: task.id,
      title: task.title,
      startTime,
      endTime,
      color: color === 'transparent' ? 'var(--primary)' : color,
      isAllDay: false,
    };
  }, [priorityColors, selectedDate]);

  const dispatchExternalDragStart = useCallback((task: any, x: number, y: number) => {
    window.dispatchEvent(new CustomEvent('adonai:external-drag-start', {
      detail: { task: buildCalendarEvent(task), x, y }
    }));
  }, [buildCalendarEvent]);

  const dispatchExternalDragMove = useCallback((x: number, y: number) => {
    window.dispatchEvent(new CustomEvent('adonai:external-drag-move', {
      detail: { x, y }
    }));
  }, []);

  const dispatchExternalDragEnd = useCallback(() => {
    window.dispatchEvent(new CustomEvent('adonai:external-drag-end'));
  }, []);

  const filteredTasks = useMemo(() => {
    if (!selectedFolderId) return tasks;
    return tasks.filter((t: any) => t.folder_id === selectedFolderId);
  }, [tasks, selectedFolderId]);

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort(compareTasksWithinQuadrants);
  }, [filteredTasks]);

  useEffect(() => {
    setOrderedTasks(sortedTasks);
  }, [sortedTasks]);

  const persistMiniWidgetOrder = useCallback((nextOrder: any[]) => {
    nextOrder.forEach((task, idx) => {
      if (task.status !== 'done' && (task.sort_order ?? 0) !== idx) {
        updateTask.mutate({ id: task.id, sort_order: idx });
      }
    });
  }, [updateTask]);

  const handleReorderStart = useCallback((idx: number) => {
    if (orderedTasks[idx]?.status === 'done') return;
    setReorderIdx(idx);
  }, [orderedTasks]);

  const handleReorderOver = useCallback((event: React.DragEvent, idx: number) => {
    event.preventDefault();
    if (reorderIdx === null || reorderIdx === idx) return;
    const dragged = orderedTasks[reorderIdx];
    const target = orderedTasks[idx];
    if (!dragged || !target || dragged.status === 'done' || target.status === 'done') return;
    if (getTaskManualOrderGroupKey(dragged) !== getTaskManualOrderGroupKey(target)) return;

    const next = [...orderedTasks];
    const [moved] = next.splice(reorderIdx, 1);
    next.splice(idx, 0, moved);
    setOrderedTasks(next);
    setReorderIdx(idx);
  }, [orderedTasks, reorderIdx]);

  const handleReorderEnd = useCallback(() => {
    if (reorderIdx !== null) persistMiniWidgetOrder(orderedTasks);
    setReorderIdx(null);
  }, [orderedTasks, persistMiniWidgetOrder, reorderIdx]);

  const completedCount = filteredTasks.filter((t: any) => t.status === 'done').length;
  const totalCount = filteredTasks.length;

  const handleToggle = (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const isDone = task.status === 'done';
    if (isDone) {
      updateTask.mutate({ id: task.id, status: 'pending', completed_at: null });
    } else {
      setCompletingId(task.id);
      setTimeout(() => {
        updateTask.mutate(
          { id: task.id, status: 'done', completed_at: new Date().toISOString() },
          { onSettled: () => setCompletingId(null) }
        );
      }, 400);
    }
  };

  const handleCalendarEnter = useCallback(() => {
    if (calendarTimerRef.current) clearTimeout(calendarTimerRef.current);
    setCalendarOpen(true);
  }, []);

  const handleCalendarLeave = useCallback(() => {
    calendarTimerRef.current = setTimeout(() => {
      setCalendarOpen(false);
    }, 400);
  }, []);

  const handleTaskMouseDown = useCallback((e: React.MouseEvent, task: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (!calendarOpen) setCalendarOpen(true);

    const startX = e.clientX;
    const startY = e.clientY;
    let dragging = false;

    const onMove = (ev: MouseEvent) => {
      if (!dragging && (Math.abs(ev.clientX - startX) > 5 || Math.abs(ev.clientY - startY) > 5)) {
        dragging = true;
        dispatchExternalDragStart(task, startX, startY);
      }
      if (dragging) {
        dispatchExternalDragMove(ev.clientX, ev.clientY);
      }
    };

    const onUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (dragging) {
        dispatchExternalDragMove(ev.clientX, ev.clientY);
        dispatchExternalDragEnd();
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [calendarOpen, dispatchExternalDragEnd, dispatchExternalDragMove, dispatchExternalDragStart]);

  const handleTaskTouchStart = useCallback((e: React.TouchEvent, task: any) => {
    const touch = e.touches[0];
    if (!touch) return;
    if (!calendarOpen) setCalendarOpen(true);

    const startX = touch.clientX;
    const startY = touch.clientY;
    let dragging = false;
    let longPressTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      dragging = true;
      dispatchExternalDragStart(task, startX, startY);
      if ('vibrate' in navigator) navigator.vibrate(30);
    }, 220);

    const onMove = (ev: TouchEvent) => {
      const currentTouch = ev.touches[0];
      if (!currentTouch) return;

      if (!dragging) {
        const moveX = Math.abs(currentTouch.clientX - startX);
        const moveY = Math.abs(currentTouch.clientY - startY);
        if (moveX > 10 || moveY > 10) {
          if (longPressTimer) clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        return;
      }

      if (ev.cancelable) ev.preventDefault();
      dispatchExternalDragMove(currentTouch.clientX, currentTouch.clientY);
    };

    const onEnd = (ev: TouchEvent) => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
      if (longPressTimer) clearTimeout(longPressTimer);
      if (dragging) {
        const endTouch = ev.changedTouches[0];
        if (endTouch) dispatchExternalDragMove(endTouch.clientX, endTouch.clientY);
        dispatchExternalDragEnd();
      }
    };

    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
  }, [calendarOpen, dispatchExternalDragEnd, dispatchExternalDragMove, dispatchExternalDragStart]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed bottom-6 right-6 z-[9999]"
      style={{ width: calendarOpen ? 980 : 380, height: calendarOpen ? 680 : 580 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex h-full bg-background border border-outline-variant/20 rounded-[32px] shadow-2xl overflow-hidden">
        {/* Left panel: tasks */}
        <div className="flex flex-col flex-shrink-0 h-full" style={{ width: 380 }} data-sidebar-droptarget="true">
      {/* Header & Folders */}
      <div className="flex flex-col bg-background/95 backdrop-blur-md border-b border-outline-variant/10">
        <div className="w-12 h-1.5 bg-on-surface-variant/10 rounded-full mx-auto mt-3 mb-2" />
        
        <div className="px-5 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Flame className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground leading-none block">
                Mi Día
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">
                {format(selectedDate, "EEEE d MMMM", { locale: es })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFolderBar(!showFolderBar)}
              className={`p-2.5 rounded-2xl transition-colors ${showFolderBar ? 'bg-primary/10 text-primary' : 'text-on-surface-variant/40 hover:text-foreground hover:bg-surface-container'}`}
            >
              <Folder className="w-5 h-5" />
            </button>
            <button 
              onClick={onClose}
              className="p-2.5 hover:bg-surface-container rounded-2xl transition-colors text-on-surface-variant/40 hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Folder Pills - Horizontal Scroll */}
        <AnimatePresence>
          {showFolderBar && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div 
                ref={scrollRef}
                className="px-5 pb-4 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth"
              >
                <button
                  onClick={() => setSelectedFolderId(null)}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    !selectedFolderId 
                      ? 'bg-foreground text-background shadow-lg shadow-foreground/10' 
                      : 'bg-surface-container text-on-surface-variant/60 hover:text-foreground hover:bg-surface-container-high'
                  }`}
                >
                  General
                </button>
                
                {folders.map((folder: any) => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      selectedFolderId === folder.id
                        ? 'bg-foreground text-background shadow-lg shadow-foreground/10'
                        : 'bg-surface-container text-on-surface-variant/60 hover:text-foreground hover:bg-surface-container-high'
                    }`}
                  >
                    <Folder className={`w-3.5 h-3.5 ${selectedFolderId === folder.id ? 'text-background' : ''}`} style={{ color: selectedFolderId === folder.id ? undefined : folder.color }} />
                    {folder.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="h-1 bg-outline-variant/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / totalCount) * 100}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="h-full bg-primary"
            />
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-2.5 custom-scrollbar bg-surface/30 focus:outline-none focus:ring-2 focus:ring-primary/20" data-sidebar-droptarget="true" tabIndex={0}>
        {sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-[24px] bg-surface-container flex items-center justify-center mb-4">
              <span className="text-2xl">✨</span>
            </div>
            <p className="text-sm font-black text-foreground">¡Todo en orden!</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 mt-1">
              {selectedFolderId ? 'No hay tareas en esta carpeta' : 'No hay tareas para hoy'}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {orderedTasks.map((task: any, idx: number) => {
              const isDone = task.status === 'done';
              const isCompleting = completingId === task.id;

              const taskPriorityColor = (() => {
                if (task.urgency && task.importance) return priorityColors.p1;
                if (task.urgency && !task.importance) return priorityColors.p2;
                if (!task.urgency && task.importance) return priorityColors.p3;
                return priorityColors.p4;
              })();

              const folder = folders.find((f: any) => f.id === task.folder_id);

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: isCompleting ? 0.3 : 1,
                    y: 0,
                    scale: isCompleting ? 0.98 : 1,
                  }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  draggable={!isDone}
                  onDragStart={() => handleReorderStart(idx)}
                  onDragOver={(event) => handleReorderOver(event, idx)}
                  onDragEnd={handleReorderEnd}
                  onClick={(e) => handleToggle(task, e)}
                  className={`group flex items-center gap-4 px-4 py-4 rounded-[24px] cursor-pointer transition-all border ${
                    isDone
                      ? 'bg-transparent border-transparent opacity-40'
                      : 'bg-background border-outline-variant/10 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5'
                  }`}
                >
                  {!isDone && !isCompleting ? (
                    <div
                      title="Arrastra para ordenar"
                      aria-label="Arrastra para ordenar"
                      onClick={(e) => e.stopPropagation()}
                      className="flex h-8 w-5 flex-shrink-0 items-center justify-center rounded-lg text-on-surface-variant/30 transition-all group-hover:text-primary group-hover:opacity-100 cursor-grab active:cursor-grabbing"
                    >
                      <ChevronsUpDown className="h-4 w-4" strokeWidth={1.8} />
                    </div>
                  ) : (
                    <div className="w-5 flex-shrink-0" />
                  )}

                  <div className="flex-shrink-0">
                    <motion.div
                      initial={isDone || isCompleting ? { scale: 0, rotate: -45 } : false}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <TaskCheckbox
                        checked={isDone || isCompleting}
                        priorityColor={taskPriorityColor}
                        size="md"
                      />
                    </motion.div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <span
                      className={`block text-sm font-semibold tracking-normal leading-snug transition-all ${
                        isDone || isCompleting
                          ? 'text-on-surface-variant line-through'
                          : 'text-foreground'
                      }`}
                    >
                      {task.title}
                    </span>
                    {!isDone && !isCompleting && folder && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Folder 
                          className="w-3 h-3" 
                          style={{ color: folder.color }} 
                        />
                        <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">
                          {folder.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Link icons (Clips) */}
                  {!isDone && !isCompleting && task.link && (
                    <div className="flex items-center gap-1 ml-auto">
                      {task.link.split(/\s+/).filter(Boolean).map((url: string, i: number) => {
                        const href = url.startsWith('http') ? url : `https://${url}`;
                        return (
                          <a
                            key={i}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="w-8 h-8 rounded-xl flex items-center justify-center bg-surface-container/50 border border-outline-variant/10 hover:bg-primary/10 hover:text-primary transition-all text-on-surface-variant/40"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                          </a>
                        );
                      })}
                    </div>
                  )}

                  {!isDone && !isCompleting && (
                    <button
                      type="button"
                      title="Arrastrar al calendario"
                      onMouseDown={(e) => handleTaskMouseDown(e, task)}
                      onTouchStart={(e) => handleTaskTouchStart(e, task)}
                      onClick={(e) => e.stopPropagation()}
                      className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant/25 opacity-0 transition-all hover:bg-primary/10 hover:text-primary hover:opacity-100 group-hover:opacity-60 active:scale-95 cursor-grab active:cursor-grabbing touch-none focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <GripHorizontal className="h-3.5 w-3.5" />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {/* All done celebration */}
        {totalCount > 0 && completedCount === totalCount && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 rounded-[32px] bg-primary/5 border border-primary/10 text-center"
          >
            <span className="text-3xl block mb-2">✨</span>
            <p className="text-sm font-black text-primary uppercase tracking-widest">¡Objetivo Logrado!</p>
            <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mt-1">Has completado todas las tareas de esta sección.</p>
          </motion.div>
        )}
      </div>
        </div>

        {/* Hot zone / calendar toggle */}
        <div
          onMouseEnter={handleCalendarEnter}
          onMouseLeave={handleCalendarLeave}
          className="relative flex-shrink-0 w-4 cursor-pointer flex items-center justify-center hover:bg-primary/5 transition-colors"
        >
          <div className="w-0.5 h-8 rounded-full bg-outline-variant/20 group-hover:bg-primary/30 transition-colors" />
        </div>

        {/* Right panel: day calendar */}
        <AnimatePresence>
        {calendarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 600, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="border-l border-outline-variant/10 overflow-hidden flex-shrink-0"
              onMouseEnter={handleCalendarEnter}
              onMouseLeave={handleCalendarLeave}
            >
              <div className="w-[600px] h-full min-h-0 overflow-hidden">
                <AdonaiCalendarView
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  viewMode="day"
                  dragDisabled={false}
                  className="h-full min-h-0 overflow-hidden"
                  hideSidebar
                  fillHeight
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>,
    document.body
  );
};

export default MiniTaskWidget;
