import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, Link as LinkIcon } from 'lucide-react';
import SubtasksSection from './SubtasksSection';
import { useSubtasks } from '@/hooks/useSubtasks';
import { useTasks } from '@/hooks/useTasks';
import { usePriorityColors } from '@/hooks/usePriorityColors';

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

export const TaskCard = ({
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
  const { subtasks } = useSubtasks(task.id);
  const { updateTask } = useTasks();
  const [subtasksOpen, setSubtasksOpen] = useState(false);
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
      className={`p-4 rounded-[28px] flex items-start gap-4 cursor-pointer transition-all border group/task shadow-sm ${
        isDone || completingTaskId === task.id
          ? 'bg-transparent border-transparent opacity-40' 
          : dragIdx === taskIdx || touchIdx === taskIdx 
            ? `scale-[1.02] shadow-lg border-primary z-30` 
            : `hover:border-on-surface-variant/30 border-outline-variant/10`
      }`}
    >
      {/* Checkbox */}
      <div className="relative flex-shrink-0">
        {isDone || completingTaskId === task.id ? (
          <motion.div 
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="w-10 h-10 rounded-[14px] bg-primary flex items-center justify-center cursor-pointer shadow-sm"
            onClick={(e) => handleUncomplete(task, e)}
          >
            <Check className="w-6 h-6 text-primary-foreground stroke-[3]" />
          </motion.div>
        ) : (
          <button onClick={(e) => { e.stopPropagation(); handleComplete(task, e); }}
            className="w-9 h-9 rounded-[12px] border-2 border-outline flex items-center justify-center hover:border-primary hover:bg-primary/10 transition-all active:scale-75 group/check bg-surface"
          >
            <div className="w-3.5 h-3.5 rounded-[6px] bg-primary scale-0 group-hover/check:scale-100 transition-transform duration-300" />
          </button>
        )}
      </div>

      <div className="flex-1 min-w-0 relative flex flex-col justify-center min-h-[44px]">
        <div className="flex items-center gap-2 mb-1">
          {/* Subtasks Toggle directly to the left of the title */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSubtasksOpen(!subtasksOpen);
            }}
            className="flex-shrink-0 text-on-surface-variant/40 hover:text-primary transition-colors flex items-center"
          >
            <span className={`text-[18px] font-black inline-block transition-transform ${subtasksOpen ? 'rotate-45 text-primary' : ''}`}>
              {"+"}
            </span>
          </button>

          <div className={`text-[16px] font-black tracking-tight transition-all flex flex-1 items-center gap-2 font-headline break-words ${
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

            {isDone && task.actual_duration_seconds > 0 && (() => {
              const isOver = task.estimated_minutes > 0 && task.actual_duration_seconds > (task.estimated_minutes * 60);
              return (
                <span 
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    marginLeft: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '46px',
                    color: isOver ? '#F87171' : '#A3E635',
                    background: isOver ? 'rgba(248, 113, 113, 0.2)' : 'rgba(163, 230, 53, 0.2)',
                    border: `1px solid ${isOver ? 'rgba(248, 113, 113, 0.3)' : 'rgba(163, 230, 53, 0.3)'}`,
                    lineHeight: '1'
                  }}
                >
                  {String(Math.floor(task.actual_duration_seconds / 60)).padStart(2, '0')}:{String(task.actual_duration_seconds % 60).padStart(2, '0')}
                </span>
              );
            })()}
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
      
      <div className="flex items-center gap-1.5 flex-shrink-0">

        {/* Green link clip — visible when task has a link */}
        {!isDone && task.link && (
          <a
            href={task.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-9 h-9 rounded-[12px] flex items-center justify-center transition-all active:scale-90 bg-black/20 border border-white/5 hover:bg-black/30 group/link"
            aria-label="Abrir link"
          >
            <LinkIcon 
              className="w-4 h-4 transition-colors" 
              style={{ color: priorityColor === 'transparent' ? 'var(--primary)' : priorityColor }} 
            />
          </a>
        )}

        {!isDone && (
          isEditing ? (
            <button
              onClick={(e) => { e.stopPropagation(); submitEdit(); }}
              className="w-9 h-9 rounded-[12px] flex items-center justify-center transition-all active:scale-90 bg-primary shadow-lg shadow-primary/20"
              aria-label="Guardar cambios"
            >
              <Check className="w-5 h-5 text-primary-foreground stroke-[3]" />
            </button>
          ) : (
            <button
              onClick={(e) => handleStartTimer(task, e)}
              className="w-9 h-9 rounded-[12px] border border-white/5 flex items-center justify-center transition-all active:scale-90 bg-black/20 hover:bg-black/30"
              aria-label="Iniciar temporizador"
            >
              <Clock 
                className="w-4 h-4" 
                style={{ color: priorityColor === 'transparent' ? 'var(--primary)' : priorityColor }} 
              />
            </button>
          )
        )}
      </div>
    </motion.div>
  );
};
