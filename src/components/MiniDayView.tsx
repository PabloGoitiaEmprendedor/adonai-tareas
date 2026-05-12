import { useMemo, useRef, useEffect } from 'react';
import { format, isSameDay, startOfDay, addMinutes, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';

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
}

const HOUR_HEIGHT = 50;
const TOTAL_HEIGHT = 24 * HOUR_HEIGHT;
const TIME_WIDTH = 36;

export function MiniDayView({ events, currentDate }: MiniDayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const todayEvents = useMemo(() => {
    return events
      .filter(e => isSameDay(e.startTime, currentDate) || isSameDay(e.endTime, currentDate))
      .filter(e => e.startTime && e.endTime)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [events, currentDate]);

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const timeLineTop = (currentMinutes / 60) * HOUR_HEIGHT;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = Math.max(0, (now.getHours() - 2) * HOUR_HEIGHT);
    el.scrollTop = target;
  }, []);

  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = 0; h < 24; h++) arr.push(h);
    return arr;
  }, []);

  return (
    <div className="flex flex-col h-full select-none">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-outline-variant/10 flex-shrink-0">
        <div className="w-2 h-2 rounded-full bg-primary" />
        <span className="text-[10px] font-black uppercase tracking-widest text-primary">
          {format(currentDate, "EEEE d MMMM", { locale: es })}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar relative"
        style={{ overscrollBehavior: 'contain' }}
      >
        <div className="absolute inset-0" style={{ height: TOTAL_HEIGHT }}>
          {/* Hour rows */}
          {hours.map(h => {
            return (
              <div
                key={h}
                className="flex"
                style={{ height: HOUR_HEIGHT, borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                <div
                  className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider text-on-surface-variant/30 text-right pr-2 pt-0.5"
                  style={{ width: TIME_WIDTH, lineHeight: `${HOUR_HEIGHT}px` }}
                >
                  {h.toString().padStart(2, '0')}
                </div>
                <div className="flex-1 relative" />
              </div>
            );
          })}

          {/* Event blocks */}
          {todayEvents.map(event => {
            const dayStart = startOfDay(currentDate);
            const startMin = Math.max(0, differenceInMinutes(event.startTime, dayStart));
            const endMin = Math.min(24 * 60, differenceInMinutes(event.endTime, dayStart));
            const top = (startMin / 60) * HOUR_HEIGHT;
            const height = Math.max(8, ((endMin - startMin) / 60) * HOUR_HEIGHT);

            return (
              <div
                key={event.id}
                title={event.title}
                className="absolute left-[40px] right-1 rounded-md px-1.5 py-0.5 overflow-hidden cursor-default"
                style={{
                  top,
                  height,
                  backgroundColor: event.color.startsWith('#')
                    ? `${event.color}33`
                    : event.color === 'transparent'
                      ? 'hsl(var(--primary) / 0.15)'
                      : 'hsl(var(--primary) / 0.15)',
                  borderLeft: `3px solid ${event.color.startsWith('#') ? event.color : event.color === 'transparent' ? 'hsl(var(--primary))' : 'hsl(var(--primary))'}`,
                  opacity: 0.9,
                }}
              >
                <span className="text-[8px] font-black leading-tight block text-foreground truncate">
                  {event.title}
                </span>
                {height > 20 && (
                  <span className="text-[7px] font-medium text-on-surface-variant/60 block truncate">
                    {format(event.startTime, 'HH:mm')} - {format(event.endTime, 'HH:mm')}
                  </span>
                )}
              </div>
            );
          })}

          {/* Current time line */}
          <div
            className="absolute left-0 right-0 pointer-events-none z-10"
            style={{ top: timeLineTop }}
          >
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-red-500 ml-[30px] -translate-x-1/2 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
              <div className="flex-1 h-[1.5px] bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.4)]" />
            </div>
          </div>
        </div>

        {/* Empty state */}
        {todayEvents.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/20">
              Sin eventos
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
