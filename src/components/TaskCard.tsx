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

  const { colors: priorityColors } = usePriorityColors();

  const getPriorityColor = () => {
    if (task.urgency && task.importance) return priorityColors.p1;
    if (task.urgency && !task.importance) return priorityColors.p2;
    if (!task.urgency && task.importance) return priorityColors.p3;
    return priorityColors.p4;
  };

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
      className={`p-4 rounded-[28px] flex items-start gap-3 cursor-pointer transition-all border group/task ${
        isDone || completingTaskId === task.id
          ? 'bg-transparent border-transparent opacity-40' 
          : dragIdx === taskIdx || touchIdx === taskIdx 
            ? 'scale-[1.02] shadow-lg border-primary z-30' 
            : 'hover:border-on-surface-variant/30'
      }`}
      style={{ 
        backgroundColor: (isDone || completingTaskId === task.id) ? 'transparent' : `${getPriorityColor()}40`,
        borderColor: (isDone || completingTaskId === task.id) ? 'transparent' : (dragIdx === taskIdx || touchIdx === taskIdx ? undefined : `${getPriorityColor()}50`)
      }}
    >
      {/* Checkbox */}
      <div className="relative flex-shrink-0 mt-0.5">
        {isDone || completingTaskId === task.id ? (
          <motion.div 
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="w-9 h-9 rounded-[12px] bg-primary flex items-center justify-center cursor-pointer shadow-sm"
            onClick={(e) => handleUncomplete(task, e)}
          >
            <Check className="w-5 h-5 text-primary-foreground stroke-[3]" />
          </motion.div>
        ) : (
          <button onClick={(e) => { e.stopPropagation(); handleComplete(task, e); }}
            className="w-9 h-9 rounded-[12px] border-2 border-outline flex items-center justify-center hover:border-primary hover:bg-primary/10 transition-all active:scale-75 group/check bg-surface"
          >
            <div className="w-3.5 h-3.5 rounded-[6px] bg-primary scale-0 group-hover/check:scale-100 transition-transform duration-300" />
          </button>
        )}
      </div>

      {/* Subtask toggle — between checkbox and title */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setSubtasksOpen(!subtasksOpen);
        }}
        className="flex-shrink-0 mt-2 text-on-surface-variant/40 hover:text-primary transition-colors flex items-center"
      >
        <span className={`text-[16px] font-black inline-block transition-transform ${subtasksOpen ? 'rotate-45 text-primary' : ''}`}>
          +
        </span>
        {hasSubtasks && !subtasksOpen && (
          <span className="text-[9px] font-black text-on-surface-variant/40 ml-0.5">
            {completedSubtasks}/{subtasks.length}
          </span>
        )}
      </button>

      {/* Title + content */}
      <div className="flex-1 min-w-0 relative flex flex-col justify-center min-h-[36px]">
          <div className={`text-[15px] font-black tracking-tight transition-all flex flex-1 items-center gap-2 break-words ${
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
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ml-1 transition-colors ${
                  isOver 
                    ? 'bg-red-500/5 text-red-400/70 border border-red-500/10' 
                    : 'bg-emerald-500/5 text-emerald-400/70 border border-emerald-500/10'
                }`}>
                  {Math.floor(task.actual_duration_seconds / 60)}:{String(task.actual_duration_seconds % 60).padStart(2, '0')}
                </span>
              );
            })()}
          </div>
        
        {(isDone || completingTaskId === task.id) && (
          <motion.div 
            initial={completingTaskId === task.id ? { width: 0 } : { width: '105%' }}
            animate={{ width: '105%' }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-1/2 left-[-2.5%] h-[4px] bg-on-surface-variant/10 -translate-y-1/2 pointer-events-none rounded-full"
          />
        )}

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
      
      <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">

        {/* Green link clip — visible when task has a link */}
        {!isDone && task.link && (
          <a
            href={task.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-8 h-8 rounded-[10px] flex items-center justify-center transition-all active:scale-90 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 hover:scale-110"
            aria-label="Abrir link"
          >
            <LinkIcon className="w-3.5 h-3.5 text-emerald-500" />
          </a>
        )}

        {!isDone && (
          isEditing ? (
            <button
              onClick={(e) => { e.stopPropagation(); submitEdit(); }}
              className="w-8 h-8 rounded-[10px] flex items-center justify-center transition-all active:scale-90 bg-primary shadow-lg shadow-primary/20"
              aria-label="Guardar cambios"
            >
              <Check className="w-4 h-4 text-primary-foreground stroke-[3]" />
            </button>
          ) : (
            <button
              onClick={(e) => handleStartTimer(task, e)}
              className="w-8 h-8 rounded-[10px] border border-outline-variant text-on-surface-variant flex items-center justify-center hover:border-primary hover:text-foreground transition-all active:scale-90 bg-transparent"
              aria-label="Iniciar temporizador"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
          )
        )}
      </div>
    </motion.div>
  );
};
