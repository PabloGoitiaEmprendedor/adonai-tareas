import { useEffect, useRef, useState, memo, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { Check, Paperclip, X } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { usePriorityColors } from '@/hooks/usePriorityColors';
import { TaskCheckbox } from './TaskCheckbox';
import { TaskDurationBadge, TaskTimerButton } from './TaskTime';

interface TaskCardProps {
  task: any;
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
  setSelectedTask: (task: any) => void;
  handleComplete: (task: any, e: React.MouseEvent) => void;
  handleUncomplete: (task: any, e: React.MouseEvent) => void;
  handleStartTimer: (task: any, e: React.MouseEvent) => void;
  view: 'daily' | 'weekly';
  hideTimer?: boolean;
  highlighted?: boolean;
}

export const TaskCard = memo(({
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
  setSelectedTask,
  handleComplete,
  handleUncomplete,
  handleStartTimer,
  view,
  hideTimer = true,
  highlighted = false
}: TaskCardProps) => {
  const { updateTask } = useTasks();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const titleTextareaRef = useRef<HTMLTextAreaElement | null>(null);

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
    setEditedTitle(task.title);
    setIsEditing(false);
  };

  const submitEdit = () => {
    const normalizedTitle = editedTitle.replace(/\r\n/g, '\n');
    if (normalizedTitle.trim() && normalizedTitle !== task.title) {
      updateTask.mutate({ id: task.id, title: normalizedTitle });
    }
    setIsEditing(false);
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

  return (
    <motion.div
      layoutId={view === 'weekly' ? task.id : undefined}
      layout={false}
      data-task-idx={taskIdx}
      data-task-id={task.id}
      onDragEnd={() => handleDragEnd?.()}
      initial={view === 'daily' ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1 }}
      exit={view === 'daily' ? { opacity: 0, transition: { duration: 0.08 } } : undefined}
      onDragOver={(e) => handleDragOver?.(e, taskIdx)}
      style={cardStyle}
      onClick={() => setSelectedTask(task)}
      className={`relative flex items-start gap-2 overflow-hidden border px-1.5 py-2 transition-colors group/task md:px-2 ${
        view === 'daily' ? 'min-h-[42px] border-b-transparent' : 'min-h-[42px]'
      } ${highlighted ? 'ring-2 ring-primary/40 bg-primary/5' : ''} border-x-transparent border-t-transparent hover:border-primary/18 cursor-pointer`}
    >
      {/* Drag handle (desktop + mobile): the only area that starts drag */}
      {(
        <div
          data-drag-handle="true"
          draggable
          className="relative z-20 flex h-8 w-5 flex-shrink-0 items-center justify-center rounded-lg text-on-surface-variant/35 hover:bg-on-surface-variant/5 hover:text-on-surface-variant/60 cursor-grab active:cursor-grabbing"
          title="Arrastra para reordenar"
          aria-label="Arrastrar tarea"
          onClick={(e) => e.stopPropagation()}
          onDragStart={(event) => {
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
          onTouchStart={(e) => handleTouchStart?.(taskIdx, e)}
          onTouchMove={(e) => handleTouchMove?.(e)}
          onTouchEnd={() => handleTouchEnd?.()}
          style={{ touchAction: 'none' }}
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

      <div className="relative z-10 flex flex-1 min-w-0 flex-col justify-center pr-2">
        <div className="flex min-w-0 items-start gap-2">
          <div className={`min-w-0 text-[14px] font-semibold tracking-normal transition-all flex flex-1 items-start gap-2 font-headline ${
            isDone || completingTaskId === task.id ? 'text-on-surface-variant/30 line-through' : 'text-foreground'
          }`}>
            {isEditing ? (
              <>
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
                  onKeyDown={e => {
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  onClick={e => e.stopPropagation()}
                  draggable={false}
                  data-no-drag="true"
                  className="cursor-edit relative z-10 min-h-[28px] min-w-0 flex-1 whitespace-pre-wrap break-words bg-transparent px-1 focus:outline-none resize-none overflow-hidden leading-snug"
                  rows={Math.max(1, editedTitle.split('\n').length)}
                  spellCheck={false}
                />
                <div className="flex items-start gap-1.5 pt-0.5" data-no-drag="true" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-xl border border-outline-variant/20 bg-surface/40 text-primary hover:bg-surface/70 active:scale-95 transition-all flex items-center justify-center cursor-click"
                    onClick={submitEdit}
                    aria-label="Guardar"
                    title="Guardar"
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </button>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-xl border border-outline-variant/20 bg-surface/40 text-muted-foreground hover:bg-surface/70 active:scale-95 transition-all flex items-center justify-center cursor-click"
                    onClick={cancelEdit}
                    aria-label="Cancelar"
                    title="Cancelar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              <span 
                className="cursor-edit relative z-10 block min-w-0 flex-1 whitespace-pre-wrap break-words rounded px-1 -ml-1 transition-colors hover:bg-on-surface-variant/5 hover:text-primary leading-snug"
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); setEditedTitle(task.title); }}
                draggable={false}
                data-no-drag="true"
              >
                {task.title}
              </span>
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
});
