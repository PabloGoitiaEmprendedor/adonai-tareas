import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Check, Link as LinkIcon, Paperclip } from 'lucide-react';
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
  dragIdx: number | null;
  touchIdx: number | null;
  handleDragStart: (idx: number) => void;
  handleDragOver: (e: React.DragEvent, idx: number) => void;
  handleDragEnd: () => void;
  handleTouchStart: (idx: number, e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
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
  touchIdx,
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
  // If transparent, use transparent, otherwise append 4D for ~30% opacity
  const backgroundColor = priorityColor === 'transparent' ? 'transparent' : `${priorityColor}4D`;

  return (
    <motion.div
      layoutId={view === 'weekly' ? task.id : undefined}
      layout={view === 'daily' ? true : undefined}
      initial={view === 'daily' ? { opacity: 0, x: -20 } : { opacity: 0, scale: 0.95 }}
      animate={
        view === 'daily' 
        ? { 
            opacity: completingTaskId === task.id ? 0.3 : 1, 
            x: 0,
            scale: completingTaskId === task.id ? 0.98 : 1
          } 
        : { opacity: 1, scale: 1 }
      }
      exit={view === 'daily' ? { opacity: 0, scale: 0.8, transition: { duration: 0.2 } } : undefined}
      onClick={() => setSelectedTask(task)}
      style={{ backgroundColor }}
      className={`p-5 rounded-[28px] flex items-start gap-4 cursor-pointer transition-all border group/task shadow-sm hover:shadow-xl hover:shadow-black/20 ${
        isDone || completingTaskId === task.id
          ? 'bg-transparent border-transparent opacity-40' 
          : dragIdx === taskIdx || touchIdx === taskIdx 
            ? `scale-[1.02] shadow-2xl border-primary z-30` 
            : `hover:border-primary/20 border-white/5 bg-white/[0.01]`
      }`}
    >
      {/* Checkbox */}
      <div className="relative flex-shrink-0 pt-1">
        <motion.div
          initial={isDone || completingTaskId === task.id ? { scale: 0, rotate: -45 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <TaskCheckbox
            checked={isDone || completingTaskId === task.id}
            priorityColor={priorityColor}
            size="md"
            onClick={(e) => {
              e.stopPropagation();
              if (isDone || completingTaskId === task.id) handleUncomplete(task, e);
              else handleComplete(task, e);
            }}
          />
        </motion.div>
      </div>

      <div className="flex-1 min-w-0 relative flex flex-col justify-center min-h-[44px] pr-2">
        <div className="flex items-center gap-2 mb-1">
          {/* Subtasks Toggle directly to the left of the title */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSubtasksOpen(!subtasksOpen);
            }}
            className="flex-shrink-0 text-white/30 hover:text-primary transition-all flex items-center justify-center w-8 h-8 hover:bg-white/5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label={subtasksOpen ? 'Ocultar subtareas' : 'Mostrar subtareas'}
          >
            <span className={`text-[16px] font-black inline-block transition-transform duration-300 ${subtasksOpen ? 'rotate-45 text-primary scale-110' : 'group-hover/task:scale-110'}`}>
              {"+"}
            </span>
          </button>

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
                className="bg-transparent border-b border-primary focus:outline-none relative z-10 w-full"
              />
            ) : (
              <span 
                className="relative z-10 cursor-text hover:bg-on-surface-variant/5 rounded px-1 -ml-1 transition-colors flex-1 min-w-0 break-words"
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); setEditedTitle(task.title); }}
                title="Haz clic para editar"
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

        {!isDone && (
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
      
      <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end max-w-[45%]">

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

        {!isDone && (
          isEditing ? (
            <button
              onClick={(e) => { e.stopPropagation(); submitEdit(); }}
              className="w-9 h-9 md:w-8 md:h-8 rounded-[10px] flex items-center justify-center transition-all active:scale-90 bg-primary shadow-lg shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label="Guardar cambios"
            >
              <Check className="w-4 h-4 text-primary-foreground stroke-[3]" />
            </button>
          ) : (
            <TaskTimerButton
              priorityColor={priorityColor}
              onClick={(e) => handleStartTimer(task, e)}
            />
          )
        )}
      </div>
    </motion.div>
  );
});
