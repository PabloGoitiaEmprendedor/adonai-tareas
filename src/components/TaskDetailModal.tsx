import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, RotateCcw, Clock, Calendar, Flag, Tag } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { useContexts } from '@/hooks/useContexts';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface TaskDetailModalProps {
  task: any;
  open: boolean;
  onClose: () => void;
}

const TaskDetailModal = ({ task, open, onClose }: TaskDetailModalProps) => {
  const { updateTask } = useTasks();
  const { contexts } = useContexts();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(0);
  const [importance, setImportance] = useState(false);
  const [urgency, setUrgency] = useState(false);
  const [contextId, setContextId] = useState<string | null>(null);
  const [status, setStatus] = useState('pending');

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (task && open) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setDueDate(task.due_date || '');
      setEstimatedMinutes(task.estimated_minutes || 25);
      setImportance(task.importance || false);
      setUrgency(task.urgency || false);
      setContextId(task.context_id || null);
      setStatus(task.status || 'pending');
      setElapsed(0);
      setTimerRunning(false);
    }
  }, [task, open]);

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerRunning]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const totalSeconds = estimatedMinutes * 60;
  const remaining = Math.max(totalSeconds - elapsed, 0);
  const timerProgress = totalSeconds > 0 ? Math.min(elapsed / totalSeconds, 1) : 0;

  const handleSave = () => {
    let priority: string = 'medium';
    if (importance && urgency) priority = 'high';
    else if (importance) priority = 'high';
    else if (urgency) priority = 'medium';
    else priority = 'low';

    updateTask.mutate({
      id: task.id,
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate || null,
      estimated_minutes: estimatedMinutes || null,
      importance,
      urgency,
      priority,
      context_id: contextId,
      status,
      ...(status === 'done' ? { completed_at: new Date().toISOString() } : {}),
    });
    toast.success('Tarea actualizada');
    onClose();
  };

  if (!open || !task) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-[60]" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-[70] px-4 pb-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="mx-auto max-w-[430px] glass-sheet rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex justify-center pt-4 pb-2">
                <div className="w-12 h-1.5 bg-on-surface-variant/20 rounded-full" />
              </div>

              <div className="p-6 space-y-5">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-foreground">Editar tarea</h2>
                  <button onClick={onClose} className="text-on-surface-variant"><X className="w-5 h-5" /></button>
                </div>

                {/* Timer */}
                <div className="bg-surface-container-low rounded-xl p-4 text-center space-y-3">
                  <div className="relative w-24 h-24 mx-auto">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                      <circle cx="48" cy="48" r="42" fill="none" stroke="hsl(var(--surface-container-high))" strokeWidth="4" />
                      <circle cx="48" cy="48" r="42" fill="none" stroke="hsl(var(--primary))" strokeWidth="4"
                        strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - timerProgress)} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold text-foreground font-mono">{formatTime(remaining)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => setTimerRunning(!timerRunning)} className="w-10 h-10 rounded-full primary-gradient flex items-center justify-center">
                      {timerRunning ? <Pause className="w-4 h-4 text-primary-foreground" /> : <Play className="w-4 h-4 text-primary-foreground" />}
                    </button>
                    <button onClick={() => { setElapsed(0); setTimerRunning(false); }} className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center">
                      <RotateCcw className="w-4 h-4 text-on-surface-variant" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nombre</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-surface-container-high rounded-lg p-3 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Descripción</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full bg-surface-container-high rounded-lg p-3 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
                </div>

                {/* Date & Time row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1"><Calendar className="w-3 h-3" /> Fecha</label>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-surface-container-high rounded-lg p-3 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> Minutos</label>
                    <input type="number" min={1} max={480} value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(Number(e.target.value))} className="w-full bg-surface-container-high rounded-lg p-3 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>

                {/* Importance & Urgency */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setImportance(!importance)}
                    className={`p-3 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${importance ? 'bg-primary/20 text-primary ring-1 ring-primary/30' : 'bg-surface-container-high text-on-surface-variant'}`}
                  >
                    <Flag className="w-4 h-4" /> {importance ? 'Importante' : 'No importante'}
                  </button>
                  <button
                    onClick={() => setUrgency(!urgency)}
                    className={`p-3 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${urgency ? 'bg-error/20 text-error ring-1 ring-error/30' : 'bg-surface-container-high text-on-surface-variant'}`}
                  >
                    <Clock className="w-4 h-4" /> {urgency ? 'Urgente' : 'No urgente'}
                  </button>
                </div>

                {/* Context */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1"><Tag className="w-3 h-3" /> Contexto</label>
                  <div className="flex flex-wrap gap-2">
                    {contexts.map((ctx) => (
                      <button key={ctx.id} onClick={() => setContextId(ctx.id === contextId ? null : ctx.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${contextId === ctx.id ? 'bg-primary/20 text-primary ring-1 ring-primary/30' : 'bg-surface-container-high text-on-surface-variant'}`}>
                        {ctx.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Estado</label>
                  <div className="flex gap-2">
                    {['pending', 'done', 'skipped'].map((s) => (
                      <button key={s} onClick={() => setStatus(s)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${status === s ? 'bg-primary text-primary-foreground' : 'bg-surface-container-high text-on-surface-variant'}`}>
                        {s === 'pending' ? 'Pendiente' : s === 'done' ? 'Hecha' : 'Pospuesta'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save */}
                <button onClick={handleSave} className="w-full py-3.5 rounded-xl primary-gradient text-primary-foreground font-bold text-sm">
                  Guardar cambios
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TaskDetailModal;
