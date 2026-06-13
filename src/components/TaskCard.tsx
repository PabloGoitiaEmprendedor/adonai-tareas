import { useEffect, useRef, useState, memo, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Paperclip } from 'lucide-react';
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
  due_date?: string | null;
  folder_id?: string | null;
  recurrence_id?: string | null;
  subtasks?: unknown[] | null;
  subtasks_count?: number | null;
  subtask_count?: number | null;
  children?: unknown[] | null;
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
  hideTimer = false,
  highlighted = false,
  notebookView = false
}: TaskCardProps<TTask>) => {
  const { updateTask, createTask } = useTasks();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title || '');
  const [isSubtaskOpen, setIsSubtaskOpen] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const titleTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const subtaskTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerReorderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number; type: string } | null>(null);
  const dragStartedRef = useRef(false);
  const suppressNextClickRef = useRef(false);
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
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest('[data-drag-handle], [data-no-drag], button, a, input, textarea, select')) return;
    if (isEditing || dragIdx === taskIdx || dragStartedRef.current) return;
    setSelectedTask(task);
  };

  const clearPointerReorderTimer = () => {
    if (pointerReorderTimer.current) {
      clearTimeout(pointerReorderTimer.current);
      pointerReorderTimer.current = null;
    }
  };

  const handleCardPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (
      isDone ||
      isEditing ||
      !handlePointerReorderStart ||
      target.closest('[data-no-drag], button, a, input, textarea, select')
    ) {
      return;
    }

    pointerStartRef.current = { x: event.clientX, y: event.clientY, type: event.pointerType };
    clearPointerReorderTimer();
    pointerReorderTimer.current = setTimeout(() => {
      const start = pointerStartRef.current;
      if (!start) return;
      dragStartedRef.current = true;
      suppressNextClickRef.current = true;
      if ('vibrate' in navigator) navigator.vibrate(18);
      if (cardBodyRef.current) cardBodyRef.current.style.touchAction = 'none';
      handlePointerReorderStart(taskIdx, start.x, start.y);
    }, event.pointerType === 'touch' ? 320 : 180);
  };

  const handleCardPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    if (!start || !pointerReorderTimer.current || start.type !== 'touch') return;
    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (moved > 10) {
      clearPointerReorderTimer();
      pointerStartRef.current = null;
    }
  };

  const handleCardPointerEnd = () => {
    clearPointerReorderTimer();
    pointerStartRef.current = null;
    if (dragStartedRef.current) {
      window.setTimeout(() => {
        dragStartedRef.current = false;
        if (cardBodyRef.current) cardBodyRef.current.style.touchAction = '';
      }, 120);
    }
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

  const visibleSubtasks = (Array.isArray(task.children) ? task.children : Array.isArray(task.subtasks) ? task.subtasks : [])
    .filter((item): item is TTask => Boolean(item && typeof item === 'object' && 'id' in item && 'title' in item));

  const hasSubtasks = Boolean(
    visibleSubtasks.length > 0 ||
    (typeof task.subtasks_count === 'number' && task.subtasks_count > 0) ||
    (typeof task.subtask_count === 'number' && task.subtask_count > 0)
  );

  const priorityColor = getTaskPriorityColor();
  const cardStyle = {
    background: 'rgba(255,255,255,0.40)',
    borderRadius: 16,
    borderColor: 'rgba(30,41,59,0.12)',
    boxShadow: highlighted
      ? '0 0 0 2px rgba(195,245,60,0.30), 0 8px 20px rgba(17,24,39,0.08)'
      : '0 4px 12px rgba(17,24,39,0.05)',
    backdropFilter: 'blur(12px)',
  } as CSSProperties;

  return (
    <motion.div
      ref={cardBodyRef}
      layoutId={view === 'weekly' ? task.id : undefined}
      layout={false}
      data-task-idx={taskIdx}
      data-task-id={task.id}
      onDragEnd={() => handleDragEnd?.()}
      onClick={openTaskDetails}
      onPointerDown={handleCardPointerDown}
      onPointerMove={handleCardPointerMove}
      onPointerUp={handleCardPointerEnd}
      onPointerCancel={handleCardPointerEnd}
      initial={view === 'daily' ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1 }}
      exit={view === 'daily' ? { opacity: 0, transition: { duration: 0.08 } } : undefined}
      onDragOver={(e) => handleDragOver?.(e, taskIdx)}
      style={{ ...cardStyle, flexWrap: 'wrap', opacity: isDone ? 0.45 : 1 }}
      className={`relative flex items-start gap-2.5 overflow-hidden border transition-[box-shadow,background,border-color,opacity] duration-150 group/task select-none ${
        notebookView ? 'px-[13px] py-3' : 'px-[13px] py-3'
      } ${
        notebookView ? 'notebook-task-row min-h-[50px]' : 'min-h-[50px]'
      } ${
        highlighted ? 'ring-2 ring-primary/35' : ''
      } ${
        dragIdx === taskIdx ? 'border-primary/55 ring-2 ring-primary/45 shadow-[0_0_18px_rgba(99,102,241,0.24)]' : ''
      } hover:border-primary/18 cursor-grab active:cursor-grabbing`}
    >
      {!isDone && !hideTimer && (
        <div className="relative z-20 order-3 flex-shrink-0" data-no-drag="true">
          <TaskTimerButton
            size="sm"
            priorityColor={priorityColor}
            className="border-transparent bg-transparent text-on-surface-variant/65 shadow-none hover:bg-on-surface-variant/8 hover:text-foreground/75"
            onClick={(e) => handleStartTimer(task, e)}
          />
        </div>
      )}

      {task.link && (
        <div className="relative z-20 order-3 flex flex-shrink-0 items-center gap-1" data-no-drag="true">
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
                className="flex h-6 w-6 items-center justify-center rounded-lg border border-outline/20 bg-surface/35 shadow-sm transition-all hover:bg-surface/70 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
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
      <div className="relative z-20 order-1 flex-shrink-0 cursor-pointer" data-no-drag="true">
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

      <div className={`relative z-10 order-2 flex flex-1 min-w-0 flex-col justify-center ${notebookView ? 'pr-0.5' : 'pr-2'}`}>
        <div className="flex min-w-0 items-start gap-2">
          <div className={`min-w-0 text-[15px] font-semibold tracking-normal transition-all flex flex-1 items-start gap-2 font-headline ${
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
                  className="notebook-task-editor cursor-edit relative z-10 min-h-[20px] w-full min-w-0 bg-transparent p-0 focus:outline-none resize-none overflow-hidden leading-[1.34]"
                  rows={Math.max(1, editedTitle.split('\n').length)}
                  spellCheck={false}
                />
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <span 
                  className="notebook-task-editor cursor-edit relative z-10 inline max-w-full rounded p-0 leading-[1.34] transition-colors hover:text-primary"
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

      {isSubtaskOpen && !isDone && (
        <div className={`order-4 mt-1 flex w-[calc(100%-24px)] flex-col gap-1.5 ${notebookView ? 'ml-6 pl-2' : 'ml-6 pl-2'}`} data-no-drag="true">
          {visibleSubtasks.map((subtask) => {
            const subtaskDone = subtask.status === 'done';
            return (
              <div
                key={subtask.id}
                className="flex min-h-8 items-start gap-2 rounded-[10px] bg-[rgba(247,243,233,0.76)] px-2.5 py-1.5"
                onClick={(event) => event.stopPropagation()}
              >
                <TaskCheckbox
                  checked={subtaskDone}
                  priorityColor={priorityColor}
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    updateTask.mutate({ id: subtask.id, status: subtaskDone ? 'pending' : 'done' });
                  }}
                  ariaLabel="Completar subtarea"
                />
                <span className={`min-w-0 flex-1 break-words pt-px text-[13.5px] font-medium leading-[1.35] ${subtaskDone ? 'text-on-surface-variant/55 line-through' : 'text-foreground'}`}>
                  {subtask.title}
                </span>
              </div>
            );
          })}
          <div className="flex min-h-8 items-start gap-2 rounded-[10px] bg-[rgba(247,243,233,0.76)] px-2.5 py-1.5">
          <TaskCheckbox
            checked={false}
            priorityColor={priorityColor}
            size="sm"
            onClick={() => subtaskTextareaRef.current?.focus()}
            ariaLabel="Subtarea"
          />
          <textarea
            ref={subtaskTextareaRef}
            value={subtaskTitle}
            onChange={(event) => setSubtaskTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                const title = subtaskTitle.trim();
                if (!title) return;
                createTask.mutate({
                  title,
                  parent_task_id: task.id,
                  due_date: task.due_date || new Date().toISOString().slice(0, 10),
                  folder_id: task.folder_id || null,
                  urgency: task.urgency ?? undefined,
                  importance: task.importance ?? undefined,
                  recurrence_id: task.recurrence_id || null,
                  estimated_minutes: task.estimated_minutes ?? undefined,
                  creation_source: 'subtask',
                });
                setSubtaskTitle('');
                setIsSubtaskOpen(true);
                window.setTimeout(() => subtaskTextareaRef.current?.focus(), 0);
              }
              if (event.key === 'Escape') {
                setIsSubtaskOpen(false);
                setSubtaskTitle('');
              }
            }}
            onClick={(event) => event.stopPropagation()}
            placeholder="Nueva subtarea"
            rows={1}
            className="min-h-[20px] w-full resize-none bg-transparent text-[13.5px] font-semibold leading-[1.25] text-foreground outline-none placeholder:text-on-surface-variant/35"
            style={{ overflow: 'hidden' }}
          />
          </div>
        </div>
      )}
      
      <div className="relative z-10 order-3 ml-auto flex max-w-[45%] flex-shrink-0 flex-wrap items-center justify-end gap-1.5">
        {!isDone && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsSubtaskOpen((value) => !value);
              window.setTimeout(() => subtaskTextareaRef.current?.focus(), 0);
            }}
            aria-label={isSubtaskOpen ? 'Recoger subtarea' : 'Desplegar subtarea'}
            className={`flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full border-none bg-transparent text-on-surface-variant/55 transition-[color,opacity] duration-100 active:scale-95 ${
              hasSubtasks || isSubtaskOpen ? 'opacity-100' : 'opacity-100'
            }`}
            data-no-drag="true"
          >
            <ChevronDown className="h-3.5 w-3.5 transition-transform duration-75" strokeWidth={2.6} style={{ transform: isSubtaskOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export const TaskCard = memo(TaskCardComponent) as typeof TaskCardComponent;
