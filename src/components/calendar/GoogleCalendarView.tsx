import React, { useState, useEffect, useRef } from 'react';
import { format, startOfWeek, addDays, startOfDay, parseISO, isSameDay, addWeeks, subWeeks, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Check, Settings, Search, HelpCircle, Menu, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarEvent } from '@/hooks/useCalendarEvents';

interface GoogleCalendarViewProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onConnect: () => void;
  onSlotClick: (date: Date) => void;
  isConnected: boolean;
}

const GoogleCalendarView: React.FC<GoogleCalendarViewProps> = ({ 
  events, 
  selectedDate, 
  onSelectDate, 
  onConnect,
  onSlotClick,
  isConnected 
}) => {
  const [showDemo, setShowDemo] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const displayDays = viewMode === 'week' ? weekDays : [selectedDate];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      const scrollPosition = (currentHour * 60) - 100; // Offset to see a bit of the previous hour
      scrollContainerRef.current.scrollTop = Math.max(0, scrollPosition);
    }
  }, [showDemo, isConnected]); // Trigger when view becomes active

  const demoEvents: CalendarEvent[] = [
    { id: '1', title: 'Reunión de Diseño Adonai', start: new Date().toISOString().split('T')[0] + 'T10:00:00', end: new Date().toISOString().split('T')[0] + 'T11:30:00', summary: '' },
    { id: '2', title: 'Revisión con Cliente', start: addDays(new Date(), 1).toISOString().split('T')[0] + 'T14:00:00', end: addDays(new Date(), 1).toISOString().split('T')[0] + 'T15:00:00', summary: '' },
    { id: '3', title: 'Lanzamiento v1.1', start: addDays(new Date(), 2).toISOString().split('T')[0] + 'T09:00:00', end: addDays(new Date(), 2).toISOString().split('T')[0] + 'T12:00:00', summary: '' },
  ];

  const activeEvents = isConnected || showDemo ? (isConnected ? events : demoEvents) : [];

  if (!isConnected && !showDemo) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 bg-surface-container-low/80 backdrop-blur-xl rounded-[40px] border border-outline-variant/10 text-center space-y-10 animate-in fade-in zoom-in duration-700 shadow-2xl">
        <div className="w-28 h-28 bg-white rounded-[32px] flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.1)] relative group">
          <div className="absolute inset-0 bg-primary/10 animate-ping rounded-[32px] group-hover:bg-primary/20 transition-all" />
          <svg width="64" height="64" viewBox="0 0 48 48" className="relative z-10 transition-transform group-hover:scale-110 duration-500">
            <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
            <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.49 46 24 46z"/>
            <path fill="#FBBC05" d="M11.69 28.21c-.44-1.32-.69-2.73-.69-4.21s.25-2.89.69-4.21V14.1H4.34A23.98 23.98 0 0 0 0 24c0 3.65.81 7.11 2.27 10.22l7.42-5.7c-1.47-1.12-2.58-2.61-3.23-4.31z"/>
            <path fill="#EA4335" d="M24 9.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 3.18 29.93 1 24 1 15.49 1 7.96 5.93 4.34 13.04l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
          </svg>
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-black font-headline tracking-tight text-foreground">Conecta tu Calendario de Google</h2>
          <p className="text-base text-on-surface-variant/60 max-w-[380px] mx-auto leading-relaxed">
            Toda tu productividad en un solo lugar. Sincroniza tus eventos en tiempo real con el diseño premium de Adonai.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-5">
          <button 
            onClick={onConnect}
            className="px-12 py-6 bg-white text-black rounded-[28px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4 border border-outline-variant/10"
          >
            <Plus className="w-5 h-5" />
            Vincular cuenta Google
          </button>
          <button 
            onClick={() => setShowDemo(true)}
            className="px-12 py-6 bg-primary/10 text-primary rounded-[28px] font-black text-sm uppercase tracking-[0.2em] hover:bg-primary/20 transition-all border border-primary/20"
          >
            Ver Vista Previa (Demo)
          </button>
        </div>
      </div>
    );
  }

  const navigate = (direction: 'next' | 'prev') => {
    if (viewMode === 'week') {
      onSelectDate(direction === 'next' ? addWeeks(selectedDate, 1) : subWeeks(selectedDate, 1));
    } else {
      onSelectDate(direction === 'next' ? addDays(selectedDate, 1) : subDays(selectedDate, 1));
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-180px)] animate-in fade-in duration-1000">
      
      {/* Sidebar - Fijo al lado */}
      <div className="hidden lg:flex flex-col w-72 flex-shrink-0 space-y-8 h-full">
        <button 
          onClick={() => onSlotClick(new Date())}
          className="flex items-center gap-4 px-8 py-5 bg-white dark:bg-surface-container-highest text-black dark:text-white rounded-[32px] shadow-2xl shadow-black/10 hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all w-full group overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-primary/5 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
          <Plus className="w-6 h-6 text-primary group-hover:rotate-180 transition-transform duration-700 relative z-10" />
          <span className="text-sm font-black pr-2 relative z-10">Crear Evento</span>
        </button>

        {/* Mini Calendar Holder */}
        <div className="p-6 bg-surface-container-low rounded-[40px] border border-outline-variant/10 shadow-sm">
          <div className="flex items-center justify-between mb-6 px-1">
            <span className="text-xs font-black uppercase tracking-[0.2em] opacity-60">
              {format(selectedDate, 'MMMM yyyy', { locale: es })}
            </span>
            <div className="flex gap-4">
              <ChevronLeft className="w-4 h-4 cursor-pointer opacity-40 hover:opacity-100 transition-opacity" onClick={() => onSelectDate(subDays(selectedDate, 30))} />
              <ChevronRight className="w-4 h-4 cursor-pointer opacity-40 hover:opacity-100 transition-opacity" onClick={() => onSelectDate(addDays(selectedDate, 30))} />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-[10px] text-center font-black mb-3 opacity-20">
            {['L','M','X','J','V','S','D'].map(d => <span key={d}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 35 }, (_, i) => {
              const baseDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
              const day = addDays(baseDate, i - 7);
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              
              return (
                <div key={i} 
                  onClick={() => onSelectDate(day)}
                  className={`h-8 w-8 flex items-center justify-center rounded-xl text-[10px] font-black transition-all cursor-pointer ${isSelected ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : isToday ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container-high'}`}>
                  {format(day, 'd')}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6 px-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Mis Calendarios</h3>
          <div className="space-y-3">
            {[
              { name: 'Adonai Principal', color: 'bg-primary' },
              { name: 'Trabajo', color: 'bg-orange-500' },
              { name: 'Personal', color: 'bg-blue-500' }
            ].map((cal, i) => (
              <div key={cal.name} className="flex items-center gap-4 group cursor-pointer">
                <div className={`w-5 h-5 rounded-lg border-2 border-transparent ${cal.color} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-[11px] font-black opacity-60 group-hover:opacity-100 transition-opacity">{cal.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid View - Contenedor con Scroll Interno y Auto-Scroll */}
      <div className="flex-1 bg-white dark:bg-surface-container-lowest rounded-[48px] border border-outline-variant/10 overflow-hidden flex flex-col shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] relative">
        
        {/* Google Toolbar - FIJA arriba del contenedor */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-outline-variant/10 bg-surface-container-lowest/90 backdrop-blur-2xl z-40">
          <div className="flex items-center gap-8">
            <button 
              onClick={() => { onSelectDate(new Date()); setViewMode('day'); }}
              className="px-6 py-2.5 rounded-[18px] border border-outline-variant/30 text-xs font-black uppercase tracking-[0.2em] hover:bg-surface-container-low transition-all"
            >
              Hoy
            </button>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('prev')} className="p-2.5 hover:bg-surface-container-low rounded-2xl transition-all"><ChevronLeft className="w-5 h-5 opacity-60" /></button>
              <button onClick={() => navigate('next')} className="p-2.5 hover:bg-surface-container-low rounded-2xl transition-all"><ChevronRight className="w-5 h-5 opacity-60" /></button>
            </div>
            <h2 className="text-xl font-black tracking-tight text-foreground/90 capitalize">
              {format(selectedDate, 'MMMM yyyy', { locale: es })}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-surface-container-low/80 rounded-[20px] p-1.5 border border-outline-variant/10">
              <button onClick={() => setViewMode('day')} className={`px-6 py-2 rounded-[16px] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'day' ? 'bg-white dark:bg-surface-container-high shadow-lg text-primary' : 'opacity-40'}`}>Día</button>
              <button onClick={() => setViewMode('week')} className={`px-6 py-2 rounded-[16px] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'week' ? 'bg-white dark:bg-surface-container-high shadow-lg text-primary' : 'opacity-40'}`}>Semana</button>
            </div>
          </div>
        </div>

        {/* Grid Header - FIJA debajo de la toolbar */}
        <div className="flex border-b border-outline-variant/10 bg-surface-container-lowest/80 backdrop-blur-xl z-30">
          <div className="w-20 flex-shrink-0 border-r border-outline-variant/10" />
          <div className={`flex-1 grid ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-1'}`}>
            {displayDays.map((day) => (
              <div key={day.toISOString()} className="py-6 text-center border-r border-outline-variant/5 last:border-r-0">
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${isSameDay(day, new Date()) ? 'text-primary' : 'opacity-40'}`}>
                  {format(day, 'EEE', { locale: es })}
                </p>
                <div 
                  onClick={() => { onSelectDate(day); setViewMode('day'); }}
                  className={`w-12 h-12 rounded-[18px] flex items-center justify-center mx-auto text-base font-black transition-all cursor-pointer ${isSameDay(day, new Date()) ? 'bg-primary text-primary-foreground shadow-lg' : 'hover:bg-surface-container-low'}`}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grid Body - Con Scroll Interno y Auto-Scroll Ref */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto no-scrollbar relative bg-surface-container-lowest/20 scroll-smooth"
        >
          <div className="flex h-[1440px]">
            {/* Time Column */}
            <div className="w-20 border-r border-outline-variant/10 bg-surface-container-lowest/50">
              {hours.map(hour => (
                <div key={hour} className="h-[60px] relative">
                  <span className="absolute -top-2.5 right-3 text-[10px] font-black opacity-20 uppercase tracking-tighter">
                    {hour === 0 ? '' : `${hour}:00`}
                  </span>
                </div>
              ))}
            </div>

            {/* Event Columns */}
            <div className={`flex-1 grid ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-1'} relative`}>
              {/* Horizontal Lines */}
              {hours.map(hour => (
                <div key={hour} className="absolute w-full border-b border-outline-variant/5" style={{ top: `${hour * 60}px`, height: '60px' }} />
              ))}

              {/* Grid Clickable Slots */}
              {hours.map(hour => (
                displayDays.map((day, dayIdx) => {
                  const slotDate = new Date(day);
                  slotDate.setHours(hour, 0, 0, 0);
                  const cols = displayDays.length;
                  return (
                    <div 
                      key={`${dayIdx}-${hour}`}
                      onClick={() => onSlotClick(slotDate)}
                      className="absolute border-r border-outline-variant/5 cursor-pointer hover:bg-primary/5 transition-all group z-0"
                      style={{ 
                        top: `${hour * 60}px`, 
                        height: '60px', 
                        left: `${dayIdx * (100 / cols)}%`, 
                        width: `${100 / cols}%` 
                      }}
                    >
                      <Plus className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-primary/0 group-hover:text-primary/20 transition-all" />
                    </div>
                  );
                })
              ))}

              {/* Render Events */}
              <AnimatePresence>
                {activeEvents.map(event => {
                  const startDate = parseISO(event.start);
                  const endDate = parseISO(event.end);
                  const dayIndex = displayDays.findIndex(d => isSameDay(d, startDate));
                  
                  if (dayIndex === -1) return null;

                  const startHour = startDate.getHours() + startDate.getMinutes() / 60;
                  const duration = Math.max(0.5, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
                  const cols = displayDays.length;

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute p-1 z-10"
                      style={{
                        top: `${startHour * 60}px`,
                        height: `${duration * 60}px`,
                        left: `${dayIndex * (100 / cols)}%`,
                        width: `${100 / cols}%`,
                      }}
                    >
                      <div className="h-full bg-primary text-primary-foreground border-l-[6px] border-black/20 rounded-[14px] p-3 shadow-xl overflow-hidden cursor-pointer hover:brightness-110 transition-all">
                        <p className="text-[11px] font-black leading-tight">{event.title}</p>
                        <p className="text-[9px] font-bold opacity-70 mt-1">
                          {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Current Time Indicator */}
              {displayDays.some(d => isSameDay(d, new Date())) && (
                <div 
                  className="absolute w-full flex items-center z-20 pointer-events-none"
                  style={{ top: `${(new Date().getHours() + new Date().getMinutes() / 60) * 60}px` }}
                >
                  <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5 shadow-lg border-2 border-white" />
                  <div className="flex-1 h-0.5 bg-red-500 opacity-60" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleCalendarView;
