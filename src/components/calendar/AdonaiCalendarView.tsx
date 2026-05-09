import React, { useMemo, useState, useEffect } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useTimeBlocks } from '@/hooks/useTimeBlocks';
import { useFolders } from '@/hooks/useFolders';
import { usePriorityColors } from '@/hooks/usePriorityColors';
import { EventManager, Event } from '@/components/ui/event-manager';
import { format, parseISO, startOfMonth, endOfMonth, addMonths, startOfDay, addHours, differenceInMinutes, addMinutes, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { Sparkles, Calendar as CalendarIcon, Plus } from 'lucide-react';

interface AdonaiCalendarViewProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  viewMode?: 'day' | 'week' | 'month';
}

const TIME_PREFIX_REGEX = /^\[T:(\d{2}:\d{2})-(\d{2}:\d{2})\]/;

const parseTimeFromDescription = (description: string | null) => {
  if (!description) return null;
  const match = description.match(TIME_PREFIX_REGEX);
  if (!match) return null;
  return {
    start: match[1],
    end: match[2],
    cleanDescription: description.replace(TIME_PREFIX_REGEX, '').trim()
  };
};

const formatTimeToDescription = (startTime: Date, endTime: Date, description: string | null) => {
  const cleanDesc = description ? description.replace(TIME_PREFIX_REGEX, '').trim() : '';
  const timePrefix = `[T:${format(startTime, 'HH:mm')}-${format(endTime, 'HH:mm')}]`;
  return `${timePrefix} ${cleanDesc}`.trim();
};

