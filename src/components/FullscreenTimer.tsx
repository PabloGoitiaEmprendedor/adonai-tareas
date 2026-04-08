import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pause, Play, RotateCcw, Check } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { toast } from 'sonner';

interface FullscreenTimerProps {
  task: any;
  open: boolean;
  onClose: () => void;
}

const FullscreenTimer = ({ task, open, onClose }: FullscreenTimerProps) => {
  const { updateTask } = useTasks();
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = (task?.estimated_minutes || 25) * 60;
  const remaining = Math.max(totalSeconds - elapsed, 0);
  const progress = totalSeconds > 0 ? Math.min(elapsed / totalSeconds, 1) : 0;

  useEffect(() => {
    if (open) { setElapsed(0); setRunning(true); }
    else { setRunning(false); }
  }, [open]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleComplete = () => {
    updateTask.mutate({ id: task.id, status: 'done', completed_at: new Date().toISOString() });
    toast.success('¡Tarea completada!');
    onClose();
  };

  if (!open || !task) return null;

  const circumference = 2 * Math.PI * 140;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center px-8"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-on-surface-variant">
          <X className="w-6 h-6" />
        </button>

        <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-2">Enfocado en</p>
        <h2 className="text-xl font-bold text-foreground text-center mb-12 max-w-xs">{task.title}</h2>

        <div className="relative w-72 h-72 mb-12">
          <svg className="w-72 h-72 -rotate-90" viewBox="0 0 300 300">
            <circle cx="150" cy="150" r="140" fill="none" stroke="hsl(var(--surface-container-high))" strokeWidth="6" />
            <circle cx="150" cy="150" r="140" fill="none" stroke="hsl(var(--primary))" strokeWidth="6"
              strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} strokeLinecap="round"
              className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold text-foreground font-mono tracking-wider">{formatTime(remaining)}</span>
            <span className="text-xs text-on-surface-variant mt-2">{formatTime(elapsed)} transcurrido</span>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <button onClick={() => { setElapsed(0); setRunning(false); }}
            className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center">
            <RotateCcw className="w-5 h-5 text-on-surface-variant" />
          </button>
          <button onClick={() => setRunning(!running)}
            className="w-20 h-20 rounded-full primary-gradient flex items-center justify-center shadow-lg shadow-primary/30">
            {running ? <Pause className="w-8 h-8 text-primary-foreground" /> : <Play className="w-8 h-8 text-primary-foreground" />}
          </button>
          <button onClick={handleComplete}
            className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center">
            <Check className="w-5 h-5 text-primary" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FullscreenTimer;
