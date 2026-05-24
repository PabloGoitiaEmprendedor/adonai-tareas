import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  ChevronDown,
  Search,
  X,
  Notebook,
  NotebookText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { isSameDay, startOfDay } from 'date-fns';

interface MobileDynamicIslandProps {
  tasks: any[];
  currentDate: Date;
  onAddTask: () => void;
  onTaskClick: (task: any) => void;
  onDragStart?: (e: any, task: any) => void;
  onDragTouchStart?: (e: any, task: any) => void;
  priorityColors: Record<string, string>;
  getPriorityKey: (urgency: boolean, importance: boolean) => string;
  folders?: any[];
}

export const MobileDynamicIsland = ({
  tasks,
  currentDate,
  onAddTask,
  onTaskClick,
  onDragStart,
  onDragTouchStart,
  priorityColors,
  getPriorityKey,
  folders = []
}: MobileDynamicIslandProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'all' | 'shared'>('all');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [draggedTask, setDraggedTask] = useState<any>(null);
  const [isDraggingTask, setIsDraggingTask] = useState(false);
  const draggedTaskRef = useRef<any>(null);
  const dragStarted = useRef(false);

  const startPos = useRef({ x: 0, y: 0 });

  const buildCalendarDragTask = (task: any) => {
    const startTime = task.startTime || task.start_time || new Date(currentDate);
    const endTime = task.endTime || task.end_time || new Date(new Date(startTime).getTime() + 30 * 60 * 1000);
    const priorityKey = getPriorityKey(task.urgency || false, task.importance || false);

    return {
      ...task,
      id: String(task.id || '').startsWith('task-') ? task.id : `task-${task.id}`,
      title: task.title,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      color: priorityColors?.[priorityKey] || 'hsl(var(--primary))',
      isAllDay: true,
    };
  };

  const handleTouchStart = (e: React.TouchEvent, task: any) => {
    if (dragStarted.current) return;
    
    const touch = e.touches[0];
    startPos.current = { x: touch.clientX, y: touch.clientY };
    
    longPressTimer.current = setTimeout(() => {
      dragStarted.current = true;
      const dragTask = buildCalendarDragTask(task);
      setDraggedTask(dragTask);
      draggedTaskRef.current = dragTask;
      setIsDraggingTask(true);
      if ('vibrate' in navigator) navigator.vibrate(50);

      window.dispatchEvent(new CustomEvent('adonai:external-drag-start', {
        detail: { task: dragTask, x: startPos.current.x, y: startPos.current.y }
      }));
    }, 280);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    
    if (dragStarted.current && (draggedTask || draggedTaskRef.current)) {
      // Prevent scrolling while dragging
      if (e.cancelable) e.preventDefault();
      window.dispatchEvent(new CustomEvent('adonai:external-drag-move', { 
        detail: { x: touch.clientX, y: touch.clientY } 
      }));
    } else if (longPressTimer.current) {
      const moveX = Math.abs(touch.clientX - startPos.current.x);
      const moveY = Math.abs(touch.clientY - startPos.current.y);
      
      // Cancel long press if user moves significantly (tolerance: 10px)
      if (moveX > 10 || moveY > 10) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    if (dragStarted.current) {
      if (e.cancelable) e.preventDefault();
      window.dispatchEvent(new CustomEvent('adonai:external-drag-end'));
      dragStarted.current = false;
      setDraggedTask(null);
      draggedTaskRef.current = null;
      setIsDraggingTask(false);
    }
  };

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  const quadrantRank = useCallback((t: any) =>
    t.urgency && t.importance ? 0
    : t.urgency ? 1
    : t.importance ? 2
    : 3, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const title = t.title || '';
      const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase());
      
      const taskDate = t.startTime || t.start_time || (t.date ? new Date(t.date) : new Date());
      const isCompleted = t.completed || t.status === 'done';
      const inTimeRange = isSameDay(taskDate, currentDate) || 
                         (taskDate < startOfDay(currentDate) && !isCompleted);
      
      let matchesFolder = true;
      if (selectedFolderId === 'shared') {
        matchesFolder = !!(t.is_shared || t.shared_with);
      } else if (selectedFolderId === 'all') {
        matchesFolder = !t.folder_id;
      } else {
        matchesFolder = t.folder_id === selectedFolderId;
      }

      return matchesSearch && inTimeRange && matchesFolder;
    });
  }, [tasks, searchQuery, currentDate, selectedFolderId]);

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      const rankDiff = quadrantRank(a) - quadrantRank(b);
      if (rankDiff !== 0) return rankDiff;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
  }, [filteredTasks, quadrantRank]);

  const tasksByFolder = useMemo(() => {
    const groups: Record<string, any[]> = {};
    sortedTasks.forEach(t => {
      const folder = t.folder_name || t.category || 'Sin cuaderno';
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push(t);
    });
    return groups;
  }, [sortedTasks]);

  const toggleFolder = (folder: string) => {
    const newSet = new Set(expandedFolders);
    if (newSet.has(folder)) newSet.delete(folder);
    else newSet.add(folder);
    setExpandedFolders(newSet);
  };

  return (
    <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-[calc(100vw-32px)] flex flex-col items-center pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={isDraggingTask ? { opacity: 0, y: 28, scale: 0.96 } : { opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full notebook-cream-bg border border-outline-variant/12 rounded-[28px] shadow-2xl overflow-hidden flex flex-col mb-3 pointer-events-auto max-h-[55vh]"
            style={{ pointerEvents: isDraggingTask ? 'none' : 'auto' }}
          >
            {/* Notebook spiral rings */}

            {/* Ruled lines background */}

            {/* Vertical margin line */}

            <div className="relative z-10 p-4 flex flex-col gap-3 overflow-hidden h-full">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-black" style={{ color: '#1f2937' }}>Tareas de hoy</h3>
                  <p className="text-[10px] font-medium mt-0.5 notebook-handwriting" style={{ color: '#6b7280' }}>Mantén presionado para arrastrar al calendario</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-all"
                    style={{ backgroundColor: 'rgba(30,41,59,0.05)', color: '#4b5563' }}
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={3} />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#6b7280', opacity: 0.5 }} />
                <Input 
                  placeholder="Buscar tarea..." 
                  className="pl-9 h-9 text-[12px] font-bold rounded-lg placeholder:opacity-40 border-0"
                  style={{ backgroundColor: 'rgba(30,41,59,0.05)', color: '#1f2937' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Notebooks Navigation */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 border-b" style={{ borderColor: 'rgba(30,41,59,0.08)' }}>
                <button
                  onClick={() => setSelectedFolderId('all')}
                  className={cn(
                    "flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide transition-all border notebook-handwriting",
                    selectedFolderId === 'all' 
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-white/40 text-[#4b5563] border-[rgba(30,41,59,0.18)]'
                  )}
                >
                  {selectedFolderId === 'all' ? (
                    <NotebookText className="w-3 h-3 inline mr-1" />
                  ) : (
                    <Notebook className="w-3 h-3 inline mr-1" />
                  )}
                  Hoy
                </button>

                {folders.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolderId(selectedFolderId === folder.id ? 'all' : folder.id)}
                    className={cn(
                      "flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide transition-all border notebook-handwriting",
                      selectedFolderId === folder.id 
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-white/40 text-[#4b5563] border-[rgba(30,41,59,0.18)]'
                    )}
                  >
                    {folder.name}
                  </button>
                ))}
              </div>

              {/* Task List */}
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-0 pb-2">
                <div className="space-y-0"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(180deg, rgba(120,145,190,0.08) 0 1px, transparent 1px 42px)',
                    backgroundPosition: '0 5px',
                  }}
                >
                    {sortedTasks.length > 0 ? (
                      sortedTasks
                        .map((task) => {
                          const priorityKey = getPriorityKey(task.urgency || false, task.importance || false);
                          const evColor = (task.color?.startsWith('#') || task.color?.startsWith('var')) ? task.color : undefined;
                          return (
                            <motion.div
                              key={task.id}
                              onMouseDown={onDragStart ? (e) => onDragStart(e, task) : undefined}
                              onTouchStart={(e) => handleTouchStart(e, task)}
                              onTouchMove={handleTouchMove}
                              onTouchEnd={handleTouchEnd}
                              onTouchCancel={handleTouchEnd}
                              onClick={() => !dragStarted.current && onTaskClick(task)}
                              className="group flex items-center gap-3 px-2 py-1.5 transition-colors cursor-grab active:cursor-grabbing touch-none"
                            >
                              <div
                                className="h-[18px] w-[18px] rounded-full border-2 shrink-0"
                                style={{ borderColor: evColor || priorityColors?.[priorityKey] || 'rgba(30,41,59,0.2)' }}
                              />
                              <div className="flex-1 min-w-0">
                                <span className="block text-[14px] font-semibold leading-snug tracking-normal break-words whitespace-normal" style={{ color: task.status === 'done' ? '#6b7280' : '#1f2937' }}>
                                  {task.title}
                                </span>
                              </div>
                            </motion.div>
                          );
                        })
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: 'rgba(30,41,59,0.05)' }}>
                          <Search className="w-4 h-4" style={{ color: '#6b7280' }} />
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: '#6b7280' }}>Sin tareas para hoy</p>
                      </div>
                    )}
                  </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3 pointer-events-auto">
        <motion.button
          layoutId="task-island"
          onClick={() => setIsOpen(!isOpen)}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "h-[42px] rounded-full shadow-2xl flex items-center justify-between px-5 transition-all border border-outline-variant/10",
            isOpen ? "bg-surface-container-high w-full text-foreground" : "bg-primary w-[130px] text-primary-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? '' : 'rotate-180'}`} />
            <span className="text-[11px] font-black uppercase tracking-widest">
              {isOpen ? "Cerrar" : "Tareas"}
            </span>
          </div>
        </motion.button>

      </div>
    </div>
  );
};
