import { useState } from 'react';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useTasks } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';

import { format, addDays, addMonths, startOfWeek, startOfMonth, endOfMonth, isSameDay, isSameMonth, parseISO, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, MapPin, ExternalLink, CalendarX, RotateCcw } from 'lucide-react';

import { motion } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import GoogleCalendarView from '@/components/calendar/GoogleCalendarView';

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [source, setSource] = useState<'adonai' | 'google'>('adonai');

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

  const dayEvents = (events || []).filter((e) => {
    const eventDate = parseISO(e.start);
    return isSameDay(eventDate, selectedDate);
  });

  const adonaiTasksForDay = (adonaiTasks || []).filter((t: any) => {
    return t.due_date === format(selectedDate, 'yyyy-MM-dd');
  });

  const goWeek = (dir: number) => setSelectedDate(addDays(selectedDate, dir * 7));

  const goMonth = (dir: number) => setSelectedDate(addMonths(selectedDate, dir));

  const handleGoogleConnect = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('google-auth', {
        body: { 
          action: 'get-url', 
          redirect_uri: window.location.origin + '/calendar-callback' 
        },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (error) {
      console.error("Error connecting Google Calendar:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 lg:pl-20 lg:pb-6">
      <div className="max-w-[430px] lg:max-w-[1200px] mx-auto px-5 pt-6 space-y-5">
        
        {/* Source Switcher */}
        <div className="flex bg-surface-container-low/50 backdrop-blur-md rounded-2xl p-1 w-fit mx-auto mb-2 border border-outline-variant/10">
          <button 
            onClick={() => setSource('adonai')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${source === 'adonai' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105' : 'text-on-surface-variant/60 hover:text-foreground'}`}
          >
            Tareas Adonai
          </button>
          <button 
            onClick={() => setSource('google')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${source === 'google' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105' : 'text-on-surface-variant/60 hover:text-foreground'}`}
          >
            Google Calendar
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-on-surface-variant text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
              {source === 'google' ? 'Google Calendar Sync' : 'Calendario Adonai'}
            </span>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              {format(selectedDate, "MMMM yyyy", { locale: es })}
            </h1>
          </div>
          <div className="flex bg-surface-container-low rounded-xl p-1 border border-outline-variant/5">
            <button onClick={() => setViewMode('week')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'week' ? 'bg-surface-container-highest text-foreground shadow-sm' : 'text-on-surface-variant/40'}`}>Sem</button>
            <button onClick={() => setViewMode('month')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'month' ? 'bg-surface-container-highest text-foreground shadow-sm' : 'text-on-surface-variant/40'}`}>Mes</button>
          </div>
        </div>
        {source === 'google' ? (
          <GoogleCalendarView 
            events={events}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onConnect={handleGoogleConnect}
            isConnected={connected}
          />
        ) : (
          <div className="space-y-6">
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
                        className={`flex flex-col items-center py-2 rounded-lg transition-all ${isSelected ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : isToday ? 'bg-primary/10' : 'hover:bg-surface-container-high'}`}>
                        <span className={`text-[10px] uppercase font-black tracking-widest ${isSelected ? 'text-primary-foreground' : 'text-on-surface-variant'}`}>
                          {format(day, 'EEE', { locale: es }).slice(0, 2)}
                        </span>
                        <span className={`text-sm font-black mt-0.5 ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>{format(day, 'd')}</span>
                        {dayHasEvents && !isSelected && <div className="w-1 h-1 rounded-full bg-primary mt-1" />}
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
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => goMonth(-1)} className="p-2 rounded-lg bg-surface-container-low">
                    <ChevronLeft className="w-4 h-4 text-on-surface-variant" />
                  </button>
                  <button onClick={() => goMonth(1)} className="p-2 rounded-lg bg-surface-container-low">
                    <ChevronRight className="w-4 h-4 text-on-surface-variant" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map(d => (
                    <span key={d} className="text-center text-[10px] text-on-surface-variant font-black uppercase tracking-widest opacity-40">{d}</span>
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
                        className={`flex flex-col items-center py-2.5 rounded-xl transition-all ${isSelected ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : isToday ? 'bg-primary/10' : !inMonth ? 'opacity-10' : 'hover:bg-surface-container-high'}`}>
                        <span className={`text-xs font-black ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>{format(day, 'd')}</span>
                        {dayHasEvents && !isSelected && <div className="w-1 h-1 rounded-full bg-primary mt-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* List Section */}
            {(dayEvents.length > 0 || adonaiTasksForDay.length > 0) ? (
              <div className="space-y-6">
                {adonaiTasksForDay.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary px-1 opacity-60">Tareas Adonai</h3>
                    {adonaiTasksForDay.map((task: any) => (
                      <motion.div key={task.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        className="bg-surface-container-low/50 backdrop-blur-sm p-4 rounded-2xl border border-outline-variant/10 flex items-center gap-4 hover:bg-surface-container-low transition-colors">
                        <div className={`w-3 h-3 rounded-full shadow-sm ${task.status === 'done' ? 'bg-primary shadow-primary/20' : 'bg-outline-variant'}`} />
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-black ${task.status === 'done' ? 'line-through opacity-40' : ''}`}>{task.title}</h4>
                          <p className="text-[10px] font-bold text-on-surface-variant/40 mt-0.5 flex items-center gap-1.5">
                            {task.recurrence_id && <RotateCcw className="w-3 h-3" />}
                            {task.isVirtual ? 'RECURRENTE' : 'PLANIFICADA'}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {dayEvents.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant px-1 opacity-60">Google Calendar</h3>
                    {dayEvents.map((event) => (
                      <motion.div key={event.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        className="bg-surface-container-low/50 backdrop-blur-sm p-4 rounded-2xl border border-outline-variant/10 space-y-1 hover:bg-surface-container-low transition-colors group">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-black text-foreground truncate group-hover:text-primary transition-colors">{event.title}</h3>
                            <p className="text-[10px] font-bold text-on-surface-variant/40 mt-1 uppercase tracking-wider">
                              {event.allDay ? 'Todo el día' : `${format(parseISO(event.start), 'h:mm aa')} - ${format(parseISO(event.end), 'h:mm aa')}`}
                            </p>
                          </div>
                          {event.htmlLink && (
                            <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-surface-container-high/50 text-on-surface-variant hover:text-primary transition-all">
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
              <div className="bg-surface-container-low/30 backdrop-blur-sm p-12 rounded-[32px] text-center border border-dashed border-outline-variant/20 space-y-4">
                <div className="w-20 h-20 bg-surface-container-high/50 rounded-full flex items-center justify-center mx-auto">
                  <CalendarX className="w-10 h-10 text-on-surface-variant/20" />
                </div>
                <p className="text-on-surface-variant/40 text-xs font-black uppercase tracking-widest">Nada planeado para hoy</p>
              </div>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default CalendarPage;
