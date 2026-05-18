import React, { useState, useEffect, useRef } from 'react';
import { format, startOfWeek, addDays, startOfDay, parseISO, isSameDay, addWeeks, subWeeks, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Check, Trash2, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarEvent, useCalendarEvents } from '@/hooks/useCalendarEvents';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Menu, PanelLeftClose, PanelLeft, Calendar as CalendarIconUI } from 'lucide-react';

interface GoogleCalendarViewProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onConnect: () => void;
  isConnected: boolean;
}

const GoogleCalendarView: React.FC<GoogleCalendarViewProps> = ({ 
  events, 
  selectedDate, 
  onSelectDate, 
  onConnect,
  isConnected 
}) => {
  
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hourHeight = 60; 
  const { createEvent, updateEvent, deleteEvent } = useCalendarEvents();
  
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', startTime: '', endTime: '' });
  
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const displayDays = viewMode === 'week' ? weekDays : [selectedDate];
  const isShowingToday = displayDays.some(day => isSameDay(day, new Date()));
  const hours = Array.from({ length: 24 }, (_, i) => i);

  useEffect(() => {
    const scrollToCurrentTime = () => {
      if (scrollContainerRef.current) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        const scrollPosition = ((currentHour + currentMinutes / 60) * hourHeight) - (scrollContainerRef.current.clientHeight / 2);
        scrollContainerRef.current.scrollTop = Math.max(0, scrollPosition);
      }
    };

    if (isShowingToday) {
      const timer = setTimeout(scrollToCurrentTime, 500);
      return () => clearTimeout(timer);
    }
  }, [isShowingToday, selectedDate, viewMode, hourHeight]);

  const demoEvents: CalendarEvent[] = [
    { id: '1', title: 'Reunión de Diseño Adonai', start: new Date().toISOString().split('T')[0] + 'T10:00:00', end: new Date().toISOString().split('T')[0] + 'T11:30:00', description: '', location: '', allDay: false, color: null, htmlLink: '' },
    { id: '2', title: 'Revisión con Cliente', start: addDays(new Date(), 1).toISOString().split('T')[0] + 'T14:00:00', end: addDays(new Date(), 1).toISOString().split('T')[0] + 'T15:00:00', description: '', location: '', allDay: false, color: null, htmlLink: '' },
    { id: 'demo-3', title: 'Planificación Semanal', start: addDays(new Date(), 2).toISOString().split('T')[0] + 'T09:00:00', end: addDays(new Date(), 2).toISOString().split('T')[0] + 'T10:30:00', description: '', location: '', allDay: false, color: null, htmlLink: '' },
  ];

  const activeEvents = isConnected ? events : demoEvents;

  const handleEventClick = (event: CalendarEvent) => {
    if (!isConnected) return;
    setEditingEvent(event);
    setIsCreating(false);
    setEditForm({
      title: event.title,
      startTime: parseISO(event.start).toTimeString().slice(0, 5),
      endTime: parseISO(event.end).toTimeString().slice(0, 5),
    });
  };

  const handleSlotClick = (date: Date) => {
    if (!isConnected) return;
    const defaultEnd = new Date(date.getTime() + 60 * 60 * 1000);
    setEditingEvent({
      id: 'new',
      title: '',
      start: date.toISOString(),
      end: defaultEnd.toISOString(),
      description: '',
      location: '',
      allDay: false,
      color: null,
      htmlLink: '',
    });
    setIsCreating(true);
    setEditForm({
      title: '',
      startTime: date.toTimeString().slice(0, 5),
      endTime: defaultEnd.toTimeString().slice(0, 5),
    });
  };

  const saveEvent = () => {
    if (!editingEvent || !isConnected) return;
    const [startH, startM] = editForm.startTime.split(':');
    const [endH, endM] = editForm.endTime.split(':');
    const startDate = new Date(editingEvent.start);
    startDate.setHours(parseInt(startH), parseInt(startM), 0, 0);
    const endDate = new Date(editingEvent.end);
    endDate.setHours(parseInt(endH), parseInt(endM), 0, 0);
    const eventData = {
      summary: editForm.title || '(Sin título)',
      start: { dateTime: startDate.toISOString() },
      end: { dateTime: endDate.toISOString() }
    };
    if (isCreating) {
      createEvent.mutate(eventData);
    } else {
      updateEvent.mutate({ eventId: editingEvent.id, eventData });
    }
    setEditingEvent(null);
  };

  const removeEvent = () => {
    if (editingEvent && !isCreating && isConnected) {
      deleteEvent.mutate(editingEvent.id);
    }
    setEditingEvent(null);
  };

  const handleDragEnd = (event: CalendarEvent, info: any) => {
    if (!isConnected) return;
    const columnWidth = info.view.scrollContainer.clientWidth / displayDays.length;
    const dayOffset = Math.round(info.offset.x / columnWidth);
    const hourOffset = Math.round(info.offset.y / hourHeight);
    if (dayOffset === 0 && hourOffset === 0) return;
    const startDate = parseISO(event.start);
    const endDate = parseISO(event.end);
    startDate.setDate(startDate.getDate() + dayOffset);
    startDate.setHours(startDate.getHours() + hourOffset);
    endDate.setDate(endDate.getDate() + dayOffset);
    endDate.setHours(endDate.getHours() + hourOffset);
    updateEvent.mutate({
      eventId: event.id,
      eventData: {
        summary: event.title,
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() }
      }
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-1000 relative">
      
      {/* Sidebar Removida según solicitud del usuario */}

      <div className="flex-1 bg-white dark:bg-surface-container-lowest rounded-[48px] border border-outline-variant/10 flex flex-col shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] relative">
        <div className="flex items-center justify-between pl-12 pr-8 py-4 border-b border-outline-variant/5 bg-surface-container-lowest/90 backdrop-blur-2xl sticky top-0 z-50">
          <div className="flex items-center gap-6">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-3 px-4 py-2 hover:bg-surface-container-low rounded-2xl transition-all group">
                  <CalendarIconUI className="w-4 h-4 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 group-hover:opacity-100">Hoy</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-[32px] border-none shadow-2xl bg-white/95 dark:bg-surface-container-highest/95 backdrop-blur-xl" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && onSelectDate(date)}
                  initialFocus
                  className="p-4"
                />
              </PopoverContent>
            </Popover>

            <div className="h-6 w-[1px] bg-outline-variant/10" />
            
            <div className="flex items-center gap-2">
              <button onClick={() => onSelectDate(viewMode === 'week' ? subWeeks(selectedDate, 1) : subDays(selectedDate, 1))} className="p-2 hover:bg-surface-container-low rounded-xl transition-colors"><ChevronLeft className="w-4 h-4 opacity-40" /></button>
              <button
                onClick={() => onSelectDate(new Date())}
                className="h-9 rounded-xl px-3 text-[10px] font-black uppercase tracking-[0.18em] text-primary hover:bg-primary/10 transition-colors"
              >
                Hoy
              </button>
              <button onClick={() => onSelectDate(viewMode === 'week' ? addWeeks(selectedDate, 1) : addDays(selectedDate, 1))} className="p-2 hover:bg-surface-container-low rounded-xl transition-colors"><ChevronRight className="w-4 h-4 opacity-40" /></button>
            </div>

            <div className="flex flex-col ml-2">
              <h2 className="text-sm font-black tracking-[0.1em] text-foreground/90 uppercase">{format(selectedDate, 'MMMM yyyy', { locale: es })}</h2>
              <p className="text-[10px] font-black text-primary uppercase tracking-widest">{format(selectedDate, 'EEEE, d', { locale: es })}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {!isConnected && (
              <button 
                onClick={onConnect}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Conectar Google
              </button>
            )}
            <div className="flex bg-surface-container-low/50 rounded-[18px] p-1 border border-outline-variant/10">
              <button onClick={() => setViewMode('day')} className={`px-5 py-2 rounded-[14px] text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'day' ? 'bg-white dark:bg-surface-container-high shadow-md text-primary' : 'opacity-30'}`}>Día</button>
              <button onClick={() => setViewMode('week')} className={`px-5 py-2 rounded-[14px] text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'week' ? 'bg-white dark:bg-surface-container-high shadow-md text-primary' : 'opacity-30'}`}>Semana</button>
            </div>
          </div>
        </div>

        {viewMode === 'week' && (
          <div className="flex border-b border-outline-variant/5 bg-surface-container-lowest/50 backdrop-blur-xl sticky top-[73px] z-40">
            <div className="w-20 border-r border-outline-variant/10" />
            <div className="flex-1 grid grid-cols-7">
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="py-4 text-center border-r border-outline-variant/5">
                  <p className={`text-[9px] font-black uppercase tracking-tighter mb-1 ${isSameDay(day, new Date()) ? 'text-primary' : 'opacity-30'}`}>
                    {format(day, 'EEE', { locale: es })}
                  </p>
                  <div className={`text-xs font-black ${isSameDay(day, new Date()) ? 'text-primary' : ''}`}>
                    {format(day, 'd')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div ref={scrollContainerRef} className="flex-1 relative bg-surface-container-lowest/20 scroll-smooth">
          <div className="flex" style={{ height: `${24 * hourHeight}px` }}>
            <div className="w-20 border-r border-outline-variant/10 bg-surface-container-lowest/50">
              {hours.map(hour => (
                <div key={hour} className="relative" style={{ height: `${hourHeight}px` }}>
                  <span className="absolute -top-2.5 right-3 text-[10px] font-black opacity-20 uppercase tracking-tighter">{hour === 0 ? '' : `${hour}:00`}</span>
                </div>
              ))}
            </div>

            <div className={`flex-1 grid ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-1'} relative`}>
              {hours.map(hour => (
                <div key={hour} className="absolute w-full border-b border-outline-variant/5" style={{ top: `${hour * hourHeight}px`, height: `${hourHeight}px` }} />
              ))}

              {hours.map(hour => (
                displayDays.map((day, dayIdx) => {
                  const slotDate = new Date(day);
                  slotDate.setHours(hour, 0, 0, 0);
                  const cols = displayDays.length;
                  return (
                    <div key={`${dayIdx}-${hour}`} onClick={() => handleSlotClick(slotDate)} className="absolute border-r border-outline-variant/5 cursor-pointer hover:bg-primary/5 transition-all group z-0" style={{ top: `${hour * hourHeight}px`, height: `${hourHeight}px`, left: `${dayIdx * (100 / cols)}%`, width: `${100 / cols}%` }}>
                      <Plus className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-primary/0 group-hover:text-primary/20" />
                    </div>
                  );
                })
              ))}

              <AnimatePresence>
                {activeEvents.map(event => {
                  const startDate = parseISO(event.start);
                  const endDate = parseISO(event.end);
                  
                  const eventDay = startOfDay(startDate);
                  const dayIndex = displayDays.findIndex(d => isSameDay(startOfDay(d), eventDay));
                  
                  if (dayIndex === -1) return null;

                  const startHour = startDate.getHours() + startDate.getMinutes() / 60;
                  const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
                  const cols = displayDays.length;

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
                      className="absolute p-3 rounded-[24px] text-xs shadow-xl border-l-4 border-primary overflow-hidden cursor-pointer group bg-white/95 dark:bg-surface-container-highest/95 backdrop-blur-xl hover:shadow-2xl hover:scale-[1.02] transition-all z-10"
                      style={{
                        top: `${startHour * hourHeight + 4}px`,
                        height: `${Math.max(duration * hourHeight - 8, hourHeight/2)}px`,
                        left: `${dayIndex * (100 / cols) + 0.5}%`,
                        width: `${100 / cols - 1}%`
                      }}
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between mb-1">
                          <CalendarIcon className="w-3 h-3 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="font-black text-foreground/90 leading-tight line-clamp-2">{event.title}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {isSameDay(selectedDate, new Date()) && (
                <div 
                  className="absolute left-0 right-0 z-20 pointer-events-none"
                  style={{ top: `${(new Date().getHours() + new Date().getMinutes() / 60) * hourHeight}px` }}
                >
                  <div className="relative w-full h-[2px] bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                    <div className="absolute -left-1 -top-1 w-2.5 h-2.5 bg-red-500 rounded-full shadow-lg" />
                    <div className="absolute right-0 -top-2.5 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Ahora</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
        <DialogContent className="rounded-[40px] p-8 border-none shadow-2xl bg-white dark:bg-surface-container-highest max-w-md">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-3xl font-black tracking-tight">
              {isCreating ? 'Nuevo Evento' : 'Editar Evento'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Título</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm({...editForm, title: e.target.value})} className="h-16 rounded-[24px] bg-surface-container-low border-none text-base font-bold focus:ring-2 focus:ring-primary/20" placeholder="¿Qué tienes planeado?" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Inicio</Label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                  <Input type="time" value={editForm.startTime} onChange={(e) => setEditForm({...editForm, startTime: e.target.value})} className="h-14 rounded-[20px] bg-surface-container-low border-none pl-12 font-bold" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Fin</Label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                  <Input type="time" value={editForm.endTime} onChange={(e) => setEditForm({...editForm, endTime: e.target.value})} className="h-14 rounded-[20px] bg-surface-container-low border-none pl-12 font-bold" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-10 flex gap-4 sm:justify-between">
            {!isCreating && (
              <Button variant="ghost" onClick={removeEvent} className="h-14 px-6 rounded-[24px] text-red-500 hover:bg-red-50 font-black uppercase text-[10px] tracking-widest">
                <Trash2 className="w-4 h-4 mr-2" /> Eliminar
              </Button>
            )}
            <div className="flex gap-3 ml-auto">
              <Button variant="outline" onClick={() => setEditingEvent(null)} className="h-14 px-8 rounded-[24px] border-outline-variant/20 font-black uppercase text-[10px] tracking-widest">Cancelar</Button>
              <Button onClick={saveEvent} className="h-14 px-8 rounded-[24px] bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-black uppercase text-[10px] tracking-widest hover:scale-[1.05] transition-transform">
                <Check className="w-4 h-4 mr-2" /> Guardar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoogleCalendarView;
