import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTasks } from '@/hooks/useTasks';
import { useFolders } from '@/hooks/useFolders';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, Flame, X, Folder, Link as LinkIcon, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePriorityColors } from '@/hooks/usePriorityColors';

interface MiniTaskWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MiniTaskWidget = ({ isOpen, onClose }: MiniTaskWidgetProps) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { tasks, updateTask } = useTasks({ date: today });
  const { folders } = useFolders();
  const { colors: priorityColors } = usePriorityColors();
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showFolderBar, setShowFolderBar] = useState(true); 
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const filteredTasks = useMemo(() => {
    if (!selectedFolderId) return tasks;
    return tasks.filter((t: any) => t.folder_id === selectedFolderId);
  }, [tasks, selectedFolderId]);

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a: any, b: any) => {
      const doneA = a.status === 'done' ? 1 : 0;
      const doneB = b.status === 'done' ? 1 : 0;
      if (doneA !== doneB) return doneA - doneB;
      const orderA = a.sort_order || 0;
      const orderB = b.sort_order || 0;
      return orderA - orderB;
    });
  }, [filteredTasks]);

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

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed bottom-6 right-6 w-[380px] max-h-[580px] bg-background border border-outline-variant/20 rounded-[32px] shadow-2xl flex flex-col z-[9999] overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
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
                {format(currentTime, "EEEE d MMMM", { locale: es })}
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
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-2.5 custom-scrollbar bg-surface/30">
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
            {sortedTasks.map((task: any) => {
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
                  onClick={(e) => handleToggle(task, e)}
                  className={`group flex items-center gap-4 px-4 py-4 rounded-[24px] cursor-pointer transition-all border ${
                    isDone
                      ? 'bg-transparent border-transparent opacity-40'
                      : 'bg-background border-outline-variant/10 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {isDone || isCompleting ? (
                      <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: taskPriorityColor === 'transparent' ? 'var(--primary)' : taskPriorityColor }}
                      >
                        <Check className="w-4 h-4 text-primary-foreground stroke-[3]" />
                      </motion.div>
                    ) : (
                      <div 
                        className="w-8 h-8 rounded-xl border-2 flex items-center justify-center bg-surface group-hover:bg-primary/5 transition-all"
                        style={{ borderColor: taskPriorityColor === 'transparent' ? 'var(--outline-variant)' : taskPriorityColor }}
                      >
                        <div 
                          className="w-3 h-3 rounded-md scale-0 group-hover:scale-100 transition-all duration-300" 
                          style={{ backgroundColor: taskPriorityColor === 'transparent' ? 'var(--primary)' : taskPriorityColor }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span
                      className={`block text-sm font-bold tracking-tight leading-snug transition-all ${
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
    </div>,
    document.body
  );
};

export default MiniTaskWidget;