const AdonaiCalendarView: React.FC<AdonaiCalendarViewProps> = ({ selectedDate, onSelectDate, viewMode = 'day' }) => {
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  
  // Fetch tasks for the current month view
  const rangeStart = startOfMonth(selectedDate);
  const rangeEnd = endOfMonth(selectedDate);
  
  const { tasks, createTask, updateTask, deleteTask } = useTasks({
    startDate: format(rangeStart, 'yyyy-MM-dd'),
    endDate: format(rangeEnd, 'yyyy-MM-dd'),
  });

  const { timeBlocks, createBlock, updateBlock, deleteBlock } = useTimeBlocks(dateStr);
  const { folders } = useFolders();
  const { colors: priorityColors } = usePriorityColors();

  // Map everything to EventManager
  const calendarEvents = useMemo(() => {
    const events: Event[] = [];

    // Map Time Blocks
    timeBlocks?.forEach((block) => {
      // If the block is recurring and we are on a day it applies to, we show it
      // The useTimeBlocks hook already filters for the current day, but for month view we might need more
      const start = parseISO(`${dateStr}T${block.start_time}`);
      const end = parseISO(`${dateStr}T${block.end_time}`);
      
      events.push({
        id: `block-${block.id}`,
        title: block.title,
        startTime: start,
        endTime: end,
        color: block.color || 'blue',
        category: 'Calendario',
        description: block.is_recurring ? 'Hábito Recurrente' : 'Bloque de Tiempo',
      });
    });

    tasks?.forEach((task) => {
      // Show tasks that match the current month range or have no date (though useTasks filters)
      if (task.status !== 'done') {
        const taskDateStr = task.due_date || dateStr;
        const scheduledTime = parseTimeFromDescription(task.description);
        
        // Default time or parsed time
        const start = scheduledTime 
          ? parseISO(`${taskDateStr}T${scheduledTime.start}:00`)
          : parseISO(`${taskDateStr}T08:00:00`);
        const end = scheduledTime 
          ? parseISO(`${taskDateStr}T${scheduledTime.end}:00`)
          : parseISO(`${taskDateStr}T08:10:00`); // Default to 10 minutes

        const folder = folders.find((f: any) => f.id === task.folder_id);
        const folderName = folder ? folder.name : 'General';

        let color = priorityColors.p4; // Default to P4
        if (task.urgency && task.importance) color = priorityColors.p1;
        else if (task.urgency && !task.importance) color = priorityColors.p2;
        else if (!task.urgency && task.importance) color = priorityColors.p3;

        if (color === 'transparent') color = 'var(--primary)';

        events.push({
          id: `task-${task.id}`,
          title: task.title,
          startTime: start,
          endTime: end,
          color: color,
          category: folderName,
          description: scheduledTime ? scheduledTime.cleanDescription : (task.description || (task.isVirtual ? 'Tarea Recurrente' : undefined)),
          urgency: task.urgency || false,
          importance: task.importance || false,
          links: task.link ? [task.link] : [],
          priority: (task.urgency ? 2 : 0) + (task.importance ? 1 : 0),
          isAllDay: !scheduledTime,
          completed: task.status === 'done',
        });
      }
    });

    return events;
  }, [tasks, timeBlocks, dateStr, folders, priorityColors]);

  const handleEventUpdate = (id: string, updates: Partial<Event>) => {
    if (id.startsWith('block-')) {
      const blockId = id.replace('block-', '');
      const updateData: any = {};
      
      if (updates.title) updateData.title = updates.title;
      if (updates.startTime) updateData.start_time = format(updates.startTime, 'HH:mm:ss');
      if (updates.endTime) updateData.end_time = format(updates.endTime, 'HH:mm:ss');
      if (updates.color) updateData.color = updates.color;
      
      updateBlock.mutate({ id: blockId, ...updateData });
    } else if (id.startsWith('task-')) {
      const taskId = id.replace('task-', '');
      const updateData: any = {};
      
      if (updates.title) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.urgency !== undefined) updateData.urgency = updates.urgency;
      if (updates.importance !== undefined) updateData.importance = updates.importance;
      if (updates.links && updates.links.length > 0) updateData.link = updates.links[0];

      // ── Remove time ──────────────────────────────────────────────────────────
      // If the user toggled OFF "Asignar hora específica", isAllDay becomes true.
      // Strip the [T:HH:mm-HH:mm] prefix so the task leaves the calendar
      // and returns to the unscheduled task bank. Silent — no toast.
      if (updates.isAllDay === true) {
        const task = tasks?.find(t => t.id === taskId);
        const cleanDesc = (task?.description || '').replace(TIME_PREFIX_REGEX, '').trim();
        updateData.description = cleanDesc;
        updateTask.mutate({ id: taskId, ...updateData });
        return;
      }
      // ─────────────────────────────────────────────────────────────────────────
      
      if (updates.startTime && updates.endTime) {
        const task = tasks?.find(t => t.id === taskId);
        updateData.description = formatTimeToDescription(updates.startTime, updates.endTime, updates.description || task?.description || null);
        
        const newDate = format(updates.startTime, 'yyyy-MM-dd');
        if (newDate !== dateStr) {
          updateData.due_date = newDate;
          // Silent save — no toast on drag-drop
        }
      } else if (updates.startTime) {
        const task = tasks?.find(t => t.id === taskId);
        const duration = 10 * 60 * 1000;
        const endTime = new Date(updates.startTime.getTime() + duration);
        updateData.description = formatTimeToDescription(updates.startTime, endTime, updates.description || task?.description || null);
        
        const newDate = format(updates.startTime, 'yyyy-MM-dd');
        if (newDate !== dateStr) {
          updateData.due_date = newDate;
        }
      }
      
      updateTask.mutate({ id: taskId, ...updateData });

    }
  };

  const handleEventCreate = (event: Omit<Event, 'id'>) => {
    createTask.mutate({
      title: event.title || 'Nueva Tarea',
      description: event.description,
      importance: event.importance || false,
      urgency: event.urgency || false,
      link: event.links && event.links.length > 0 ? event.links[0] : null,
      due_date: dateStr,
      status: 'todo',
    });
    toast.success('Tarea creada');
  };

  const handleEventDelete = (id: string) => {
    if (id.startsWith('block-')) {
      deleteBlock.mutate(id.replace('block-', ''));
    } else if (id.startsWith('task-')) {
      deleteTask.mutate(id.replace('task-', ''));
    }
  };

  return (
    <div className="relative space-y-6">

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <EventManager
          events={calendarEvents}
          onEventUpdate={handleEventUpdate}
          onEventCreate={handleEventCreate}
          onEventDelete={handleEventDelete}
          onCellClick={(date) => {
            if (!isSameDay(date, selectedDate)) {
              onSelectDate(date);
            }
          }}
          categories={['Calendario', 'Tarea', 'Personal', 'Trabajo']}
          colors={[
            { name: "Azul", value: "blue", bg: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
            { name: "Verde", value: "green", bg: "bg-green-500", text: "text-green-600 dark:text-green-400" },
            { name: "Naranja", value: "orange", bg: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" },
            { name: "Rojo", value: "red", bg: "bg-red-500", text: "text-red-600 dark:text-red-400" },
            { name: "Púrpura", value: "purple", bg: "bg-purple-500", text: "text-purple-600 dark:text-purple-400" },
          ]}
          defaultView={viewMode}
          className="min-h-[600px]"
        />
      </div>

    </div>
  );
};

export default AdonaiCalendarView;
