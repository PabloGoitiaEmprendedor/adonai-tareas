import { useEffect, useState } from 'react';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';

import { startOfMonth, endOfMonth } from 'date-fns';

import BottomNav from '@/components/BottomNav';
import AdonaiCalendarView from '@/components/calendar/AdonaiCalendarView';

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('adonai:selected-date') : null;
    return saved ? new Date(saved) : new Date();
  });
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('adonai:calendar-view-mode') : null;
    return (saved as any) || 'day';
  });

  const rangeStart = startOfMonth(selectedDate);
  const rangeEnd = endOfMonth(selectedDate);
  
  const { events, connected, isLoading: isCalendarLoading } = useCalendarEvents(
    rangeStart.toISOString(), 
    rangeEnd.toISOString()
  );

  // Bidirectional selectedDate and viewMode synchronization via localStorage and CustomEvents
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'adonai:selected-date' && e.newValue) {
        const parsedDate = new Date(e.newValue);
        if (!isNaN(parsedDate.getTime()) && parsedDate.getTime() !== selectedDate.getTime()) {
          setSelectedDate(parsedDate);
        }
      }
      if (e.key === 'adonai:calendar-view-mode' && e.newValue) {
        if (e.newValue !== viewMode) {
          setViewMode(e.newValue as any);
        }
      }
    };
    const handleCustomDateChange = (e: CustomEvent<{ date: Date | string }>) => {
      const parsedDate = typeof e.detail.date === 'string' ? new Date(e.detail.date) : e.detail.date;
      if (parsedDate && parsedDate.getTime() !== selectedDate.getTime()) {
        setSelectedDate(parsedDate);
      }
    };
    const handleCustomViewChange = (e: CustomEvent<{ viewMode: string }>) => {
      if (e.detail.viewMode && e.detail.viewMode !== viewMode) {
        setViewMode(e.detail.viewMode as any);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('adonai:calendar-selected-date-change' as any, handleCustomDateChange as any);
    window.addEventListener('adonai:calendar-view-mode-change' as any, handleCustomViewChange as any);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('adonai:calendar-selected-date-change' as any, handleCustomDateChange as any);
      window.removeEventListener('adonai:calendar-view-mode-change' as any, handleCustomViewChange as any);
    };
  }, [selectedDate, viewMode]);

  useEffect(() => {
    localStorage.setItem('adonai:selected-date', selectedDate.toISOString());
    window.dispatchEvent(new CustomEvent('adonai:calendar-selected-date-change', { detail: { date: selectedDate } }));
  }, [selectedDate]);

  useEffect(() => {
    localStorage.setItem('adonai:calendar-view-mode', viewMode);
    window.dispatchEvent(new CustomEvent('adonai:calendar-view-mode-change', { detail: { viewMode } }));
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
