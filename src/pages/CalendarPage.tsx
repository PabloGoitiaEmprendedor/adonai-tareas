import { useState } from 'react';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useTasks } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';

import { format, addDays, addMonths, startOfWeek, startOfMonth, endOfMonth, isSameDay, isSameMonth, parseISO, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, MapPin, ExternalLink, CalendarX, RotateCcw, Lock } from 'lucide-react';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import GoogleCalendarView from '@/components/calendar/GoogleCalendarView';
import AdonaiCalendarView from '@/components/calendar/AdonaiCalendarView';

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [source, setSource] = useState<'adonai' | 'google'>('adonai');

  const rangeStart = startOfMonth(selectedDate);
  const rangeEnd = endOfMonth(selectedDate);
  
  const { events, connected, isLoading: isCalendarLoading } = useCalendarEvents(
    rangeStart.toISOString(), 
    rangeEnd.toISOString()
  );

  const handleGoogleConnect = async () => {
    // Currently disabled as requested "Proximamente"
    return;
  };

  return (
    <div className="min-h-screen bg-background pb-24 lg:pl-20 lg:pb-6">
      <div className="max-w-[430px] lg:max-w-[1400px] mx-auto px-5 pt-6 space-y-5">
        
        {/* Source Switcher - Premium Style from Reference */}
        <div className="flex bg-[#2A2D32] rounded-[1.5rem] p-1.5 w-fit mx-auto mb-8 border border-white/5 shadow-2xl">
          <button 
            className="px-8 py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all bg-[#3A3F45] text-white shadow-xl shadow-black/20"
          >
            Adonai 360
          </button>
          <div className="relative group">
            <button 
              disabled
              className="px-8 py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all text-white/20 flex items-center gap-2 cursor-not-allowed"
            >
              Google
            </button>
            <div className="absolute -top-1 -right-2 bg-primary/20 backdrop-blur-md px-2 py-0.5 rounded-full border border-primary/30 opacity-100 transition-opacity">
              <span className="text-[7px] font-black text-primary tracking-widest uppercase">Próximamente</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-on-surface-variant text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
              {source === 'google' ? 'Google Calendar Sync' : 'Calendario Inteligente'}
            </span>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              {format(selectedDate, "MMMM yyyy", { locale: es })}
            </h1>
          </div>

          <div className="flex bg-surface-container-low p-1 rounded-2xl border border-outline-variant/10 shadow-sm">
            {[
              { id: 'day', label: 'Día' },
              { id: 'week', label: 'Semana' },
              { id: 'month', label: 'Mes' }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id as any)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  viewMode === mode.id 
                    ? "bg-primary text-black shadow-lg shadow-primary/20" 
                    : "text-on-surface-variant hover:bg-surface-container-high"
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <AdonaiCalendarView 
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          viewMode={viewMode}
        />

      </div>
      <BottomNav />
    </div>
  );
};

export default CalendarPage;
