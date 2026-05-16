import { useState } from 'react';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useTasks } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';

import { format, addDays, addMonths, startOfWeek, startOfMonth, endOfMonth, isSameDay, isSameMonth, parseISO, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, MapPin, ExternalLink, CalendarX, RotateCcw } from 'lucide-react';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import AdonaiCalendarView from '@/components/calendar/AdonaiCalendarView';

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');

  const rangeStart = startOfMonth(selectedDate);
  const rangeEnd = endOfMonth(selectedDate);
  
  const { events, connected, isLoading: isCalendarLoading } = useCalendarEvents(
    rangeStart.toISOString(), 
    rangeEnd.toISOString()
  );

  return (
    <div className="min-h-screen bg-background pb-20 lg:pl-20 lg:pb-6">
      <div className="mx-auto w-full max-w-none px-0 pt-0 lg:max-w-[1400px] lg:px-5 lg:pt-2">
        
      <AdonaiCalendarView 
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          viewMode={viewMode}
          dragDisabled={false}
        />

      </div>
      <BottomNav />
    </div>
  );
};

export default CalendarPage;
