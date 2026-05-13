import { useState, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useProfile } from '@/hooks/useProfile';
import { usePriorityColors, getPriorityKey } from '@/hooks/usePriorityColors';
import { format, startOfWeek, addDays } from 'date-fns';
import { Lock } from 'lucide-react';

import { triggerTaskCelebration, triggerDailyCelebration, triggerOnTimeCelebration } from '@/lib/celebrations';
import TaskDetailModal from '@/components/TaskDetailModal';
import FullscreenTimer from '@/components/FullscreenTimer';
import { AISchedulerModal } from '@/components/AISchedulerModal';
import AdonaiCalendarView from '@/components/calendar/AdonaiCalendarView';

const WeeklyPage = () => {
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [timerTask, setTimerTask] = useState<any>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  const [aiModalOpen, setAiModalOpen] = useState(false);

  const weekStart = startOfWeek(selectedDay, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const startDate = format(weekStart, 'yyyy-MM-dd');
  const endDate = format(weekEnd, 'yyyy-MM-dd');

  const tasksFilter = useMemo(() => ({ startDate, endDate, excludeEvents: true }), [startDate, endDate]);
  const { tasks, updateTask } = useTasks(tasksFilter);
  const { profile } = useProfile();

  const getTasksForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return tasks.filter((t) => t.due_date === dateStr);
  };

  const selectedDayTasks = getTasksForDay(selectedDay);

  const handleComplete = (task: any) => {
    setCompletingTaskId(task.id);
    const hadActiveTimer = timerTask?.id === task.id;
    if (hadActiveTimer) setTimerTask(null);

    setTimeout(() => {
      const remainingTasks = selectedDayTasks.filter((t: any) => t.status !== 'done' && t.id !== task.id);
      const isLastTask = selectedDayTasks.length > 0 && remainingTasks.length === 0;

      updateTask.mutate({ 
        id: task.id, 
        status: 'done', 
        completed_at: new Date().toISOString() 
      }, {
        onSuccess: () => {
          setCompletingTaskId(null);
          if (isLastTask) triggerDailyCelebration(profile?.name);
          else if (hadActiveTimer) triggerOnTimeCelebration(task.title, profile?.name);
          else triggerTaskCelebration(task.title, profile?.name);
        },
        onError: () => setCompletingTaskId(null)
      });
    }, 500);
  };

  const handleUncomplete = (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask.mutate({ id: task.id, status: 'pending', completed_at: null });
  };

  const handleStartTimer = (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setTimerTask(task);
  };

  const { colors: priorityColors } = usePriorityColors();

  return (
      <div className="max-w-full mx-auto px-4 pt-2 pb-10 space-y-4">
              {/* Sticky Header Container */}
        <div className="bg-background/60 backdrop-blur-3xl pb-4 -mx-6 px-6 pt-4 border-b border-outline-variant/5">
          {/* Source Switcher - Adonai 360 active, Google Coming Soon */}
          <div className="flex justify-center">
            <div className="flex bg-surface-container-high/30 backdrop-blur-2xl rounded-[20px] p-1 border border-outline-variant/5 shadow-xl">
              <button 
                className="px-6 py-2.5 rounded-[16px] text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-300 bg-primary text-primary-foreground shadow-lg"
              >
                Calendario
              </button>
              <div className="relative">
                <button 
                  disabled
                  className="px-6 py-2.5 rounded-[16px] text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-300 text-on-surface-variant/20 cursor-not-allowed flex items-center gap-1.5"
                >
                  <Lock className="w-2.5 h-2.5" />
                  Google
                </button>
                <span className="absolute -top-1.5 -right-1 bg-primary/20 text-primary text-[6px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border border-primary/20">
                  Pronto
                </span>
              </div>
            </div>
          </div>
        </div>

        <section id="weekly-calendar-main" className="space-y-4 pt-2">
          {/* Adonai 360 Calendar — fully interactive, persists to Supabase */}
          <AdonaiCalendarView
            selectedDate={selectedDay}
            onSelectDate={setSelectedDay}
          />
        </section>

        <TaskDetailModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
        <FullscreenTimer task={timerTask} open={!!timerTask} onClose={() => setTimerTask(null)} />
        <AISchedulerModal 
          open={aiModalOpen} 
          onClose={() => setAiModalOpen(false)} 
          selectedDate={selectedDay} 
        />
      </div>
  );
};

export default WeeklyPage;
