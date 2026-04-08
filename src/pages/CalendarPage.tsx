import { useState } from 'react';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useSettings } from '@/hooks/useSettings';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, MapPin, ExternalLink, CalendarX } from 'lucide-react';
import { motion } from 'framer-motion';
import BottomNav from '@/components/BottomNav';

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const timeMin = format(weekStart, "yyyy-MM-dd'T'00:00:00'Z'");
  const timeMax = format(addDays(weekStart, 7), "yyyy-MM-dd'T'23:59:59'Z'");
  const { events, connected, isLoading } = useCalendarEvents(timeMin, timeMax);
  const { settings } = useSettings();

  const dayEvents = events.filter((e) => {
    const eventDate = parseISO(e.start);
    return isSameDay(eventDate, selectedDate);
  });

  const goWeek = (dir: number) => setSelectedDate(addDays(selectedDate, dir * 7));

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-[430px] mx-auto px-5 pt-6 space-y-5">
        <div className="space-y-1">
          <span className="text-on-surface-variant text-xs font-medium uppercase tracking-widest">Calendario</span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {format(selectedDate, "MMMM yyyy", { locale: es })}
          </h1>
        </div>

        {/* Week selector */}
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
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`flex flex-col items-center py-2 rounded-lg transition-all ${
                    isSelected ? 'bg-primary text-primary-foreground' : isToday ? 'bg-primary/10' : 'hover:bg-surface-container-high'
                  }`}
                >
                  <span className={`text-[10px] uppercase ${isSelected ? 'text-primary-foreground' : 'text-on-surface-variant'}`}>
                    {format(day, 'EEE', { locale: es }).slice(0, 2)}
                  </span>
                  <span className={`text-sm font-bold ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </span>
                  {dayHasEvents && !isSelected && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
                </button>
              );
            })}
          </div>
          <button onClick={() => goWeek(1)} className="p-2 rounded-lg bg-surface-container-low">
            <ChevronRight className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>

        {/* Events */}
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
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface-container-low p-4 rounded-lg space-y-1"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-foreground truncate">{event.title}</h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {event.allDay
                        ? 'Todo el día'
                        : `${format(parseISO(event.start), 'HH:mm')} - ${format(parseISO(event.end), 'HH:mm')}`}
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
