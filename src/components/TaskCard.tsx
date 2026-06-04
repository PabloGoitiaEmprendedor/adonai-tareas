import { useEffect, useRef, useState, memo, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { Paperclip } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { usePriorityColors } from '@/hooks/usePriorityColors';
import { TaskCheckbox } from './TaskCheckbox';
import { TaskDurationBadge, TaskTimerButton } from './TaskTime';

type TaskCardTask = {
  id: string;
  title?: string;
  link?: string | null;
  actual_duration_seconds?: number | null;
  estimated_minutes?: number | null;
  urgency?: boolean | null;
  importance?: boolean | null;
  status?: string | null;
};

interface TaskCardProps<TTask extends TaskCardTask> {
  task: TTask;
  taskIdx: number;
  isDone: boolean;
  completingTaskId: string | null;
  dragIdx?: number | null;
  touchIdx?: number | null;
  handleDragStart?: (idx: number) => void;
  handleDragOver?: (e: React.DragEvent, idx: number) => void;
  handleDragEnd?: () => void;
  handleTouchStart?: (idx: number, e: React.TouchEvent) => void;
  handleTouchMove?: (e: React.TouchEvent) => void;
  handleTouchEnd?: () => void;
  handlePointerReorderStart?: (idx: number, clientX: number, clientY: number) => void;
  setSelectedTask: (task: TTask) => void;
  handleComplete: (task: TTask, e: React.MouseEvent) => void;
  handleUncomplete: (task: TTask, e: React.MouseEvent) => void;
  handleStartTimer: (task: TTask, e: React.MouseEvent) => void;
  view: 'daily' | 'weekly';
  hideTimer?: boolean;
  highlighted?: boolean;
  notebookView?: boolean;
}

const TaskCardComponent = <TTask extends TaskCardTask,>({
  task,
  taskIdx,
  isDone,
  completingTaskId,
  dragIdx,
  handleDragStart,
  handleDragOver,
  handleDragEnd,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  handlePointerReorderStart,
  setSelectedTask,
  handleComplete,
  handleUncomplete,
  handleStartTimer,
  view,
  hideTimer = true,
  highlighted = false,
  notebookView = false
}: TaskCardProps<TTask>) => {
  const { updateTask } = useTasks();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title || '');
  const titleTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartedRef = useRef(false);
  const cardBodyRef = useRef<HTMLDivElement | null>(null);
  const skipNextBlurSubmitRef = useRef(false);

  const resizeTitleEditor = () => {
    const editor = titleTextareaRef.current;
    if (!editor) return;
    editor.style.height = 'auto';
    editor.style.height = `${Math.min(editor.scrollHeight, 260)}px`;
  };

  useEffect(() => {
    if (!isEditing) return;
    resizeTitleEditor();
  }, [isEditing, editedTitle]);

  const cancelEdit = () => {
    skipNextBlurSubmitRef.current = true;
    setEditedTitle(task.title || '');
    setIsEditing(false);
    window.dispatchEvent(new CustomEvent('adonai:task-editing-change', { detail: { active: false } }));
  };

  const submitEdit = () => {
    const normalizedTitle = editedTitle.replace(/\r\n/g, '\n');
    if (normalizedTitle.trim() && normalizedTitle !== task.title) {
      updateTask.mutate({ id: task.id, title: normalizedTitle });
    }
    setIsEditing(false);
    window.dispatchEvent(new CustomEvent('adonai:task-editing-change', { detail: { active: false } }));
  };

  const startTitleEdit = () => {
    skipNextBlurSubmitRef.current = false;
    setIsEditing(true);
    setEditedTitle(task.title || '');
    window.dispatchEvent(new CustomEvent('adonai:task-editing-change', { detail: { active: true } }));
  };

  const handleEditorBlur = () => {
    if (skipNextBlurSubmitRef.current) {
      skipNextBlurSubmitRef.current = false;
      return;
    }
    submitEdit();
  };

  const openTaskDetails = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-drag-handle], [data-no-drag], button, a, input, textarea, select')) return;
    if (isEditing || dragIdx === taskIdx || dragStartedRef.current) return;
    setSelectedTask(task);
  };

  const handleBodyTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-drag-handle]') || target.closest('[data-no-drag]') || target.closest('button, a, input, textarea, select')) return;
    dragStartedRef.current = false;
    longPressTimer.current = setTimeout(() => {
      dragStartedRef.current = true;
      if ('vibrate' in navigator) navigator.vibrate(20);
      if (cardBodyRef.current) cardBodyRef.current.style.touchAction = 'none';
      handleTouchStart?.(taskIdx, e);
    }, 1000);
  };

  const handleBodyTouchMove = (e: React.TouchEvent) => {
    if (!dragStartedRef.current) {
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
      return;
    }
    e.preventDefault();
    handleTouchMove?.(e);
  };

  const handleBodyTouchEnd = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    if (dragStartedRef.current) {
      dragStartedRef.current = false;
      if (cardBodyRef.current) cardBodyRef.current.style.touchAction = '';
      handleTouchEnd?.();
    }
  };

  const { colors } = usePriorityColors();

  const getTaskPriorityColor = () => {
    if (task.urgency && task.importance) return colors.p1;
    if (task.urgency && !task.importance) return colors.p2;
    if (!task.urgency && task.importance) return colors.p3;
    return colors.p4; // Will be 'transparent' by default
  };

  const priorityColor = getTaskPriorityColor();
  const cardStyle = {
    background: 'transparent',
    borderRadius: '18px 15px 20px 16px',
  } as CSSProperties;
  const dragHandleStyle: CSSProperties & { WebkitTouchCallout?: string } = {
    touchAction: 'none',
    WebkitTouchCallout: 'none',
    userSelect: 'none',
  };

  return (
    <motion.div
      ref={cardBodyRef}
      layoutId={view === 'weekly' ? task.id : undefined}
      layout={notebookView ? 'position' : false}
      transition={{ layout: { duration: 0.08, ease: [0.2, 0.8, 0.2, 1] } }}
      data-task-idx={taskIdx}
      data-task-id={task.id}
      onDragEnd={() => handleDragEnd?.()}
      onClick={openTaskDetails}
      initial={view === 'daily' ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1 }}
      exit={view === 'daily' ? { opacity: 0, transition: { duration: 0.08 } } : undefined}
      onDragOver={(e) => handleDragOver?.(e, taskIdx)}
      style={cardStyle}
      className={`relative flex items-start gap-2 overflow-hidden border py-2 transition-all group/task select-none ${
        notebookView ? 'px-1' : 'px-1.5 md:px-2'
      } ${
        notebookView ? 'notebook-task-row min-h-[42px]' : view === 'daily' ? 'min-h-[42px] border-b-transparent border-x-transparent border-t-transparent' : 'min-h-[42px] border-x-transparent border-t-transparent'
      } ${
        highlighted ? 'ring-2 ring-primary/40 bg-primary/5' : ''
      } ${
        dragIdx === taskIdx ? 'border-primary/55 bg-primary/5 ring-2 ring-primary/45 shadow-[0_0_18px_rgba(99,102,241,0.24)]' : ''
      } border-x-transparent border-t-transparent hover:border-primary/18 cursor-pointer`}
    >
        {/* Drag handle (desktop + mobile): the only area that starts drag */}
      {(
        <div
          data-drag-handle="true"
          draggable={Boolean(handleDragStart) && !handlePointerReorderStart}
          className="relative z-20 flex h-8 w-5 flex-shrink-0 items-center justify-center rounded-lg text-on-surface-variant/35 hover:bg-on-surface-variant/5 hover:text-on-surface-variant/60 cursor-grab active:cursor-grabbing select-none"
          title="Arrastra para reordenar"
          aria-label="Arrastrar tarea"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(event) => {
            if (isDone || isEditing) return;
            event.preventDefault();
            event.stopPropagation();
            dragStartedRef.current = true;
            if (longPressTimer.current) {
              clearTimeout(longPressTimer.current);
              longPressTimer.current = null;
            }
            if (cardBodyRef.current) cardBodyRef.current.style.touchAction = 'none';
            handlePointerReorderStart?.(taskIdx, event.clientX, event.clientY);
          }}
          onDragStart={(event) => {
            if (handlePointerReorderStart) {
              event.preventDefault();
              return;
            }
            event.stopPropagation();
            try {
              event.dataTransfer?.setData('text/plain', String(task.id ?? taskIdx));
              event.dataTransfer!.effectAllowed = 'move';
            } catch {
              // Ignore.
            }
            handleDragStart?.(taskIdx);
          }}
          onDragEnd={() => handleDragEnd?.()}
          onTouchStart={(e) => {
            if (handlePointerReorderStart) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            e.preventDefault();
            e.stopPropagation();
            dragStartedRef.current = false;
            longPressTimer.current = setTimeout(() => {
              dragStartedRef.current = true;
              if ('vibrate' in navigator) navigator.vibrate(20);
              handleTouchStart?.(taskIdx, e);
            }, 1000);
          }}
          onTouchMove={(e) => {
            if (!dragStartedRef.current) {
              if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
              return;
            }
            e.preventDefault();
            handleTouchMove?.(e);
          }}
          onTouchEnd={() => {
            if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
            if (dragStartedRef.current) {
              dragStartedRef.current = false;
              handleTouchEnd?.();
            }
          }}
          style={dragHandleStyle}
        >
          <span className="flex flex-col gap-0.5">
            <span className="block h-1 w-1 rounded-full bg-current opacity-70" />
            <span className="block h-1 w-1 rounded-full bg-current opacity-40" />
            <span className="block h-1 w-1 rounded-full bg-current opacity-70" />
          </span>
        </div>
      )}
      {!isDone && !hideTimer && (
        <div className="relative z-20 flex-shrink-0" data-no-drag="true">
          <TaskTimerButton
            size="sm"
            onClick={(e) => handleStartTimer(task, e)}
          />
        </div>
      )}

      {task.link && (
        <div className="relative z-20 flex flex-shrink-0 items-center gap-1" data-no-drag="true">
          {task.link.split(/\s+/).filter(Boolean).map((url: string, i: number) => {
            const href = url.startsWith('http') ? url : `https://${url}`;
            return (
              <a
                key={i}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                draggable={false}
                className="flex h-7 w-7 items-center justify-center rounded-[9px] border border-outline/35 bg-surface/35 shadow-sm transition-all hover:bg-surface/70 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
                aria-label="Abrir link"
              >
                <Paperclip
                  className="h-3.5 w-3.5 transition-colors"
                  style={{ color: priorityColor === 'transparent' ? 'var(--primary)' : priorityColor }}
                />
              </a>
            );
          })}
        </div>
      )}

      {/* Checkbox */}
      <div className="relative z-20 flex-shrink-0 cursor-pointer" data-no-drag="true">
        <TaskCheckbox
          checked={isDone || completingTaskId === task.id}
          priorityColor={priorityColor}
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            if (isDone || completingTaskId === task.id) handleUncomplete(task, e);
            else handleComplete(task, e);
          }}
        />
      </div>

      <div className={`relative z-10 flex flex-1 min-w-0 flex-col justify-center ${notebookView ? 'pr-0.5' : 'pr-2'}`}>
        <div className="flex min-w-0 items-start gap-2">
          <div className={`min-w-0 text-[12.5px] md:text-[14px] font-semibold tracking-normal transition-all flex flex-1 items-start gap-2 font-headline ${
            isDone || completingTaskId === task.id ? 'text-on-surface-variant/30 line-through' : 'text-foreground'
          }`}>
            {isEditing ? (
              <div className="min-w-0 flex-1" data-no-drag="true">
                <textarea
                  ref={titleTextareaRef}
                  autoFocus
                  value={editedTitle}
                  onChange={e => setEditedTitle(e.target.value)}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 220) + 'px';
                  }}
                  onBlur={handleEditorBlur}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submitEdit();
                    }
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  onClick={e => e.stopPropagation()}
                  draggable={false}
                  data-no-drag="true"
                  className="notebook-task-editor cursor-edit relative z-10 min-h-[1.35em] w-full min-w-0 bg-transparent px-1 focus:outline-none resize-none overflow-hidden leading-[1.2]"
                  rows={Math.max(1, editedTitle.split('\n').length)}
                  spellCheck={false}
                />
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <span 
                  className="notebook-task-editor cursor-edit relative z-10 inline max-w-full rounded px-1 -ml-1 leading-[1.2] transition-colors hover:bg-on-surface-variant/5 hover:text-primary"
                  onClick={(e) => { e.stopPropagation(); startTitleEdit(); }}
                  draggable={false}
                  data-no-drag="true"
                >
                  {task.title}
                </span>
              </div>
            )}

            {isDone && task.actual_duration_seconds > 0 && (
              <TaskDurationBadge
                seconds={task.actual_duration_seconds}
                estimatedMinutes={task.estimated_minutes}
                compact
                className="ml-2"
              />
            )}
          </div>
        </div>
      </div>
      
      <div className="relative z-10 flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end max-w-[45%]">
      </div>
    </motion.div>
  );
};

export const TaskCard = memo(TaskCardComponent) as typeof TaskCardComponent;
