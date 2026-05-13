import React, { useMemo, useState, useEffect } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useTimeBlocks } from '@/hooks/useTimeBlocks';
import { useFolders } from '@/hooks/useFolders';
import { usePriorityColors } from '@/hooks/usePriorityColors';
import { useRecurrenceRules } from '@/hooks/useRecurrenceRules';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { EventManager, Event } from '@/components/ui/event-manager';
import { format, parseISO, startOfMonth, endOfMonth, addMonths, startOfDay, addHours, differenceInMinutes, addMinutes, isSameDay, eachDayOfInterval } from 'date-fns';
import { Sparkles, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface AdonaiCalendarViewProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  viewMode?: 'day' | 'week' | 'month';
}

const TIME_PREFIX_REGEX = /^\[T:(\d{2}:\d{2})-(\d{2}:\d{2})\]/;
const COLOR_PREFIX_REGEX = /\[C:([^\]]+)\]/;
 
const stripAllPrefixes = (description: string | null): string => {
  if (!description) return '';
  return description.replace(TIME_PREFIX_REGEX, '').replace(COLOR_PREFIX_REGEX, '').trim();
};

const parseTimeFromDescription = (description: string | null) => {
  if (!description) return null;
  const match = description.match(TIME_PREFIX_REGEX);
  if (!match) return null;
  return {
    start: match[1],
    end: match[2],
    cleanDescription: stripAllPrefixes(description)
  };
};
 
const parseColorFromDescription = (description: string | null) => {
  if (!description) return null;
  const match = description.match(COLOR_PREFIX_REGEX);
  if (!match) return null;
  return match[1]; // Return the color value
};

const rebuildDescription = (startTime: Date | null, endTime: Date | null, color: string | null, text: string): string => {
  const parts: string[] = [];
  if (startTime && endTime) {
    parts.push(`[T:${format(startTime, 'HH:mm')}-${format(endTime, 'HH:mm')}]`);
  }
  if (color) {
    parts.push(`[C:${color}]`);
  }
  if (text) {
    parts.push(text);
  }
  return parts.join(' ').trim();
};

