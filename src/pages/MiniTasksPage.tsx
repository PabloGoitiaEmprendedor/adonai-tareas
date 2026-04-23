/**
 * MiniTasksPage — Standalone popup task list.
 * Opens as a resizable, movable browser popup via window.open().
 * Shows today's tasks and lets the user check them off directly.
 * Shares the same Supabase session so auth works automatically.
 */
import { useState, useEffect, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, Flame, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import '../index.css';

const miniQueryClient = new QueryClient();

const MiniTaskList = () => {
  const { user, loading } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  const { tasks, updateTask, isLoading } = useTasks({ date: today });
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

  const handleToggle = (task: any) => {
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

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <p className="text-lg font-black text-foreground">Sesión no encontrada</p>
          <p className="text-sm text-on-surface-variant/60">
            Abre la app principal primero para iniciar sesión.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground select-none">
      {/* Drag handle area — the top bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-primary" />
            <span className="text-xs font-black uppercase tracking-[0.15em] text-foreground">
              Mis Tareas
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">
              {format(currentTime, "EEE d MMM", { locale: es })}
            </span>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/15">
              <span className="text-[11px] font-black tabular-nums text-primary">
                {completedCount}/{totalCount}
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden mt-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full primary-gradient rounded-full"
            />
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="px-3 py-2 space-y-1.5">
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
                  onClick={() => handleToggle(task)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-2xl cursor-pointer transition-all border ${
                    isDone
                      ? 'bg-transparent border-transparent opacity-50'
                      : 'bg-card border-outline-variant/10 hover:border-primary/30 shadow-sm'
                  }`}
                >
                  {/* Checkbox */}
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

                  {/* Task title — full text, no truncation */}
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
      </div>

      {/* All done celebration */}
      {totalCount > 0 && completedCount === totalCount && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-3 mt-4 p-4 rounded-2xl bg-primary/10 border border-primary/20 text-center"
        >
          <span className="text-2xl">🏆</span>
          <p className="text-sm font-black text-primary mt-1">¡Todo completado!</p>
          <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Disfruta tu tiempo libre.</p>
        </motion.div>
      )}
    </div>
  );
};

const MiniTasksPage = () => (
  <QueryClientProvider client={miniQueryClient}>
    <AuthProvider>
      <MiniTaskList />
    </AuthProvider>
  </QueryClientProvider>
);

export default MiniTasksPage;
