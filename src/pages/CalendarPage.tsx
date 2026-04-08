import { useState } from 'react';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { format, addDays, addMonths, startOfWeek, startOfMonth, endOfMonth, isSameDay, isSameMonth, parseISO, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, MapPin, ExternalLink, CalendarX } from 'lucide-react';
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
  const { events, connected, isLoading } = useCalendarEvents(timeMin, timeMax);

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

        {/* Events */}
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-on-surface-variant">
            {isSameDay(selectedDate, new Date()) ? 'Hoy' : format(selectedDate, "EEEE d", { locale: es })}
            {dayEvents.length > 0 && ` · ${dayEvents.length} evento${dayEvents.length > 1 ? 's' : ''}`}
          </h2>
        </div>

        {!connected ? (
          <div className="bg-surface-container-low p-6 rounded-lg text-center space-y-3">
            <CalendarX className="w-8 h-8 text-on-surface-variant mx-auto" />
            <p className="text-on-surface-variant text-sm">Calendario no conectado</p>
            <p className="text-on-surface-variant/60 text-xs">Inicia sesión con Google para ver tus eventos</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : dayEvents.length === 0 ? (
          <div className="bg-surface-container-low p-6 rounded-lg text-center">
            <p className="text-on-surface-variant text-sm">Sin eventos para este día</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dayEvents.map((event) => (
              <motion.div key={event.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="bg-surface-container-low p-4 rounded-lg space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-foreground truncate">{event.title}</h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {event.allDay ? 'Todo el día' : `${format(parseISO(event.start), 'HH:mm')} - ${format(parseISO(event.end), 'HH:mm')}`}
                    </p>
                  </div>
                  {event.htmlLink && (
                    <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="text-on-surface-variant hover:text-primary flex-shrink-0">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                {event.location && (
                  <div className="flex items-center gap-1 text-on-surface-variant">
                    <MapPin className="w-3 h-3" />
                    <span className="text-[11px] truncate">{event.location}</span>
                  </div>
                )}
                {event.description && (
                  <p className="text-[11px] text-on-surface-variant/70 line-clamp-2">{event.description}</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default CalendarPage;
