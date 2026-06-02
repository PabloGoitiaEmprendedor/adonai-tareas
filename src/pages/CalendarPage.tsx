import { useEffect, useState } from 'react';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';

import { startOfMonth, endOfMonth } from 'date-fns';

import BottomNav from '@/components/BottomNav';
import AdonaiCalendarView from '@/components/calendar/AdonaiCalendarView';
import {
  readStoredCalendarDate,
  readStoredCalendarViewMode,
  subscribeCalendarState,
  writeCalendarDate,
  writeCalendarViewMode,
} from '@/lib/calendarStateSync';

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState(() => {
    return readStoredCalendarDate();
  });
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>(() => {
    return readStoredCalendarViewMode('day');
  });

  const rangeStart = startOfMonth(selectedDate);
  const rangeEnd = endOfMonth(selectedDate);
  
  const { events, connected, isLoading: isCalendarLoading } = useCalendarEvents(
    rangeStart.toISOString(), 
    rangeEnd.toISOString()
  );

  // Bidirectional selectedDate and viewMode synchronization via localStorage and CustomEvents
  useEffect(() => {
    return subscribeCalendarState(selectedDate, viewMode, setSelectedDate, setViewMode);
  }, [selectedDate, viewMode]);

  useEffect(() => {
    writeCalendarDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    writeCalendarViewMode(viewMode);
  }, [viewMode]);

  return (
    <div className="themed-cursor min-h-screen bg-background pb-20 lg:pb-6">
      <div className="mx-auto w-full max-w-none px-0 pt-0 lg:max-w-[1400px] lg:px-5 lg:pt-2">
        
      <AdonaiCalendarView 
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          viewMode={viewMode}
          dragDisabled={false}
          className="overflow-visible"
          googleEvents={events}
        />

      </div>
      <BottomNav />
    </div>
  );
};

export default CalendarPage;
