import React, { useMemo, useState, useEffect, useRef } from 'react';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { buildReminderMetadata, getReminderSettings } from '@/lib/reminders';
import { ensureOneSignalSubscribed } from '@/lib/onesignal';

interface AdonaiCalendarViewProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  viewMode?: 'day' | 'week' | 'month';
  onViewModeChange?: (mode: 'day' | 'week' | 'month' | string) => void;
  dragDisabled?: boolean;
  className?: string;
  hideSidebar?: boolean;
  fillHeight?: boolean;
  googleEvents?: Array<{ id: string; title: string; start: string; end: string; description?: string; color?: string | null; allDay?: boolean; location?: string; htmlLink?: string }>;
}

const TIME_PREFIX_REGEX = /^\[T:(\d{2}:\d{2})-(\d{2}:\d{2})\]/;
const COLOR_PREFIX_REGEX = /\[C:([^\]]+)\]/;
type RecurringUpdateScope = 'single' | 'all';
 
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

function buildGoogleRRule(rec: Event['recurrence'], days?: number[], interval?: number, unit?: Event['recurrenceUnit'], endType?: string, endDate?: string, endCount?: number): string | null {
  if (!rec || rec === 'none') return null;
  const freqMap: Record<string, string> = { daily:'DAILY', weekly:'WEEKLY', biweekly:'WEEKLY', weekdays:'WEEKLY', monthly:'MONTHLY', yearly:'YEARLY' };
  const freq = freqMap[rec];
  if (!freq) return null;
  let rrule = `RRULE:FREQ=${freq}`;
  const revMap: Record<number, string> = { 0:'SU', 1:'MO', 2:'TU', 3:'WE', 4:'TH', 5:'FR', 6:'SA' };
  if (days && days.length > 0 && (rec === 'weekly' || rec === 'biweekly' || rec === 'weekdays')) {
    const byday = days.map(d => revMap[d]).filter(Boolean).join(',');
    if (byday) rrule += `;BYDAY=${byday}`;
  }
  const useInterval = interval || (rec === 'biweekly' ? 2 : 1);
  if (useInterval > 1) rrule += `;INTERVAL=${useInterval}`;
  if (endType === 'date' && endDate) {
    rrule += `;UNTIL=${endDate.replace(/-/g, '')}T235959Z`;
  } else if (endType === 'count' && endCount) {
    rrule += `;COUNT=${endCount}`;
  }
  return rrule;
}

const getCountBasedEndDate = (
  startDate: string,
  recurrence: Event['recurrence'],
  daysOfWeek: number[],
  interval: number,
  unit: Event['recurrenceUnit'],
  count?: number
) => {
  if (!count || count < 1 || !recurrence || recurrence === 'none') return null;

  const anchor = parseISO(`${startDate}T12:00:00`);
  const selectedDays = daysOfWeek.length > 0 ? daysOfWeek : [anchor.getDay()];
  let seen = 0;
  let cursor = anchor;

  for (let i = 0; i < 3660; i += 1) {
    const diffDays = Math.floor((startOfDay(cursor).getTime() - startOfDay(anchor).getTime()) / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = (cursor.getFullYear() - anchor.getFullYear()) * 12 + cursor.getMonth() - anchor.getMonth();
    const diffYears = cursor.getFullYear() - anchor.getFullYear();
    const dayMatches = selectedDays.includes(cursor.getDay());
    let matches = false;

    if (recurrence === 'daily' || (recurrence === 'custom' && unit === 'days')) {
      matches = diffDays % Math.max(1, interval) === 0;
    } else if (recurrence === 'weekly' || recurrence === 'weekdays' || recurrence === 'biweekly' || (recurrence === 'custom' && unit === 'weeks')) {
      const weeklyInterval = recurrence === 'biweekly' ? 2 : Math.max(1, interval);
      matches = dayMatches && diffWeeks % weeklyInterval === 0;
    } else if (recurrence === 'monthly' || (recurrence === 'custom' && unit === 'months')) {
      matches = cursor.getDate() === anchor.getDate() && diffMonths % Math.max(1, interval) === 0;
    } else if (recurrence === 'yearly' || (recurrence === 'custom' && unit === 'years')) {
      matches = cursor.getDate() === anchor.getDate() && cursor.getMonth() === anchor.getMonth() && diffYears % Math.max(1, interval) === 0;
    }

    if (matches) {
      seen += 1;
      if (seen >= count) return format(cursor, 'yyyy-MM-dd');
    }

    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 1);
  }

  return null;
};

