import { useState, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { Trash2, RotateCcw, Trash, CheckCircle2, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const TaskCard = ({ task, onRestore, onPermanentDelete, showDelete = true }: any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isDone = task.status === 'done';

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border-b border-outline-variant/10 last:border-b-0"
    >
      <div className="py-3 px-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0" onClick={() => setIsExpanded(!isExpanded)}>
            <div className="flex items-center gap-2">
              {isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 text-on-surface-variant/40 shrink-0" />
              )}
              <span className={`text-sm font-bold text-foreground ${isDone ? 'line-through opacity-60' : ''}`}>
                {task.title}
              </span>
            </div>
            {task.due_date && (
              <div className="flex items-center gap-1 mt-1 ml-5.5">
                <Calendar className="w-3 h-3 text-on-surface-variant/30" />
                <span className="text-[11px] text-on-surface-variant/40">{format(parseISO(task.due_date), 'd MMM', { locale: es })}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onRestore(task.id)} className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant/40 hover:text-primary transition-colors" title="Restaurar">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            {showDelete && (
              <button onClick={() => onPermanentDelete(task.id)} className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant/30 hover:text-error transition-colors" title="Eliminar permanentemente">
                <Trash className="w-3.5 h-3.5" />
              </button>
            )}
            {task.description && (
              <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant/30 transition-colors">
                <span className={`text-xs font-bold transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && task.description && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <p className="text-xs text-on-surface-variant/40 mt-2 ml-5.5 italic">{task.description}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const TrashPage = () => {
  const { tasks: allTasks, updateTask, hardDeleteTask, isLoading } = useTasks({ status: 'history' });
  const [tab, setTab] = useState<'done' | 'deleted'>('done');
  const [isEmptying, setIsEmptying] = useState(false);

  const doneTasks = useMemo(() => allTasks.filter(t => t.status === 'done'), [allTasks]);
  const deletedTasks = useMemo(() => allTasks.filter(t => t.status === 'deleted'), [allTasks]);

  const handleRestore = (id: string) => {
    updateTask.mutate({ id, status: 'pending' });
    toast.success('Tarea restaurada a la agenda');
  };

  const handlePermanentDelete = (id: string) => {
    if (window.confirm('¿Eliminar permanentemente? Esta acción no se puede deshacer.')) {
      hardDeleteTask.mutate(id);
      toast.success('Tarea eliminada para siempre');
    }
  };

  const emptyTrash = () => {
    if (window.confirm('¿Vaciar papelera? Se eliminarán permanentemente todas las tareas borradas.')) {
      setIsEmptying(true);
      deletedTasks.forEach(task => hardDeleteTask.mutate(task.id));
      toast.success('Papelera vaciada');
      setIsEmptying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <div className="max-w-[430px] lg:max-w-3xl mx-auto px-6 pt-8">
        <h1 className="text-xl font-black tracking-tight mb-6">Historial</h1>

        <div className="flex gap-1 mb-6 p-1 bg-surface-container-low rounded-xl w-fit">
          <button onClick={() => setTab('done')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'done' ? 'bg-background text-foreground shadow-sm' : 'text-on-surface-variant/50 hover:text-foreground'}`}>
            Completadas ({doneTasks.length})
          </button>
          <button onClick={() => setTab('deleted')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'deleted' ? 'bg-background text-foreground shadow-sm' : 'text-on-surface-variant/50 hover:text-foreground'}`}>
            Papelera ({deletedTasks.length})
          </button>
        </div>

        <AnimatePresence mode="wait">
          {tab === 'done' ? (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {doneTasks.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-on-surface-variant/30">Aún no hay tareas completadas.</p>
                </div>
              ) : (
                doneTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onRestore={handleRestore} showDelete={false} />
                ))
              )}
            </motion.div>
          ) : (
            <motion.div key="deleted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-on-surface-variant/40">{deletedTasks.length} tareas eliminadas</p>
                {deletedTasks.length > 0 && (
                  <button onClick={emptyTrash} disabled={isEmptying} className="text-xs font-bold text-error/60 hover:text-error transition-colors">
                    Vaciar papelera
                  </button>
                )}
              </div>
              {deletedTasks.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-on-surface-variant/30">La papelera está vacía.</p>
                </div>
              ) : (
                deletedTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onRestore={handleRestore} onPermanentDelete={handlePermanentDelete} />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TrashPage;
