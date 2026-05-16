import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import { useSubtasks } from '@/hooks/useSubtasks';
import { TaskCheckbox } from './TaskCheckbox';

interface Props {
  parentTaskId: string | null | undefined;
  defaultOpen?: boolean;
  compact?: boolean;
  isOpen?: boolean;
  hideToggle?: boolean;
}

/**
 * Subtask list with "> NAME" minimalist pattern.
 * Collapsed: shows ">" chevron with count.
 * Expanded: shows subtasks and inline create input — cursor auto-focuses.
 * Used inside TaskDetailModal and inline on DailyPage cards.
 */
export const SubtasksSection = ({ parentTaskId, defaultOpen = false, compact = false, isOpen, hideToggle = false }: Props) => {
  const { subtasks, createSubtask, toggleSubtask, deleteSubtask, updateSubtask } = useSubtasks(parentTaskId);
  const [internalOpen, setInternalOpen] = useState(defaultOpen || subtasks.length > 0);
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = (o: boolean | ((prev: boolean) => boolean)) => {
    if (typeof o === 'function') {
      setInternalOpen(prev => o(prev));
    } else {
      setInternalOpen(o);
    }
  };
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isVirtual = !parentTaskId || parentTaskId.startsWith('virtual-');

  // Auto-focus input when section opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const t = draft.trim();
    if (!t || isVirtual) return;
    createSubtask.mutate(t, {
      onSuccess: () => {
        setDraft('');
        // Re-focus after creating so user can keep adding
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    });
  };

  if (isVirtual) {
    return compact ? null : (
      <p className="text-[11px] text-on-surface-variant/40 italic font-medium">
        Las subtareas se habilitan al guardar la tarea recurrente.
      </p>
    );
  }

  const completed = subtasks.filter(s => s.status === 'done').length;

  const SubtaskItem = ({ st }: { st: any }) => {
    const done = st.status === 'done';
    const [isEditing, setIsEditing] = useState(false);
    const [draftTitle, setDraftTitle] = useState(st.title);

    const submitEdit = () => {
      setIsEditing(false);
      if (draftTitle.trim() && draftTitle.trim() !== st.title) {
        updateSubtask.mutate({ id: st.id, title: draftTitle.trim() });
      } else {
        setDraftTitle(st.title);
      }
    };

    return (
      <motion.div 
        layout
        className="flex items-center gap-3 group relative"
      >
        {/* Checkbox */}
        <div className="relative flex-shrink-0">
          <motion.div
            initial={done ? { scale: 0, rotate: -45 } : false}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <TaskCheckbox
              checked={done}
              size="lg"
              onClick={(e) => {
                e.stopPropagation();
                toggleSubtask.mutate({ id: st.id, done: !done });
              }}
            />
          </motion.div>
        </div>

        {/* Task text */}
        {isEditing ? (
          <input
            autoFocus
            value={draftTitle}
            onChange={e => setDraftTitle(e.target.value)}
            onBlur={submitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') submitEdit();
              if (e.key === 'Escape') {
                setDraftTitle(st.title);
                setIsEditing(false);
              }
            }}
            onClick={e => e.stopPropagation()}
            className="flex-1 bg-transparent border-b border-primary focus:outline-none p-0 text-sm font-bold tracking-tight font-headline text-foreground min-w-0"
          />
        ) : (
          <span 
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
              setDraftTitle(st.title);
            }}
            title="Haz clic para editar"
            className={`flex-1 text-[15px] font-bold tracking-tight font-headline cursor-text transition-all leading-tight rounded-xl px-2 py-1 -ml-2 hover:bg-white/5 min-w-0 break-words ${
              done ? 'text-white/20 line-through' : 'text-foreground'
            }`}
          >
            {st.title}
          </span>
        )}

        {/* Delete button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteSubtask.mutate(st.id);
          }}
          className="opacity-0 group-hover:opacity-100 text-on-surface-variant/10 hover:text-red-500 transition-all p-2 absolute right-0 bg-card rounded-md"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    );
  };

  return (
    <div className={compact ? 'mt-2' : 'space-y-2'}>
      {!hideToggle && (
      <div className="flex items-center gap-2 mb-1">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
          className="flex items-center gap-1.5 text-on-surface-variant/40 hover:text-primary transition-all"
        >
          {open ? (
            <div className="flex items-center gap-1">
              <ChevronRight className="w-3.5 h-3.5 rotate-90 text-primary" />
              {subtasks.length > 0 && (
                <span className="text-[10px] font-black text-primary/60">
                  {completed}/{subtasks.length}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-[14px] font-black">{">"}</span>
              {subtasks.length > 0 && (
                <span className="text-[10px] font-black opacity-60">
                  {completed}/{subtasks.length}
                </span>
              )}
            </div>
          )}
        </button>
      </div>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pl-4 space-y-3 py-2">
              {subtasks.map((st) => (
                <SubtaskItem key={st.id} st={st} />
              ))}

              {/* Always show the input directly — no two-step reveal */}
              <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="flex items-center gap-3 pt-2">
                <div className="w-10 h-10 rounded-[14px] border-2 border-white/5 flex items-center justify-center bg-white/[0.02] flex-shrink-0 opacity-40">
                   <span className="text-white/20 text-lg font-black">+</span>
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Nueva subtarea…"
                  className="flex-1 bg-transparent border-none p-0 text-[15px] font-bold tracking-tight font-headline text-foreground focus:outline-none focus:ring-0 placeholder:text-white/10"
                />
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


export default SubtasksSection;
