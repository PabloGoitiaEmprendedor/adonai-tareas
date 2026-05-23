import { useState, useMemo } from 'react';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useTasks } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';

import { format, addDays, addMonths, startOfWeek, startOfMonth, endOfMonth, isSameDay, isSameMonth, parseISO, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, MapPin, ExternalLink, CalendarX, RotateCcw } from 'lucide-react';

import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import AdonaiCalendarView from '@/components/calendar/AdonaiCalendarView';
import { TaskCard } from '@/components/TaskCard';

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const rangeStart = startOfMonth(selectedDate);
  const rangeEnd = endOfMonth(selectedDate);
  
  const { events, connected, isLoading: isCalendarLoading } = useCalendarEvents(
    rangeStart.toISOString(), 
    rangeEnd.toISOString()
  );

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const tasksFilter = useMemo(() => ({ date: dateStr, excludeEvents: false }), [dateStr]);
  const { tasks, isLoading: tasksLoading } = useTasks(tasksFilter);
  const activeTasks = useMemo(() => tasks.filter((t: any) => t.status !== 'done'), [tasks]);

  return (
    <div className="themed-cursor min-h-screen bg-background pb-20 lg:pl-20 lg:pb-6">
      <div className="mx-auto w-full max-w-none px-0 pt-0 lg:max-w-[1400px] lg:px-5 lg:pt-2">
        
      <AdonaiCalendarView 
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          viewMode={viewMode}
          dragDisabled={false}
        />

        {/* Task list for selected date */}
        <div className="mx-auto mt-4 max-w-2xl px-4 lg:px-0">
          <h3 className="mb-3 text-sm font-bold tracking-tight text-foreground/60">
            Tareas — {format(selectedDate, "d 'de' MMMM", { locale: es })}
          </h3>
          {tasksLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-container-highest/20" />
              ))}
            </div>
          ) : activeTasks.length > 0 ? (
            <div className="space-y-1">
              {activeTasks.map((task: any, idx: number) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  taskIdx={idx}
                  isDone={false}
                  completingTaskId={null}
                  setSelectedTask={setSelectedTask}
                  handleComplete={(t, e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent('adonai:complete-task', { detail: t.id }));
                  }}
                  handleUncomplete={(t, e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent('adonai:uncomplete-task', { detail: t.id }));
                  }}
                  handleStartTimer={() => {}}
                  hideTimer
                />
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm font-medium text-on-surface-variant/40">
              No hay tareas para este día
            </p>
          )}
        </div>

      </div>
      <BottomNav />
    </div>
  );
};

export default CalendarPage;
