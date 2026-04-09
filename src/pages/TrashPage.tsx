import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { Trash2, RotateCcw, ArrowLeft, Trash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const TrashPage = () => {
  const navigate = useNavigate();
  const { tasks, updateTask, deleteTask } = useTasks({ status: 'deleted' });
  const [isEmptying, setIsEmptying] = useState(false);

  const handleRestore = (id: string) => {
    updateTask.mutate({ id, status: 'pending' });
    toast.success('Tarea restaurada');
  };

  const handlePermanentDelete = (id: string) => {
    if (window.confirm('¿Eliminar permanentemente?')) {
      deleteTask.mutate(id);
      toast.success('Tarea eliminada para siempre');
    }
  };

  const emptyTrash = () => {
    if (window.confirm('¿Vaciar papelera? Esta acción no se puede deshacer.')) {
      setIsEmptying(true);
      tasks.forEach(task => deleteTask.mutate(task.id));
      toast.success('Papelera vaciada');
      setIsEmptying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[430px] lg:max-w-[800px] mx-auto px-5 pt-6 pb-24 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-black primary-gradient-text tracking-tighter">Papelera</h1>
          </div>
          
          {tasks.length > 0 && (
            <Button 
              variant="ghost" 
              onClick={emptyTrash}
              disabled={isEmptying}
              className="text-error hover:text-error hover:bg-error/10 font-bold gap-2"
            >
              <Trash className="w-4 h-4" /> Vaciar
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-10 h-10 text-on-surface-variant/20" />
              </div>
              <p className="text-on-surface-variant/60 font-medium">La papelera está vacía</p>
            </div>
          ) : (
            <AnimatePresence>
              {tasks.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-4 rounded-2xl glass-sheet border border-outline-variant/10 flex items-center justify-between group"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="font-bold text-foreground truncate">{task.title}</h3>
                    <p className="text-[10px] text-on-surface-variant/60">Eliminada recientemente</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleRestore(task.id)}
                      className="p-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      title="Restaurar"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handlePermanentDelete(task.id)}
                      className="p-2.5 rounded-xl bg-error/10 text-error hover:bg-error/20 transition-colors"
                      title="Eliminar permanentemente"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrashPage;
