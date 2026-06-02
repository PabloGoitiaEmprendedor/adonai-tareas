import { useState, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useProfile } from '@/hooks/useProfile';
import { usePriorityColors, getPriorityKey } from '@/hooks/usePriorityColors';
import { format, startOfWeek, addDays } from 'date-fns';

import { triggerTaskCelebration, triggerDailyCelebration, triggerOnTimeCelebration } from '@/lib/celebrations';
import TaskDetailModal from '@/components/TaskDetailModal';
import FullscreenTimer from '@/components/FullscreenTimer';
import { AISchedulerModal } from '@/components/AISchedulerModal';
import AdonaiCalendarView from '@/components/calendar/AdonaiCalendarView';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { GoogleCalendarConnectModal } from '@/components/ui/google-calendar-connect-modal';
import type { TaskLike } from '@/lib/taskTypes';

const WeeklyPage = () => {
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [selectedTask, setSelectedTask] = useState<TaskLike | null>(null);
  const [timerTask, setTimerTask] = useState<TaskLike | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  const [aiModalOpen, setAiModalOpen] = useState(false);

  const weekStart = startOfWeek(selectedDay, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const startDate = format(weekStart, 'yyyy-MM-dd');
  const endDate = format(weekEnd, 'yyyy-MM-dd');

  const tasksFilter = useMemo(() => ({ startDate, endDate, excludeEvents: true }), [startDate, endDate]);
  const { tasks, updateTask } = useTasks(tasksFilter);
  const { profile } = useProfile();

  const { connected: calendarConnected, hasConnectedBefore, isLoading: calendarIntegrationLoading } = useCalendarIntegration();
  const { events: googleCalendarEvents } = useCalendarEvents(
    new Date(weekStart).toISOString(),
    new Date(weekEnd).toISOString()
  );

  const getTasksForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return tasks.filter((t) => t.due_date === dateStr);
  };

  const selectedDayTasks = getTasksForDay(selectedDay);

  const handleComplete = (task: TaskLike) => {
    setCompletingTaskId(task.id);
    const hadActiveTimer = timerTask?.id === task.id;
    if (hadActiveTimer) setTimerTask(null);

    const remainingTasks = selectedDayTasks.filter((t) => t.status !== 'done' && t.id !== task.id);
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
  };

  const handleUncomplete = (task: TaskLike, e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask.mutate({ id: task.id, status: 'pending', completed_at: null });
  };

  const handleStartTimer = (task: TaskLike, e: React.MouseEvent) => {
    e.stopPropagation();
    setTimerTask(task);
  };

  const { colors: priorityColors } = usePriorityColors();

  return (
      <div className="max-w-full mx-auto px-0 sm:px-4 pt-2 pb-10 space-y-4">
        <section id="weekly-calendar-main" className="relative space-y-4 pt-2 px-0">
          <AdonaiCalendarView
            selectedDate={selectedDay}
            onSelectDate={setSelectedDay}
            dragDisabled={false}
            className="overflow-visible"
            googleEvents={googleCalendarEvents}
          />

          <GoogleCalendarConnectModal
            open={!calendarIntegrationLoading && !calendarConnected && !hasConnectedBefore}
            mode="inline"
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
