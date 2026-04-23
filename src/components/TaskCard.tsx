import { useState } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, Check, Timer, Link as LinkIcon, ChevronRight } from 'lucide-react';
import SubtasksSection from './SubtasksSection';
import { useSubtasks } from '@/hooks/useSubtasks';

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
  const [subtasksOpen, setSubtasksOpen] = useState(subtasks.length > 0);

  const completedSubtasks = subtasks.filter(s => s.status === 'done').length;
  const hasSubtasks = subtasks.length > 0;
  const score = (task.urgency ? 2 : 0) + (task.importance ? 1 : 0);

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
      draggable={!isDone}
      onDragStart={() => handleDragStart(taskIdx)}
      onDragOver={(e) => handleDragOver(e, taskIdx)}
      onDragEnd={handleDragEnd}
      onTouchStart={(e) => !isDone && handleTouchStart(taskIdx, e)}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={() => setSelectedTask(task)}
      className={`p-5 rounded-[32px] flex items-start gap-5 cursor-pointer transition-all border-2 group/task ${
        isDone || completingTaskId === task.id
          ? 'bg-transparent border-transparent opacity-40' 
          : dragIdx === taskIdx || touchIdx === taskIdx 
            ? 'bg-card scale-[1.03] shadow-2xl border-primary z-30' 
            : 'bg-card hover:border-primary/30 shadow-sm border-outline-variant/10'
      }`}
    >
      {!isDone && <GripVertical className="w-5 h-5 mt-2.5 text-on-surface-variant/20 flex-shrink-0 cursor-grab active:cursor-grabbing group-hover/task:text-primary/30 transition-colors" />}
      
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
            className="w-10 h-10 rounded-[14px] border-2 border-outline/40 flex items-center justify-center hover:border-primary hover:bg-primary/10 transition-all active:scale-75 group/check shadow-sm bg-surface"
          >
            <div className="w-4 h-4 rounded-[6px] bg-primary scale-0 group-hover/check:scale-100 transition-transform duration-300" />
          </button>
        )}
      </div>

      <div className="flex-1 min-w-0 relative flex flex-col justify-center min-h-[44px]">
        <div className="flex items-center gap-2 mb-1">
          {score >= 2 && <div className="w-2 h-2 rounded-full bg-error shadow-[0_0_10px_rgba(255,82,82,0.6)] animate-pulse" title="Urgente" />}
          
          {/* Subtasks Toggle directly to the left of the title */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSubtasksOpen(!subtasksOpen);
            }}
            className="flex-shrink-0 text-on-surface-variant/40 hover:text-primary transition-colors flex items-center"
          >
            <span className={`text-[18px] font-black inline-block transition-transform ${subtasksOpen ? 'rotate-90 text-primary' : ''}`}>
              {">"}
            </span>
          </button>

          <h4 className={`text-lg font-black tracking-tight transition-all flex items-center gap-2 font-headline break-words ${
            isDone || completingTaskId === task.id ? 'text-on-surface-variant/30 line-through' : 'text-foreground'
          }`}>
            <span className="relative z-10">{task.title}</span>
            {task.link && (
              <a
                href={task.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-on-surface-variant/40 hover:text-primary hover:scale-125 flex-shrink-0 transition-transform bg-primary/5 p-1 rounded-lg"
                aria-label="Abrir link"
              >
                <LinkIcon className="w-4 h-4" />
              </a>
            )}
            
            {hasSubtasks && !subtasksOpen && (
              <span className="text-[10px] font-black text-on-surface-variant/40 ml-1">
                {completedSubtasks}/{subtasks.length}
              </span>
            )}
          </h4>
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
      
      <div className="flex items-center gap-1 flex-shrink-0">
        {!isDone && (
          <button onClick={(e) => handleStartTimer(task, e)}
            className="w-11 h-11 rounded-[16px] bg-primary flex items-center justify-center hover:bg-primary/90 transition-all shadow-sm active:scale-90 border border-transparent group/timer"
          >
            <Timer className="w-5 h-5 text-primary-foreground" />
          </button>
        )}
      </div>
    </motion.div>
  );
};
