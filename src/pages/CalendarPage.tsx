import { useState } from 'react';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useTasks } from '@/hooks/useTasks';

import { format, addDays, addMonths, startOfWeek, startOfMonth, endOfMonth, isSameDay, isSameMonth, parseISO, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, MapPin, ExternalLink, CalendarX, RotateCcw } from 'lucide-react';

import { motion } from 'framer-motion';
import BottomNav from '@/components/BottomNav';

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  // Fetch a wide range: current month ± 1 month
  const rangeStart = startOfMonth(addMonths(selectedDate, -1));
  const rangeEnd = endOfMonth(addMonths(selectedDate, 1));
  const timeMin = rangeStart.toISOString();
  const timeMax = rangeEnd.toISOString();
  const { events, connected, isLoading: isCalendarLoading } = useCalendarEvents(timeMin, timeMax);
  const { tasks: adonaiTasks, isLoading: isTasksLoading } = useTasks({ 
    startDate: format(rangeStart, 'yyyy-MM-dd'), 
    endDate: format(rangeEnd, 'yyyy-MM-dd') 
  });

  const isLoading = isCalendarLoading || isTasksLoading;

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const monthDays = eachDayOfInterval({ start: startOfWeek(monthStart, { weekStartsOn: 1 }), end: addDays(startOfWeek(addDays(monthEnd, 6), { weekStartsOn: 1 }), -1) });
  // Ensure we have full weeks
  while (monthDays.length % 7 !== 0) monthDays.push(addDays(monthDays[monthDays.length - 1], 1));

  const dayEvents = events.filter((e) => {
    const eventDate = parseISO(e.start);
    return isSameDay(eventDate, selectedDate);
  });

  const adonaiTasksForDay = adonaiTasks.filter((t: any) => {
    return t.due_date === format(selectedDate, 'yyyy-MM-dd');
  });

  const goWeek = (dir: number) => setSelectedDate(addDays(selectedDate, dir * 7));

  const goMonth = (dir: number) => setSelectedDate(addMonths(selectedDate, dir));

  return (
    <div className="min-h-screen bg-background pb-24 lg:pl-20 lg:pb-6">
      <div className="max-w-[430px] lg:max-w-[800px] mx-auto px-5 pt-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-on-surface-variant text-xs font-medium uppercase tracking-widest">Calendario</span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {format(selectedDate, "MMMM yyyy", { locale: es })}
            </h1>
          </div>
          <div className="flex bg-surface-container-low rounded-lg p-0.5">
            <button onClick={() => setViewMode('week')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'week' ? 'bg-primary text-primary-foreground' : 'text-on-surface-variant'}`}>Sem</button>
            <button onClick={() => setViewMode('month')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'month' ? 'bg-primary text-primary-foreground' : 'text-on-surface-variant'}`}>Mes</button>
          </div>
        </div>

        {viewMode === 'week' ? (
          <div className="flex items-center gap-2">
            <button onClick={() => goWeek(-1)} className="p-2 rounded-lg bg-surface-container-low">
              <ChevronLeft className="w-4 h-4 text-on-surface-variant" />
            </button>
            <div className="flex-1 grid grid-cols-7 gap-1">
              {weekDays.map((day) => {
                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                const dayHasEvents = events.some((e) => isSameDay(parseISO(e.start), day));
                return (
                  <button key={day.toISOString()} onClick={() => setSelectedDate(day)}
                    className={`flex flex-col items-center py-2 rounded-lg transition-all ${isSelected ? 'bg-primary text-primary-foreground' : isToday ? 'bg-primary/10' : 'hover:bg-surface-container-high'}`}>
                    <span className={`text-[10px] uppercase ${isSelected ? 'text-primary-foreground' : 'text-on-surface-variant'}`}>
                      {format(day, 'EEE', { locale: es }).slice(0, 2)}
                    </span>
                    <span className={`text-sm font-bold ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>{format(day, 'd')}</span>
                    {dayHasEvents && !isSelected && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
                  </button>
                );
              })}
            </div>
            <button onClick={() => goWeek(1)} className="p-2 rounded-lg bg-surface-container-low">
              <ChevronRight className="w-4 h-4 text-on-surface-variant" />
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => goMonth(-1)} className="p-2 rounded-lg bg-surface-container-low">
                <ChevronLeft className="w-4 h-4 text-on-surface-variant" />
              </button>
              <button onClick={() => goMonth(1)} className="p-2 rounded-lg bg-surface-container-low">
                <ChevronRight className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map(d => (
                <span key={d} className="text-center text-[10px] text-on-surface-variant font-bold uppercase">{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((day) => {
                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                const inMonth = isSameMonth(day, selectedDate);
                const dayHasEvents = events.some((e) => isSameDay(parseISO(e.start), day));
                return (
                  <button key={day.toISOString()} onClick={() => setSelectedDate(day)}
                    className={`flex flex-col items-center py-1.5 rounded-lg transition-all ${isSelected ? 'bg-primary text-primary-foreground' : isToday ? 'bg-primary/10' : !inMonth ? 'opacity-30' : 'hover:bg-surface-container-high'}`}>
                    <span className={`text-xs font-medium ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>{format(day, 'd')}</span>
                    {dayHasEvents && !isSelected && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Combined Lists */}
        {(dayEvents.length > 0 || adonaiTasksForDay.length > 0) ? (
          <div className="space-y-4">
            {/* Adonai Tasks Section */}
            {adonaiTasksForDay.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-primary px-1">Tareas Adonai</h3>
                {adonaiTasksForDay.map((task: any) => (
                  <motion.div key={task.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                    className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/5 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${task.status === 'done' ? 'bg-primary' : 'bg-outline-variant'}`} />
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-bold ${task.status === 'done' ? 'line-through opacity-50' : ''}`}>{task.title}</h4>
                      <p className="text-[10px] text-on-surface-variant/60 flex items-center gap-1">
                        {task.recurrence_id && <RotateCcw className="w-2.5 h-2.5" />}
                        {task.isVirtual ? 'Recurrente' : 'Planificada'}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Google Calendar Events Section */}
            {dayEvents.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-secondary px-1">Eventos Google</h3>
                {dayEvents.map((event) => (
                  <motion.div key={event.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-surface-container-low p-4 rounded-xl space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-foreground truncate">{event.title}</h3>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {event.allDay ? 'Todo el día' : `${format(parseISO(event.start), 'h:mm aa')} - ${format(parseISO(event.end), 'h:mm aa')}`}
                        </p>
                      </div>
                      {event.htmlLink && (
                        <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="text-on-surface-variant hover:text-primary flex-shrink-0">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-surface-container-low p-10 rounded-2xl text-center space-y-3">
            <div className="w-16 h-16 bg-surface-container-high rounded-full flex items-center justify-center mx-auto opacity-40">
               <CalendarX className="w-8 h-8 text-on-surface-variant" />
            </div>
            <p className="text-on-surface-variant text-sm font-medium">Sin planes para este día</p>
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
};

export default CalendarPage;