const AdonaiCalendarView: React.FC<AdonaiCalendarViewProps> = ({ selectedDate, onSelectDate, viewMode = 'day', onViewModeChange, dragDisabled = false, className, hideSidebar = false, fillHeight = false, googleEvents = [] }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
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
  const recurrenceScopeResolverRef = useRef<((scope: RecurringUpdateScope) => void) | null>(null);
  const [recurrenceScopeDialogOpen, setRecurrenceScopeDialogOpen] = useState(false);

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

    const getTaskRecurrence = (recurrenceId?: string | null) => {
      const rule = recurrenceId ? recurrenceRules.find(r => r.id === recurrenceId) : undefined;
      let recurrence: Event['recurrence'] = 'none';
      let recurrenceDays: number[] | undefined = undefined;
      let recurrenceInterval: number | undefined = undefined;
      let recurrenceUnit: Event['recurrenceUnit'] | undefined = undefined;

      if (!rule) {
        return { recurrence, recurrenceDays, recurrenceInterval, recurrenceUnit, recurrenceEndDate: undefined };
      }

      recurrenceInterval = rule.interval || 1;

      if (rule.frequency === 'daily') {
        recurrence = recurrenceInterval > 1 ? 'custom' : 'daily';
        recurrenceUnit = recurrence === 'custom' ? 'days' : undefined;
      } else if (rule.frequency === 'weekly') {
        const days = rule.days_of_week || [];
        const allWeekdays = [1, 2, 3, 4, 5];
        const isAllWeekdays = days.length === 5 && allWeekdays.every(d => days.includes(d));
        if (recurrenceInterval === 2) {
          recurrence = 'biweekly';
          recurrenceDays = days.length > 0 ? days : undefined;
        } else if (recurrenceInterval > 1) {
          recurrence = 'custom';
          recurrenceUnit = 'weeks';
          recurrenceDays = days.length > 0 ? days : undefined;
        } else if (isAllWeekdays) {
          recurrence = 'weekdays';
        } else {
          recurrence = 'weekly';
          recurrenceDays = days.length > 0 ? days : undefined;
        }
      } else if (rule.frequency === 'monthly') {
        recurrence = recurrenceInterval > 1 ? 'custom' : 'monthly';
        recurrenceUnit = recurrence === 'custom' ? 'months' : undefined;
      } else if (rule.frequency === 'yearly') {
        recurrence = recurrenceInterval > 1 ? 'custom' : 'yearly';
        recurrenceUnit = recurrence === 'custom' ? 'years' : undefined;
      }

      return {
        recurrence,
        recurrenceDays,
        recurrenceInterval,
        recurrenceUnit,
        recurrenceEndDate: rule.end_date || undefined,
      };
    };

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
                isEvent: true,
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
        metadata: block.metadata || {},
        isEvent: true,
        recurrence,
        recurrenceDays,
      });
    });

