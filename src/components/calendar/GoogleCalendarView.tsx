import React, { useState, useEffect, useRef } from 'react';
import { format, startOfWeek, addDays, startOfDay, parseISO, isSameDay, addWeeks, subWeeks, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Check, Trash2, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarEvent, useCalendarEvents } from '@/hooks/useCalendarEvents';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
  const isAdmin = user?.email === 'pablogoitiaemprendedor@gmail.com';
  
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { createEvent, updateEvent, deleteEvent } = useCalendarEvents();
  
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', startTime: '', endTime: '' });
  
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const displayDays = viewMode === 'week' ? weekDays : [selectedDate];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      const scrollPosition = (currentHour * 60) - 100;
      scrollContainerRef.current.scrollTop = Math.max(0, scrollPosition);
    }
  }, [isConnected]);

  const demoEvents: CalendarEvent[] = [
    { id: '1', title: 'Reunión de Diseño Adonai', start: new Date().toISOString().split('T')[0] + 'T10:00:00', end: new Date().toISOString().split('T')[0] + 'T11:30:00', description: '', location: '', allDay: false, color: null, htmlLink: '' },
    { id: '2', title: 'Revisión con Cliente', start: addDays(new Date(), 1).toISOString().split('T')[0] + 'T14:00:00', end: addDays(new Date(), 1).toISOString().split('T')[0] + 'T15:00:00', description: '', location: '', allDay: false, color: null, htmlLink: '' },
    { id: 'demo-3', title: 'Planificación Semanal', start: addDays(new Date(), 2).toISOString().split('T')[0] + 'T09:00:00', end: addDays(new Date(), 2).toISOString().split('T')[0] + 'T10:30:00', description: '', location: '', allDay: false, color: null, htmlLink: '' },
  ];

  const activeEvents = isConnected ? events : demoEvents;

  const handleEventClick = (event: CalendarEvent) => {
    if (!isConnected) return; // Prevent editing demo events
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
    
    // Calculate new position based on drop offset
    const columnWidth = info.view.scrollContainer.clientWidth / displayDays.length;
    const hourHeight = 60; // 60px per hour
    
    const dayOffset = Math.round(info.offset.x / columnWidth);
    const hourOffset = Math.round(info.offset.y / hourHeight);
    
    if (dayOffset === 0 && hourOffset === 0) return; // No movement

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
    <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-180px)] animate-in fade-in duration-1000">
      
      {/* Sidebar Fijo */}
      <div className="hidden lg:flex flex-col w-72 flex-shrink-0 space-y-6 h-full">
        {!isConnected && (
          <div className="p-6 bg-primary/5 rounded-[32px] border border-primary/10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <svg width="24" height="24" viewBox="0 0 48 48">
                  <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
                  <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.49 46 24 46z"/>
                  <path fill="#FBBC05" d="M11.69 28.21c-.44-1.32-.69-2.73-.69-4.21s.25-2.89.69-4.21V14.1H4.34A23.98 23.98 0 0 0 0 24c0 3.65.81 7.11 2.27 10.22l7.42-5.7c-1.47-1.12-2.58-2.61-3.23-4.31z"/>
                  <path fill="#EA4335" d="M24 9.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 3.18 29.93 1 24 1 15.49 1 7.96 5.93 4.34 13.04l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
                </svg>
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-primary">Google Calendar</span>
            </div>
            {isAdmin ? (
              <button 
                onClick={onConnect}
                className="w-full py-4 bg-primary text-primary-foreground rounded-[20px] font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
              >
                Conectar ahora
              </button>
            ) : (
              <button 
                disabled 
                className="w-full py-4 bg-surface-container-high text-on-surface/30 rounded-[20px] font-black text-xs uppercase tracking-widest cursor-not-allowed border border-outline-variant/10"
              >
                Próximamente
              </button>
            )}
          </div>
        )}

        <button 
          onClick={() => handleSlotClick(new Date())} 
          disabled={!isConnected}
          className={`flex items-center gap-4 px-8 py-5 bg-white dark:bg-surface-container-highest text-black dark:text-white rounded-[32px] shadow-2xl transition-all w-full group overflow-hidden relative ${!isConnected ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
        >
          <div className="absolute inset-0 bg-primary/5 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
          <Plus className="w-6 h-6 text-primary group-hover:rotate-180 transition-transform duration-700 relative z-10" />
          <span className="text-sm font-black pr-2 relative z-10">Crear Evento</span>
        </button>

        <div className="p-6 bg-surface-container-low rounded-[40px] border border-outline-variant/10 shadow-sm">
          <div className="flex items-center justify-between mb-6 px-1">
            <span className="text-xs font-black uppercase tracking-[0.2em] opacity-60">
              {format(selectedDate, 'MMMM yyyy', { locale: es })}
            </span>
            <div className="flex gap-4">
              <ChevronLeft className="w-4 h-4 cursor-pointer opacity-40 hover:opacity-100" onClick={() => onSelectDate(subDays(selectedDate, 30))} />
              <ChevronRight className="w-4 h-4 cursor-pointer opacity-40 hover:opacity-100" onClick={() => onSelectDate(addDays(selectedDate, 30))} />
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
                <div key={i} onClick={() => onSelectDate(day)} className={`h-8 w-8 flex items-center justify-center rounded-xl text-[10px] font-black cursor-pointer ${isSelected ? 'bg-primary text-primary-foreground shadow-lg' : isToday ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container-high'}`}>
                  {format(day, 'd')}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 bg-white dark:bg-surface-container-lowest rounded-[48px] border border-outline-variant/10 overflow-hidden flex flex-col shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] relative">
        <div className="flex items-center justify-between px-8 py-5 border-b border-outline-variant/10 bg-surface-container-lowest/90 backdrop-blur-2xl z-40">
          <div className="flex items-center gap-8">
            <button onClick={() => { onSelectDate(new Date()); setViewMode('day'); }} className="px-6 py-2.5 rounded-[18px] border border-outline-variant/30 text-xs font-black uppercase tracking-[0.2em] hover:bg-surface-container-low transition-all">Hoy</button>
            <div className="flex items-center gap-3">
              <button onClick={() => onSelectDate(viewMode === 'week' ? subWeeks(selectedDate, 1) : subDays(selectedDate, 1))} className="p-2.5 hover:bg-surface-container-low rounded-2xl"><ChevronLeft className="w-5 h-5 opacity-60" /></button>
              <button onClick={() => onSelectDate(viewMode === 'week' ? addWeeks(selectedDate, 1) : addDays(selectedDate, 1))} className="p-2.5 hover:bg-surface-container-low rounded-2xl"><ChevronRight className="w-5 h-5 opacity-60" /></button>
            </div>
            <h2 className="text-xl font-black tracking-tight text-foreground/90 capitalize">{format(selectedDate, 'MMMM yyyy', { locale: es })}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-surface-container-low/80 rounded-[20px] p-1.5 border border-outline-variant/10">
              <button onClick={() => setViewMode('day')} className={`px-6 py-2 rounded-[16px] text-[10px] font-black uppercase tracking-widest ${viewMode === 'day' ? 'bg-white dark:bg-surface-container-high shadow-lg text-primary' : 'opacity-40'}`}>Día</button>
              <button onClick={() => setViewMode('week')} className={`px-6 py-2 rounded-[16px] text-[10px] font-black uppercase tracking-widest ${viewMode === 'week' ? 'bg-white dark:bg-surface-container-high shadow-lg text-primary' : 'opacity-40'}`}>Semana</button>
            </div>
          </div>
        </div>

        <div className="flex border-b border-outline-variant/10 bg-surface-container-lowest/80 backdrop-blur-xl z-30">
          <div className="w-20 flex-shrink-0 border-r border-outline-variant/10" />
          <div className={`flex-1 grid ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-1'}`}>
            {displayDays.map((day) => (
              <div key={day.toISOString()} className="py-6 text-center border-r border-outline-variant/5">
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${isSameDay(day, new Date()) ? 'text-primary' : 'opacity-40'}`}>
                  {format(day, 'EEE', { locale: es })}
                </p>
                <div onClick={() => { onSelectDate(day); setViewMode('day'); }} className={`w-12 h-12 rounded-[18px] flex items-center justify-center mx-auto text-base font-black cursor-pointer ${isSameDay(day, new Date()) ? 'bg-primary text-primary-foreground shadow-lg' : 'hover:bg-surface-container-low'}`}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto no-scrollbar relative bg-surface-container-lowest/20 scroll-smooth">
          <div className="flex h-[1440px]">
            <div className="w-20 border-r border-outline-variant/10 bg-surface-container-lowest/50">
              {hours.map(hour => (
                <div key={hour} className="h-[60px] relative">
                  <span className="absolute -top-2.5 right-3 text-[10px] font-black opacity-20 uppercase tracking-tighter">{hour === 0 ? '' : `${hour}:00`}</span>
                </div>
              ))}
            </div>

            <div className={`flex-1 grid ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-1'} relative`}>
              {hours.map(hour => (
                <div key={hour} className="absolute w-full border-b border-outline-variant/5" style={{ top: `${hour * 60}px`, height: '60px' }} />
              ))}

              {hours.map(hour => (
                displayDays.map((day, dayIdx) => {
                  const slotDate = new Date(day);
                  slotDate.setHours(hour, 0, 0, 0);
                  const cols = displayDays.length;
                  return (
                    <div key={`${dayIdx}-${hour}`} onClick={() => handleSlotClick(slotDate)} className="absolute border-r border-outline-variant/5 cursor-pointer hover:bg-primary/5 transition-all group z-0" style={{ top: `${hour * 60}px`, height: '60px', left: `${dayIdx * (100 / cols)}%`, width: `${100 / cols}%` }}>
                      <Plus className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-primary/0 group-hover:text-primary/20" />
                    </div>
                  );
                })
              ))}

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
                      drag={isConnected}
                      dragMomentum={false}
                      dragElastic={0}
                      onDragEnd={(e, info) => handleDragEnd(event, info)}
                      whileDrag={{ scale: 1.05, zIndex: 50, cursor: 'grabbing' }}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute p-1 z-10 cursor-grab"
                      style={{
                        top: `${startHour * 60}px`,
                        height: `${duration * 60}px`,
                        left: `${dayIndex * (100 / cols)}%`,
                        width: `${100 / cols}%`,
                      }}
                    >
                      <div onClick={(e) => { e.stopPropagation(); handleEventClick(event); }} className="h-full bg-primary text-primary-foreground border-l-[6px] border-black/20 rounded-[14px] p-3 shadow-xl overflow-hidden hover:brightness-110">
                        <p className="text-[11px] font-black leading-tight">{event.title}</p>
                        <p className="text-[9px] font-bold opacity-70 mt-1">{format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {displayDays.some(d => isSameDay(d, new Date())) && (
                <div className="absolute w-full flex items-center z-20 pointer-events-none" style={{ top: `${(new Date().getHours() + new Date().getMinutes() / 60) * 60}px` }}>
                  <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5 shadow-lg border-2 border-white" />
                  <div className="flex-1 h-0.5 bg-red-500 opacity-60" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-[32px] border-outline-variant/10 shadow-2xl p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-black tracking-tight">{isCreating ? 'Nuevo Evento' : 'Editar Evento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest opacity-60">Título</Label>
              <Input 
                value={editForm.title} 
                onChange={e => setEditForm({ ...editForm, title: e.target.value })} 
                className="h-12 bg-surface-container-low border-outline-variant/20 rounded-[16px] text-base font-bold px-4"
                placeholder="Añade un título"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest opacity-60">Inicio</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                  <Input type="time" value={editForm.startTime} onChange={e => setEditForm({ ...editForm, startTime: e.target.value })} className="h-12 pl-10 bg-surface-container-low border-outline-variant/20 rounded-[16px] font-bold" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest opacity-60">Fin</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                  <Input type="time" value={editForm.endTime} onChange={e => setEditForm({ ...editForm, endTime: e.target.value })} className="h-12 pl-10 bg-surface-container-low border-outline-variant/20 rounded-[16px] font-bold" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-8 flex gap-3 sm:justify-between">
            {!isCreating ? (
              <Button onClick={removeEvent} variant="destructive" className="h-12 w-12 p-0 rounded-[16px] hover:scale-105 active:scale-95 transition-transform"><Trash2 className="w-5 h-5" /></Button>
            ) : <div />}
            <div className="flex gap-3">
              <Button onClick={() => setEditingEvent(null)} variant="outline" className="h-12 px-6 rounded-[16px] font-black">Cancelar</Button>
              <Button onClick={saveEvent} className="h-12 px-8 rounded-[16px] font-black hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-primary/20">Guardar</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoogleCalendarView;
