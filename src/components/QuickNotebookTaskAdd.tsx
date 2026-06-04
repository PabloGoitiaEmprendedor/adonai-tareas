import { useState } from 'react';
import { format } from 'date-fns';
import { Pencil, Link, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useTasks } from '@/hooks/useTasks';
import { usePriorityColors } from '@/hooks/usePriorityColors';

type PriorityOption = {
  key: 'p1' | 'p2' | 'p3' | 'p4';
  label: string;
  urgency: boolean;
  importance: boolean;
  priority: 'high' | 'medium' | 'low';
};

const PRIORITY_OPTIONS: PriorityOption[] = [
  { key: 'p1', label: 'Ahora', urgency: true, importance: true, priority: 'high' },
  { key: 'p2', label: 'Pronto', urgency: true, importance: false, priority: 'medium' },
  { key: 'p3', label: 'Clave', urgency: false, importance: true, priority: 'medium' },
  { key: 'p4', label: 'Luego', urgency: false, importance: false, priority: 'low' },
];

interface QuickNotebookTaskAddProps {
  folderId?: string | null;
  folderName?: string;
  disabled?: boolean;
  onDisabledClick?: () => void;
}

export const QuickNotebookTaskAdd = ({ folderId, disabled, onDisabledClick }: QuickNotebookTaskAddProps) => {
  const { createTask } = useTasks();
  const { colors } = usePriorityColors();
  const [phase, setPhase] = useState<'idle' | 'title' | 'link' | 'priority'>('idle');
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');

  const normalizeTitle = (value: string) => value.replace(/\s+$/g, '');

  const reset = () => {
    setTitle('');
    setLink('');
    setPhase('idle');
  };

  const handleStart = () => {
    if (disabled) {
      onDisabledClick?.();
      return;
    }
    setPhase('title');
  };

  const handleTitleSubmit = () => {
    if (!normalizeTitle(title).trim()) {
      reset();
      return;
    }
    setPhase('link');
  };

  const handleLinkSubmit = () => {
    setPhase('priority');
  };

  const handlePriority = (option: PriorityOption) => {
    const normalizedTitle = normalizeTitle(title);
    if (!normalizedTitle.trim()) return;
    createTask.mutate({
      title: normalizedTitle,
      due_date: format(new Date(), 'yyyy-MM-dd'),
      folder_id: folderId || null,
      priority: option.priority,
      urgency: option.urgency,
      importance: option.importance,
      estimated_minutes: 30,
      creation_source: 'secondary',
      link: link.trim() || null,
    }, {
      onSuccess: reset,
      onError: () => toast.error('No se pudo crear la tarea'),
    });
  };

  return (
    <div className="relative z-10">
      <AnimatePresence mode="wait">
        {phase === 'idle' && (
          <motion.button
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleStart}
            className="flex h-[38px] w-full items-center gap-2.5 px-2 text-left text-on-surface-variant/25 transition-colors hover:text-primary/60"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-outline-variant/20 bg-background/20">
              <Pencil className="h-3 w-3" />
            </span>
          </motion.button>
        )}

        {phase === 'title' && (
          <motion.div
            key="title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 px-2 py-2"
          >
            <Pencil className="h-4 w-4 text-primary/60 mt-1" />
            <div className="flex-1 min-w-0">
            <textarea
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 160) + 'px';
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.ctrlKey || event.shiftKey)) {
                  event.preventDefault();
                  if (title.trim()) handleTitleSubmit();
                } else if (event.key === 'Escape') {
                  reset();
                }
              }}
              placeholder="Nombre de la tarea"
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-on-surface-variant/30 resize-none overflow-hidden"
              rows={1}
            />
            <p className="text-[9px] font-medium text-on-surface-variant/20 mt-0.5">Enter = salto de línea · Ctrl+Enter = listo · Esc = cerrar</p>
            </div>
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => title.trim() && handleTitleSubmit()}
                className="h-8 w-8 rounded-xl bg-primary/10 text-primary/80 border border-primary/15 hover:bg-primary/15 transition-all active:scale-95 flex items-center justify-center cursor-click"
                aria-label="Listo"
                title="Listo"
              >
                <Check className="h-4 w-4" strokeWidth={3} />
              </button>
              <button
                type="button"
                onClick={reset}
                className="h-8 w-8 rounded-xl bg-surface-container/40 text-muted-foreground border border-outline-variant/15 hover:bg-surface-container/60 transition-all active:scale-95 flex items-center justify-center cursor-click"
                aria-label="Cancelar"
                title="Cancelar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'link' && (
          <motion.div
            key="link"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-[42px] items-center gap-3 px-2"
          >
            <Link className="h-4 w-4 text-primary/60" />
            <input
              autoFocus
              value={link}
              onChange={(event) => setLink(event.target.value)}
              onBlur={handleLinkSubmit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleLinkSubmit();
                if (event.key === 'Escape') reset();
              }}
              placeholder="Link (opcional)"
              className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-on-surface-variant/30"
            />
            <button
              onClick={handleLinkSubmit}
              className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary/70 transition-colors hover:text-primary"
            >
              Saltar
            </button>
          </motion.div>
        )}

        {phase === 'priority' && (
          <motion.div
            key="priority"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-[42px] items-center gap-2 px-2 py-1.5"
          >
            <span className="notebook-handwriting shrink-0 text-sm text-[#1f2937]/70">Prioridad</span>
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto no-scrollbar">
              {PRIORITY_OPTIONS.map((option) => {
                const color = colors[option.key] === 'transparent' ? 'hsl(var(--outline))' : colors[option.key];
                return (
                  <button
                    key={option.key}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handlePriority(option)}
                    className="shrink-0 rounded-full border border-[#1f2937]/20 bg-white/60 px-2.5 py-1 text-[10px] font-black text-[#1f2937]/80 transition-colors hover:bg-white/90 hover:text-[#1f2937]"
                  >
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
