import { useState, memo, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { Paperclip } from 'lucide-react';
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
  setSelectedTask,
  handleComplete,
  handleUncomplete,
  handleStartTimer,
  view,
  hideTimer = true
}: TaskCardProps) => {
  const { updateTask } = useTasks();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);

  const submitEdit = () => {
    setIsEditing(false);
    if (editedTitle.trim() && editedTitle.trim() !== task.title) {
      updateTask.mutate({ id: task.id, title: editedTitle.trim() });
    } else {
      setEditedTitle(task.title);
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

  return (
    <motion.div
      layoutId={view === 'weekly' ? task.id : undefined}
      layout={false}
      draggable={!isDone}
      onDragStart={(event) => {
        if ((event.target as HTMLElement).closest('[data-no-drag="true"]')) {
          event.preventDefault();
          return;
        }
        handleDragStart?.(taskIdx);
      }}
      onDragEnd={() => handleDragEnd?.()}
      initial={view === 'daily' ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1 }}
      exit={view === 'daily' ? { opacity: 0, transition: { duration: 0.08 } } : undefined}
      onClick={() => setSelectedTask(task)}
      onDragOver={(e) => handleDragOver?.(e, taskIdx)}
      style={cardStyle}
      className={`relative flex items-center gap-2 overflow-hidden border px-1.5 py-0 transition-colors group/task md:px-2 ${
        view === 'daily' ? 'h-[42px] cursor-grab' : 'min-h-[42px] cursor-hand'
      } border-x-transparent border-t-transparent hover:border-primary/18`}
    >
      {!isDone && !hideTimer && (
        <div className="relative z-20 flex-shrink-0" data-no-drag="true">
          <TaskTimerButton
            size="sm"
            onClick={(e) => handleStartTimer(task, e)}
          />
        </div>
      )}

      {!isDone && task.link && (
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
      <div className="cursor-pencil relative z-20 flex-shrink-0" data-no-drag="true">
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

      <div className="relative z-10 flex h-[42px] flex-1 flex-col justify-center min-w-0 pr-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className={`min-w-0 text-[14px] font-semibold tracking-normal transition-all flex flex-1 items-center gap-2 font-headline ${
            isDone || completingTaskId === task.id ? 'text-on-surface-variant/30 line-through' : 'text-foreground'
          }`}>
            {isEditing ? (
              <input
                autoFocus
                value={editedTitle}
                size={Math.max(editedTitle.length, 4)}
                onChange={e => setEditedTitle(e.target.value)}
                onBlur={submitEdit}
                onKeyDown={e => {
                  if (e.key === 'Enter') submitEdit();
                  if (e.key === 'Escape') {
                    setEditedTitle(task.title);
                    setIsEditing(false);
                  }
                }}
                onClick={e => e.stopPropagation()}
                draggable={false}
                data-no-drag="true"
                className="cursor-eraser relative z-10 max-w-full bg-transparent px-1 focus:outline-none"
              />
            ) : (
              <span 
                className="cursor-eraser relative z-10 inline-block max-w-full truncate rounded px-1 -ml-1 transition-colors hover:bg-on-surface-variant/5 hover:text-primary"
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
