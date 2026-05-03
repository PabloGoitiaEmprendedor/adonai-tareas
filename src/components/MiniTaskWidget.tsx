import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTasks } from '@/hooks/useTasks';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, Flame, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MiniTaskWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MiniTaskWidget = ({ isOpen, onClose }: MiniTaskWidgetProps) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { tasks, updateTask } = useTasks({ date: today });
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a: any, b: any) => {
      const doneA = a.status === 'done' ? 1 : 0;
      const doneB = b.status === 'done' ? 1 : 0;
      if (doneA !== doneB) return doneA - doneB;
      const orderA = a.sort_order || 0;
      const orderB = b.sort_order || 0;
      return orderA - orderB;
    });
  }, [tasks]);

  const completedCount = tasks.filter((t: any) => t.status === 'done').length;
  const totalCount = tasks.length;

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
      className="fixed bottom-6 right-6 w-[360px] max-h-[520px] bg-background border border-outline-variant/20 rounded-2xl shadow-2xl flex flex-col z-[9999] overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Drag handle visual & Header */}
      <div className="flex flex-col pt-2 bg-background/95 backdrop-blur-md border-b border-border/30">
        <div className="w-12 h-1 bg-on-surface-variant/20 rounded-full mx-auto mb-2" />
        
        <div className="px-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-primary" />
            <span className="text-xs font-black uppercase tracking-[0.15em] text-foreground">
              Mis Tareas
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">
              {format(currentTime, "EEE d MMM", { locale: es })}
            </span>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-surface-container-high rounded-lg transition-colors text-on-surface-variant/60"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="h-1.5 bg-surface-container-highest overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / totalCount) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full primary-gradient"
            />
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2 custom-scrollbar">
        {sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-4xl mb-3">🎉</span>
            <p className="text-sm font-black text-foreground">¡Día despejado!</p>
            <p className="text-xs text-on-surface-variant/50 mt-1">No tienes tareas para hoy.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {sortedTasks.map((task: any) => {
              const isDone = task.status === 'done';
              const isCompleting = completingId === task.id;

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{
                    opacity: isCompleting ? 0.3 : 1,
                    y: 0,
                    scale: isCompleting ? 0.97 : 1,
                  }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={(e) => handleToggle(task, e)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-2xl cursor-pointer transition-all border ${
                    isDone
                      ? 'bg-transparent border-transparent opacity-50'
                      : 'bg-card border-outline-variant/10 hover:border-primary/30 shadow-sm'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {isDone || isCompleting ? (
                      <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm"
                      >
                        <Check className="w-4 h-4 text-primary-foreground stroke-[3]" />
                      </motion.div>
                    ) : (
                      <div className="w-8 h-8 rounded-xl border-2 border-outline/40 flex items-center justify-center hover:border-primary hover:bg-primary/10 transition-all bg-surface group/check">
                        <div className="w-3 h-3 rounded-md bg-primary scale-0 group-hover/check:scale-100 transition-transform duration-300" />
                      </div>
                    )}
                  </div>

                  <span
                    className={`flex-1 text-sm font-bold leading-snug transition-all ${
                      isDone || isCompleting
                        ? 'text-on-surface-variant/30 line-through'
                        : 'text-foreground'
                    }`}
                  >
                    {task.title}
                  </span>
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
            className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-center"
          >
            <span className="text-2xl">🏆</span>
            <p className="text-sm font-black text-primary mt-1">¡Todo completado!</p>
            <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Disfruta tu tiempo libre.</p>
          </motion.div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default MiniTaskWidget;
