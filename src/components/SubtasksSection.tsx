import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, X, ChevronDown } from 'lucide-react';
import { useSubtasks } from '@/hooks/useSubtasks';

interface Props {
  parentTaskId: string | null | undefined;
  defaultOpen?: boolean;
  compact?: boolean;
}

/**
 * Subtask list with proper indentation, optimistic toggling, quick-create input.
 * Used inside TaskDetailModal and inline on DailyPage cards.
 */
export const SubtasksSection = ({ parentTaskId, defaultOpen = false, compact = false }: Props) => {
  const { subtasks, createSubtask, toggleSubtask, deleteSubtask } = useSubtasks(parentTaskId);
  const [open, setOpen] = useState(defaultOpen || subtasks.length > 0);
  const [draft, setDraft] = useState('');

  const isVirtual = !parentTaskId || parentTaskId.startsWith('virtual-');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const t = draft.trim();
    if (!t || isVirtual) return;
    createSubtask.mutate(t, { onSuccess: () => setDraft('') });
  };

  if (isVirtual) {
    return compact ? null : (
      <p className="text-[11px] text-on-surface-variant/50 italic">
        Las subtareas se habilitan al guardar la tarea recurrente.
      </p>
    );
  }

  const completed = subtasks.filter(s => s.status === 'done').length;

  return (
    <div className={compact ? '' : 'space-y-2'}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="w-full flex items-center justify-between text-[11px] font-black uppercase tracking-[0.15em] text-on-surface-variant/60 hover:text-primary transition-colors py-1"
      >
        <span className="flex items-center gap-1.5">
          <Plus className="w-3 h-3" />
          Subtareas
          {subtasks.length > 0 && (
            <span className="bg-primary/15 text-primary px-1.5 py-0.5 rounded-full normal-case tracking-normal text-[10px]">
              {completed}/{subtasks.length}
            </span>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pl-4 ml-1 border-l-2 border-primary/20 space-y-1.5 py-1">
              {subtasks.map((st) => {
                const done = st.status === 'done';
                return (
                  <div key={st.id} className="flex items-center gap-2.5 group">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSubtask.mutate({ id: st.id, done: !done });
                      }}
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                        done ? 'bg-primary border-primary' : 'border-outline-variant/60 hover:border-primary'
                      }`}
                    >
                      {done && <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />}
                    </button>
                    <span className={`flex-1 text-[12px] font-medium transition-colors ${
                      done ? 'text-on-surface-variant/40 line-through' : 'text-foreground'
                    }`}>
                      {st.title}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSubtask.mutate(st.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-on-surface-variant/50 hover:text-error transition-all"
                      aria-label="Eliminar subtarea"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}

              <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 pt-1">
                <Plus className="w-3 h-3 text-on-surface-variant/40 flex-shrink-0" />
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Nueva subtarea…"
                  className="flex-1 bg-transparent border-none p-0 text-[12px] text-foreground focus:outline-none focus:ring-0 placeholder:text-on-surface-variant/30"
                />
                {draft.trim() && (
                  <button type="submit" className="text-[10px] uppercase font-black tracking-wider text-primary px-1.5 py-0.5 rounded hover:bg-primary/10">
                    Añadir
                  </button>
                )}
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SubtasksSection;