const AdonaiCalendarView: React.FC<AdonaiCalendarViewProps> = ({ selectedDate, onSelectDate, viewMode = 'day' }) => {
  const { user } = useAuth();
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  
  const rangeStart = useMemo(() => startOfMonth(selectedDate), [selectedDate]);
  const rangeEnd = useMemo(() => endOfMonth(selectedDate), [selectedDate]);

  // Fetch all materialized recurring task instances (completed/deleted per-date)
  const { data: materializedTasks = [], refetch: refetchMaterialized } = useQuery({
    queryKey: ['materialized-recurrence', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('tasks')
        .select('id, recurrence_id, due_date, status')
        .eq('user_id', user.id)
        .not('recurrence_id', 'is', null);
      return data || [];
    },
    enabled: !!user,
    staleTime: 30_000,
  });
  const tasksFilter = useMemo(() => ({
    startDate: format(rangeStart, 'yyyy-MM-dd'),
    endDate: format(rangeEnd, 'yyyy-MM-dd'),
  }), [rangeStart, rangeEnd]);
  
  const { tasks, createTask, updateTask, deleteTask } = useTasks(tasksFilter);

  // Map excluded dates to event instance IDs for EventManager
  const recurrenceExceptions = useMemo(() => {
    const exceptions = new Set<string>();
    (materializedTasks || []).forEach((mt: any) => {
      if (mt.status !== 'done' && mt.status !== 'deleted') return;
      exceptions.add(`task-${mt.id}`);
      const anchorTask = tasks?.find((t: any) => t.recurrence_id === mt.recurrence_id);
      if (anchorTask) {
        exceptions.add(`task-${anchorTask.id}-rec-${mt.due_date}`);
      }
    });
    return exceptions;
  }, [materializedTasks, tasks]);

  const rangeStartStr = format(rangeStart, 'yyyy-MM-dd');
  const rangeEndStr = format(rangeEnd, 'yyyy-MM-dd');
  // For month view, pass the full range to fetch time blocks across the entire month
  const timeBlocksRangeEnd = viewMode === 'month' ? rangeEndStr : undefined;
  const { timeBlocks, createBlock, updateBlock, deleteBlock } = useTimeBlocks(dateStr, timeBlocksRangeEnd);
  const { folders } = useFolders();
  const { colors: priorityColors } = usePriorityColors();
  const { rules: recurrenceRules, createRule, deleteRule } = useRecurrenceRules();

  // Map everything to EventManager
  const calendarEvents = useMemo(() => {
    const events: Event[] = [];

    // Helper to find the next occurrence of a specific day from a start date
    const findNextDay = (from: Date, targetDay: number): Date => {
      const d = new Date(from);
      while (d.getDay() !== targetDay) {
        d.setDate(d.getDate() + 1);
      }
      return d;
    };

    // Map Time Blocks
    timeBlocks?.forEach((block) => {
      const blockDays = block.days_of_week || [];
      
      // Determine recurrence type from time block data
      let recurrence: Event['recurrence'] = 'none';
      let recurrenceDays: number[] | undefined = undefined;
      let anchorDate: Date;
      
      if (block.is_recurring) {
        const weekdays = [1, 2, 3, 4, 5];
        const isAllWeekdays = blockDays.length === 5 && weekdays.every(d => blockDays.includes(d));
        
        if (blockDays.length === 0 || blockDays.length >= 7) {
          recurrence = 'daily';
          anchorDate = parseISO(`${dateStr}T${block.start_time}`);
        } else if (isAllWeekdays) {
          recurrence = 'weekdays';
          anchorDate = findNextDay(rangeStart, 1);
        } else if (blockDays.length === 1) {
          recurrence = 'weekly';
          recurrenceDays = blockDays;
          anchorDate = findNextDay(rangeStart, blockDays[0]);
        } else {
          // For blocks with specific multiple days (e.g. Mon+Wed), generate one event per day
          const rangeDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
          rangeDays.forEach(day => {
            if (blockDays.includes(day.getDay())) {
              const dStr = format(day, 'yyyy-MM-dd');
              const s = parseISO(`${dStr}T${block.start_time}`);
              const e = parseISO(`${dStr}T${block.end_time}`);
              events.push({
                id: `block-${block.id}-${dStr}`,
                title: block.title,
                startTime: s,
                endTime: e,
                color: block.color || 'blue',
                category: 'Calendario',
                description: '',
              });
            }
          });
          return; // Skip the default single event push below
        }
      } else {
        anchorDate = parseISO(`${dateStr}T${block.start_time}`);
      }
      
      const start = anchorDate;
      const end = parseISO(`${format(anchorDate, 'yyyy-MM-dd')}T${block.end_time}`);
      
      events.push({
        id: `block-${block.id}`,
        title: block.title,
        startTime: start,
        endTime: end,
        color: block.color || 'blue',
        category: 'Calendario',
        description: '',
        recurrence,
        recurrenceDays,
      });
    });

tasks?.forEach((task) => {
       // Show tasks that match the current month range or have no date (though useTasks filters)
       if (task.status !== 'done') {
         const taskDateStr = task.due_date || dateStr;
         const scheduledTime = parseTimeFromDescription(task.description);
         const parsedColor = parseColorFromDescription(task.description);
         
         // Default time or parsed time
         const start = scheduledTime 
           ? parseISO(`${taskDateStr}T${scheduledTime.start}:00`)
           : parseISO(`${taskDateStr}T08:00:00`);
         const end = scheduledTime 
           ? parseISO(`${taskDateStr}T${scheduledTime.end}:00`)
           : addMinutes(start, 30); // Default to 30 minutes

         const folder = folders.find((f: any) => f.id === task.folder_id);
         const folderName = folder ? folder.name : 'General';

         // Use parsed color from description if available, otherwise fall back to priority-based color
         let color = parsedColor ? parsedColor : priorityColors.p4; // Default to P4
         let urgency = task.urgency || false;
         let importance = task.importance || false;
         
         if (parsedColor) {
           // If color is set via description, we map it back to urgency/importance for UI consistency
           if (parsedColor === priorityColors.p1 || parsedColor === '#ef4444') {
             urgency = true;
             importance = true;
           } else if (parsedColor === priorityColors.p2 || parsedColor === '#f59e0b') {
             urgency = true;
             importance = false;
           } else if (parsedColor === priorityColors.p3 || parsedColor === '#3b82f6') {
             urgency = false;
             importance = true;
           } else if (parsedColor === priorityColors.p4 || parsedColor === 'transparent') {
             urgency = false;
             importance = false;
           }
         } else {
           // Fall back to priority-based color mapping
           if (task.urgency && task.importance) {
             color = priorityColors.p1;
             urgency = true;
             importance = true;
           } else if (task.urgency && !task.importance) {
             color = priorityColors.p2;
             urgency = true;
             importance = false;
           } else if (!task.urgency && task.importance) {
             color = priorityColors.p3;
             urgency = false;
             importance = true;
           } else {
             color = priorityColors.p4;
             urgency = false;
             importance = false;
           }
           
           if (color === 'transparent') color = 'var(--primary)';
         }

          // Resolve recurrence from task's recurrence_id -> recurrence_rules
          let taskRecurrence: Event['recurrence'] = 'none';
          let taskRecurrenceDays: number[] | undefined = undefined;
          if (task.recurrence_id && recurrenceRules) {
            const rule = recurrenceRules.find(r => r.id === task.recurrence_id);
            if (rule) {
              if (rule.frequency === 'daily') {
                taskRecurrence = 'daily';
              } else if (rule.frequency === 'weekly') {
                const days = rule.days_of_week || [];
                const allWeekdays = [1, 2, 3, 4, 5];
                const isAllWeekdays = days.length === 5 && allWeekdays.every(d => days.includes(d));
                if (rule.interval === 2) {
                  taskRecurrence = 'biweekly';
                  if (days.length > 0) taskRecurrenceDays = days;
                } else if (isAllWeekdays) {
                  taskRecurrence = 'weekdays';
                } else if (days.length > 0) {
                  taskRecurrence = 'weekly';
                  taskRecurrenceDays = days;
                } else {
                  taskRecurrence = 'weekly';
                }
              } else if (rule.frequency === 'monthly') {
                taskRecurrence = 'monthly';
              } else if (rule.frequency === 'yearly') {
                taskRecurrence = 'yearly';
              }
            }
          }

          events.push({
            id: `task-${task.id}`,
            title: task.title,
            startTime: start,
            endTime: end,
            color: color,
            category: folderName,
             description: stripAllPrefixes(scheduledTime ? scheduledTime.cleanDescription : (task.description || '')) || undefined,
            urgency: urgency,
            importance: importance,
            links: task.link ? [task.link] : [],
            priority: (urgency ? 2 : 0) + (importance ? 1 : 0),
            isAllDay: !scheduledTime,
            completed: task.status === 'done',
            isEvent: task.creation_source === 'event',
            recurrence: taskRecurrence,
            recurrenceDays: taskRecurrenceDays,
          });
       }
     });

    return events;
  }, [tasks, timeBlocks, dateStr, folders, priorityColors, rangeStart, rangeEnd, recurrenceRules]);

const handleEventUpdate = async (id: string, updates: Partial<Event>) => {
    // Handle completion of recurring instances (skip for calendar-only events)
    const recMatch = id.match(/^task-(.+)-rec-(\d{4}-\d{2}-\d{2})$/);
    if (recMatch && updates.completed === true) {
      const anchorTaskId = recMatch[1];
      const dueDate = recMatch[2];
      const anchorTask = tasks?.find((t: any) => t.id === anchorTaskId);
      // Events (creation_source='event') don't get checked off
      if (anchorTask?.creation_source === 'event') return;
      if (anchorTask && anchorTask.recurrence_id) {
        const { error } = await supabase.from('tasks').insert({
          user_id: user?.id,
          title: anchorTask.title,
          description: anchorTask.description,
          due_date: dueDate,
          recurrence_id: anchorTask.recurrence_id,
          status: 'done',
          completed_at: new Date().toISOString(),
          priority: anchorTask.priority || 'medium',
          importance: anchorTask.importance || false,
          urgency: anchorTask.urgency || false,
          source_type: 'text',
          creation_source: 'calendar',
        });
        if (error) {
          console.error('[calendar] Error saving recurrence completion:', error);
        } else {
          refetchMaterialized();
        }
      }
      return;
    }

    // Skip drag updates for generated recurring instances (use optimistic local state only)
    if (id.match(/^task-.+-rec-\d{4}-\d{2}-\d{2}$/)) return;

    if (id.startsWith('block-')) {
      // Extract base block ID (strip date suffix from generated events like "block-{id}-2026-05-11")
      const blockId = id.replace(/^block-/, '').replace(/-\d{4}-\d{2}-\d{2}$/, '');
      const updateData: any = {};
      
      if (updates.title) updateData.title = updates.title;
      if (updates.startTime) updateData.start_time = format(updates.startTime, 'HH:mm:ss');
      if (updates.endTime) updateData.end_time = format(updates.endTime, 'HH:mm:ss');
      if (updates.color) updateData.color = updates.color;
      if (updates.recurrence !== undefined) updateData.is_recurring = updates.recurrence !== 'none';
      if (updates.recurrenceDays !== undefined) updateData.days_of_week = updates.recurrenceDays;
      
      updateBlock.mutate({ id: blockId, ...updateData });
    } else if (id.startsWith('task-')) {
      const taskId = id.replace('task-', '');
      const task = tasks?.find(t => t.id === taskId);
      const updateData: any = {};

      if (updates.title) updateData.title = updates.title;
      if (updates.urgency !== undefined) updateData.urgency = updates.urgency;
      if (updates.importance !== undefined) updateData.importance = updates.importance;
      if (updates.links && updates.links.length > 0) updateData.link = updates.links[0];

      // ── Rebuild description from all sources ──────────────────────────
      const currentDbDesc = task?.description || '';
      const cleanText = updates.description !== undefined
        ? stripAllPrefixes(updates.description)
        : stripAllPrefixes(currentDbDesc);

      const existingColor = parseColorFromDescription(currentDbDesc);
      const newColor = updates.color ?? existingColor;

      const existingTime = parseTimeFromDescription(currentDbDesc);
      const newStartTime = updates.startTime ?? null;
      const newEndTime = updates.endTime ?? null;

      const isAllDay = updates.isAllDay ?? (existingTime === null);
      const noTimesProvided = !updates.startTime && !updates.endTime;
      if (isAllDay === true && noTimesProvided) {
        updateData.description = rebuildDescription(null, null, newColor, cleanText) || undefined;
      } else {
        let startTime = newStartTime;
        let endTime = newEndTime;

        if (startTime || endTime) {
          if (!startTime && existingTime) {
            startTime = parseISO(`${dateStr}T${existingTime.start}:00`);
          }
          if (startTime && !endTime) {
            endTime = addMinutes(startTime, 30);
          }
        } else if (existingTime) {
          startTime = parseISO(`${dateStr}T${existingTime.start}:00`);
          endTime = parseISO(`${dateStr}T${existingTime.end}:00`);
        } else if (isAllDay === false) {
          startTime = parseISO(`${dateStr}T09:00:00`);
          endTime = parseISO(`${dateStr}T10:00:00`);
        }

        updateData.description = rebuildDescription(startTime, endTime, newColor, cleanText);

        if (startTime && format(startTime, 'yyyy-MM-dd') !== dateStr) {
          updateData.due_date = format(startTime, 'yyyy-MM-dd');
        }
      }

      // ── Handle recurrence ────────────────────────────────────────────
      const doUpdate = () => updateTask.mutate({ id: taskId, ...updateData });

      if (updates.recurrence === undefined) {
        doUpdate();
      } else {
        const existingRuleId = task?.recurrence_id;

        if (updates.recurrence === 'none') {
          if (existingRuleId) deleteRule.mutate(existingRuleId);
          updateData.recurrence_id = null;
          doUpdate();
        } else {
          const frequencyMap: Record<string, 'daily' | 'weekly' | 'monthly' | 'yearly'> = {
            daily: 'daily',
            weekdays: 'weekly',
            weekly: 'weekly',
            biweekly: 'weekly',
            monthly: 'monthly',
            yearly: 'yearly',
          };
          const frequency = frequencyMap[updates.recurrence];
          if (!frequency) { doUpdate(); return; }

          let daysOfWeek: number[] = [];
          if (updates.recurrence === 'weekdays') {
            daysOfWeek = [1, 2, 3, 4, 5];
          } else if (updates.recurrenceDays && updates.recurrenceDays.length > 0) {
            daysOfWeek = updates.recurrenceDays;
          }

          const interval = updates.recurrence === 'biweekly' ? 2 : 1;
          const eventDate = updates.startTime
            ? format(updates.startTime, 'yyyy-MM-dd')
            : dateStr;

          (async () => {
            try {
              const newRule = await createRule.mutateAsync({
                title: updateData.title || task?.title || '',
                description: null,
                link: null,
                frequency,
                interval,
                days_of_week: daysOfWeek,
                day_of_month: null,
                month_of_year: null,
                start_date: eventDate,
                end_date: null,
                start_time: null,
                end_time: null,
                estimated_minutes: null,
              });
              if (existingRuleId) deleteRule.mutate(existingRuleId);
              updateData.recurrence_id = newRule.id;
              doUpdate();
            } catch (err) {
              console.error('[recurrence] Error creating rule:', err);
              window.dispatchEvent(new CustomEvent('adonai:notify', {
                detail: { type: 'error', message: 'Error al guardar recurrencia' }
              }));
            }
          })();
        }
      }
    }
  };

  const handleEventCreate = (event: Omit<Event, 'id'>) => {
    const start = event.startTime || new Date();
    const end = event.endTime || addMinutes(start, 60);
    const eventDateStr = format(start, 'yyyy-MM-dd');

    const cleanDesc = stripAllPrefixes(event.description || '');
    const isEvent = event.isEvent === true;

    let description: string | undefined;
    if (event.isAllDay) {
      // task_only: no time info
      description = cleanDesc || undefined;
    } else if (isEvent) {
      // calendar_only: time info + isEvent flag
      description = rebuildDescription(start, end, event.color || null, cleanDesc);
    } else {
      // both: time info, no isEvent flag
      description = rebuildDescription(start, end, event.color || null, cleanDesc);
    }

    createTask.mutate(
      {
        title: event.title || 'Nueva Tarea',
        description,
        importance: event.importance || false,
        urgency: event.urgency || false,
        link: event.links && event.links.length > 0 ? event.links[0] : null,
        due_date: eventDateStr,
        status: 'pending',
        creation_source: isEvent ? 'event' : undefined,
      },
      {
        onSuccess: () => {
          window.dispatchEvent(new CustomEvent('adonai:notify', {
            detail: { type: 'success', message: isEvent ? 'Evento creado' : 'Tarea creada' }
          }));
        },
        onError: () => {
          window.dispatchEvent(new CustomEvent('adonai:notify', {
            detail: { type: 'error', message: 'Error al crear' }
          }));
        }
      }
    );
  };

  const handleEventDelete = async (id: string) => {
    // Check if this is a recurring instance (task-{id}-rec-{date})
    const recMatch = id.match(/^task-(.+)-rec-(\d{4}-\d{2}-\d{2})$/);
    if (recMatch) {
      const anchorTaskId = recMatch[1];
      const dueDate = recMatch[2];
      const anchorTask = tasks?.find((t: any) => t.id === anchorTaskId);
      if (!anchorTask || !anchorTask.recurrence_id) return;
      // Create a 'deleted' materialized task for this specific date
      const { error } = await supabase.from('tasks').insert({
        user_id: user?.id,
        title: anchorTask.title,
        description: anchorTask.description,
        due_date: dueDate,
        recurrence_id: anchorTask.recurrence_id,
        status: 'deleted',
        priority: anchorTask.priority || 'medium',
        importance: anchorTask.importance || false,
        urgency: anchorTask.urgency || false,
        source_type: 'text',
        creation_source: 'calendar',
      });
      if (!error) {
        window.dispatchEvent(new CustomEvent('adonai:notify', {
          detail: { type: 'success', message: `Ocurrencia del ${dueDate} eliminada` }
        }));
        refetchMaterialized();
      }
      return;
    }
    if (id.startsWith('block-')) {
      const blockId = id.replace(/^block-/, '').replace(/-\d{4}-\d{2}-\d{2}$/, '');
      deleteBlock.mutate(blockId);
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
          recurrenceExceptions={recurrenceExceptions}
        />
      </div>

    </div>
  );
};

export default AdonaiCalendarView;
