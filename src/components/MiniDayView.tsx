import React, { useMemo, useRef, useEffect, useState } from 'react';
import { format, isSameDay, startOfDay, endOfDay, differenceInMinutes, addMinutes, addHours, isWithinInterval, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DayEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  color: string;
  isEvent?: boolean;
}

interface MiniDayViewProps {
  events: DayEvent[];
  currentDate: Date;
  onEventClick?: (eventId: string) => void;
  onEventUpdate?: (eventId: string, newStartTime: Date) => void;
  onEventResize?: (eventId: string, newEndTime: Date) => void;
  onGridClick?: (startTime: Date) => void;
  onDateChange?: (newDate: Date) => void;
  onInteractionChange?: (isInteracting: boolean) => void;
}

const HOUR_HEIGHT = 80; 
const SLOT_SIZE = HOUR_HEIGHT / 4; // 15 mins
const TIME_WIDTH = 74;

export function MiniDayView({ 
  events, 
  currentDate,
  onEventClick,
  onEventUpdate,
  onEventResize,
  onGridClick,
  onDateChange,
  onInteractionChange
}: MiniDayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(new Date());
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Sync interaction state
  useEffect(() => {
    onInteractionChange?.(isDragging || isResizing);
  }, [isDragging, isResizing, onInteractionChange]);

  const todayEvents = useMemo(() => {
    const start = startOfDay(currentDate);
    const end = endOfDay(currentDate);
    return events.filter(e => isWithinInterval(e.startTime, { start, end }));
  }, [events, currentDate]);

  const timeLineTop = useMemo(() => {
    if (!isSameDay(now, currentDate)) return -100;
    const dayStart = startOfDay(currentDate);
    const mins = differenceInMinutes(now, dayStart);
    return (mins / 60) * HOUR_HEIGHT;
  }, [now, currentDate]);

  // Initial scroll to current time
  useEffect(() => {
    const scrollTime = new Date();
    if (!isSameDay(scrollTime, currentDate)) return;

    if (scrollRef.current) {
      const dayStart = startOfDay(currentDate);
      const currentMins = differenceInMinutes(scrollTime, dayStart);
      const scrollPos = (currentMins / 60) * HOUR_HEIGHT - 120;
      scrollRef.current.scrollTop = Math.max(0, scrollPos);
    }
  }, [currentDate]);

  const snapTo15 = (val: number) => Math.round(val / SLOT_SIZE) * SLOT_SIZE;

  return (
    <div className="flex flex-col h-full select-none bg-background/20">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-outline-variant/15 flex-shrink-0 bg-surface/90 backdrop-blur-xl">
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-foreground/90">
          {format(currentDate, "EEEE, d 'DE' MMMM", { locale: es })}
        </span>
        <div className="flex shrink-0 items-center gap-1 rounded-full border border-outline-variant/15 bg-background/50 p-0.5">
          <button
            onClick={() => onDateChange?.(subDays(currentDate, 1))}
            className="p-1.5 rounded-full hover:bg-foreground/5 active:scale-90 transition-all"
          >
            <ChevronLeft className="w-4 h-4 text-foreground/40" />
          </button>
          <button
            onClick={() => onDateChange?.(new Date())}
            className="h-7 rounded-full px-3 text-[9px] font-black uppercase tracking-[0.18em] text-primary hover:bg-primary/10 active:scale-95 transition-all"
          >
            Hoy
          </button>
          <button
            onClick={() => onDateChange?.(addMinutes(currentDate, 24 * 60))}
            className="p-1.5 rounded-full hover:bg-foreground/5 active:scale-90 transition-all"
          >
            <ChevronRight className="w-4 h-4 text-foreground/40" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto overflow-x-hidden relative custom-scrollbar"
      >
        <div className="relative w-full" style={{ height: 24 * HOUR_HEIGHT }}>
          {/* Grid lines and Time labels */}
          {Array.from({ length: 96 }).map((_, i) => {
            const isHour = i % 4 === 0;
            const h = Math.floor(i / 4);
            const date = addHours(startOfDay(currentDate), h);
            
            return (
              <div
                key={i}
                onClick={(e) => {
                  if (isDragging || isResizing) return;
                  onGridClick?.(addMinutes(startOfDay(currentDate), i * 15));
                }}
                className={cn(
                  "absolute left-0 right-0 border-t transition-colors hover:bg-primary/5 cursor-crosshair",
                  isHour ? "border-border/60" : i % 4 === 2 ? "border-border/20" : "border-border/5"
                )}
                style={{ top: i * SLOT_SIZE, height: SLOT_SIZE }}
              >
                {isHour && (
                  <span className="absolute -top-3 left-2 text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase">
                    {format(date, 'h a')}
                  </span>
                )}
              </div>
            );
          })}

          {/* Event blocks */}
          {todayEvents.map(event => {
            const dayStart = startOfDay(currentDate);
            const startMin = Math.max(0, differenceInMinutes(event.startTime, dayStart));
            const endMin = Math.min(24 * 60, differenceInMinutes(event.endTime, dayStart));
            const top = (startMin / 60) * HOUR_HEIGHT;
            const height = Math.max(SLOT_SIZE, ((endMin - startMin) / 60) * HOUR_HEIGHT);

            const color = event.color || 'var(--primary)';
            const isHex = color.startsWith('#');
            const isVar = color.startsWith('var');
            
            return (
              <motion.div
                key={event.id}
                title={event.title}
                onClick={(e: React.MouseEvent) => {
                  if ((e as any).defaultPrevented || isDragging || isResizing) return;
                  onEventClick?.(event.id);
                }}
                drag={isResizing ? false : "y"}
                dragMomentum={false}
                dragElastic={0}
                dragConstraints={scrollRef}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={(_, info) => {
                  setIsDragging(false);
                  const deltaY = info.offset.y;
                  const newTop = top + deltaY;
                  const newMins = Math.round((newTop / HOUR_HEIGHT) * 60 / 15) * 15;
                  const newStart = addMinutes(startOfDay(currentDate), newMins);
                  if (newStart.getTime() !== event.startTime.getTime()) {
                    onEventUpdate?.(event.id, newStart);
                  }
                }}
                className="absolute left-[74px] right-4 rounded-xl p-2 text-[10px] font-bold text-white shadow-lg cursor-grab active:cursor-grabbing hover:brightness-110 z-10 overflow-hidden group select-none transition-all duration-200 ease-out"
                style={{
                  top: top + 1,
                  height: height - 2,
                  backgroundColor: (isHex || isVar) ? color : 'hsl(var(--primary))',
                  opacity: event.completed ? 0.5 : 1,
                  filter: event.completed ? 'grayscale(0.3)' : 'none'
                }}
                whileDrag={{ scale: 1.02, zIndex: 50, cursor: 'grabbing', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', opacity: 1, filter: 'none' }}
              >
                <div className="flex flex-col h-full py-1 px-1 pointer-events-none">
                  <p className={`truncate font-black select-none leading-tight ${event.completed ? 'line-through' : ''}`}>
                    {event.title}
                  </p>
                  {height > 35 && (
                    <p className="opacity-70 text-[8px] font-medium mt-0.5 select-none truncate">
                      {format(event.startTime, 'h:mm')} - {format(event.endTime, 'h:mm a')}
                    </p>
                  )}
                </div>

                {/* Resize Handle */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize flex items-center justify-center group/handle"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsResizing(true);
                  }}
                  drag="y"
                  dragMomentum={false}
                  dragElastic={0}
                  onDragEnd={(_, info) => {
                    setIsResizing(false);
                    const deltaY = info.offset.y;
                    const newHeight = height + deltaY;
                    const snappedHeight = Math.max(SLOT_SIZE, snapTo15(newHeight));
                    const durationMins = (snappedHeight / HOUR_HEIGHT) * 60;
                    const newEnd = addMinutes(event.startTime, durationMins);
                    if (newEnd.getTime() !== event.endTime.getTime()) {
                      onEventResize?.(event.id, newEnd);
                    }
                  }}
                >
                  <div className="w-8 h-1 rounded-full bg-white/20 group-hover/handle:bg-white/40 transition-colors" />
                </motion.div>
              </motion.div>
            );
          })}

          {/* Current time line (Premium Design) */}
          <div
            className="absolute left-[70px] right-4 pointer-events-none z-40 flex items-center"
            style={{ top: timeLineTop, marginTop: '-8px' }}
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute w-4 h-4 rounded-full bg-red-500 animate-ping opacity-20" />
              <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-background shadow-sm" />
            </div>
            <div className="flex-1 h-0.5 bg-gradient-to-r from-red-500 to-transparent opacity-40" />
            <span className="text-[8px] font-black text-red-500 bg-surface px-1.5 py-0.5 rounded-full ml-2 shadow-sm border border-red-500/10">
              {format(new Date(), "h:mm a")}
            </span>
          </div>
        </div>

        {/* Empty state */}
        {todayEvents.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/10">
              Sin eventos hoy
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
