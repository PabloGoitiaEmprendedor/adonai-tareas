import { useState, memo, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { Paperclip } from 'lucide-react';
import SubtasksSection from './SubtasksSection';
import { useSubtasks } from '@/hooks/useSubtasks';
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
  view
}: TaskCardProps) => {
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const { subtasks } = useSubtasks(task.id, { enabled: subtasksOpen });
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

  const completedSubtasks = subtasks.filter(s => s.status === 'done').length;
  const hasSubtasks = subtasks.length > 0;

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
      onDragStart={() => handleDragStart?.(taskIdx)}
      onDragEnd={() => handleDragEnd?.()}
      initial={view === 'daily' ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
      animate={
        view === 'daily' 
        ? { 
            opacity: completingTaskId === task.id ? 0.3 : 1, 
          } 
        : { opacity: 1, scale: 1 }
      }
      exit={view === 'daily' ? { opacity: 0, transition: { duration: 0.12 } } : undefined}
      onClick={() => setSelectedTask(task)}
      onDragOver={(e) => handleDragOver?.(e, taskIdx)}
      style={cardStyle}
      className={`relative flex min-h-[42px] cursor-pointer items-center gap-2 overflow-visible border px-1.5 py-0 transition-colors group/task md:px-2 ${
        isDone || completingTaskId === task.id
          ? 'bg-transparent border-transparent opacity-40' 
          : `border-transparent hover:border-primary/18`
      }`}
    >
      {!isDone && !isEditing && (
        <div className="relative z-10 flex-shrink-0">
          <TaskTimerButton
            size="sm"
            onClick={(e) => handleStartTimer(task, e)}
          />
        </div>
      )}

      {/* Checkbox */}
      <div className="relative z-10 flex-shrink-0">
        <motion.div
          initial={isDone || completingTaskId === task.id ? { scale: 0, rotate: -45 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
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
        </motion.div>
      </div>

      <div className="relative z-10 flex min-h-[42px] flex-1 flex-col justify-center pr-2 min-w-0">
        <div className="flex items-center gap-2">
          <div className={`text-[14px] font-semibold tracking-normal transition-all flex flex-1 items-center gap-2 font-headline break-words ${
            isDone || completingTaskId === task.id ? 'text-on-surface-variant/30 line-through' : 'text-foreground'
          }`}>
            {isEditing ? (
              <input
                autoFocus
                value={editedTitle}
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
                className="cursor-eraser relative z-10 w-full bg-transparent border-b border-primary/35 px-1 focus:outline-none"
              />
            ) : (
              <span 
                className="cursor-eraser relative z-10 rounded px-1 -ml-1 transition-colors flex-1 min-w-0 break-words hover:bg-on-surface-variant/5 hover:text-primary"
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); setEditedTitle(task.title); }}
                draggable={false}
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

        {!isDone && !subtasksOpen && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSubtasksOpen(true);
            }}
            className="absolute -bottom-1 left-0 z-20 inline-flex h-4 items-center rounded-full bg-background/70 px-1.5 text-[8px] font-black uppercase tracking-[0.1em] text-on-surface-variant/28 opacity-0 shadow-sm transition-opacity hover:text-on-surface-variant/55 group-hover/task:opacity-60 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            aria-label="Mostrar subtareas"
          >
            + subtarea
          </button>
        )}
        {!isDone && subtasksOpen && (
          <div className="mt-1">
            <SubtasksSection 
              parentTaskId={task.id} 
              compact 
              isOpen={subtasksOpen} 
              hideToggle={true} 
            />
          </div>
        )}
      </div>
      
      <div className="relative z-10 flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end max-w-[45%]">

        {/* Green link clips — visible when task has a link(s) */}
        {!isDone && task.link && (
          <div className="flex items-center gap-1">
            {task.link.split(/\s+/).filter(Boolean).map((url: string, i: number) => {
              const href = url.startsWith('http') ? url : `https://${url}`;
              return (
              <a
                key={i}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-9 h-9 md:w-8 md:h-8 rounded-[10px] flex items-center justify-center transition-all active:scale-90 bg-surface/50 dark:bg-black/20 border border-outline/50 hover:bg-surface dark:hover:bg-black/40 group/link shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                aria-label="Abrir link"
              >
                <Paperclip 
                  className="w-3.5 h-3.5 transition-colors" 
                  style={{ color: priorityColor === 'transparent' ? 'var(--primary)' : priorityColor }} 
                />
              </a>
              );
            })}
          </div>
        )}

      </div>
    </motion.div>
  );
});
