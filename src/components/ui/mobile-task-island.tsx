import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  ChevronDown, 
  Search, 
  X, 
  Folder, 
  FolderOpen, 
  Users,
  GripHorizontal 
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
  const dragStarted = useRef(false);

  const startPos = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent, task: any) => {
    if (dragStarted.current) return;
    
    const touch = e.touches[0];
    startPos.current = { x: touch.clientX, y: touch.clientY };
    
    longPressTimer.current = setTimeout(() => {
      dragStarted.current = true;
      setDraggedTask(task);
      if ('vibrate' in navigator) navigator.vibrate(50);
      
      window.dispatchEvent(new CustomEvent('adonai:external-drag-start', { 
        detail: { task, x: startPos.current.x, y: startPos.current.y } 
      }));
    }, 2000);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    
    if (dragStarted.current && draggedTask) {
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
      const folder = t.folder_name || t.category || 'Sin carpeta';
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
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full bg-surface-container/95 backdrop-blur-2xl border border-outline-variant/10 rounded-[28px] shadow-2xl overflow-hidden flex flex-col mb-3 pointer-events-auto max-h-[45vh]"
          >
            <div className="p-5 flex flex-col gap-4 overflow-hidden h-full">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-black text-primary leading-tight">Tareas de hoy</h3>
                  <p className="text-[11px] text-muted-foreground/80 font-medium mt-0.5">Mantén presionado para arrastrar al calendario</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary active:scale-90"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                <Input 
                  placeholder="Buscar tarea..." 
                  className="pl-9 h-10 text-[12px] bg-surface-container-high border-none rounded-2xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Folders Navigation (Matching MiniTasksPage aesthetic) */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 border-b border-outline-variant/10">
                <button
                  onClick={() => setSelectedFolderId('all')}
                  className={cn(
                    "flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-2",
                    selectedFolderId === 'all' 
                      ? "bg-primary text-primary-foreground shadow-lg" 
                      : "bg-surface-container-high/50 text-muted-foreground border border-outline-variant/10"
                  )}
                >
                  {selectedFolderId === 'all' ? (
                    <FolderOpen className="w-3 h-3" />
                  ) : (
                    <Folder className="w-3 h-3" />
                  )}
                  General
                </button>

                {folders.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolderId(selectedFolderId === folder.id ? 'all' : folder.id)}
                    className={cn(
                      "flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-2",
                      selectedFolderId === folder.id 
                        ? "bg-primary text-primary-foreground shadow-lg" 
                        : "bg-surface-container-high/50 text-muted-foreground border border-outline-variant/10"
                    )}
                  >
                    <AnimatePresence mode="wait">
                      {folder.isShared ? (
                        <motion.div
                          key="shared"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                        >
                          <Users className="w-3 h-3" style={{ color: selectedFolderId === folder.id ? 'inherit' : (folder.color || 'inherit') }} />
                        </motion.div>
                      ) : (
                        <motion.div
                          key={selectedFolderId === folder.id ? 'open' : 'closed'}
                          initial={{ rotateY: selectedFolderId === folder.id ? 180 : -180, scale: 0.8 }}
                          animate={{ rotateY: 0, scale: 1 }}
                          exit={{ rotateY: selectedFolderId === folder.id ? -180 : 180, scale: 0.8 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                        >
                          {selectedFolderId === folder.id ? (
                            <FolderOpen className="w-3 h-3" />
                          ) : (
                            <Folder className="w-3 h-3" style={{ color: folder.color || 'inherit' }} />
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {folder.name}
                  </button>
                ))}
              </div>

              {/* Task List */}
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-2">
                <div className="space-y-2">
                    {sortedTasks.length > 0 ? (
                      sortedTasks
                        .map((task) => {
                          const priorityKey = getPriorityKey(task.urgency || false, task.importance || false);
                          return (
                            <motion.div
                              key={task.id}
                              onMouseDown={onDragStart ? (e) => onDragStart(e, task) : undefined}
                              onTouchStart={(e) => handleTouchStart(e, task)}
                              onTouchMove={handleTouchMove}
                              onTouchEnd={handleTouchEnd}
                              onClick={() => !dragStarted.current && onTaskClick(task)}
                              className="group flex items-start gap-4 p-4 rounded-[24px] bg-surface-container-high/50 border border-transparent hover:border-primary/20 transition-all active:scale-[0.98] cursor-grab active:cursor-grabbing touch-pan-y"
                              style={{ 
                                backgroundColor: priorityColors?.[priorityKey] 
                                  ? `color-mix(in srgb, ${priorityColors[priorityKey]}, transparent 92%)`
                                  : 'transparent',
                              }}
                            >
                              <div
                                className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]"
                                style={{ backgroundColor: priorityColors?.[priorityKey] || '#ccc' }}
                              />
                              <div className={cn("flex-1 min-w-0", task.status === 'done' && "opacity-40")}>
                                <span className={cn("text-[13px] font-black leading-tight block text-foreground", task.status === 'done' && "line-through")}>{task.title}</span>
                              </div>
                              <GripHorizontal className="w-4 h-4 text-muted-foreground/30 self-center" />
                            </motion.div>
                          );
                        })
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 opacity-30 text-center">
                        <Search className="w-8 h-8 mb-3" />
                        <p className="text-[13px] font-bold text-muted-foreground/50 mt-1">No hay tareas</p>
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