// Map Google Calendar Events
    googleEvents?.forEach((ge) => {
      const start = parseISO(ge.start);
      const end = parseISO(ge.end);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

      // Map Google reminders to App reminder format
      let reminderEnabled = false;
      let reminderMinutesBefore = 15;
      if (ge.reminders) {
        if (ge.reminders.overrides && ge.reminders.overrides.length > 0) {
          const popup = ge.reminders.overrides.find(r => r.method === 'popup');
          if (popup) {
            reminderEnabled = true;
            reminderMinutesBefore = popup.minutes;
          }
        } else if (ge.reminders.useDefault) {
          reminderEnabled = true;
        }
      }

      // ── Parse Google RRULE into app recurrence fields ────────
      let recurrence: Event['recurrence'] = 'none';
      let recurrenceDays: number[] = [];
      let recurrenceInterval = 1;
      let recurrenceUnit: Event['recurrenceUnit'] = 'weeks';
      let recurrenceEndType: Event['recurrenceEndType'] = 'never';
      let recurrenceEndDate: string | undefined;
      let recurrenceEndCount: number | undefined;

      if (ge.recurrence && ge.recurrence.length > 0) {
        const rrule = ge.recurrence[0].replace(/^RRULE:/i, '');
        const parts = rrule.split(';');
        for (const part of parts) {
          const [key, val] = part.split('=');
          if (!val) continue;
          switch (key) {
            case 'FREQ':
              if (val === 'DAILY') { recurrence = 'daily'; recurrenceUnit = 'days'; }
              else if (val === 'WEEKLY') { recurrence = 'weekly'; recurrenceUnit = 'weeks'; }
              else if (val === 'MONTHLY') { recurrence = 'monthly'; recurrenceUnit = 'months'; }
              else if (val === 'YEARLY') { recurrence = 'yearly'; recurrenceUnit = 'years'; }
              else recurrence = 'custom';
              break;
            case 'BYDAY': {
              const dayMap: Record<string, number> = { MO:1, TU:2, WE:3, TH:4, FR:5, SA:6, SU:0 };
              recurrenceDays = val.split(',').map((d: string) => dayMap[d.trim()]).filter((d: number | undefined): d is number => d !== undefined);
              break;
            }
            case 'INTERVAL': recurrenceInterval = parseInt(val, 10); break;
            case 'COUNT': recurrenceEndType = 'count'; recurrenceEndCount = parseInt(val, 10); break;
            case 'UNTIL': {
              recurrenceEndType = 'date';
              const ds = val.replace('T', ' ').split(' ')[0];
              if (ds && ds.length === 8) recurrenceEndDate = `${ds.slice(0,4)}-${ds.slice(4,6)}-${ds.slice(6,8)}`;
              break;
            }
          }
        }
      }

      events.push({
        id: `google-${ge.id}`,
        title: ge.title,
        startTime: start,
        endTime: end,
        color: ge.color || '#4285F4',
        category: 'Google Calendar',
        description: ge.description || '',
        links: [...new Set([
          ...(ge.links || []),
          ...(ge.location && ge.location.includes('http')
            ? ge.location.split(/\s+/).filter(w => w.startsWith('http://') || w.startsWith('https://')).map(w => w.replace(/[.,;:!?)]+$/, ''))
            : [])
        ])],
        isAllDay: ge.allDay || false,
        isEvent: true,
        location: ge.location || '',
        recurrence,
        recurrenceDays,
        recurrenceInterval,
        recurrenceUnit,
        recurrenceEndType,
        recurrenceEndDate,
        recurrenceEndCount,
        reminderEnabled,
        reminderMinutesBefore,
      });
    });

    tasks?.forEach((task) => {
       if (task.status !== 'done' && task.status !== 'deleted') {
         const taskDateStr = task.due_date || dateStr;
         const scheduledTime = parseTimeFromDescription(task.description);
         const parsedColor = parseColorFromDescription(task.description);
         const recurrenceConfig = getTaskRecurrence(task.recurrence_id);
         
         const start = scheduledTime
           ? parseISO(`${taskDateStr}T${scheduledTime.start}:00`)
           : parseISO(`${taskDateStr}T08:00:00`);
         const end = scheduledTime
           ? parseISO(`${taskDateStr}T${scheduledTime.end}:00`)
           : addMinutes(start, 30);

         const folder = folders.find((f: any) => f.id === task.folder_id);
         const folderName = folder ? folder.name : 'Hoy';

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

          events.push({
            id: `task-${task.id}`,
            title: task.title,
            startTime: start,
            endTime: end,
            color: color,
            category: folderName,
             description: stripAllPrefixes(scheduledTime ? scheduledTime.cleanDescription : (task.description || '')) || undefined,
            metadata: task.metadata || {},
            urgency: urgency,
            importance: importance,
            links: task.link ? [task.link] : [],
            priority: (urgency ? 2 : 0) + (importance ? 1 : 0),
            sortOrder: task.sort_order,
            isAllDay: !scheduledTime,
            completed: task.status === 'done',
            isEvent: (task.metadata as any)?.creation_source === 'event',
            recurrence: recurrenceConfig.recurrence,
            recurrenceDays: recurrenceConfig.recurrenceDays,
            recurrenceInterval: recurrenceConfig.recurrenceInterval,
            recurrenceUnit: recurrenceConfig.recurrenceUnit,
            recurrenceEndType: recurrenceConfig.recurrenceEndDate ? 'date' : 'never',
            recurrenceEndDate: recurrenceConfig.recurrenceEndDate,
            expandRecurrence: false,
            recurrenceId: task.recurrence_id || undefined,
            reminderEnabled: !!getReminderSettings(task.metadata, (task.metadata as any)?.creation_source === 'event' ? 'event' : 'task')?.enabled,
            reminderMinutesBefore: getReminderSettings(task.metadata, (task.metadata as any)?.creation_source === 'event' ? 'event' : 'task')?.minutes_before,
          });
       }
     });

    return events;
  }, [tasks, timeBlocks, dateStr, folders, priorityColors, rangeStart, rangeEnd, recurrenceRules, googleEvents]);

  const getTaskEventParts = (id: string) => {
    const generatedMatch = id.match(/^task-(.+)-rec-(\d{4}-\d{2}-\d{2})$/);
    if (generatedMatch) {
      return { taskId: generatedMatch[1], occurrenceDate: generatedMatch[2], isGeneratedOccurrence: true };
    }

    if (!id.startsWith('task-')) return null;
    return { taskId: id.replace('task-', ''), occurrenceDate: null, isGeneratedOccurrence: false };
  };

  const resolveRecurringUpdateScope = (scope: RecurringUpdateScope) => {
    recurrenceScopeResolverRef.current?.(scope);
    recurrenceScopeResolverRef.current = null;
    setRecurrenceScopeDialogOpen(false);
  };

  const askRecurringUpdateScope = () => {
    setRecurrenceScopeDialogOpen(true);
    return new Promise<RecurringUpdateScope>((resolve) => {
      recurrenceScopeResolverRef.current = resolve;
    });
  };

  const updateRecurringTaskSeries = async (
    recurrenceId: string,
    updateData: any,
    updates: Partial<Event>,
    originalEvent?: Event
  ) => {
    if (!user) return;

    const { due_date: _dueDate, recurrence_id: _recurrenceId, ...seriesTaskUpdates } = updateData;

    if (Object.keys(seriesTaskUpdates).length > 0) {
      const { error } = await supabase
        .from('tasks')
        .update(seriesTaskUpdates)
        .eq('user_id', user.id)
        .eq('recurrence_id', recurrenceId);
      if (error) throw error;
    }

    const ruleUpdates: any = {};
    if (seriesTaskUpdates.title) ruleUpdates.title = seriesTaskUpdates.title;

    if (updates.startTime) {
      const nextDate = format(updates.startTime, 'yyyy-MM-dd');
      const nextDay = updates.startTime.getDay();
      const rule = recurrenceRules.find(r => r.id === recurrenceId);
      ruleUpdates.start_date = nextDate;

      if (rule?.frequency === 'weekly') {
        const currentDays = rule.days_of_week || [];
        const previousDay = originalEvent?.startTime?.getDay();
        if (currentDays.length <= 1) {
          ruleUpdates.days_of_week = [nextDay];
        } else if (previousDay !== undefined) {
          ruleUpdates.days_of_week = Array.from(new Set(currentDays.map(day => day === previousDay ? nextDay : day))).sort();
        }
      }
    }

    if (Object.keys(ruleUpdates).length > 0) {
      const { error } = await supabase
        .from('recurrence_rules')
        .update(ruleUpdates)
        .eq('id', recurrenceId)
        .eq('user_id', user.id);
      if (error) throw error;
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tasks', user.id] }),
      queryClient.invalidateQueries({ queryKey: ['recurrence_rules', user.id] }),
      queryClient.invalidateQueries({ queryKey: ['materialized-recurrence', user.id] }),
    ]);
    (window as any).electronAPI?.syncData?.();
  };

  const handleEventUpdate = async (id: string, updates: Partial<Event>) => {
    if (updates.reminderEnabled) {
      ensureOneSignalSubscribed();
    }

    // Handle completion of recurring instances (skip for calendar-only events)
    const recMatch = id.match(/^task-(.+)-rec-(\d{4}-\d{2}-\d{2})$/);
    if (recMatch && updates.completed === true) {
      const anchorTaskId = recMatch[1];
      const dueDate = recMatch[2];
      const anchorTask = tasks?.find((t: any) => t.id === anchorTaskId);
      // Events (creation_source='event') don't get checked off
      if ((anchorTask?.metadata as any)?.creation_source === 'event') return;
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
        });
        if (error) {
          console.error('[calendar] Error saving recurrence completion:', error);
        } else {
          refetchMaterialized();
        }
      }
      return;
    }

    // ── Google Calendar event (bidirectional sync) ──────────────────────
    if (id.startsWith('google-')) {
      const googleId = id.replace('google-', '');

      // ── Optimistic update: apply change to local cache immediately ──
      queryClient.setQueryData(['calendar-events'], (old: any) => {
        if (!old) return old;
        const list = Array.isArray(old) ? old : (old.items ?? old);
        const updated = list.map((ev: any) => {
          const evId = ev.id?.replace('google-', '') ?? ev.id;
          if (evId !== googleId) return ev;
          return {
            ...ev,
            ...(updates.title ? { title: updates.title, summary: updates.title } : {}),
            ...(updates.description !== undefined ? { description: updates.description } : {}),
            ...(updates.startTime ? { start: updates.startTime.toISOString() } : {}),
            ...(updates.endTime ? { end: updates.endTime.toISOString() } : {}),
          };
        });
        return Array.isArray(old) ? updated : { ...old, items: updated };
      });

      // ── Background sync to Google (silent) ──
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const eventData: any = {};
      if (updates.title) eventData.summary = updates.title;
      if (updates.description !== undefined) eventData.description = updates.description;
      if (updates.startTime) eventData.start = { dateTime: updates.startTime.toISOString() };
      if (updates.endTime) eventData.end = { dateTime: updates.endTime.toISOString() };
      if (updates.location !== undefined) eventData.location = updates.location;
      if (updates.recurrence !== undefined) {
        const rrule = buildGoogleRRule(updates.recurrence, updates.recurrenceDays, updates.recurrenceInterval, updates.recurrenceUnit, updates.recurrenceEndType, updates.recurrenceEndDate, updates.recurrenceEndCount);
        if (rrule) eventData.recurrence = [rrule];
        else eventData.recurrence = [];
      }
      if (updates.reminderEnabled !== undefined) {
        eventData.reminders = updates.reminderEnabled
          ? { useDefault: false, overrides: [{ method: 'popup', minutes: updates.reminderMinutesBefore ?? 15 }] }
          : { useDefault: false, overrides: [] };
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-calendar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: 'update', eventId: googleId, eventData }),
        });
        if (!response.ok) throw new Error('Failed to sync');
        // Silently refresh in background after confirm
        queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      } catch (err) {
        console.error('[google-sync] Error:', err);
        // On error, revert by invalidating to re-fetch real state
        queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      }
      return;
    }

    if (id.startsWith('block-')) {
      // Extract base block ID (strip date suffix from generated events like "block-{id}-2026-05-11")
      const blockId = id.replace(/^block-/, '').replace(/-\d{4}-\d{2}-\d{2}$/, '');

      if (updates.isEvent === false) {
        const start = updates.startTime || new Date();
        const end = updates.endTime || addMinutes(start, 60);
        const cleanDesc = stripAllPrefixes(updates.description || '');

        try {
          await createTask.mutateAsync({
            title: updates.title || 'Nueva Tarea',
            description: rebuildDescription(start, end, updates.color || null, cleanDesc),
            importance: updates.importance || false,
            urgency: updates.urgency || false,
            link: updates.links && updates.links.length > 0 ? updates.links[0] : null,
            due_date: format(start, 'yyyy-MM-dd'),
            status: 'pending',
            metadata: buildReminderMetadata((updates as any).metadata, 'task', !!updates.reminderEnabled, updates.reminderMinutesBefore ?? 15),
          });
          await deleteBlock.mutateAsync(blockId);
        } catch (err) {
          console.error('[calendar] Error converting block to task:', err);
        }
        return;
      }

      const updateData: any = {};
      
      if (updates.title) updateData.title = updates.title;
      if (updates.startTime) updateData.start_time = format(updates.startTime, 'HH:mm:ss');
      if (updates.endTime) updateData.end_time = format(updates.endTime, 'HH:mm:ss');
      if (updates.color) updateData.color = updates.color;
      if (updates.recurrence !== undefined) updateData.is_recurring = updates.recurrence !== 'none';
      if (updates.recurrenceDays !== undefined) updateData.days_of_week = updates.recurrenceDays;
      
      updateBlock.mutate({ id: blockId, ...updateData });
    } else if (id.startsWith('task-')) {
      const taskParts = getTaskEventParts(id);
      if (!taskParts) return;

      const taskId = taskParts.taskId;
      if (taskId.startsWith('temp-')) return;
      const originalEvent = calendarEvents.find(event => event.id === id);
      const task = tasks?.find(t => t.id === taskId);

      if (updates.isEvent === true) {
        const start = updates.startTime || originalEvent?.startTime || new Date();
        const end = updates.endTime || originalEvent?.endTime || addMinutes(start, 60);
        const recurrence = updates.recurrence || originalEvent?.recurrence || 'none';
        const isRecurring = recurrence !== 'none';
        const daysOfWeek = recurrence === 'weekdays'
          ? [1, 2, 3, 4, 5]
          : updates.recurrenceDays && updates.recurrenceDays.length > 0
            ? updates.recurrenceDays
            : originalEvent?.recurrenceDays && originalEvent.recurrenceDays.length > 0
              ? originalEvent.recurrenceDays
              : isRecurring
                ? [start.getDay()]
                : [];

        try {
          await createBlock.mutateAsync({
            title: updates.title || originalEvent?.title || task?.title || 'Nuevo Evento',
            start_time: format(start, 'HH:mm:ss'),
            end_time: format(end, 'HH:mm:ss'),
            block_date: isRecurring ? null : format(start, 'yyyy-MM-dd'),
            color: updates.color || originalEvent?.color || priorityColors.p4,
            is_recurring: isRecurring,
            days_of_week: daysOfWeek,
            metadata: buildReminderMetadata((updates as any).metadata || originalEvent?.metadata || task?.metadata, 'event', !!updates.reminderEnabled, updates.reminderMinutesBefore ?? (getReminderSettings(originalEvent?.metadata, 'event')?.minutes_before ?? 15)),
          });
          await deleteTask.mutateAsync(taskId);
        } catch (err) {
          console.error('[calendar] Error converting task to block:', err);
        }
        return;
      }

      const recurrenceId = task?.recurrence_id || originalEvent?.recurrenceId || null;
      const singleUpdateTaskId = taskParts.isGeneratedOccurrence && recurrenceId && taskParts.occurrenceDate
        ? `virtual-${recurrenceId}-${taskParts.occurrenceDate}`
        : taskId;
      const updateData: any = {};

      if (updates.title) updateData.title = updates.title;
      if (updates.urgency !== undefined) updateData.urgency = updates.urgency;
      if (updates.importance !== undefined) updateData.importance = updates.importance;
      if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder;
      if (updates.links && updates.links.length > 0) updateData.link = updates.links[0];
      if (updates.reminderEnabled !== undefined || updates.reminderMinutesBefore !== undefined) {
        const reminderSource = task?.metadata || originalEvent?.metadata || {};
        const reminderKind = (reminderSource as any)?.creation_source === 'event' || task?.id?.startsWith('block-') || originalEvent?.id?.startsWith('block-') ? 'event' : 'task';
        updateData.metadata = buildReminderMetadata(
          reminderSource,
          reminderKind,
          updates.reminderEnabled ?? getReminderSettings(reminderSource, reminderKind)?.enabled ?? false,
          updates.reminderMinutesBefore ?? getReminderSettings(reminderSource, reminderKind)?.minutes_before ?? 15,
        );
      }


      // ── Rebuild description from all sources ──────────────────────────
      const currentDbDesc = task?.description || originalEvent?.description || '';
      const cleanText = updates.description !== undefined
        ? stripAllPrefixes(updates.description)
        : stripAllPrefixes(currentDbDesc);

      const existingColor = parseColorFromDescription(currentDbDesc);
      const newColor = updates.color ?? existingColor;

      const existingTime = parseTimeFromDescription(currentDbDesc);
      const newStartTime = updates.startTime ?? null;
      const newEndTime = updates.endTime ?? null;
      const targetDateStr = newStartTime ? format(newStartTime, 'yyyy-MM-dd') : (taskParts.occurrenceDate || task?.due_date || dateStr);

      const isAllDay = updates.isAllDay ?? (existingTime === null);
      const noTimesProvided = !updates.startTime && !updates.endTime;
      if (isAllDay === true && noTimesProvided) {
        const newDesc = rebuildDescription(null, null, newColor, cleanText);
        updateData.description = newDesc === "" ? null : newDesc;
        if (newStartTime && targetDateStr !== task?.due_date) {
          updateData.due_date = targetDateStr;
        }
      } else {
        let startTime = newStartTime;
        let endTime = newEndTime;

        if (startTime || endTime) {
          if (!startTime && existingTime) {
            startTime = parseISO(`${targetDateStr}T${existingTime.start}:00`);
          }
          if (startTime && !endTime) {
            endTime = addMinutes(startTime, 30);
          }
        } else if (existingTime) {
          startTime = parseISO(`${targetDateStr}T${existingTime.start}:00`);
          endTime = parseISO(`${targetDateStr}T${existingTime.end}:00`);
        } else if (isAllDay === false) {
          startTime = parseISO(`${targetDateStr}T09:00:00`);
          endTime = parseISO(`${targetDateStr}T10:00:00`);
        }

        updateData.description = rebuildDescription(startTime, endTime, newColor, cleanText);

        if (startTime && format(startTime, 'yyyy-MM-dd') !== task?.due_date) {
          updateData.due_date = format(startTime, 'yyyy-MM-dd');
        }
      }

      // ── Handle recurrence ────────────────────────────────────────────
      const doUpdate = () => updateTask.mutate({ id: singleUpdateTaskId, ...updateData });

      if (updates.recurrence !== undefined && recurrenceId) {
        const scope = await askRecurringUpdateScope();
        if (scope === 'single') {
          doUpdate();
          return;
        }

        try {
          await updateRecurringTaskSeries(recurrenceId, updateData, updates, originalEvent);
        } catch (err) {
          console.error('[recurrence] Error updating linked series:', err);
        }
        return;
      }

      if (updates.recurrence === undefined) {
        if (recurrenceId && Object.keys(updateData).length > 0) {
          const scope = await askRecurringUpdateScope();
          if (scope === 'all') {
            try {
              await updateRecurringTaskSeries(recurrenceId, updateData, updates, originalEvent);
            } catch (err) {
              console.error('[recurrence] Error updating linked series:', err);
            }
            return;
          }
        }
        doUpdate();
      } else {
        const existingRuleId = recurrenceId;

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
            custom: updates.recurrenceUnit === 'days'
              ? 'daily'
              : updates.recurrenceUnit === 'months'
                ? 'monthly'
                : updates.recurrenceUnit === 'years'
                  ? 'yearly'
                  : 'weekly',
          };
          const frequency = frequencyMap[updates.recurrence];
          if (!frequency) { doUpdate(); return; }

          let daysOfWeek: number[] = [];
          if (updates.recurrence === 'weekdays') {
            daysOfWeek = [1, 2, 3, 4, 5];
          } else if (updates.recurrenceDays && updates.recurrenceDays.length > 0) {
            daysOfWeek = updates.recurrenceDays;
          }

          const interval = updates.recurrence === 'biweekly'
            ? 2
            : updates.recurrence === 'custom'
              ? updates.recurrenceInterval || 1
              : 1;
          const eventDate = updates.startTime
            ? format(updates.startTime, 'yyyy-MM-dd')
            : dateStr;
          const countEndDate = updates.recurrenceEndType === 'count'
            ? getCountBasedEndDate(
                eventDate,
                updates.recurrence,
                daysOfWeek,
                interval,
                updates.recurrenceUnit || 'weeks',
                updates.recurrenceEndCount
              )
            : null;

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
                end_date: updates.recurrenceEndType === 'date' ? (updates.recurrenceEndDate || null) : countEndDate,
                start_time: null,
                end_time: null,
                estimated_minutes: null,
              });
              if (existingRuleId) deleteRule.mutate(existingRuleId);
              updateData.recurrence_id = newRule.id;
              doUpdate();
            } catch (err) {
              console.error('[recurrence] Error creating rule:', err);
            }
          })();
        }
      }
    }
  };

  const handleEventCreate = async (event: Omit<Event, 'id'>) => {
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

    if (isEvent && !event.isAllDay) {
      const recurrence = event.recurrence || 'none';
      const isRecurring = recurrence !== 'none';
      const daysOfWeek = recurrence === 'weekdays'
        ? [1, 2, 3, 4, 5]
        : event.recurrenceDays && event.recurrenceDays.length > 0
          ? event.recurrenceDays
          : isRecurring
            ? [start.getDay()]
            : [];

      try {
        await createBlock.mutateAsync({
          title: event.title || 'Nuevo Evento',
          start_time: format(start, 'HH:mm:ss'),
          end_time: format(end, 'HH:mm:ss'),
          block_date: isRecurring ? null : eventDateStr,
          color: event.color || priorityColors.p4,
          is_recurring: isRecurring,
          days_of_week: daysOfWeek,
          metadata: buildReminderMetadata(event.metadata, 'event', !!event.reminderEnabled, event.reminderMinutesBefore ?? 15),
        });
      } catch (err) {
        console.error('[calendar] Error creating calendar block:', err);
      }
      return;
    }

    let recurrenceId: string | null = null;
    if (event.recurrence && event.recurrence !== 'none') {
      try {
        const frequencyMap: Record<string, 'daily' | 'weekly' | 'monthly' | 'yearly'> = {
          daily: 'daily',
          weekdays: 'weekly',
          weekly: 'weekly',
          biweekly: 'weekly',
          monthly: 'monthly',
          yearly: 'yearly',
          custom: event.recurrenceUnit === 'days'
            ? 'daily'
            : event.recurrenceUnit === 'months'
              ? 'monthly'
              : event.recurrenceUnit === 'years'
                ? 'yearly'
                : 'weekly',
        };

        const daysOfWeek = event.recurrence === 'weekdays'
          ? [1, 2, 3, 4, 5]
          : event.recurrenceDays || [];
        const interval = event.recurrence === 'biweekly'
          ? 2
          : event.recurrence === 'custom'
            ? event.recurrenceInterval || 1
            : 1;
        const countEndDate = event.recurrenceEndType === 'count'
          ? getCountBasedEndDate(
              eventDateStr,
              event.recurrence,
              daysOfWeek,
              interval,
              event.recurrenceUnit || 'weeks',
              event.recurrenceEndCount
            )
          : null;

        const rule = await createRule.mutateAsync({
          title: event.title || 'Nueva Tarea',
          description: null,
          link: null,
          frequency: frequencyMap[event.recurrence],
          interval,
          days_of_week: daysOfWeek,
          day_of_month: null,
          month_of_year: null,
          start_date: eventDateStr,
          end_date: event.recurrenceEndType === 'date' ? (event.recurrenceEndDate || null) : countEndDate,
          start_time: null,
          end_time: null,
          estimated_minutes: null,
        });
        recurrenceId = rule.id;
      } catch (err) {
        console.error('[recurrence] Error creating rule:', err);
      }
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
        recurrence_id: recurrenceId,
        creation_source: isEvent ? 'event' : undefined,
      },
      {},
    );
  };

  const handleEventDelete = async (id: string) => {
    // Check if this is a recurring instance (task-{id}-rec-{date})
    const recMatch = id.match(/^task-(.+)-rec-(\d{4}-\d{2}-\d{2})$/);
    if (recMatch) {
      const anchorTaskId = recMatch[1];
      const dueDate = recMatch[2];
      let anchorTask = tasks?.find((t: any) => t.id === anchorTaskId);
      if (!anchorTask && user) {
        const { data } = await supabase
          .from('tasks')
          .select('id, title, description, due_date, recurrence_id, priority, importance, urgency')
          .eq('id', anchorTaskId)
          .maybeSingle();
        anchorTask = data;
      }
      if (!anchorTask || !anchorTask.recurrence_id) return;
      // Create a 'deleted' materialized task for this specific date
      const { error } = await supabase.from('tasks').insert({
        user_id: user?.id,
        title: anchorTask.title,
        description: anchorTask.description,
        due_date: dueDate,
        recurrence_id: anchorTask.recurrence_id,
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        priority: anchorTask.priority || 'medium',
        importance: anchorTask.importance || false,
        urgency: anchorTask.urgency || false,
        source_type: 'text',
      });
      if (!error || error.code === '23505') {
        refetchMaterialized();
      } else {
        console.error('[recurrence] Could not delete occurrence');
      }
      return;
    }
    if (id.startsWith('google-')) {
      const googleId = id.replace('google-', '');

      // ── Optimistic delete: remove from cache immediately ──
      queryClient.setQueryData(['calendar-events'], (old: any) => {
        if (!old) return old;
        const list = Array.isArray(old) ? old : (old.items ?? old);
        const filtered = list.filter((ev: any) => {
          const evId = ev.id?.replace('google-', '') ?? ev.id;
          return evId !== googleId;
        });
        return Array.isArray(old) ? filtered : { ...old, items: filtered };
      });

      // ── Background delete from Google (silent) ──
      (async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;
        try {
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-calendar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ action: 'delete', eventId: googleId }),
          });
          if (!response.ok) throw new Error('Failed to delete from Google Calendar');
          queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
        } catch (err) {
          console.error('[google-sync] Error deleting:', err);
          queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
        }
      })();
      return;
    }
    if (id.startsWith('block-')) {
      const blockId = id.replace(/^block-/, '').replace(/-\d{4}-\d{2}-\d{2}$/, '');
      deleteBlock.mutate(blockId);
    } else if (id.startsWith('task-')) {
      const taskId = id.replace(/^task-/, '').replace(/-\d{4}-\d{2}-\d{2}$/, '');
      deleteTask.mutate(taskId);
    }
  };

  return (
    <div className={cn(fillHeight ? "relative flex h-full min-h-0 flex-1 flex-col gap-6 overflow-hidden" : "relative space-y-6", className)}>

      <div className={cn(fillHeight ? "flex-1 min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-700" : "animate-in fade-in slide-in-from-bottom-4 duration-700")}>
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
          categories={['Tarea', 'Personal', 'Trabajo']}
          colors={[
            { name: "Azul", value: "blue", bg: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
            { name: "Verde", value: "green", bg: "bg-green-500", text: "text-green-600 dark:text-green-400" },
            { name: "Naranja", value: "orange", bg: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" },
            { name: "Rojo", value: "red", bg: "bg-red-500", text: "text-red-600 dark:text-red-400" },
            { name: "Púrpura", value: "purple", bg: "bg-purple-500", text: "text-purple-600 dark:text-purple-400" },
          ]}
          defaultView={viewMode}
          focusedDate={selectedDate}
          onDateChange={onSelectDate}
          onViewChange={onViewModeChange}
          className={fillHeight ? "h-full min-h-0" : "min-h-[800px] sm:min-h-[640px] lg:min-h-[720px]"}
          recurrenceExceptions={recurrenceExceptions}
          dragDisabled={dragDisabled}
          hideSidebar={hideSidebar}
          containedScroll={fillHeight}
        />
      </div>

      <Dialog
        open={recurrenceScopeDialogOpen}
        onOpenChange={(open) => {
          if (!open && recurrenceScopeResolverRef.current) {
            resolveRecurringUpdateScope('single');
          } else {
            setRecurrenceScopeDialogOpen(open);
          }
        }}
      >
        <DialogContent className="max-w-[92vw] rounded-[32px] border border-primary/15 bg-surface-container-high/95 p-0 shadow-2xl backdrop-blur-3xl sm:max-w-md">
          <div className="overflow-hidden rounded-[32px]">
            <div className="relative px-6 pb-5 pt-6">
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/18 to-transparent" />
              <div className="relative flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-xl font-black tracking-tight text-foreground">
                    Esto forma parte de una repeticion
                  </DialogTitle>
                  <DialogDescription className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">
                    Adonai puede cambiar solo este evento o mantener toda la serie vinculada para que las repeticiones sigan iguales.
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="grid gap-2 border-t border-outline-variant/10 bg-background/35 p-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => resolveRecurringUpdateScope('single')}
                className="rounded-2xl border border-outline-variant/15 bg-surface-container px-4 py-3 text-left transition-all hover:border-primary/25 hover:bg-primary/5 active:scale-[0.98]"
              >
                <span className="block text-sm font-black text-foreground">Solo este evento</span>
                <span className="mt-1 block text-xs font-medium leading-snug text-muted-foreground">Ideal si este dia fue una excepcion.</span>
              </button>
              <button
                type="button"
                onClick={() => resolveRecurringUpdateScope('all')}
                className="rounded-2xl bg-primary px-4 py-3 text-left text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-105 active:scale-[0.98]"
              >
                <span className="block text-sm font-black">Todas las repeticiones</span>
                <span className="mt-1 block text-xs font-medium leading-snug opacity-80">Mantiene la serie completa sincronizada.</span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default AdonaiCalendarView;
