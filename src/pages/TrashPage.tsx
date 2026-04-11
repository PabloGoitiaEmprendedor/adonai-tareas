import { useState, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { Trash2, RotateCcw, Trash, CheckCircle2, Clock, Calendar, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const TaskCard = ({ task, onRestore, onPermanentDelete, showDelete = true }: any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isDone = task.status === 'done';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-2xl border transition-all duration-300 ${
        isDone 
          ? 'bg-primary/5 border-primary/10' 
          : 'bg-error/5 border-error/10'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0" onClick={() => setIsExpanded(!isExpanded)}>
            <div className="flex items-center gap-2 mb-1">
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-primary" />
              ) : (
                <Trash2 className="w-4 h-4 text-error" />
              )}
              <h3 className={`font-bold text-foreground truncate ${isDone ? 'line-through opacity-70' : ''}`}>
                {task.title}
              </h3>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {task.due_date && (
                <div className="flex items-center gap-1 text-[10px] text-on-surface-variant/60 font-medium">
                  <Calendar className="w-3 h-3" />
                  {format(parseISO(task.due_date), 'd MMM', { locale: es })}
                </div>
              )}
              {task.priority && (
                <div className="flex items-center gap-1 text-[10px] text-on-surface-variant/60 font-medium capitalize">
                  <AlertCircle className="w-3 h-3" />
                  {task.priority}
                </div>
              )}
              {task.estimated_minutes && (
                <div className="flex items-center gap-1 text-[10px] text-on-surface-variant/60 font-medium">
                  <Clock className="w-3 h-3" />
                  {task.estimated_minutes} min
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start">
            <button 
              onClick={() => onRestore(task.id)}
              className="p-2 rounded-xl bg-background hover:bg-surface-container-high text-on-surface-variant transition-all shadow-sm border border-outline-variant/10"
              title="Restaurar"
            >
              <RotateCcw className="w-3.5 h-3.5 text-primary" />
            </button>
            {showDelete && (
              <button 
                onClick={() => onPermanentDelete(task.id)}
                className="p-2 rounded-xl bg-background hover:bg-surface-container-high text-on-surface-variant transition-all shadow-sm border border-outline-variant/10"
                title="Eliminar permanentemente"
              >
                <Trash className="w-3.5 h-3.5 text-error" />
              </button>
            )}
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-xl bg-background hover:bg-surface-container-high text-on-surface-variant transition-all shadow-sm border border-outline-variant/10"
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && task.description && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 mt-3 border-t border-outline-variant/10">
                <p className="text-xs text-on-surface-variant leading-relaxed italic">
                  {task.description}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const TrashPage = () => {
  const { tasks: allTasks, updateTask, hardDeleteTask, isLoading } = useTasks({ status: 'history' });
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <div className="max-w-[430px] lg:max-w-4xl mx-auto px-6 pt-4 space-y-8">
        
        {/* Completed Tasks Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between py-1">
            <div className="space-y-0.5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Victoria</p>
              <h1 className="text-xl font-extrabold tracking-tight">Tareas Completadas</h1>
            </div>
          </div>

          <div className="space-y-3">
            {doneTasks.length === 0 ? (
              <div className="py-10 text-center bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/30">
                <p className="text-on-surface-variant/40 text-xs font-medium">Aún no hay tareas completadas para mostrar.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {doneTasks.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onRestore={handleRestore} 
                    showDelete={false} 
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Trash Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between py-1 border-t border-outline-variant/10 pt-8">
            <div className="space-y-0.5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-error">Zona de Riesgo</p>
              <h1 className="text-xl font-extrabold tracking-tight">Papelera</h1>
            </div>
            
            {deletedTasks.length > 0 && (
              <Button 
                variant="ghost" 
                onClick={emptyTrash}
                disabled={isEmptying}
                className="text-error hover:text-error hover:bg-error/10 font-bold gap-2 h-9 px-3 rounded-xl text-xs"
              >
                <Trash className="w-3.5 h-3.5" /> Vaciar
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {deletedTasks.length === 0 ? (
              <div className="py-10 text-center bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/30">
                <p className="text-on-surface-variant/40 text-xs font-medium">La papelera está vacía.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deletedTasks.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onRestore={handleRestore} 
                    onPermanentDelete={handlePermanentDelete} 
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default TrashPage;
