"use client"
import { format, addHours, addMinutes, addDays, isSameDay, isSameMonth, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { es } from "date-fns/locale"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, Clock, LayoutGrid, List, Plus, Minus, Filter, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check, MoreHorizontal, Link as LinkIcon, Trash2, Repeat, Zap, Menu, GripHorizontal, GripVertical, Bell, BellOff, Palette, Pencil, ExternalLink, Settings, Paperclip } from "lucide-react"
import { usePriorityColors, getPriorityKey } from "@/hooks/usePriorityColors"
import { useFolders } from "@/hooks/useFolders"
import { cn } from "@/lib/utils"
import { REMINDER_OPTIONS, type ReminderMinutes } from "@/lib/reminders"
import { TaskCard } from "@/components/TaskCard"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar as CalendarPicker } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { MonthView as SecondaryMonthView, ScheduleView as SecondaryScheduleView, YearView as SecondaryYearView } from "./event-manager-secondary-views"
import { DEFAULT_EVENT_COLORS as SHARED_DEFAULT_EVENT_COLORS } from "./event-manager-types"

export interface Event {
  id: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  color: string
  category?: string
  folderId?: string | null
  attendees?: string[]
  tags?: string[]
  priority?: number
  recurrence?: 'none' | 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom'
  recurrenceDays?: number[]
  recurrenceInterval?: number
  recurrenceUnit?: 'days' | 'weeks' | 'months' | 'years'
  recurrenceEndType?: 'never' | 'date' | 'count'
  recurrenceEndDate?: string
  recurrenceEndCount?: number
  expandRecurrence?: boolean
  reminderEnabled?: boolean
  reminderMinutesBefore?: number
  reminderCustomValue?: number
  reminderCustomUnit?: 'minutes' | 'hours' | 'days' | 'weeks'
  urgency?: boolean
  importance?: boolean
  links?: string[]
  metadata?: Record<string, unknown>
  isAllDay?: boolean
  completed?: boolean
  isEvent?: boolean
  recurrenceId?: string
  sortOrder?: number | null
}

const REMINDER_CYCLE_VALUES: ReminderMinutes[] = [0, 5, 10, 15, 30, 60, 1440, 10080]
const REMINDER_LABEL_BY_VALUE = new Map<number, string>(REMINDER_OPTIONS.map((option) => [option.value, option.label]))
const CALENDAR_UPCOMING_ROOT_STORAGE_KEY = 'adonai_calendar_upcoming_root_open'
const CALENDAR_UPCOMING_DAYS_STORAGE_KEY = 'adonai_calendar_upcoming_days_open'
const CALENDAR_UPCOMING_WEEKS_STORAGE_KEY = 'adonai_calendar_upcoming_weeks_open'
const CALENDAR_UPCOMING_MONTHS_STORAGE_KEY = 'adonai_calendar_upcoming_months_open'

const capitalizeCalendarLabel = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

const readStoredBoolean = (key: string, fallback: boolean) => {
  try {
    const value = localStorage.getItem(key)
    if (value === null) return fallback
    return value === 'true'
  } catch {
    return fallback
  }
}

const readStoredOpenMap = (key: string): Record<string, boolean> => {
  try {
    const value = localStorage.getItem(key)
    if (!value) return {}
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[0] === 'string' && typeof entry[1] === 'boolean')
    )
  } catch {
    return {}
  }
}

const writeStoredValue = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, typeof value === 'boolean' ? String(value) : JSON.stringify(value))
  } catch {
    // localStorage can be unavailable in restricted embedded contexts.
  }
}

const formatCalendarUpcomingLabel = (date?: Date | null, today = new Date()) => {
  if (!date) return 'Siguientes'
  const todayStart = startOfDay(today)
  const day = startOfDay(date)
  const diffDays = Math.round((day.getTime() - todayStart.getTime()) / 86400000)
  const weekday = format(day, 'EEEE', { locale: es })
  const capitalizedWeekday = capitalizeCalendarLabel(weekday)

  if (diffDays === 1) return 'Mañana'
  if (diffDays >= 2 && diffDays <= 6) return capitalizedWeekday
  if (diffDays >= 7 && diffDays <= 13) return `Próximo ${weekday}`
  if (isSameMonth(day, todayStart)) return `${capitalizedWeekday} ${format(day, 'd')}`
  return format(day, 'd MMMM', { locale: es })
}

const getReminderDisplayLabel = (enabled: boolean, minutes?: number) => {
  if (!enabled) return "Sin recordatorio"
  return REMINDER_LABEL_BY_VALUE.get(minutes ?? 0) || "En el momento"
}

const getNextReminderState = (enabled: boolean, minutes?: number) => {
  if (!enabled) {
    return { reminderEnabled: true, reminderMinutesBefore: REMINDER_CYCLE_VALUES[0] }
  }

  const currentIndex = REMINDER_CYCLE_VALUES.indexOf((minutes ?? 0) as ReminderMinutes)
  const nextIndex = currentIndex >= 0 ? currentIndex + 1 : 0

  if (nextIndex >= REMINDER_CYCLE_VALUES.length) {
    return { reminderEnabled: false, reminderMinutesBefore: minutes ?? REMINDER_CYCLE_VALUES[0] }
  }

  return { reminderEnabled: true, reminderMinutesBefore: REMINDER_CYCLE_VALUES[nextIndex] }
}

type RecurrenceMode = NonNullable<Event['recurrence']>
type RecurrenceUnit = NonNullable<Event['recurrenceUnit']>
type RecurrenceEndType = NonNullable<Event['recurrenceEndType']>

const WEEK_DAYS = [
  { value: 1, label: 'L', full: 'lunes' },
  { value: 2, label: 'M', full: 'martes' },
  { value: 3, label: 'X', full: 'miércoles' },
  { value: 4, label: 'J', full: 'jueves' },
  { value: 5, label: 'V', full: 'viernes' },
  { value: 6, label: 'S', full: 'sábado' },
  { value: 0, label: 'D', full: 'domingo' },
]

const RECURRENCE_UNIT_LABELS: Record<RecurrenceUnit, [string, string]> = {
  days: ['día', 'días'],
  weeks: ['semana', 'semanas'],
  months: ['mes', 'meses'],
  years: ['año', 'años'],
}

type CalendarViewMode = "month" | "week" | "day" | "year" | "list" | "schedule" | "3day";
type ExternalDragDetail = { task: Event; x: number; y: number };
type ExternalDragMoveDetail = { x: number; y: number };
const getEventLinks = (links?: string[]) => {
  return (links || []).flatMap((link) => link.split(/\s+/)).map((link) => link.trim()).filter(Boolean);
};

const hexToRgba = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const stripHtml = (html: string): string => {
  if (!html) return '';
  
  // Use DOMParser for robust HTML parsing (handles all edge cases)
  if (typeof window !== 'undefined' && window.DOMParser) {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      
      // Process ordered lists into numbered text
      doc.querySelectorAll('ol').forEach(ol => {
        const startNum = parseInt(ol.getAttribute('start') || '1', 10);
        const items: string[] = [];
        ol.querySelectorAll(':scope > li').forEach((li, idx) => {
          items.push(`${startNum + idx}. ${li.textContent?.trim() || ''}`);
        });
        const textNode = doc.createTextNode('\n' + items.join('\n') + '\n');
        ol.replaceWith(textNode);
      });
      
      // Process unordered lists into bulleted text
      doc.querySelectorAll('ul').forEach(ul => {
        const items: string[] = [];
        ul.querySelectorAll(':scope > li').forEach(li => {
          items.push(`\u2022 ${li.textContent?.trim() || ""}`);
        });
        const textNode = doc.createTextNode('\n' + items.join('\n') + '\n');
        ul.replaceWith(textNode);
      });
      
      // Add newlines for block elements
      doc.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
      doc.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6').forEach(el => {
        el.prepend('\n');
        el.append('\n');
      });
      
      return (doc.body.textContent || '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    } catch (e) {
      // Fallback to regex
    }
  }
  
  // Regex fallback for SSR or DOMParser failure
  let text = html;
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<p[^>]*>/gi, '');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, "\u2022 ");
  text = text.replace(/<\/li>/gi, '\n');
  return text.replace(/<[^>]*?>/g, '').trim();
};

const getTextColorForBg = (hex: string): string => {
  if (!hex || !hex.startsWith('#')) return '#FFFFFF';
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  if (isDarkMode) return '#FFFFFF';
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '#FFFFFF';
  return `#${[r, g, b].map((channel) => Math.max(0, Math.min(255, Math.round(channel * 0.8))).toString(16).padStart(2, '0')).join('')}`;
};

const getEventStyles = (hexColor?: string) => {
  if (!hexColor) return {};
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  
  const isHex = hexColor.startsWith('#');
  if (!isHex) return {};
  
  if (isDarkMode) {
    return {
      backgroundColor: hexToRgba(hexColor, 0.22),
      backgroundBlendMode: 'normal',
      color: '#FFFFFF',
      isolation: 'isolate',
      borderLeft: `4px solid ${hexColor}`,
      borderRight: '1px solid rgba(255, 255, 255, 0.05)',
      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    };
  } else {
    return {
      backgroundColor: hexToRgba(hexColor, 0.12),
      backgroundBlendMode: 'normal',
      color: getTextColorForBg(hexColor),
      isolation: 'isolate',
      borderLeft: `4px solid ${hexColor}`,
      borderRight: '1px solid rgba(0, 0, 0, 0.04)',
      borderTop: '1px solid rgba(0, 0, 0, 0.04)',
      borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
    };
  }
};

const cleanDescription = (desc?: string): string => {
  if (!desc) return '';
  
  const trimmed = desc.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.description && typeof parsed.description === 'string') {
        return cleanDescription(parsed.description);
      }
      if (parsed.notes && typeof parsed.notes === 'string') {
        return cleanDescription(parsed.notes);
      }
      return '';
    } catch {
      return '';
    }
  }

  // Decode HTML entities FIRST so encoded tags like &lt;ol&gt; become <ol> before stripping
  let text = desc
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&middot;/g, "\u00b7")
    .replace(/&bull;/g, "\u2022")

  // Now strip HTML tags (including the ones we just decoded)
  text = stripHtml(text);

  text = text.replace(/\[Adonai[^\]]*\]/gi, '');
  text = text.replace(/adonai[-_]task[-_]id:\s*[a-z0-9-]+/gi, '');
  text = text.replace(/google[-_]calendar[-_]event[-_]id:\s*[a-z0-9_]+/gi, '');

  return text.trim();
};

const EventLinkClips = ({ links, color }: { links?: string[]; color?: string }) => {
  const urls = getEventLinks(links);
  if (urls.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {urls.map((url, index) => {
        const href = url.startsWith('http') ? url : `https://${url}`;
        return (
          <a
            key={`${url}-${index}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-white/20 bg-background/70 text-foreground shadow-sm backdrop-blur-sm transition-all hover:scale-105 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label="Abrir link"
          >
            <Paperclip
              className="h-3.5 w-3.5"
              style={{ color: color && (color.startsWith('#') || color.startsWith('var')) ? color : undefined }}
            />
          </a>
        );
      })}
    </div>
  );
};

export interface EventManagerProps {
  events?: Event[]
  onEventCreate?: (event: Omit<Event, "id">) => void
  onEventUpdate?: (id: string, event: Partial<Event>) => void
  onEventDelete?: (id: string, scope?: 'single' | 'series') => void
  onCellClick?: (date: Date) => void
  categories?: string[]
  colors?: { name: string; value: string; bg: string; text: string }[]
  defaultView?: "month" | "week" | "day" | "year" | "list" | "schedule" | "3day"
  className?: string
  recurrenceExceptions?: Set<string>
  availableTags?: string[]
  onEventClick?: (event: Event) => void
  dragDisabled?: boolean
  focusedDate?: Date
  onDateChange?: (date: Date) => void
  hideSidebar?: boolean
  containedScroll?: boolean
  onViewChange?: (view: "month" | "week" | "day" | "year" | "list" | "schedule" | "3day") => void
}

const MIN_EVENT_DURATION_MINUTES = 5
const DEFAULT_EVENT_DURATION_MINUTES = 30
const SNAP_MINUTES = 5

const snapMinutes = (minutes: number) => Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES

const getStableDurationMs = (startTime?: Date, endTime?: Date, fallbackMinutes = DEFAULT_EVENT_DURATION_MINUTES) => {
  const start = startTime ? new Date(startTime).getTime() : NaN
  const end = endTime ? new Date(endTime).getTime() : NaN
  const duration = end - start
  const minDuration = MIN_EVENT_DURATION_MINUTES * 60 * 1000
  if (!Number.isFinite(duration) || duration < minDuration) return fallbackMinutes * 60 * 1000
  return duration
}

const clampEventWithinDay = (startTime: Date, durationMs: number) => {
  const safeDuration = Math.max(durationMs, MIN_EVENT_DURATION_MINUTES * 60 * 1000)
  const dayStart = startOfDay(startTime)
  const latestStart = new Date(dayStart)
  latestStart.setHours(24, 0, 0, 0)
  latestStart.setTime(latestStart.getTime() - safeDuration)

  const clampedStart = new Date(startTime)
  if (clampedStart < dayStart) clampedStart.setTime(dayStart.getTime())
  if (clampedStart > latestStart) clampedStart.setTime(latestStart.getTime())

  return {
    startTime: clampedStart,
    endTime: new Date(clampedStart.getTime() + safeDuration),
  }
}

const areEventListsEquivalent = (left: Event[], right: Event[]) => {
  if (left.length !== right.length) return false
  return left.every((event, index) => {
    const other = right[index]
    return other &&
      event.id === other.id &&
      event.title === other.title &&
      event.startTime?.getTime() === other.startTime?.getTime() &&
      event.endTime?.getTime() === other.endTime?.getTime() &&
      event.isAllDay === other.isAllDay &&
      event.completed === other.completed &&
      event.color === other.color &&
      event.description === other.description &&
      event.isEvent === other.isEvent &&
      event.reminderEnabled === other.reminderEnabled &&
      event.reminderMinutesBefore === other.reminderMinutesBefore &&
      JSON.stringify(event.links || []) === JSON.stringify(other.links || [])
  })
}

const doTimedEventsOverlap = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => {
  return aStart < bEnd && aEnd > bStart
}

const findTimedEventConflict = (
  events: Event[],
  candidate: Pick<Event, 'startTime' | 'endTime'> & { id?: string; isAllDay?: boolean },
  ignoreId?: string
) => {
  // Allow overlapping events to provide a fluid Google Calendar-like usability.
  // The calendar UI already renders overlapping events side-by-side beautifully.
  return null
}

const notifyCalendarConflict = () => {
  window.dispatchEvent(new CustomEvent('adonai:notify', {
    detail: {
      type: 'error',
      message: 'Ese horario ya esta ocupado. Elige un espacio libre.',
    },
  }))
}

export function EventManager({
  events: initialEvents = [],
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  onEventClick,
  onCellClick,
  categories = ["Meeting", "Task", "Reminder", "Personal"],
  colors = SHARED_DEFAULT_EVENT_COLORS,
  defaultView = "month",
  className,
  availableTags = ["Important", "Urgent", "Work", "Personal", "Team", "Client"],
  recurrenceExceptions,
  dragDisabled = false,
  focusedDate,
  onDateChange,
  hideSidebar = false,
  containedScroll = false,
  onViewChange,
}: EventManagerProps) {
  const { colors: priorityColors, customColors, addCustomColor, removeCustomColor } = usePriorityColors()
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [locallyDeletedEventIds, setLocallyDeletedEventIds] = useState<Set<string>>(new Set())
  // Map of eventId -> optimistic event for drops currently pending Supabase confirmation.
  // Prevents a stale React Query refetch from overwriting the optimistic local state.
  const pendingDropsRef = useRef<Map<string, Event>>(new Map())
  const sidebarScrollRef = useRef<HTMLDivElement>(null)
  const registerPendingDrop = useCallback((ev: Event) => {
    pendingDropsRef.current.set(ev.id, ev);
    setTimeout(() => {
      if (pendingDropsRef.current.has(ev.id)) {
        console.warn(`[TimeGrid] Pending drop ${ev.id} timed out after 5s`);
        pendingDropsRef.current.delete(ev.id);
      }
    }, 5000);
  }, [])

  useEffect(() => {
    if (pendingDropsRef.current.size === 0) {
      const nextEvents = initialEvents.filter(event => !locallyDeletedEventIds.has(event.id))
      setEvents(prev => areEventListsEquivalent(prev, nextEvents) ? prev : nextEvents)
      return
    }
    // Smart merge: preserve optimistic drops/updates until Supabase confirms
    setEvents((prev) => {
      const merged = initialEvents.filter(event => !locallyDeletedEventIds.has(event.id)).map(extEvent => {
        const pending = pendingDropsRef.current.get(extEvent.id)
        if (pending) {
          // Check if the server event has the updates we expect
          // For time/allDay changes:
          const timeMatches = extEvent.isAllDay === pending.isAllDay && 
                             (extEvent.isAllDay || (extEvent.startTime.getTime() === pending.startTime.getTime() && extEvent.endTime.getTime() === pending.endTime.getTime()))
          
          // For priority/color changes:
          const priorityMatches = extEvent.urgency === pending.urgency && 
                                 extEvent.importance === pending.importance && 
                                 extEvent.color === pending.color

          // For completion:
          const completionMatches = extEvent.completed === pending.completed

          const contentMatches =
            extEvent.title === pending.title &&
            extEvent.description === pending.description &&
            extEvent.isEvent === pending.isEvent &&
            extEvent.reminderEnabled === pending.reminderEnabled &&
            extEvent.reminderMinutesBefore === pending.reminderMinutesBefore &&
            JSON.stringify(extEvent.links || []) === JSON.stringify(pending.links || [])

          const isConfirmed = timeMatches && priorityMatches && completionMatches && contentMatches

          if (isConfirmed) {
            pendingDropsRef.current.delete(extEvent.id)
            return extEvent
          }
          return pending
        }
        return extEvent
      })
      return areEventListsEquivalent(prev, merged) ? prev : merged
    })
  }, [initialEvents, locallyDeletedEventIds])

  const [currentDate, setCurrentDate] = useState(() => focusedDate ? new Date(focusedDate) : new Date())
  const [view, setView] = useState<CalendarViewMode>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('adonai:calendar-view-mode') : null;
    const allowedViews: CalendarViewMode[] = ["month", "week", "day", "year", "list", "schedule", "3day"];
    return saved && allowedViews.includes(saved as CalendarViewMode) ? (saved as CalendarViewMode) : defaultView;
  });
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null)

  // Propagate view changes to localStorage, custom event, and optional parent callback
  const handleViewChange = useCallback((newView: "month" | "week" | "day" | "year" | "list" | "schedule" | "3day") => {
    setView((previous) => previous === newView ? previous : newView);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('adonai:calendar-view-mode', newView);
    }
    window.dispatchEvent(new CustomEvent('adonai:calendar-view-mode-change', { detail: { viewMode: newView } }));
    onViewChange?.(newView);
  }, [onViewChange]);
  const handleHoveredDayChange = useCallback((nextDay: Date | null) => {
    setHoveredDay((previous) => {
      if (!previous && !nextDay) return previous
      if (previous && nextDay && isSameDay(previous, nextDay)) return previous
      return nextDay
    })
  }, [])
  const [hourZoom, setHourZoom] = useState(160)
  const calendarRootRef = useRef<HTMLDivElement | null>(null)
  const pinchDistanceRef = useRef<number | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const DURATION_OPTIONS = [
    { label: '1m', value: 1 },
    { label: '5m', value: 5 },
    { label: '10m', value: 10 },
    { label: '15m', value: 15 },
    { label: '20m', value: 20 },
    { label: '25m', value: 25 },
    { label: '30m', value: 30 },
    { label: '35m', value: 35 },
    { label: '40m', value: 40 },
    { label: '45m', value: 45 },
    { label: '50m', value: 50 },
    { label: '55m', value: 55 },
    { label: '1h', value: 60 },
    { label: '1:30h', value: 90 },
    { label: '2h', value: 120 },
    { label: '2:30h', value: 150 },
    { label: '3h', value: 180 },
  ]

  const [isQuickPreviewOpen, setIsQuickPreviewOpen] = useState(false)
  const [isQuickPreviewExpanded, setIsQuickPreviewExpanded] = useState(false)
  const [quickPreviewEvent, setQuickPreviewEvent] = useState<Event | null>(null)

  // Local draft states for preview editing
  const [previewTitle, setPreviewTitle] = useState('')
  const [previewDescription, setPreviewDescription] = useState('')
  const [previewStartTime, setPreviewStartTime] = useState<Date>(new Date())
  const [previewEndTime, setPreviewEndTime] = useState<Date>(new Date())
  const [previewIsEvent, setPreviewIsEvent] = useState(true)
  const [previewImportance, setPreviewImportance] = useState(false)
  const [previewUrgency, setPreviewUrgency] = useState(false)
  const [previewRecurrence, setPreviewRecurrence] = useState<RecurrenceMode>('none')
  const [previewRecurrenceDays, setPreviewRecurrenceDays] = useState<number[]>([])
  const [previewRecurrenceInterval, setPreviewRecurrenceInterval] = useState(1)
  const [previewRecurrenceUnit, setPreviewRecurrenceUnit] = useState<RecurrenceUnit>('weeks')
  const [previewRecurrenceEndType, setPreviewRecurrenceEndType] = useState<RecurrenceEndType>('never')
  const [previewRecurrenceEndDate, setPreviewRecurrenceEndDate] = useState('')
  const [previewRecurrenceEndCount, setPreviewRecurrenceEndCount] = useState(5)
  const [previewColor, setPreviewColor] = useState('')
  const [previewReminderEnabled, setPreviewReminderEnabled] = useState(false)
  const [previewReminderMinutes, setPreviewReminderMinutes] = useState(15)
  const [previewLinks, setPreviewLinks] = useState<string[]>([])

  const handleEventClickInternal = useCallback((event: Event) => {
    if (onEventClick) {
      onEventClick(event)
    } else {
      setQuickPreviewEvent(event)
      setIsQuickPreviewExpanded(false)
      setPreviewTitle(event.title || '')
      const rawDesc = event.description || '';
      const cleanedDesc = cleanDescription(rawDesc);
      setPreviewDescription(cleanedDesc)
      setPreviewStartTime(new Date(event.startTime))
      setPreviewEndTime(new Date(event.endTime))
      setPreviewIsEvent(event.isEvent !== false)
      setPreviewImportance(!!event.importance)
      setPreviewUrgency(!!event.urgency)
      setPreviewRecurrence(event.recurrence || 'none')
      setPreviewRecurrenceDays(event.recurrenceDays || [])
      setPreviewRecurrenceInterval(event.recurrenceInterval || 1)
      setPreviewRecurrenceUnit(event.recurrenceUnit || 'weeks')
      setPreviewRecurrenceEndType(event.recurrenceEndType || 'never')
      setPreviewRecurrenceEndDate(event.recurrenceEndDate || '')
      setPreviewRecurrenceEndCount(event.recurrenceEndCount || 5)
      setPreviewColor(event.color || priorityColors.p4)
      setPreviewReminderEnabled(!!event.reminderEnabled)
      setPreviewReminderMinutes(event.reminderMinutesBefore ?? 15)
      setPreviewLinks(event.links || [])
      setIsQuickPreviewOpen(true)
    }
  }, [onEventClick, priorityColors])

  const toggleQuickPreviewDetails = () => {
    setIsQuickPreviewExpanded((expanded) => !expanded)
  }

  const handleSaveQuickPreview = useCallback(() => {
    if (!quickPreviewEvent) return
    
    const updates: Partial<Event> = {
      title: previewTitle,
      description: previewDescription,
      startTime: previewStartTime,
      endTime: previewEndTime,
      isEvent: previewIsEvent,
      importance: previewImportance,
      urgency: previewUrgency,
      recurrence: previewRecurrence,
      recurrenceDays: previewRecurrence === 'none' ? [] : previewRecurrenceDays,
      recurrenceInterval: previewRecurrence === 'none' ? 1 : previewRecurrenceInterval,
      recurrenceUnit: previewRecurrence === 'none' ? 'weeks' : previewRecurrenceUnit,
      recurrenceEndType: previewRecurrence === 'none' ? 'never' : previewRecurrenceEndType,
      recurrenceEndDate: previewRecurrenceEndType === 'date' ? previewRecurrenceEndDate : undefined,
      recurrenceEndCount: previewRecurrenceEndType === 'count' ? previewRecurrenceEndCount : undefined,
      color: previewColor,
      reminderEnabled: previewReminderEnabled,
      reminderMinutesBefore: previewReminderMinutes,
      links: previewLinks.filter(l => l.trim() !== ''),
    }

    const updatedEvent = { ...quickPreviewEvent, ...updates }
    pendingDropsRef.current.set(quickPreviewEvent.id, updatedEvent)
    setTimeout(() => { pendingDropsRef.current.delete(quickPreviewEvent.id) }, 5000)
    setEvents((prev) => prev.map((event) => event.id === quickPreviewEvent.id ? updatedEvent : event))
    
    onEventUpdate?.(quickPreviewEvent.id, updates)
    setIsQuickPreviewOpen(false)
    setIsQuickPreviewExpanded(false)
    setQuickPreviewEvent(null)
  }, [quickPreviewEvent, previewTitle, previewDescription, previewStartTime, previewEndTime, previewIsEvent, previewImportance, previewUrgency, previewRecurrence, previewRecurrenceDays, previewRecurrenceInterval, previewRecurrenceUnit, previewRecurrenceEndType, previewRecurrenceEndDate, previewRecurrenceEndCount, previewColor, previewReminderEnabled, previewReminderMinutes, previewLinks, onEventUpdate])


  const hasChanges = useMemo(() => {
    if (!quickPreviewEvent) return false
    const origTitle = quickPreviewEvent.title || ''
    const origDesc = quickPreviewEvent.description || ''
    const origStartTime = quickPreviewEvent.startTime?.getTime()
    const origEndTime = quickPreviewEvent.endTime?.getTime()
    const origIsEvent = quickPreviewEvent.isEvent !== false
    const origImportance = !!quickPreviewEvent.importance
    const origUrgency = !!quickPreviewEvent.urgency
    const origRecurrence = quickPreviewEvent.recurrence || 'none'
    const origRecurrenceDays = quickPreviewEvent.recurrenceDays || []
    const origRecurrenceInterval = quickPreviewEvent.recurrenceInterval || 1
    const origRecurrenceUnit = quickPreviewEvent.recurrenceUnit || 'weeks'
    const origRecurrenceEndType = quickPreviewEvent.recurrenceEndType || 'never'
    const origRecurrenceEndDate = quickPreviewEvent.recurrenceEndDate || ''
    const origRecurrenceEndCount = quickPreviewEvent.recurrenceEndCount || 5
    const origColor = quickPreviewEvent.color || priorityColors.p4
    const origReminder = !!quickPreviewEvent.reminderEnabled
    const origMins = quickPreviewEvent.reminderMinutesBefore ?? 15
    const origLinks = quickPreviewEvent.links || []
    
    const cleanedLinks = previewLinks.filter(l => l.trim() !== '')
    const cleanedOrigLinks = origLinks.filter(l => l.trim() !== '')

    return (
      previewTitle !== origTitle ||
      previewDescription !== origDesc ||
      previewStartTime.getTime() !== origStartTime ||
      previewEndTime.getTime() !== origEndTime ||
      previewIsEvent !== origIsEvent ||
      previewImportance !== origImportance ||
      previewUrgency !== origUrgency ||
      previewRecurrence !== origRecurrence ||
      JSON.stringify([...previewRecurrenceDays].sort()) !== JSON.stringify([...origRecurrenceDays].sort()) ||
      previewRecurrenceInterval !== origRecurrenceInterval ||
      previewRecurrenceUnit !== origRecurrenceUnit ||
      previewRecurrenceEndType !== origRecurrenceEndType ||
      previewRecurrenceEndDate !== origRecurrenceEndDate ||
      previewRecurrenceEndCount !== origRecurrenceEndCount ||
      previewColor.toLowerCase() !== origColor.toLowerCase() ||
      previewReminderEnabled !== origReminder ||
      (previewReminderEnabled && previewReminderMinutes !== origMins) ||
      JSON.stringify(cleanedLinks) !== JSON.stringify(cleanedOrigLinks)
    )
  }, [
    quickPreviewEvent,
    previewTitle,
    previewDescription,
    previewStartTime,
    previewEndTime,
    previewIsEvent,
    previewImportance,
    previewUrgency,
    previewRecurrence,
    previewRecurrenceDays,
    previewRecurrenceInterval,
    previewRecurrenceUnit,
    previewRecurrenceEndType,
    previewRecurrenceEndDate,
    previewRecurrenceEndCount,
    previewColor,
    previewReminderEnabled,
    previewReminderMinutes,
    previewLinks,
    priorityColors
  ])

  const previewRecurrenceDayNames = useMemo(() => (
    WEEK_DAYS
      .filter((day) => previewRecurrenceDays.includes(day.value))
      .map((day) => day.full)
  ), [previewRecurrenceDays])

  const previewRecurrenceSummary = useMemo(() => {
    const title = previewTitle || 'Este elemento'
    const baseSummary = (() => {
      if (!previewRecurrence || previewRecurrence === 'none') return 'No se repite'
      if (previewRecurrence === 'daily') return 'Se repite cada día'
      if (previewRecurrence === 'weekdays') return 'Se repite de lunes a viernes'
      if (previewRecurrence === 'weekly') {
        return previewRecurrenceDayNames.length
          ? `Se repite cada ${previewRecurrenceDayNames.join(', ')}`
          : 'Se repite cada semana'
      }
      if (previewRecurrence === 'biweekly') {
        return previewRecurrenceDayNames.length
          ? `Se repite cada 2 semanas: ${previewRecurrenceDayNames.join(', ')}`
          : 'Se repite cada 2 semanas'
      }
      if (previewRecurrence === 'monthly') return 'Se repite cada mes'
      if (previewRecurrence === 'yearly') return 'Se repite cada año'

      const [singular, plural] = RECURRENCE_UNIT_LABELS[previewRecurrenceUnit]
      const cadence = `Se repite cada ${previewRecurrenceInterval} ${previewRecurrenceInterval === 1 ? singular : plural}`
      return previewRecurrenceUnit === 'weeks' && previewRecurrenceDayNames.length
        ? `${cadence}: ${previewRecurrenceDayNames.join(', ')}`
        : cadence
    })()

    const endSummary = previewRecurrenceEndType === 'date' && previewRecurrenceEndDate
      ? ` hasta ${format(new Date(`${previewRecurrenceEndDate}T12:00:00`), 'd MMM yyyy', { locale: es })}`
      : previewRecurrenceEndType === 'count'
        ? ` durante ${previewRecurrenceEndCount} eventos`
        : ''

    return `${title}: ${baseSummary}${endSummary}.`
  }, [
    previewTitle,
    previewRecurrence,
    previewRecurrenceDayNames,
    previewRecurrenceUnit,
    previewRecurrenceInterval,
    previewRecurrenceEndType,
    previewRecurrenceEndDate,
    previewRecurrenceEndCount,
  ])

  const applyPreviewRecurrenceMode = (mode: RecurrenceMode) => {
    setPreviewRecurrence(mode)

    if (mode === 'none') {
      setPreviewRecurrenceDays([])
      setPreviewRecurrenceInterval(1)
      setPreviewRecurrenceUnit('weeks')
      setPreviewRecurrenceEndType('never')
      setPreviewRecurrenceEndDate('')
      setPreviewRecurrenceEndCount(5)
      return
    }

    if (mode === 'weekdays') {
      setPreviewRecurrenceDays([1, 2, 3, 4, 5])
      setPreviewRecurrenceInterval(1)
      setPreviewRecurrenceUnit('weeks')
      return
    }

    if (mode === 'weekly' || mode === 'biweekly') {
      setPreviewRecurrenceDays((days) => days.length ? days : [previewStartTime.getDay()])
      setPreviewRecurrenceInterval(mode === 'biweekly' ? 2 : 1)
      setPreviewRecurrenceUnit('weeks')
      return
    }

    if (mode === 'daily') {
      setPreviewRecurrenceDays([])
      setPreviewRecurrenceInterval(1)
      setPreviewRecurrenceUnit('days')
      return
    }

    if (mode === 'monthly') {
      setPreviewRecurrenceDays([])
      setPreviewRecurrenceInterval(1)
      setPreviewRecurrenceUnit('months')
      return
    }

    if (mode === 'yearly') {
      setPreviewRecurrenceDays([])
      setPreviewRecurrenceInterval(1)
      setPreviewRecurrenceUnit('years')
      return
    }

    setPreviewRecurrenceInterval((interval) => Math.max(1, interval || 1))
    setPreviewRecurrenceUnit((unit) => unit || 'weeks')
  }

  const togglePreviewRecurrenceDay = (day: number) => {
    setPreviewRecurrenceDays((days) => {
      const nextDays = days.includes(day)
        ? days.filter((value) => value !== day)
        : [...days, day]

      if (nextDays.length === 0) {
        setPreviewRecurrence('none')
      } else if (previewRecurrence !== 'custom') {
        setPreviewRecurrence(previewRecurrence === 'biweekly' ? 'biweekly' : 'weekly')
      }

      setPreviewRecurrenceUnit('weeks')
      return nextDays
    })
  }


  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [dialogInitialSnapshot, setDialogInitialSnapshot] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createReminderDefaultActive, setCreateReminderDefaultActive] = useState(false)
  const [creationSource, setCreationSource] = useState<'calendar_only' | 'task_only' | 'both'>('calendar_only')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [customDuration, setCustomDuration] = useState('')
  const [draggedEvent, setDraggedEvent] = useState<Event | null>(null)
  const [previewTime, setPreviewTime] = useState<{ day: Date; hour: number; minutes?: number } | null>(null)
  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    title: "",
    description: "",
    color: colors[0].value,
    category: categories[0],
    tags: [],
    reminderEnabled: true,
    reminderMinutesBefore: 0,
  })

  const { folders } = useFolders();
  const visibleFolders = useMemo(
    () => (folders as Array<{ id: string; name: string; deleted_at?: string | null }>).filter((folder) => !folder.deleted_at),
    [folders]
  );
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedDayForSheet, setSelectedDayForSheet] = useState<Date | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [sidebarView, setSidebarView] = useState<'list' | 'folders'>('folders');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['Hoy']));
  const [sidebarReorderId, setSidebarReorderId] = useState<string | null>(null);
  const [sidebarDragIdx, setSidebarDragIdx] = useState<number | null>(null);
  const [showSidebarUpcoming, setShowSidebarUpcoming] = useState(() => readStoredBoolean(CALENDAR_UPCOMING_ROOT_STORAGE_KEY, true));
  const [openSidebarUpcomingDays, setOpenSidebarUpcomingDays] = useState<Record<string, boolean>>(() => readStoredOpenMap(CALENDAR_UPCOMING_DAYS_STORAGE_KEY));
  const [openSidebarUpcomingWeeks, setOpenSidebarUpcomingWeeks] = useState<Record<string, boolean>>(() => readStoredOpenMap(CALENDAR_UPCOMING_WEEKS_STORAGE_KEY));
  const [openSidebarUpcomingMonths, setOpenSidebarUpcomingMonths] = useState<Record<string, boolean>>(() => readStoredOpenMap(CALENDAR_UPCOMING_MONTHS_STORAGE_KEY));
  const sidebarDragIdxRef = useRef<number | null>(null);
  const [recurrenceEditorOpen, setRecurrenceEditorOpen] = useState(true)
  const [pendingCustomColor, setPendingCustomColor] = useState('#5B7CFA')
  const [draftEvent, setDraftEvent] = useState<Event | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const draftInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    writeStoredValue(CALENDAR_UPCOMING_ROOT_STORAGE_KEY, showSidebarUpcoming)
  }, [showSidebarUpcoming])

  useEffect(() => {
    writeStoredValue(CALENDAR_UPCOMING_DAYS_STORAGE_KEY, openSidebarUpcomingDays)
  }, [openSidebarUpcomingDays])

  useEffect(() => {
    writeStoredValue(CALENDAR_UPCOMING_WEEKS_STORAGE_KEY, openSidebarUpcomingWeeks)
  }, [openSidebarUpcomingWeeks])

  useEffect(() => {
    writeStoredValue(CALENDAR_UPCOMING_MONTHS_STORAGE_KEY, openSidebarUpcomingMonths)
  }, [openSidebarUpcomingMonths])

  const startDraft = useCallback((startTime: Date, endTime?: Date) => {
    const end = endTime || addMinutes(startTime, 30)
    setDraftEvent({
      id: `draft-${Date.now()}`,
      title: '',
      startTime: startTime,
      endTime: end,
      color: '#9e9e9e',
      isAllDay: false,
      isEvent: true,
    })
    setDraftTitle('')
    setTimeout(() => draftInputRef.current?.focus(), 100)
  }, [])

  const confirmDraft = useCallback(() => {
    if (!draftEvent || !draftTitle.trim()) return
    if (findTimedEventConflict(events, draftEvent, draftEvent.id)) {
      notifyCalendarConflict()
      return
    }
    const event: Event = {
      ...draftEvent,
      title: draftTitle.trim(),
      color: '#9e9e9e',
    }
    onEventCreate?.(event)
    setDraftEvent(null)
    setDraftTitle('')
  }, [draftEvent, draftTitle, onEventCreate, events])

  const cancelDraft = useCallback(() => {
    setDraftEvent(null)
    setDraftTitle('')
  }, [])

  const updateDraftTime = useCallback((startTime: Date, endTime: Date) => {
    setDraftEvent(prev => prev ? { ...prev, startTime, endTime } : null)
  }, [])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('adonai:draft-state-change', { detail: { active: !!draftEvent } }))
  }, [draftEvent])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('adonai:dialog-state-change', { detail: { active: isDialogOpen } }))
    if (isDialogOpen) setRecurrenceEditorOpen(false)
  }, [isDialogOpen])

  const getDialogSnapshot = useCallback((event?: Partial<Event> | null) => JSON.stringify({
    title: event?.title || '',
    description: event?.description || '',
    startTime: event?.startTime ? new Date(event.startTime).getTime() : null,
    endTime: event?.endTime ? new Date(event.endTime).getTime() : null,
    color: event?.color || '',
    category: event?.category || '',
    tags: event?.tags || [],
    recurrence: event?.recurrence || 'none',
    recurrenceDays: event?.recurrenceDays || [],
    recurrenceInterval: event?.recurrenceInterval || null,
    recurrenceUnit: event?.recurrenceUnit || null,
    recurrenceEndType: event?.recurrenceEndType || null,
    recurrenceEndDate: event?.recurrenceEndDate || null,
    recurrenceEndCount: event?.recurrenceEndCount || null,
    reminderEnabled: !!event?.reminderEnabled,
    reminderMinutesBefore: event?.reminderMinutesBefore || null,
    reminderCustomValue: event?.reminderCustomValue || null,
    reminderCustomUnit: event?.reminderCustomUnit || null,
    urgency: !!event?.urgency,
    importance: !!event?.importance,
    links: event?.links || [],
    isAllDay: !!event?.isAllDay,
    isEvent: !!event?.isEvent,
  }), [])

  useEffect(() => {
    if (!isDialogOpen) {
      setDialogInitialSnapshot('')
      setConfirmCloseOpen(false)
      return
    }
    setDialogInitialSnapshot(getDialogSnapshot(isCreating ? newEvent : selectedEvent))
  }, [isDialogOpen, isCreating, newEvent, selectedEvent, getDialogSnapshot])

  useEffect(() => {
    if (!focusedDate) return
    setCurrentDate(prev => isSameDay(prev, focusedDate) ? prev : new Date(focusedDate))
  }, [focusedDate])

  const commitCurrentDate = useCallback((nextDate: Date | ((previous: Date) => Date)) => {
    setCurrentDate(previous => {
      const resolved = typeof nextDate === 'function' ? nextDate(previous) : nextDate
      const normalized = new Date(resolved)
      onDateChange?.(normalized)
      window.dispatchEvent(new CustomEvent('adonai:calendar-selected-date-change', { detail: { date: normalized } }))
      return normalized
    })
  }, [onDateChange])

  const toggleFolder = (folder: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folder)) {
      newExpanded.delete(folder);
    } else {
      newExpanded.add(folder);
    }
    setExpandedFolders(newExpanded);
  };

  // Initialize recSummary from event recurrence data when dialog opens
  useEffect(() => {
    if (!isDialogOpen) return;
    const event = isCreating ? newEvent : selectedEvent;
    const days = event?.recurrenceDays;
    if (days && days.length > 0) {
      const dayLabels = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
      const selectedLabels = [...days].sort().map(d => dayLabels[d]).join(', ');
      const interval = event?.recurrenceInterval || 1;
      const unit = event?.recurrenceUnit || 'weeks';
      const unitMap: Record<string, string> = { days: interval === 1 ? "d\u00eda" : "d\u00edas", weeks: interval === 1 ? "semana" : "semanas", months: interval === 1 ? "mes" : "meses", years: interval === 1 ? "a\u00f1o" : "a\u00f1os" };
      let text = `Cada ${interval} ${unitMap[unit] || unit}`;
      if (unit === 'weeks') text += ` en ${selectedLabels}`;
      void text;
    } else {
      return;
    }
  }, [isDialogOpen, isCreating, selectedEvent, newEvent])

  // Sync view state with defaultView prop
  useEffect(() => {
    if (defaultView) {
      setView((previous) => previous === defaultView ? previous : defaultView)
    }
  }, [defaultView])

  // Sync view state with localStorage for bidirectional multi-window calendar view syncing!
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'adonai:calendar-view-mode' && e.newValue) {
        setView((previous) => previous === e.newValue ? previous : (e.newValue as CalendarViewMode));
      }
    };
    const handleCustomEvent = (e: CustomEvent<{ viewMode: CalendarViewMode }>) => {
      if (e.detail.viewMode && e.detail.viewMode !== view) {
        setView((previous) => previous === e.detail.viewMode ? previous : e.detail.viewMode);
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('adonai:calendar-view-mode-change', handleCustomEvent as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('adonai:calendar-view-mode-change', handleCustomEvent as EventListener);
    };
  }, [view]);



  const filteredEvents = useMemo(() => {
    const baseEvents = events.filter((event) => {
      if (locallyDeletedEventIds.has(event.id)) return false
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          event.title.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.category?.toLowerCase().includes(query) ||
          event.tags?.some((tag) => tag.toLowerCase().includes(query))

        if (!matchesSearch) return false
      }

      // Color filter
      if (selectedColors.length > 0 && !selectedColors.includes(event.color)) {
        return false
      }

      // Tag filter
      if (selectedTags.length > 0) {
        const hasMatchingTag = event.tags?.some((tag) => selectedTags.includes(tag))
        if (!hasMatchingTag) return false
      }

      // Category filter
      if (selectedCategories.length > 0 && event.category && !selectedCategories.includes(event.category)) {
        return false
      }

      return true
    })

    // Calculate visible range based on current view
    let visibleStart: Date, visibleEnd: Date;
    if (view === 'year') {
      visibleStart = new Date(currentDate.getFullYear(), 0, 1);
      visibleEnd = new Date(currentDate.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (view === 'month') {
      visibleStart = startOfMonth(currentDate);
      visibleEnd = endOfMonth(currentDate);
    } else if (view === 'week') {
      visibleStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      visibleEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else if (view === 'day') {
      visibleStart = startOfDay(currentDate);
      visibleEnd = endOfDay(currentDate);
    } else if (view === '3day') {
      visibleStart = startOfDay(currentDate);
      visibleEnd = endOfDay(addDays(currentDate, 2));
    } else {
      visibleStart = startOfMonth(currentDate);
      visibleEnd = endOfMonth(currentDate);
    }

    // Generate recurring instances for the visible range
    const recurringInstances: Event[] = []

    const skipRecurrenceId = (instanceId: string) => recurrenceExceptions?.has(instanceId)

    baseEvents.forEach(event => {
      if (!event.recurrence || event.recurrence === 'none' || event.expandRecurrence === false) return

      const anchorDate = new Date(event.startTime)
      const anchorEnd = new Date(event.endTime)
      const recurrenceEndDate = event.recurrenceEndDate
        ? endOfDay(new Date(`${event.recurrenceEndDate}T12:00:00`))
        : null
      const recurrenceEndCount = event.recurrenceEndType === 'count'
        ? Math.max(1, event.recurrenceEndCount || 1)
        : null

      if (isNaN(anchorDate.getTime()) || isNaN(anchorEnd.getTime())) return

      const duration = anchorEnd.getTime() - anchorDate.getTime()
      const anchorDayStart = startOfDay(anchorDate)
      const anchorHour = anchorDate.getHours()
      const anchorMin = anchorDate.getMinutes()
      const anchorSec = anchorDate.getSeconds()

      // Iterate each day in the visible range and check against recurrence rule
      const daysInRange = eachDayOfInterval({ start: visibleStart, end: visibleEnd })
      let occurrenceCount = 1

      daysInRange.forEach(day => {
        const dayStart = startOfDay(day)

        // Skip the anchor date itself (base event already represents it)
        if (dayStart.getTime() === anchorDayStart.getTime()) return

        // Skip dates before the anchor date (event didn't exist yet)
        if (day < anchorDayStart) return
        if (recurrenceEndDate && dayStart > recurrenceEndDate) return

        const dayOfWeek = day.getDay()
        const dayOfMonth = day.getDate()
        const monthOfYear = day.getMonth()

        let matches = false

        switch (event.recurrence) {
          case 'daily':
            matches = true
            break
          case 'weekdays':
            matches = dayOfWeek !== 0 && dayOfWeek !== 6
            break
          case 'weekly':
            if (event.recurrenceDays && event.recurrenceDays.length > 0) {
              matches = event.recurrenceDays.includes(dayOfWeek)
            } else {
              matches = dayOfWeek === anchorDate.getDay()
            }
            break
          case 'biweekly': {
            const weeksSinceAnchor = Math.floor((dayStart.getTime() - anchorDayStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
            const isEvenWeek = Math.floor(weeksSinceAnchor / 2) % 2 === 0
            if (event.recurrenceDays && event.recurrenceDays.length > 0) {
              matches = event.recurrenceDays.includes(dayOfWeek) && isEvenWeek
            } else {
              matches = dayOfWeek === anchorDate.getDay() && isEvenWeek
            }
            break
          }
          case 'monthly':
            matches = dayOfMonth === anchorDate.getDate()
            break
          case 'yearly':
            matches = monthOfYear === anchorDate.getMonth() && dayOfMonth === anchorDate.getDate()
            break
          case 'custom': {
            // Custom recurrence with interval and unit
            const interval = event?.recurrenceInterval || 1;
            const unit = event?.recurrenceUnit || 'weeks';
            if (unit === 'days') {
              const daysSinceAnchor = Math.floor((dayStart.getTime() - anchorDayStart.getTime()) / (24 * 60 * 60 * 1000));
              matches = daysSinceAnchor % interval === 0;
            } else if (unit === 'weeks') {
              const weeksSinceAnchor = Math.floor((dayStart.getTime() - anchorDayStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
              if (weeksSinceAnchor % interval === 0) {
                if (event.recurrenceDays && event.recurrenceDays.length > 0) {
                  matches = event.recurrenceDays.includes(dayOfWeek);
                } else {
                  matches = dayOfWeek === anchorDate.getDay();
                }
              }
            } else if (unit === 'months') {
              const monthsSinceAnchor = (day.getFullYear() - anchorDate.getFullYear()) * 12 + (day.getMonth() - anchorDate.getMonth());
              matches = monthsSinceAnchor > 0 && monthsSinceAnchor % interval === 0 && dayOfMonth === anchorDate.getDate();
            } else if (unit === 'years') {
              const yearsSinceAnchor = day.getFullYear() - anchorDate.getFullYear();
              matches = yearsSinceAnchor > 0 && yearsSinceAnchor % interval === 0 && monthOfYear === anchorDate.getMonth() && dayOfMonth === anchorDate.getDate();
            }
            break;
          }
          default:
            break
        }

        if (!matches) return
        occurrenceCount += 1
        if (recurrenceEndCount && occurrenceCount > recurrenceEndCount) return

        const nextStart = new Date(day)
        nextStart.setHours(anchorHour, anchorMin, anchorSec, 0)
        const nextEnd = new Date(nextStart.getTime() + duration)
        const instanceId = `${event.id}-rec-${format(day, 'yyyy-MM-dd')}`
        if (skipRecurrenceId(instanceId) || locallyDeletedEventIds.has(instanceId)) return

        recurringInstances.push({
          ...event,
          id: instanceId,
          startTime: nextStart,
          endTime: nextEnd,
        })
      })
    })

    return [...baseEvents, ...recurringInstances]
  }, [events, searchQuery, selectedColors, selectedTags, selectedCategories, currentDate, view, recurrenceExceptions, locallyDeletedEventIds])

  const getSidebarTaskRank = useCallback((event: Event) => {
    if (event.urgency && event.importance) return 0;
    if (event.urgency) return 1;
    if (event.importance) return 2;
    return 3;
  }, []);

  const getSidebarTaskDateRank = useCallback((event: Event) => {
    const currentDateStr = format(currentDate, 'yyyy-MM-dd');
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return currentDateStr === todayStr && event.startTime < startOfDay(currentDate) && !event.completed ? 1 : 0;
  }, [currentDate]);

  const compareSidebarTasks = useCallback((a: Event, b: Event) => {
    const doneA = a.completed ? 1 : 0;
    const doneB = b.completed ? 1 : 0;
    if (doneA !== doneB) return doneB - doneA;

    const rankDiff = getSidebarTaskRank(a) - getSidebarTaskRank(b);
    if (rankDiff !== 0) return rankDiff;

    const dateRankDiff = getSidebarTaskDateRank(a) - getSidebarTaskDateRank(b);
    if (dateRankDiff !== 0) return dateRankDiff;

    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  }, [getSidebarTaskDateRank, getSidebarTaskRank]);

  const getSidebarTaskGroupKey = useCallback((event: Event) => {
    return `${event.folderId || 'general'}:${getSidebarTaskRank(event)}:${getSidebarTaskDateRank(event)}`;
  }, [getSidebarTaskDateRank, getSidebarTaskRank]);

  const canReorderSidebarTask = useCallback((event: Event) => {
    return !event.completed && event.id.startsWith('task-') && !event.id.includes('-rec-');
  }, []);

  const handleSidebarReorderStart = useCallback((e: React.DragEvent, event: Event) => {
    e.stopPropagation();
    if (!canReorderSidebarTask(event)) return;
    setSidebarReorderId(event.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', event.id);
  }, [canReorderSidebarTask]);

  const handleSidebarReorderOver = useCallback((e: React.DragEvent, target: Event) => {
    if (!sidebarReorderId || sidebarReorderId === target.id || !canReorderSidebarTask(target)) return;
    e.preventDefault();
    e.stopPropagation();

    setEvents((prev) => {
      const dragged = prev.find((event) => event.id === sidebarReorderId);
      if (!dragged || !canReorderSidebarTask(dragged)) return prev;
      if (getSidebarTaskGroupKey(dragged) !== getSidebarTaskGroupKey(target)) return prev;

      const group = prev
        .filter((event) => canReorderSidebarTask(event) && getSidebarTaskGroupKey(event) === getSidebarTaskGroupKey(target))
        .sort(compareSidebarTasks);

      const from = group.findIndex((event) => event.id === dragged.id);
      const to = group.findIndex((event) => event.id === target.id);
      if (from < 0 || to < 0 || from === to) return prev;

      const nextGroup = [...group];
      const [moved] = nextGroup.splice(from, 1);
      nextGroup.splice(to, 0, moved);
      const nextSort = new Map(nextGroup.map((event, index) => [event.id, index]));

      return prev.map((event) => (
        nextSort.has(event.id)
          ? { ...event, sortOrder: nextSort.get(event.id) ?? event.sortOrder }
          : event
      ));
    });
  }, [canReorderSidebarTask, compareSidebarTasks, getSidebarTaskGroupKey, sidebarReorderId]);

  const handleSidebarReorderEnd = useCallback(() => {
    if (!sidebarReorderId) return;

    const dragged = events.find((event) => event.id === sidebarReorderId);
    if (dragged) {
      const group = events
        .filter((event) => canReorderSidebarTask(event) && getSidebarTaskGroupKey(event) === getSidebarTaskGroupKey(dragged))
        .sort(compareSidebarTasks);

      group.forEach((event, index) => {
        if ((event.sortOrder ?? 0) !== index) {
          onEventUpdate?.(event.id, { sortOrder: index });
        }
      });
    }

    setSidebarReorderId(null);
  }, [canReorderSidebarTask, compareSidebarTasks, events, getSidebarTaskGroupKey, onEventUpdate, sidebarReorderId]);

  const tasksByFolder = useMemo(() => {
    const currentDateStr = format(currentDate, 'yyyy-MM-dd');
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const tasks = filteredEvents.filter(e => {
      if (e.isEvent || e.id.startsWith('block-')) return false;
      const inTimeRange = (isSameDay(e.startTime, currentDate)) ||
        (currentDateStr === todayStr && e.startTime < startOfDay(currentDate) && !e.completed);
      const matchesFolder = selectedFolderId ? e.folderId === selectedFolderId : !e.folderId;
      return inTimeRange && matchesFolder;
    });
    const grouped: Record<string, Event[]> = {};
    
    tasks.forEach(task => {
      const folder = task.folderId || 'general';
      if (!grouped[folder]) grouped[folder] = [];
      grouped[folder].push(task);
    });

    Object.keys(grouped).forEach(folder => {
      grouped[folder].sort(compareSidebarTasks);
    });

    return grouped;
  }, [compareSidebarTasks, filteredEvents, currentDate, selectedFolderId]);

  const sidebarVisibleTasks = useMemo(() => Object.values(tasksByFolder).flat(), [tasksByFolder]);

  const sidebarUpcomingDays = useMemo(() => {
    const currentDayEnd = endOfDay(currentDate);
    const rangeEnd = endOfDay(addDays(currentDate, 14));
    const grouped = new Map<string, Event[]>();

    events
      .filter((event) => {
        if (event.isEvent || event.id.startsWith('block-')) return false;
        if (event.completed) return false;
        if (event.startTime <= currentDayEnd || event.startTime > rangeEnd) return false;
        return selectedFolderId ? event.folderId === selectedFolderId : !event.folderId;
      })
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime() || compareSidebarTasks(a, b))
      .forEach((event) => {
        const key = format(event.startTime, 'yyyy-MM-dd');
        const dayTasks = grouped.get(key) || [];
        dayTasks.push(event);
        grouped.set(key, dayTasks);
      });

    return Array.from(grouped.entries()).slice(0, 6).map(([key, dayTasks]) => ({
      key,
      date: dayTasks[0]?.startTime || new Date(key),
      tasks: dayTasks.sort(compareSidebarTasks),
    }));
  }, [compareSidebarTasks, currentDate, events, selectedFolderId]);

  const sidebarCurrentMonthStart = useMemo(() => startOfMonth(currentDate), [currentDate]);
  const sidebarUpcomingMonthGroups = useMemo(() => {
    const groups: Array<{
      key: string;
      label: string;
      isCurrentMonth: boolean;
      weeks: Array<{ key: string; label: string; days: typeof sidebarUpcomingDays }>;
    }> = [];

    sidebarUpcomingDays.forEach((day) => {
      const monthStart = startOfMonth(day.date);
      const monthKey = format(monthStart, 'yyyy-MM');
      let month = groups.find((item) => item.key === monthKey);
      if (!month) {
        month = {
          key: monthKey,
          label: capitalizeCalendarLabel(format(monthStart, 'MMMM', { locale: es })),
          isCurrentMonth: isSameMonth(monthStart, sidebarCurrentMonthStart),
          weeks: [],
        };
        groups.push(month);
      }

      const weekStart = startOfWeek(day.date, { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      let week = month.weeks.find((item) => item.key === weekKey);
      if (!week) {
        const label = isSameMonth(monthStart, sidebarCurrentMonthStart) && month.weeks.length === 0
          ? 'Esta semana'
          : `Semana del ${format(weekStart, 'd MMM', { locale: es })}`;
        week = { key: weekKey, label, days: [] };
        month.weeks.push(week);
      }
      week.days.push(day);
    });

    return groups;
  }, [sidebarCurrentMonthStart, sidebarUpcomingDays]);

  const handleSidebarCardDragStart = useCallback((idx: number) => {
    const task = sidebarVisibleTasks[idx];
    if (!task || !canReorderSidebarTask(task)) return;
    sidebarDragIdxRef.current = idx;
    setSidebarDragIdx(idx);
    setSidebarReorderId(task.id);
  }, [canReorderSidebarTask, sidebarVisibleTasks]);

  const moveSidebarReorderToPoint = useCallback((clientX: number, clientY: number) => {
    const currentDragIdx = sidebarDragIdxRef.current;
    if (currentDragIdx === null) return;

    const dragged = sidebarVisibleTasks[currentDragIdx];
    if (!dragged || !canReorderSidebarTask(dragged)) return;

    const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-sidebar-task-idx]'));
    if (rows.length === 0) return;

    let targetIdx: number | null = null;
    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom && clientX >= rect.left - 48 && clientX <= rect.right + 48) {
        targetIdx = Number(row.dataset.sidebarTaskIdx);
        const midpoint = rect.top + rect.height / 2;
        if (clientY > midpoint && targetIdx < rows.length - 1) targetIdx += 1;
        break;
      }
    }

    if (targetIdx === null || Number.isNaN(targetIdx) || targetIdx === currentDragIdx) return;

    const target = sidebarVisibleTasks[targetIdx];
    if (!target || !canReorderSidebarTask(target)) return;
    if (getSidebarTaskGroupKey(dragged) !== getSidebarTaskGroupKey(target)) return;

    setEvents((prev) => {
      const group = prev
        .filter((event) => canReorderSidebarTask(event) && getSidebarTaskGroupKey(event) === getSidebarTaskGroupKey(target))
        .sort(compareSidebarTasks);

      const from = group.findIndex((event) => event.id === dragged.id);
      const to = group.findIndex((event) => event.id === target.id);
      if (from < 0 || to < 0 || from === to) return prev;

      const nextGroup = [...group];
      const [moved] = nextGroup.splice(from, 1);
      nextGroup.splice(to, 0, moved);
      const nextSort = new Map(nextGroup.map((event, index) => [event.id, index]));

      sidebarDragIdxRef.current = targetIdx;
      setSidebarDragIdx(targetIdx);

      return prev.map((event) => (
        nextSort.has(event.id)
          ? { ...event, sortOrder: nextSort.get(event.id) ?? event.sortOrder }
          : event
      ));
    });
  }, [canReorderSidebarTask, compareSidebarTasks, getSidebarTaskGroupKey, setEvents, sidebarVisibleTasks]);

  const handleSidebarCardDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    const currentDragIdx = sidebarDragIdxRef.current ?? sidebarDragIdx;
    if (currentDragIdx === null || currentDragIdx === idx) return;

    const dragged = sidebarVisibleTasks[currentDragIdx];
    const target = sidebarVisibleTasks[idx];
    if (!dragged || !target) return;
    if (!canReorderSidebarTask(dragged) || !canReorderSidebarTask(target)) return;
    if (getSidebarTaskGroupKey(dragged) !== getSidebarTaskGroupKey(target)) return;

    setEvents((prev) => {
      const group = prev
        .filter((event) => canReorderSidebarTask(event) && getSidebarTaskGroupKey(event) === getSidebarTaskGroupKey(target))
        .sort(compareSidebarTasks);

      const from = group.findIndex((event) => event.id === dragged.id);
      const to = group.findIndex((event) => event.id === target.id);
      if (from < 0 || to < 0 || from === to) return prev;

      const nextGroup = [...group];
      const [moved] = nextGroup.splice(from, 1);
      nextGroup.splice(to, 0, moved);
      const nextSort = new Map(nextGroup.map((event, index) => [event.id, index]));

      sidebarDragIdxRef.current = idx;
      setSidebarDragIdx(idx);

      return prev.map((event) => (
        nextSort.has(event.id)
          ? { ...event, sortOrder: nextSort.get(event.id) ?? event.sortOrder }
          : event
      ));
    });
  }, [canReorderSidebarTask, compareSidebarTasks, getSidebarTaskGroupKey, setEvents, sidebarDragIdx, sidebarVisibleTasks]);

  const handleSidebarCardDragEnd = useCallback(() => {
    const activeId = sidebarReorderId;
    if (activeId) {
      const dragged = events.find((event) => event.id === activeId);
      if (dragged) {
        const group = events
          .filter((event) => canReorderSidebarTask(event) && getSidebarTaskGroupKey(event) === getSidebarTaskGroupKey(dragged))
          .sort(compareSidebarTasks);

        group.forEach((event, index) => {
          if ((event.sortOrder ?? 0) !== index) {
            onEventUpdate?.(event.id, { sortOrder: index });
          }
        });
      }
    }

    sidebarDragIdxRef.current = null;
    setSidebarDragIdx(null);
    setSidebarReorderId(null);
  }, [canReorderSidebarTask, compareSidebarTasks, events, getSidebarTaskGroupKey, onEventUpdate, sidebarReorderId]);

  const handleSidebarPointerReorderStart = useCallback((idx: number, clientX: number, clientY: number) => {
    const task = sidebarVisibleTasks[idx];
    if (!task || !canReorderSidebarTask(task)) return;

    sidebarDragIdxRef.current = idx;
    setSidebarDragIdx(idx);
    setSidebarReorderId(task.id);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    moveSidebarReorderToPoint(clientX, clientY);

    const onPointerMove = (event: PointerEvent) => {
      event.preventDefault();
      moveSidebarReorderToPoint(event.clientX, event.clientY);
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', cleanup);
      window.removeEventListener('pointercancel', cleanup);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      handleSidebarCardDragEnd();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', cleanup);
    window.addEventListener('pointercancel', cleanup);
  }, [canReorderSidebarTask, handleSidebarCardDragEnd, moveSidebarReorderToPoint, sidebarVisibleTasks]);

  const hasActiveFilters = selectedColors.length > 0 || selectedTags.length > 0 || selectedCategories.length > 0

  const calendarVisibleEvents = useMemo(() => (
    filteredEvents.filter((event) => !event.isAllDay || event.isEvent || event.id.startsWith('block-'))
  ), [filteredEvents])

  const clearFilters = () => {
    setSelectedColors([])
    setSelectedTags([])
    setSelectedCategories([])
    setSearchQuery("")
  }

  const openCreateDialog = useCallback((startTime: Date, endTime?: Date, cellClickDate?: Date) => {
    if (cellClickDate) onCellClick?.(cellClickDate);

    let finalStart = new Date(startTime);
    const durationMs = (endTime?.getTime() || addMinutes(startTime, 30).getTime()) - startTime.getTime();
    let finalEnd = new Date(finalStart.getTime() + durationMs);

    // Find first non-overlapping slot on the same day
    const dayExisting = events.filter(e => !e.isAllDay && isSameDay(e.startTime, startTime));
    let hasConflict = true;
    let guard = 0;
    while (hasConflict && guard < 30) {
      hasConflict = false;
      for (const existing of dayExisting) {
        if (finalStart < existing.endTime && finalEnd > existing.startTime) {
          finalStart = new Date(existing.endTime);
          finalEnd = new Date(finalStart.getTime() + durationMs);
          hasConflict = true;
          guard++;
          break;
        }
      }
    }

    setNewEvent({
      title: "",
      description: "",
      startTime: finalStart,
      endTime: finalEnd,
      color: colors[0].value,
      category: categories[0],
      isAllDay: false,
      recurrence: 'none',
      recurrenceDays: [],
      recurrenceInterval: 1,
      recurrenceUnit: 'weeks',
      recurrenceEndType: 'never',
      reminderEnabled: true,
      reminderMinutesBefore: 0,
    });
    setCreateReminderDefaultActive(true);
    setCreationSource('calendar_only');
    setDurationMinutes(30);
    setCustomDuration('');
    setRecurrenceEditorOpen(true);
    setIsCreating(true);
    setIsDialogOpen(true);
  }, [onCellClick, colors, categories, events]);

  const handleCreateEvent = useCallback(() => {
    if (!newEvent.title) return

    if (creationSource === 'task_only' || newEvent.isAllDay || !newEvent.startTime || !newEvent.endTime) {
      const event: Event = {
        id: Math.random().toString(36).substr(2, 9),
        title: newEvent.title,
        description: newEvent.description,
        startTime: newEvent.startTime || new Date(),
        endTime: newEvent.endTime || addHours(new Date(), 1),
        color: newEvent.color || colors[0].value,
        category: newEvent.category,
        attendees: newEvent.attendees,
        tags: newEvent.tags || [],
        recurrence: 'none',
        recurrenceDays: [],
        recurrenceInterval: 1,
        recurrenceUnit: 'weeks',
        recurrenceEndType: 'never',
        reminderEnabled: newEvent.reminderEnabled || false,
        reminderMinutesBefore: newEvent.reminderMinutesBefore,
        reminderCustomValue: newEvent.reminderCustomValue,
        reminderCustomUnit: newEvent.reminderCustomUnit,
        links: newEvent.links || [],
        urgency: newEvent.urgency,
        importance: newEvent.importance,
        isAllDay: true,
        isEvent: false,
      }
      onEventCreate?.(event)
      setIsDialogOpen(false)
      setIsCreating(false)
      setNewEvent({
        title: "",
        description: "",
        color: colors[0].value,
        category: categories[0],
        tags: [],
        recurrence: 'none',
        links: [],
        reminderEnabled: true,
        reminderMinutesBefore: 0,
      })
      setCreateReminderDefaultActive(false)
      return
    }

    if (!newEvent.startTime || !newEvent.endTime) return

    if (findTimedEventConflict(events, {
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      isAllDay: false,
    })) {
      notifyCalendarConflict()
      return
    }

    const event: Event = {
      id: Math.random().toString(36).substr(2, 9),
      title: newEvent.title,
      description: newEvent.description,
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      color: newEvent.color || colors[0].value,
      category: newEvent.category,
      attendees: newEvent.attendees,
      tags: newEvent.tags || [],
      recurrence: newEvent.recurrence || 'none',
      recurrenceDays: newEvent.recurrenceDays || [],
      recurrenceInterval: newEvent.recurrenceInterval,
      recurrenceUnit: newEvent.recurrenceUnit,
      recurrenceEndType: newEvent.recurrenceEndType,
      recurrenceEndDate: newEvent.recurrenceEndDate,
      recurrenceEndCount: newEvent.recurrenceEndCount,
      reminderEnabled: newEvent.reminderEnabled || false,
      reminderMinutesBefore: newEvent.reminderMinutesBefore,
      reminderCustomValue: newEvent.reminderCustomValue,
      reminderCustomUnit: newEvent.reminderCustomUnit,
      links: newEvent.links || [],
      urgency: newEvent.urgency,
      importance: newEvent.importance,
      isAllDay: false,
      isEvent: creationSource === 'calendar_only',
    }

    onEventCreate?.(event)
    setIsDialogOpen(false)
    setIsCreating(false)
    setNewEvent({
      title: "",
      description: "",
      color: colors[0].value,
      category: categories[0],
      tags: [],
      recurrence: 'none',
      recurrenceDays: [],
      recurrenceInterval: 1,
      recurrenceUnit: 'weeks',
      recurrenceEndType: 'never',
      links: [],
      reminderEnabled: true,
      reminderMinutesBefore: 0,
    })
    setCreateReminderDefaultActive(false)
  }, [newEvent, colors, categories, onEventCreate, creationSource, events])

  const handleUpdateEvent = useCallback(() => {
    if (!selectedEvent) return

    const updatedEvent = { ...selectedEvent }
    if (findTimedEventConflict(events, updatedEvent, selectedEvent.id)) {
      notifyCalendarConflict()
      return
    }
    
    // Optimistically track this update
    pendingDropsRef.current.set(selectedEvent.id, updatedEvent)

    setEvents((prev) => prev.map((e) => (e.id === selectedEvent.id ? updatedEvent : e)))
    onEventUpdate?.(selectedEvent.id, updatedEvent)
    setIsDialogOpen(false)
    setSelectedEvent(null)
  }, [selectedEvent, onEventUpdate, events])

  const hasUnsavedDialogChanges = useMemo(() => {
    if (!isDialogOpen || !dialogInitialSnapshot) return false
    return getDialogSnapshot(isCreating ? newEvent : selectedEvent) !== dialogInitialSnapshot
  }, [dialogInitialSnapshot, getDialogSnapshot, isCreating, isDialogOpen, newEvent, selectedEvent])

  const discardDialogChanges = useCallback(() => {
    setConfirmCloseOpen(false)
    setIsDialogOpen(false)
    setIsCreating(false)
    setSelectedEvent(null)
  }, [])

  const requestDialogClose = useCallback(() => {
    if (hasUnsavedDialogChanges) {
      setConfirmCloseOpen(true)
      return
    }
    discardDialogChanges()
  }, [discardDialogChanges, hasUnsavedDialogChanges])

  const saveAndCloseDialog = useCallback(() => {
    setConfirmCloseOpen(false)
    if (isCreating) {
      handleCreateEvent()
    } else {
      handleUpdateEvent()
    }
  }, [handleCreateEvent, handleUpdateEvent, isCreating])

  const handleDeleteEvent = useCallback(
    (id: string) => {
      const targetEvent = events.find((event) => event.id === id) || selectedEvent || quickPreviewEvent || null
      const isRecurringEvent = !!targetEvent?.recurrence && targetEvent.recurrence !== 'none'
      const deleteScope: 'single' | 'series' = isRecurringEvent
        ? (window.confirm('Este recordatorio pertenece a una secuencia.\n\nAceptar: borrar todos.\nCancelar: borrar solo este.') ? 'series' : 'single')
        : 'single'

      setLocallyDeletedEventIds((prev) => {
        const next = new Set(prev)
        next.add(id)
        return next
      })
      window.setTimeout(() => {
        setLocallyDeletedEventIds((prev) => {
          if (!prev.has(id)) return prev
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, 10000)
      setEvents((prev) => prev.filter((event) => {
        if (deleteScope !== 'series') return event.id !== id
        if (targetEvent?.recurrenceId) return event.recurrenceId !== targetEvent.recurrenceId
        const targetSeriesId = id.replace(/-\d{4}-\d{2}-\d{2}$/, '')
        return event.id.replace(/-\d{4}-\d{2}-\d{2}$/, '') !== targetSeriesId
      }))
      onEventDelete?.(id, deleteScope)
      setIsDialogOpen(false)
      setSelectedEvent(null)
    },
    [events, onEventDelete, quickPreviewEvent, selectedEvent],
  )

  const handleToggleComplete = useCallback(
    (id: string, completed: boolean) => {
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, completed } : e)))
      onEventUpdate?.(id, { completed })
      if (selectedEvent?.id === id) {
        setSelectedEvent(prev => prev ? ({ ...prev, completed }) : null)
      }
    },
    [onEventUpdate, selectedEvent?.id],
  )

  const handleSidebarTaskSelect = useCallback((task: Event) => {
    handleEventClickInternal(task);
  }, [handleEventClickInternal]);

  const handleSidebarTaskComplete = useCallback((task: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    handleToggleComplete(task.id, true);
  }, [handleToggleComplete]);

  const handleSidebarTaskUncomplete = useCallback((task: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    handleToggleComplete(task.id, false);
  }, [handleToggleComplete]);

  const handleSidebarTaskTimer = useCallback((_task: Event, e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Shared ghost ref for both sidebar and grid drags
  const globalGhostRef = useRef<HTMLDivElement>(null)
  const [globalDragEvent, setGlobalDragEvent] = useState<Event | null>(null)
  const globalDragEventRef = useRef<Event | null>(null)

  const setActiveDragEvent = useCallback((event: Event | null) => {
    globalDragEventRef.current = event
    setGlobalDragEvent(event)
  }, [])

  const handleDragStart = useCallback((event: Event) => {
    setDraggedEvent(event)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedEvent(null)
  }, [])

  // Drop event from sidebar onto the calendar grid at a specific time
  const dropEventOnCalendar = useCallback((event: Event, day: Date, hour: number, mins: number) => {
    // Ensure startTime and endTime are valid Dates (especially for external tasks/mobile island)
    const start = event.startTime ? new Date(event.startTime) : new Date();
    const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + 30 * 60 * 1000);
    
    const duration = (event.isAllDay || isNaN(end.getTime()) || isNaN(start.getTime())) 
      ? 30 * 60 * 1000 
      : (end.getTime() - start.getTime());
      
    const newStartTime = new Date(day)
    newStartTime.setHours(hour, mins, 0, 0)
    const newEndTime = new Date(newStartTime.getTime() + duration)
    const updatedEvent = { ...event, startTime: newStartTime, endTime: newEndTime, isAllDay: false }
    if (findTimedEventConflict(events, updatedEvent, event.id)) {
      notifyCalendarConflict()
      return
    }
    pendingDropsRef.current.set(event.id, updatedEvent)
    setTimeout(() => { pendingDropsRef.current.delete(event.id) }, 5000)
    setEvents(prev => prev.map(e => e.id === event.id ? updatedEvent : e))
    onEventUpdate?.(event.id, updatedEvent)
  }, [onEventUpdate, events])

  // Sidebar custom mouse drag mirrors the calendar ghost system
  const handleSidebarMouseDown = useCallback((e: React.MouseEvent, event: Event) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-drag-handle]')) return
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    let dragging = false

    const showGhost = (x: number, y: number) => {
      const g = globalGhostRef.current
      if (!g) return
      g.style.display = 'flex'
      g.style.opacity = '1'
      g.style.transform = `translate(${x - 70}px, ${y - 20}px)`
    }

    const hideGhost = () => {
      const g = globalGhostRef.current
      if (!g) return
      g.style.opacity = '0'
      g.style.transform = `translate(-9999px, -9999px)`
      setTimeout(() => { if (g) g.style.display = 'none' }, 150)
    }

    const onMove = (ev: MouseEvent) => {
      if (!dragging && (Math.abs(ev.clientX - startX) > 5 || Math.abs(ev.clientY - startY) > 5)) {
        dragging = true
        setActiveDragEvent(event)
      }
      if (dragging) showGhost(ev.clientX, ev.clientY)
    }

    const onUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      hideGhost()
      setActiveDragEvent(null)
      if (!dragging) return

      const els = document.elementsFromPoint(ev.clientX, ev.clientY) as HTMLElement[]
      const cell = els.find(el => el.dataset && el.dataset.cellHour !== undefined)
      if (cell && cell.dataset.cellDay && cell.dataset.cellHour !== undefined) {
        const day = new Date(cell.dataset.cellDay)
        const hour = parseInt(cell.dataset.cellHour)
        const mins = parseInt(cell.dataset.cellMins || '0')
        dropEventOnCalendar(event, day, hour, mins)
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [dropEventOnCalendar, setActiveDragEvent])

  // Sidebar touch drag for mobile
  const handleSidebarTouchStart = useCallback((e: React.TouchEvent, event: Event) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-drag-handle]')) return
    const touch = e.touches[0]
    const startX = touch.clientX
    const startY = touch.clientY
    let dragging = false

    const showGhost = (x: number, y: number) => {
      const g = globalGhostRef.current
      if (!g) return
      g.style.display = 'flex'
      g.style.opacity = '1'
      g.style.transform = `translate(${x - 70}px, ${y - 20}px)`
    }

    const hideGhost = () => {
      const g = globalGhostRef.current
      if (!g) return
      g.style.opacity = '0'
      g.style.transform = `translate(-9999px, -9999px)`
      setTimeout(() => { if (g) g.style.display = 'none' }, 150)
    }

    const onMove = (ev: TouchEvent) => {
      if (!dragging && (Math.abs(ev.touches[0].clientX - startX) > 5 || Math.abs(ev.touches[0].clientY - startY) > 5)) {
        dragging = true
        setActiveDragEvent(event)
      }
      if (dragging) showGhost(ev.touches[0].clientX, ev.touches[0].clientY)
    }

    const onEnd = (ev: TouchEvent) => {
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      hideGhost()
      setActiveDragEvent(null)
      if (!dragging) return

      const touch = ev.changedTouches[0]
      const els = document.elementsFromPoint(touch.clientX, touch.clientY) as HTMLElement[]
      const cell = els.find(el => el.dataset && el.dataset.cellHour !== undefined)
      if (cell && cell.dataset.cellDay && cell.dataset.cellHour !== undefined) {
        const day = new Date(cell.dataset.cellDay)
        const hour = parseInt(cell.dataset.cellHour)
        const mins = parseInt(cell.dataset.cellMins || '0')
        dropEventOnCalendar(event, day, hour, mins)
      }
    }

    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
  }, [dropEventOnCalendar, setActiveDragEvent])

  // External drag listeners (for MobileDynamicIsland long press)
  useEffect(() => {
    const handleExternalDragStart = (e: CustomEvent<ExternalDragDetail>) => {
      const { task, x, y } = e.detail;
      setActiveDragEvent(task);
      const g = globalGhostRef.current;
      if (g) {
        g.style.display = 'flex';
        g.style.opacity = '1';
        g.style.transform = `translate(${x - 70}px, ${y - 20}px)`;
      }
    };

    const handleExternalDragMove = (e: CustomEvent<ExternalDragMoveDetail>) => {
      const { x, y } = e.detail;
      const g = globalGhostRef.current;
      if (g) {
        g.style.transform = `translate(${x - 70}px, ${y - 20}px)`;
      }
    };

    const handleExternalDragEnd = (_e: Event) => {
      const g = globalGhostRef.current;
      if (!g) return;
      
      const transform = g.style.transform;
      const match = transform.match(/translate\((.+)px,\s*(.+)px\)/);
      const x = match ? parseFloat(match[1]) : 0;
      const y = match ? parseFloat(match[2]) : 0;
      
      // Hide ghost
      g.style.opacity = '0';
      g.style.transform = `translate(-9999px, -9999px)`;
      setTimeout(() => { if (g) g.style.display = 'none' }, 150);

      const activeEvent = globalDragEventRef.current;
      if (activeEvent) {
        const els = document.elementsFromPoint(x + 70, y + 20) as HTMLElement[];
        const cell = els.find(el => el.dataset && el.dataset.cellHour !== undefined);
        if (cell && cell.dataset.cellDay && cell.dataset.cellHour !== undefined) {
          const day = new Date(cell.dataset.cellDay);
          const hour = parseInt(cell.dataset.cellHour);
          const mins = parseInt(cell.dataset.cellMins || '0');
          dropEventOnCalendar(activeEvent, day, hour, mins);
        }
      }
      setActiveDragEvent(null);
    };

    window.addEventListener('adonai:external-drag-start', handleExternalDragStart as EventListener);
    window.addEventListener('adonai:external-drag-move', handleExternalDragMove as EventListener);
    window.addEventListener('adonai:external-drag-end', handleExternalDragEnd);
    return () => {
      window.removeEventListener('adonai:external-drag-start', handleExternalDragStart as EventListener);
      window.removeEventListener('adonai:external-drag-move', handleExternalDragMove as EventListener);
      window.removeEventListener('adonai:external-drag-end', handleExternalDragEnd);
    };
  }, [dropEventOnCalendar, setActiveDragEvent]);

  useEffect(() => {
    const handler = () => {
      const now = new Date();
      now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30, 0, 0)
      const end = addMinutes(now, 30)
      openCreateDialog(now, end)
    }
    window.addEventListener('adonai:open-create-event', handler)
    return () => window.removeEventListener('adonai:open-create-event', handler)
  }, [openCreateDialog])

  const handleDrop = useCallback(
    (date: Date, hour?: number, minutes: number = 0) => {
      if (!draggedEvent) return

      let duration = getStableDurationMs(draggedEvent.startTime, draggedEvent.endTime)
      
      // If dropping an all-day task from sidebar, default to 30 minutes duration
      if (draggedEvent.isAllDay) {
        duration = DEFAULT_EVENT_DURATION_MINUTES * 60 * 1000
      }

      const newStartTime = new Date(date)
      if (hour !== undefined) {
        newStartTime.setHours(hour, minutes, 0, 0)
      } else if (!draggedEvent.isAllDay) {
        // Preserve original time if not provided and not an all-day event
        newStartTime.setHours(draggedEvent.startTime.getHours(), draggedEvent.startTime.getMinutes(), 0, 0)
      }
      const { startTime: finalStartTime, endTime: finalEndTime } = clampEventWithinDay(newStartTime, duration)

      const updatedEvent = {
        ...draggedEvent,
        startTime: finalStartTime,
        endTime: finalEndTime,
        isAllDay: hour === undefined ? draggedEvent.isAllDay : false, // Keep all-day if dropped on a day cell, otherwise make timed
      }

      if (findTimedEventConflict(events, updatedEvent, draggedEvent.id)) {
        notifyCalendarConflict()
        setDraggedEvent(null)
        setPreviewTime(null)
        return
      }

      // Register the optimistic event so the sync useEffect can preserve it
      const droppedId = draggedEvent.id
      console.log(`[DnD-drop] Registering pending drop for id=${droppedId}, isAllDay=false, start=${newStartTime}`)
      pendingDropsRef.current.set(droppedId, updatedEvent)
      setTimeout(() => {
        if (pendingDropsRef.current.has(droppedId)) {
          console.warn(`[DnD-drop] Safety cleanup: ${droppedId} was never confirmed by Supabase after 5s`)
          pendingDropsRef.current.delete(droppedId)
        }
      }, 5000)

      setEvents((prev) => prev.map((e) => (e.id === draggedEvent.id ? updatedEvent : e)))
      onEventUpdate?.(draggedEvent.id, updatedEvent)
      setDraggedEvent(null)
      setPreviewTime(null)
    },
    [draggedEvent, onEventUpdate, events],
  )

  const navigateDate = useCallback(
    (direction: "prev" | "next") => {
      commitCurrentDate((prev) => {
        const newDate = new Date(prev)
        if (view === "year") {
          newDate.setFullYear(prev.getFullYear() + (direction === "next" ? 1 : -1))
        } else if (view === "month") {
          newDate.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1))
        } else if (view === "week") {
          newDate.setDate(prev.getDate() + (direction === "next" ? 7 : -7))
        } else if (view === "3day") {
          newDate.setDate(prev.getDate() + (direction === "next" ? 3 : -3))
        } else if (view === "day" || view === "schedule") {
          newDate.setDate(prev.getDate() + (direction === "next" ? 1 : -1))
        }
        return newDate
      })
    },
    [view, commitCurrentDate],
  )

  // Mobile swipe navigation
  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)
  useEffect(() => {
    const el = document.querySelector('[data-calendar-grid]') || document.body
    const onTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-no-swipe]')) return
      touchStartXRef.current = e.touches[0].clientX
      touchStartYRef.current = e.touches[0].clientY
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartXRef.current === null || touchStartYRef.current === null) return
      const dx = e.changedTouches[0].clientX - touchStartXRef.current
      const dy = e.changedTouches[0].clientY - touchStartYRef.current
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        navigateDate(dx > 0 ? 'prev' : 'next')
      }
      touchStartXRef.current = null
      touchStartYRef.current = null
    }
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [navigateDate])

  const getColorClasses = useCallback(
    (colorValue: string) => {
      const color = colors.find((c) => c.value === colorValue)
      return color || colors[0]
    },
    [colors],
  )

  const toggleTag = (tag: string, isCreating: boolean) => {
    if (isCreating) {
      setNewEvent((prev) => ({
        ...prev,
        tags: prev.tags?.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...(prev.tags || []), tag],
      }))
    } else {
      setSelectedEvent((prev) =>
        prev
          ? {
              ...prev,
              tags: prev.tags?.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...(prev.tags || []), tag],
            }
          : null,
      )
    }
  }

  const viewLabels: Record<"day" | "week" | "month" | "year" | "3day" | "schedule" | "list", string> = {
    day: "D\u00eda",
    week: "Semana",
    month: "Mes",
    year: "A\u00f1o",
    "3day": "3 d\u00edas",
    schedule: "Agenda",
    list: "Lista",
  }

  const mobileMonthLabel = format(currentDate, "MMMM", { locale: es })
  const currentWeekdayLabel = format(currentDate, "EEE", { locale: es }).replace('.', '').toUpperCase()
  const currentDayNumber = format(currentDate, "d")
  const hasNotebookSidebar = !hideSidebar && !isDesktopSidebarCollapsed && (view === "day" || view === "week")
  const mobileWeekdayLabel = currentWeekdayLabel.slice(0, 3)
  const currentDateLabel = `${currentWeekdayLabel} ${currentDayNumber}`

  useEffect(() => {
    const root = calendarRootRef.current
    if (!root) return

    const isTouchZoomView = view === "day" || view === "week" || view === "3day"
    if (!isTouchZoomView) return

    const getDistance = (touches: TouchList) => {
      const first = touches[0]
      const second = touches[1]
      return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY)
    }

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        pinchDistanceRef.current = getDistance(event.touches)
      }
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || pinchDistanceRef.current === null) return

      event.preventDefault()
      const nextDistance = getDistance(event.touches)
      const delta = nextDistance - pinchDistanceRef.current

      if (Math.abs(delta) < 18) return

      setHourZoom((previous) => {
        const direction = delta > 0 ? 40 : -40
        return Math.max(60, Math.min(320, previous + direction))
      })
      pinchDistanceRef.current = nextDistance
    }

    const clearPinch = () => {
      pinchDistanceRef.current = null
    }

    root.addEventListener('touchstart', handleTouchStart, { passive: true })
    root.addEventListener('touchmove', handleTouchMove, { passive: false })
    root.addEventListener('touchend', clearPinch)
    root.addEventListener('touchcancel', clearPinch)

    return () => {
      root.removeEventListener('touchstart', handleTouchStart)
      root.removeEventListener('touchmove', handleTouchMove)
      root.removeEventListener('touchend', clearPinch)
      root.removeEventListener('touchcancel', clearPinch)
    }
  }, [view])

  return (
    <div ref={calendarRootRef} data-calendar-grid className={cn("relative flex w-full max-w-full flex-col gap-0 bg-card", className)}>
      {/* Sticky Header - Google-like */}
      <div className="sticky top-0 z-30 bg-background border-b border-outline-variant/10 px-2 sm:px-3 pb-2 pt-2 lg:px-2 lg:pt-2 -mx-0 mb-0 shadow-none">
        <div className="flex items-center gap-2 pl-2 pr-12 sm:hidden">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl px-1 py-1 text-left transition-opacity hover:opacity-80"
              >
                <span className="text-2xl font-black tracking-tight text-foreground leading-none">
                  {mobileMonthLabel.charAt(0).toUpperCase() + mobileMonthLabel.slice(1)}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                <span className="inline-flex h-7 items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 text-[10px] font-black uppercase tracking-[0.24em] text-primary shadow-sm">
                  {mobileWeekdayLabel}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(92vw,360px)] rounded-[28px] border-outline-variant/10 bg-surface-container/95 p-0 shadow-2xl backdrop-blur-3xl" align="start">
              <div className="border-b border-outline-variant/5 px-4 py-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fecha y vista</span>
              </div>
              <div className="p-3">
                <CalendarPicker mode="single" selected={currentDate} onSelect={(date) => date && commitCurrentDate(date)} initialFocus className="p-1" />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(["day", "week", "month", "year"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleViewChange(option)}
                      className={cn(
                        "h-11 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all",
                        view === option
                          ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                          : "border-outline-variant/10 bg-surface-container-low text-foreground"
                      )}
                    >
                      {viewLabels[option]}
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <button
            type="button"
            onClick={() => commitCurrentDate(new Date())}
            className="inline-flex h-10 min-w-[42px] items-center justify-center rounded-2xl bg-primary/12 px-3 text-base font-black text-primary shadow-sm"
          >
            {currentDayNumber}
          </button>

          <div className="flex-1 min-w-0" />
        </div>

        {/* Single-line header: Month + Day + Nav + View tabs */}
        <div className={cn(
          "hidden sm:flex items-center gap-1.5 pl-12 lg:gap-2",
          hideSidebar ? "lg:pl-3" : hasNotebookSidebar ? "lg:pl-[436px]" : "lg:pl-20"
        )}>
          {/* Month name (opens date picker) */}
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity shrink-0">
                <span className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-foreground leading-none flex items-center gap-2">
                  {format(currentDate, "MMMM", { locale: es }).charAt(0).toUpperCase() + format(currentDate, "MMMM", { locale: es }).slice(1)}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-outline-variant/10 bg-surface-container/95 backdrop-blur-3xl shadow-2xl" align="start">
              <div className="p-2 border-b border-outline-variant/5 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2">Seleccionar Fecha</span>
                <Button variant="ghost" size="sm" onClick={() => commitCurrentDate(new Date())} className="text-[9px] font-black uppercase tracking-widest h-7 px-2 rounded-md hover:bg-primary/10 text-primary">
                  Ir a Hoy
                </Button>
              </div>
              <CalendarPicker mode="single" selected={currentDate} onSelect={(date) => date && commitCurrentDate(date)} initialFocus className="p-3" />
            </PopoverContent>
          </Popover>

          {/* Nav arrows */}
          <div className="flex items-center gap-0.5 shrink-0 rounded-xl border border-outline-variant/10 bg-surface-container-low/70 p-0.5">
            <Button variant="ghost" size="icon" onClick={() => navigateDate("prev")} className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => commitCurrentDate(new Date())}
              className="h-7 rounded-lg px-3 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10"
            >
              Hoy
            </Button>
            <span className="inline-flex h-7 items-center rounded-lg border border-primary/15 bg-primary/10 px-2.5 text-[10px] font-black uppercase tracking-widest text-primary">
              {currentDateLabel}
            </span>
            <Button variant="ghost" size="icon" onClick={() => navigateDate("next")} className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Spacer */}
          <div className="flex-1 min-w-0" />

          {/* View selector */}
          <Select value={view} onValueChange={(value) => handleViewChange(value as typeof view)}>
            <SelectTrigger className="h-8 w-[92px] shrink-0 rounded-xl border-outline-variant/10 bg-surface-container-low/80 px-2 text-[10px] font-black uppercase tracking-widest text-foreground shadow-none focus:ring-1 focus:ring-primary/30 sm:w-[108px]">
              <SelectValue>{viewLabels[view]}</SelectValue>
            </SelectTrigger>
            <SelectContent align="end" className="min-w-[132px] rounded-2xl border-outline-variant/10 bg-surface-container/95 p-1 shadow-2xl backdrop-blur-xl">
              <SelectItem value="day" className="rounded-xl text-xs font-bold">{"D\u00eda"}</SelectItem>
              <SelectItem value="week" className="rounded-xl text-xs font-bold">Semana</SelectItem>
              <SelectItem value="month" className="rounded-xl text-xs font-bold">Mes</SelectItem>
              <SelectItem value="year" className="rounded-xl text-xs font-bold">{"A\u00f1o"}</SelectItem>
            </SelectContent>
          </Select>

          {/* Zoom controls */}
          {view !== "month" && view !== "year" && (
            <div className="hidden sm:flex items-center gap-0.5 border border-outline-variant/10 rounded-xl overflow-hidden shrink-0">
              <button
                onClick={() => setHourZoom(h => Math.max(60, h - 40))}
                className="h-7 w-7 flex items-center justify-center text-[10px] font-black hover:bg-surface-container/80 transition-all active:scale-90 text-muted-foreground/60 hover:text-foreground"
                title="Alejar"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-[8px] font-black px-1 text-muted-foreground/40 select-none min-w-[24px] text-center">
                {hourZoom === 60 ? '1h' : hourZoom === 80 ? '45m' : hourZoom === 120 ? '30m' : hourZoom === 160 ? '15m' : '5m'}
              </span>
              <button
                onClick={() => setHourZoom(h => Math.min(320, h + 40))}
                className="h-7 w-7 flex items-center justify-center text-[10px] font-black hover:bg-surface-container/80 transition-all active:scale-90 text-muted-foreground/60 hover:text-foreground"
                title="Acercar"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className={cn(containedScroll ? "flex-1 min-h-0" : "min-h-0", "relative bg-card")}>
        <div className={cn(containedScroll ? "h-full" : "min-h-0", "bg-card")}>
            {view === "month" && (
              <SecondaryMonthView
                currentDate={currentDate}
                events={calendarVisibleEvents}
                onEventClick={handleEventClickInternal}
                onCellClick={(day) => {
                  setSelectedDayForSheet(day)
                  setIsSheetOpen(true)
                  if (onCellClick) onCellClick(day)
                }}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
                getColorClasses={getColorClasses}
                hoveredDay={hoveredDay}
                onHoverDay={handleHoveredDayChange}
                dragDisabled={dragDisabled}
              />
            )}
            {view === "year" && (
              <SecondaryYearView
                currentDate={currentDate}
                events={calendarVisibleEvents}
                onSelectMonth={(monthDate) => {
                  commitCurrentDate(monthDate)
                  handleViewChange("month")
                }}
              />
            )}
            {(view === "week" || view === "day" || view === "3day") && (
              <div className={cn(
                "flex flex-col lg:flex-row min-h-0 relative items-stretch gap-0 transition-[gap] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                isDesktopSidebarCollapsed ? "lg:gap-0" : "lg:gap-4",
                containedScroll ? "h-full" : "w-full",
                !hideSidebar && (view === "day" || view === "week" || view === "3day") && "lg:pl-16"
              )}>
                {!hideSidebar && isDesktopSidebarCollapsed && (view === "day" || view === "week") && (
                  <button
                    type="button"
                    onClick={() => setIsDesktopSidebarCollapsed(false)}
                    className="fixed left-[58px] top-1/2 z-[70] hidden h-14 w-7 -translate-y-1/2 items-center justify-center rounded-r-full border border-l-0 border-outline-variant/16 bg-background text-muted-foreground shadow-[0_8px_22px_rgba(0,0,0,0.22)] transition-all hover:w-8 hover:text-primary lg:flex"
                    aria-label="Mostrar tareas de hoy"
                    title="Mostrar tareas"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
                {!hideSidebar && (view === "day" || view === "week") && (
                  <motion.div
                    className="hidden flex-shrink-0 overflow-hidden lg:block"
                    initial={false}
                    animate={{
                      width: isDesktopSidebarCollapsed ? 0 : 344,
                      opacity: isDesktopSidebarCollapsed ? 0 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 260, damping: 34, mass: 0.8 }}
                    aria-hidden={isDesktopSidebarCollapsed}
                  >
                  <motion.div 
                    data-sidebar-droptarget="true"
                    className={cn(
                      "fixed bottom-2 left-[74px] top-2 z-30 w-[21.5rem] will-change-transform",
                      isDesktopSidebarCollapsed && "pointer-events-none"
                    )}
                    initial={false}
                    animate={{
                      x: isDesktopSidebarCollapsed ? -36 : 0,
                      opacity: isDesktopSidebarCollapsed ? 0 : 1,
                      scale: isDesktopSidebarCollapsed ? 0.985 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 240, damping: 30, mass: 0.72 }}
                    style={{ transformOrigin: "left center" }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedEvent && !draggedEvent.isAllDay && draggedEvent.id.startsWith('task-')) {
                        const updatedEvent = {
                          ...draggedEvent,
                          isAllDay: true,
                          startTime: new Date(currentDate), // reset time to start of day
                          endTime: new Date(currentDate)
                        };
                        setEvents((prev) => prev.map((evt) => (evt.id === draggedEvent.id ? updatedEvent : evt)));
                        onEventUpdate?.(draggedEvent.id, { isAllDay: true });
                        setDraggedEvent(null);
                      }
                    }}
                  >
                    <Card className="flex h-full w-full flex-col overflow-hidden border-outline-variant/12 notebook-cream-bg shadow-sm">
                    {/* Notebook spiral rings */}
                    <div className="hidden absolute inset-y-4 left-2 flex-col justify-between pointer-events-none z-20">
                      {Array.from({ length: 10 }).map((_, ring) => (
                        <span
                          key={ring}
                          className="h-2.5 w-6 rounded-full border-2 border-[#A8A29E]/40 bg-[#A8A29E]/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_1px_2px_rgba(0,0,0,0.12)]"
                        />
                      ))}
                    </div>

                    {/* Vertical margin line */}
                    <div className="hidden absolute top-[122px] bottom-8 left-9 w-px bg-rose-300/20 pointer-events-none z-20" />

                    <div className="relative z-10 flex items-start justify-between gap-3 px-5 py-4">
                      <div className="min-w-0">
                        <h2 className="text-[24px] font-black leading-[28px] tracking-[-0.03em]" style={{ color: '#18202e', fontFamily: '"Plus Jakarta Sans", var(--font-headline, ui-rounded, system-ui, sans-serif)' }}>
                          Pendientes
                        </h2>
                        <p className="mt-1 text-[10.5px] font-bold leading-snug" style={{ color: '#5a6375' }}>
                          Arrastra tareas al calendario
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsDesktopSidebarCollapsed(true)}
                        className="absolute right-3 top-4 z-30 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-outline-variant/16 bg-background text-muted-foreground shadow-[0_8px_22px_rgba(0,0,0,0.12)] transition-all hover:text-primary"
                        aria-label="Ocultar tareas de hoy"
                        title="Ocultar tareas"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Folder tab bar - matching DailyPage notebook style */}
                    <div className="relative z-10 flex items-center gap-2 overflow-x-auto no-scrollbar px-5 py-1 pb-1 mb-1 justify-start">
                      <button
                        type="button"
                        onClick={() => setSelectedFolderId(null)}
                        className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[10px] font-semibold tracking-tight transition-all border ${
                          selectedFolderId === null
                            ? 'bg-primary/15 text-primary border-primary/35 shadow-sm'
                            : 'bg-white/40 text-on-surface-variant/80 border-outline-variant/40 hover:text-foreground hover:border-outline-variant/60'
                        }`}
                      >
                        General
                      </button>
                      {visibleFolders.map((folder) => {
                        const isSelected = selectedFolderId === folder.id;
                        return (
                          <button
                            key={folder.id}
                            type="button"
                            onClick={() => setSelectedFolderId(isSelected ? null : folder.id)}
                            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[10px] font-semibold tracking-tight transition-all border ${
                              isSelected
                                ? 'bg-primary/15 text-primary border-primary/35 shadow-sm'
                                : 'bg-white/40 text-on-surface-variant/80 border-outline-variant/40 hover:text-foreground hover:border-outline-variant/60'
                            }`}
                          >
                            {folder.name}
                          </button>
                        );
                      })}
                    </div>

                    <div ref={sidebarScrollRef} className="relative z-10 flex-1 overflow-y-auto custom-scrollbar px-5 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20" data-sidebar-scroll="true" tabIndex={0}>
                      {sidebarVisibleTasks.length > 0 ? (
                        <div className="notebook-task-list">
                          {sidebarVisibleTasks.map((event, idx) => (
                            <div
                              key={event.id}
                              data-sidebar-task-idx={idx}
                              onMouseDown={(e) => {
                                handleSidebarMouseDown(e, event);
                              }}
                              onTouchStart={(e) => {
                                handleSidebarTouchStart(e, event);
                              }}
                              className="touch-none"
                            >
                              <TaskCard
                                task={event}
                                taskIdx={idx}
                                isDone={!!event.completed}
                                completingTaskId={null}
                                dragIdx={sidebarDragIdx}
                                handleDragStart={handleSidebarCardDragStart}
                                handleDragOver={handleSidebarCardDragOver}
                                handleDragEnd={handleSidebarCardDragEnd}
                                handlePointerReorderStart={handleSidebarPointerReorderStart}
                                setSelectedTask={handleSidebarTaskSelect}
                                handleComplete={handleSidebarTaskComplete}
                                handleUncomplete={handleSidebarTaskUncomplete}
                                 handleStartTimer={handleSidebarTaskTimer}
                                 view="daily"
                                 notebookView
                                 hideTimer
                               />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center px-2">
                          <List className="w-6 h-6 mb-2 text-on-surface-variant/40" />
                          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50">Sin tareas para hoy</p>
                        </div>
                      )}
                      <div
                        className="mt-5"
                        style={{
                          padding: '14px 14px 16px',
                          background: 'rgba(246,243,244,0.94)',
                          borderTop: '1px solid rgba(30,41,59,0.08)',
                          borderRadius: 0,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setShowSidebarUpcoming((value) => !value)}
                          className="flex w-full items-center gap-2 border-0 bg-transparent p-0 pb-3 text-left"
                          style={{ color: 'rgba(85,68,45,0.78)' }}
                        >
                          <ChevronDown
                            style={{
                              width: 15,
                              height: 15,
                              strokeWidth: 2.6,
                              transform: showSidebarUpcoming ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 60ms linear',
                            }}
                          />
                          <span className="flex-1 text-[11px] font-[850] uppercase leading-4 tracking-[0.05em]">Siguientes</span>
                        </button>

                        <AnimatePresence initial={false}>
                          {showSidebarUpcoming && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.06, ease: 'linear' }}
                              style={{ display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}
                            >
                              {sidebarUpcomingMonthGroups.length === 0 ? (
                                <div className="rounded-[15px] border border-black/[0.06] bg-white/35 px-3 py-3 text-[12px] font-bold text-[#5f6775]/65">
                                  No hay tareas siguientes.
                                </div>
                              ) : (
                                sidebarUpcomingMonthGroups.map((month) => {
                                  const monthOpen = openSidebarUpcomingMonths[month.key] ?? month.isCurrentMonth;
                                  return (
                                    <motion.div key={month.key} layout={false} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                      <button
                                        type="button"
                                        onClick={() => setOpenSidebarUpcomingMonths((current) => ({ ...current, [month.key]: !(current[month.key] ?? month.isCurrentMonth) }))}
                                        className="flex w-full items-center gap-2 border-0 text-left"
                                        style={{
                                          minHeight: 39,
                                          borderRadius: month.isCurrentMonth ? 8 : 14,
                                          background: month.isCurrentMonth ? 'transparent' : 'rgba(255,255,255,0.34)',
                                          padding: month.isCurrentMonth ? '2px 2px 1px' : '8px 11px',
                                          border: month.isCurrentMonth ? 'none' : '1px solid rgba(30,41,59,0.10)',
                                        }}
                                      >
                                        <ChevronDown
                                          style={{
                                            width: 14,
                                            height: 14,
                                            flexShrink: 0,
                                            color: 'rgba(31,41,55,0.46)',
                                            transform: monthOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 60ms linear',
                                          }}
                                        />
                                        <span
                                          className="min-w-0 flex-1 text-[12px] font-[850] tracking-[0.02em]"
                                          style={{ color: month.isCurrentMonth ? 'rgba(85,68,45,0.52)' : 'rgba(85,68,45,0.62)' }}
                                        >
                                          {month.label}
                                        </span>
                                      </button>

                                      <AnimatePresence initial={false}>
                                        {monthOpen && (
                                          <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.06, ease: 'linear' }}
                                            style={{ display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}
                                          >
                                            {month.weeks.map((week) => {
                                              const weekOpen = openSidebarUpcomingWeeks[week.key] ?? month.isCurrentMonth;
                                              return (
                                                <motion.div
                                                  key={week.key}
                                                  layout={false}
                                                  style={{ borderRadius: 15, border: '1px solid rgba(30,41,59,0.10)', background: 'rgba(255,255,255,0.36)', boxShadow: '0 4px 12px rgba(17,24,39,0.05)', overflow: 'hidden' }}
                                                >
                                                  <button
                                                    type="button"
                                                    onClick={() => setOpenSidebarUpcomingWeeks((current) => ({ ...current, [week.key]: !(current[week.key] ?? month.isCurrentMonth) }))}
                                                    className="flex w-full items-center gap-2 border-0 bg-transparent text-left"
                                                    style={{ minHeight: 43, padding: '9px 10px 9px 13px', color: '#18202e' }}
                                                  >
                                                    <ChevronDown
                                                      style={{
                                                        width: 14,
                                                        height: 14,
                                                        flexShrink: 0,
                                                        color: 'rgba(31,41,55,0.46)',
                                                        transform: weekOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                                        transition: 'transform 60ms linear',
                                                      }}
                                                    />
                                                    <span className="min-w-0 flex-1 text-[12px] font-[850] uppercase leading-4 tracking-[0.04em] text-[#55442d]/80">
                                                      {week.label}
                                                    </span>
                                                  </button>

                                                  <AnimatePresence initial={false}>
                                                    {weekOpen && (
                                                      <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        transition={{ duration: 0.06, ease: 'linear' }}
                                                        style={{ padding: '0 10px 11px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10 }}
                                                      >
                                                        {week.days.map((day) => {
                                                          const dayOpen = openSidebarUpcomingDays[day.key] ?? false;
                                                          return (
                                                            <motion.div
                                                              key={day.key}
                                                              layout={false}
                                                              style={{ borderRadius: 14, border: '1px solid rgba(30,41,59,0.08)', background: 'rgba(255,255,255,0.34)', overflow: 'hidden' }}
                                                            >
                                                              <button
                                                                type="button"
                                                                onClick={() => setOpenSidebarUpcomingDays((current) => ({ ...current, [day.key]: !(current[day.key] ?? false) }))}
                                                                className="flex w-full items-center gap-2 border-0 bg-transparent text-left"
                                                                style={{ minHeight: 39, padding: '8px 9px', color: '#18202e' }}
                                                              >
                                                                <ChevronDown
                                                                  style={{
                                                                    width: 13,
                                                                    height: 13,
                                                                    flexShrink: 0,
                                                                    color: 'rgba(31,41,55,0.42)',
                                                                    transform: dayOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                                                    transition: 'transform 60ms linear',
                                                                  }}
                                                                />
                                                                <span className="min-w-0 flex-1 text-[12px] font-[850] leading-4 text-[#18202e]">
                                                                  {formatCalendarUpcomingLabel(day.date, currentDate)}
                                                                </span>
                                                              </button>

                                                              <AnimatePresence initial={false}>
                                                                {dayOpen && (
                                                                  <motion.div
                                                                    initial={{ opacity: 0, height: 0 }}
                                                                    animate={{ opacity: 1, height: 'auto' }}
                                                                    exit={{ opacity: 0, height: 0 }}
                                                                    transition={{ duration: 0.06, ease: 'linear' }}
                                                                    className="notebook-task-list"
                                                                    style={{ padding: '4px 0 10px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 12 }}
                                                                  >
                                                                    {day.tasks.map((event) => (
                                                                      <div
                                                                        key={event.id}
                                                                        onMouseDown={(e) => handleSidebarMouseDown(e, event)}
                                                                        onTouchStart={(e) => handleSidebarTouchStart(e, event)}
                                                                        className="touch-none"
                                                                      >
                                                                        <TaskCard
                                                                          task={event}
                                                                          taskIdx={-1}
                                                                          isDone={!!event.completed}
                                                                          completingTaskId={null}
                                                                          dragIdx={null}
                                                                          handleDragStart={undefined}
                                                                          handleDragOver={undefined}
                                                                          handleDragEnd={undefined}
                                                                          handlePointerReorderStart={undefined}
                                                                          setSelectedTask={handleSidebarTaskSelect}
                                                                          handleComplete={handleSidebarTaskComplete}
                                                                          handleUncomplete={handleSidebarTaskUncomplete}
                                                                          handleStartTimer={handleSidebarTaskTimer}
                                                                          view="daily"
                                                                          notebookView
                                                                          hideTimer
                                                                        />
                                                                      </div>
                                                                    ))}
                                                                  </motion.div>
                                                                )}
                                                              </AnimatePresence>
                                                            </motion.div>
                                                          );
                                                        })}
                                                      </motion.div>
                                                    )}
                                                  </AnimatePresence>
                                                </motion.div>
                                              );
                                            })}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </motion.div>
                                  );
                                })
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </Card>
                  </motion.div>
                  </motion.div>
                )}
                <div className={cn("flex-1 min-w-0 min-h-0", containedScroll ? "h-full" : "h-auto")}>
                  <TimeGridView
                    view={view as "week" | "day" | "3day"}
                    currentDate={currentDate}
                    events={filteredEvents.filter(e => !e.isAllDay)}
                    setEvents={setEvents}
                    onEventClick={handleEventClickInternal}
                    onCellClick={onCellClick}
                    onDrop={handleDrop}
                    getColorClasses={getColorClasses}
                    onEventUpdate={onEventUpdate}
                    onRegisterPendingDrop={registerPendingDrop}
                    draggedEvent={draggedEvent}
                    previewTime={previewTime}
                    setPreviewTime={setPreviewTime}
                    setIsCreating={setIsCreating}
                    setNewEvent={setNewEvent}
                    setIsDialogOpen={setIsDialogOpen}
                    colors={colors}
                    categories={categories}
                    openCreateDialog={openCreateDialog}
                    dragDisabled={dragDisabled}
                    hourZoom={hourZoom}
                    draftEvent={draftEvent}
                    draftTitle={draftTitle}
                    setDraftTitle={setDraftTitle}
                    startDraft={startDraft}
                    confirmDraft={confirmDraft}
                    cancelDraft={cancelDraft}
                    updateDraftTime={updateDraftTime}
                    containedScroll={containedScroll}
                    hideGridHeader={view === "day"}
                  />
                </div>
              </div>
            )}



            {view === "schedule" && (
              <SecondaryScheduleView
                events={calendarVisibleEvents}
                currentDate={currentDate}
                onEventClick={handleEventClickInternal}
                onToggleComplete={handleToggleComplete}
                getColorClasses={getColorClasses}
              />
            )}
        </div>
      </div>


      {/* Event Dialog - pixel-match TaskDetailModal + time section */}
      <AnimatePresence>
        {isDialogOpen && (() => {
          const hasTime = isCreating ? !newEvent.isAllDay : !selectedEvent?.isAllDay;
          const titleVal = isCreating ? (newEvent.title ?? '') : (selectedEvent?.title ?? '');
          const descVal  = isCreating ? (newEvent.description ?? '') : cleanDescription(selectedEvent?.description ?? '');
          const linksVal = (isCreating ? newEvent.links : selectedEvent?.links) || [];
          const importanceVal = isCreating ? !!newEvent.importance : !!selectedEvent?.importance;
          const urgencyVal    = isCreating ? !!newEvent.urgency    : !!selectedEvent?.urgency;
          const colorVal = isCreating ? (newEvent.color || priorityColors.p4) : (selectedEvent?.color || priorityColors.p4);

          const isTask = isCreating ? creationSource !== 'calendar_only' : selectedEvent?.id.startsWith('task-');
          const isBlock = isCreating ? (creationSource === 'calendar_only' || creationSource === 'both') : selectedEvent?.id.startsWith('block-');
          const visibilityMode = isCreating
            ? creationSource
            : selectedEvent?.isEvent === false
              ? 'both'
              : (selectedEvent?.id.startsWith('block-') || selectedEvent?.isEvent ? 'calendar_only' : 'both');

          return (
            <>
              {/* Backdrop */}
              <motion.div
                key="event-backdrop"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className={cn(containedScroll ? "absolute" : "fixed", "inset-0 bg-[#F4F7EF] dark:bg-[#080B10] z-[60]")}
                onClick={requestDialogClose}
              />

              {/* Modal panel - identical container to TaskDetailModal */}
              <motion.div
                key="event-modal"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', damping: 22, stiffness: 260 }}
                className={cn(
                  containedScroll ? "absolute p-3" : "fixed p-0 sm:p-4",
                  "inset-0 z-[70] flex items-stretch justify-center pointer-events-none sm:items-center"
                )}
              >
                <div className={cn(
                  "relative mx-auto w-full overflow-y-auto pointer-events-auto border border-outline-variant/25 bg-background shadow-[0_28px_80px_rgba(0,0,0,0.22)]",
                  containedScroll ? "max-w-[500px] max-h-[calc(100%-1.5rem)] rounded-[24px]" : "h-full max-h-full max-w-full rounded-none border-0 no-scrollbar sm:h-auto sm:max-w-[640px] sm:max-h-[88vh] sm:rounded-[30px] sm:border"
                )}>
                  <div className={cn("flex flex-col gap-4", containedScroll ? "p-4" : "p-5")}>

                    {/* Header - same as TaskDetailModal */}
                    <div className="sticky top-0 z-10 -mx-1 flex items-center justify-between rounded-[24px] bg-background/95 px-1 py-1">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={requestDialogClose}
                          className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-90 text-muted-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="w-px h-4 bg-border" />
                        {!isCreating && selectedEvent && (
                          <button
                            onClick={() => handleDeleteEvent(selectedEvent.id)}
                            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <button
                        onClick={isCreating ? handleCreateEvent : handleUpdateEvent}
                        className="px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.03] active:scale-95 transition-all"
                      >
                        {isCreating
                          ? hasTime
                            ? creationSource === 'calendar_only' ? 'Crear Evento' : 'Crear en Ambos'
                            : 'Crear Tarea'
                          : 'Guardar Cambios'}
                      </button>
                    </div>

                      <div className={cn("space-y-4", containedScroll && "space-y-3")}>

                      {/* TAREA */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider">Tarea</label>
                        </div>
                        <div className="flex items-center gap-3">
                          {!isCreating && selectedEvent && selectedEvent.id.startsWith('task-') && !selectedEvent.isEvent && (
                             <Checkbox 
                                checked={!!selectedEvent.completed}
                                onCheckedChange={(checked) => handleToggleComplete(selectedEvent.id, checked === true)}
                                className="w-6 h-6 rounded-lg border-2 border-primary/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all duration-300"
                              />
                            )}
                          <input
                            value={titleVal}
                            onChange={(e) => isCreating
                              ? setNewEvent(prev => ({ ...prev, title: e.target.value }))
                              : setSelectedEvent(prev => prev ? ({ ...prev, title: e.target.value }) : null)
                            }
                            className={cn(
                              "w-full text-lg font-bold bg-surface/70 border border-outline-variant/25 rounded-[22px] px-5 py-4 focus:outline-none focus:ring-4 focus:ring-primary/10 placeholder:text-muted-foreground/20 transition-all shadow-sm",
                              !isCreating && selectedEvent?.completed && "text-muted-foreground/50 line-through decoration-primary/30"
                            )}
                            placeholder={"T\u00edtulo"}
                            autoFocus
                          />
                        </div>
                      </div>

                      {/* CONFIGURACION RAPIDA (Grid layout) */}
                      <div className="grid grid-cols-1 gap-3">
                        {/* FECHA */}
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider ml-1">Fecha</label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <div
                                className="flex items-center gap-3 bg-surface/70 border border-outline-variant/25 rounded-[18px] px-4 py-3 cursor-pointer hover:border-primary/40 hover:bg-surface transition-all shadow-sm group"
                              >
                                <Calendar className="w-4 h-4 text-primary/40 group-hover:text-primary transition-colors" />
                                <span className="text-[11px] font-bold text-primary truncate">
                                  {format(isCreating ? (newEvent.startTime || new Date()) : (selectedEvent?.startTime || new Date()), "EEE, d MMM", { locale: es }).toUpperCase()}
                                </span>
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-[28px] overflow-hidden border-outline-variant/10 shadow-2xl" align="start">
                              <CalendarPicker
                                mode="single"
                                selected={isCreating ? (newEvent.startTime || new Date()) : (selectedEvent?.startTime || new Date())}
                                onSelect={(date) => {
                                  if (!date) return;
                                  if (isCreating) {
                                    const start = new Date(newEvent.startTime || new Date());
                                    start.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                                    const end = new Date(newEvent.endTime || new Date());
                                    end.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                                    setNewEvent(prev => ({ ...prev, startTime: start, endTime: end }));
                                  } else {
                                    const start = new Date(selectedEvent?.startTime || new Date());
                                    start.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                                    const end = new Date(selectedEvent?.endTime || new Date());
                                    end.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                                    setSelectedEvent(prev => prev ? ({ ...prev, startTime: start, endTime: end }) : null);
                                  }
                                }}
                                initialFocus
                                locale={es}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                      </div>

                      {/* MODO (Segmented style) */}
                      {hasTime && (isCreating || !!selectedEvent) && (
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider ml-1">{"\u00bfD\u00f3nde quiere verlo?"}</label>
                          <div className="flex p-1 bg-surface-container/30 border border-outline-variant/20 rounded-[20px] gap-1">
                            {[
                              { id: 'calendar_only' as const, label: 'SOLO CALENDARIO' },
                              { id: 'both' as const, label: 'LISTA DE TAREAS Y CALENDARIO' },
                            ].map(opt => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  if (isCreating) {
                                    setCreationSource(opt.id)
                                    const start = newEvent.startTime || new Date()
                                    setNewEvent(prev => ({
                                      ...prev,
                                      isAllDay: false,
                                      startTime: prev.startTime || start,
                                      endTime: prev.endTime || addMinutes(start, durationMinutes),
                                    }))
                                  } else {
                                    setSelectedEvent(prev => prev ? ({
                                      ...prev,
                                      isAllDay: false,
                                      isEvent: opt.id === 'calendar_only',
                                    }) : null)
                                  }
                                }}
                                className={cn(
                                  "flex-1 py-2.5 rounded-[14px] text-[10px] font-bold uppercase tracking-tight transition-all",
                                  visibilityMode === opt.id
                                    ? "bg-primary text-primary-foreground shadow-md"
                                    : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"
                                )}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* DURACION (Pills style) */}
                      {(creationSource === 'calendar_only' || creationSource === 'both') && isCreating && hasTime && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between px-1">
                             <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider">{"Duraci\u00f3n estimada"}</label>
                             <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={1}
                                  max={1440}
                                  value={customDuration}
                                  onChange={(e) => {
                                    setCustomDuration(e.target.value)
                                    const val = parseInt(e.target.value)
                                    if (val > 0) {
                                      setDurationMinutes(val)
                                      const start = new Date(newEvent.startTime || new Date())
                                      setNewEvent(prev => ({ ...prev, startTime: start, endTime: addMinutes(start, val) }))
                                    }
                                  }}
                                  placeholder="Min"
                                  className="w-16 h-7 text-[10px] font-bold bg-surface/50 border border-outline-variant/30 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                             </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {[15, 30, 45, 60, 90, 120].map(val => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => {
                                  setDurationMinutes(val)
                                  const start = newEvent.startTime || new Date()
                                  setNewEvent(prev => ({ ...prev, startTime: start, endTime: addMinutes(start, val) }))
                                }}
                                className={cn(
                                  "px-3.5 py-2 rounded-xl text-[10px] font-bold transition-all border",
                                  durationMinutes === val
                                    ? "bg-primary/10 text-primary border-primary/30"
                                    : "bg-surface-container/20 text-muted-foreground border-outline-variant/10 hover:border-primary/20"
                                )}
                              >
                                {val < 60 ? `${val}m` : `${val/60}h${val%60 !== 0 ? ` ${val%60}m` : ''}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* PRIORIDAD */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider ml-1">Prioridad</label>
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (isCreating) setNewEvent(prev => {
                                const importance = !prev.importance
                                return { ...prev, importance, color: priorityColors[getPriorityKey(prev.urgency || false, importance)] }
                              })
                              else setSelectedEvent(prev => {
                                if (!prev) return null
                                const importance = !prev.importance
                                return { ...prev, importance, color: priorityColors[getPriorityKey(prev.urgency || false, importance)] }
                              })
                            }}
                            className={cn(
                              "flex flex-col items-center justify-center gap-1 rounded-[20px] font-black uppercase tracking-widest text-[9px] transition-all border h-12",
                              importanceVal 
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/30 shadow-lg shadow-amber-500/5" 
                                : "bg-surface-container/30 text-muted-foreground border-outline-variant/10 hover:bg-surface-container/50"
                            )}
                          >
                            <span>IMPORTANTE</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (isCreating) setNewEvent(prev => {
                                const urgency = !prev.urgency
                                return { ...prev, urgency, color: priorityColors[getPriorityKey(urgency, prev.importance || false)] }
                              })
                              else setSelectedEvent(prev => {
                                if (!prev) return null
                                const urgency = !prev.urgency
                                return { ...prev, urgency, color: priorityColors[getPriorityKey(urgency, prev.importance || false)] }
                              })
                            }}
                            className={cn(
                              "flex flex-col items-center justify-center gap-1 rounded-[20px] font-black uppercase tracking-widest text-[9px] transition-all border h-12",
                              urgencyVal 
                                ? "bg-red-500/10 text-red-500 border-red-500/30 shadow-lg shadow-red-500/5" 
                                : "bg-surface-container/30 text-muted-foreground border-outline-variant/10 hover:bg-surface-container/50"
                            )}
                          >
                            <span>URGENTE</span>
                          </button>
                        </div>
                      </div>

                      {/* REPETICION */}
                      {(() => {
                        const priorityColorChoices = [
                          { id: 'p1', value: priorityColors.p1, label: 'P1', isCustom: false },
                          { id: 'p2', value: priorityColors.p2, label: 'P2', isCustom: false },
                          { id: 'p3', value: priorityColors.p3, label: 'P3', isCustom: false },
                          { id: 'p4', value: priorityColors.p4, label: 'P4', isCustom: false },
                        ]
                        const customColorChoices = customColors.map((color, index) => ({ id: color.id, value: color.value, label: `${index + 1}`, isCustom: true }))
                        const colorChoices = [...priorityColorChoices, ...customColorChoices]
                        const recEvent = isCreating ? newEvent : selectedEvent
                        const selectedDays = recEvent?.recurrenceDays || []
                        const currentRec = recEvent?.recurrence || 'none'
                        const interval = recEvent?.recurrenceInterval || 1
                        const unit = recEvent?.recurrenceUnit || 'weeks'
                        const endType = recEvent?.recurrenceEndType || 'never'
                        const endDate = recEvent?.recurrenceEndDate || ''
                        const endCount = recEvent?.recurrenceEndCount || 5
                        const weekDays = [
                          { value: 1, label: 'L', full: 'lunes' },
                          { value: 2, label: 'M', full: 'martes' },
                          { value: 3, label: "X", full: "mi\u00e9rcoles" },
                          { value: 4, label: 'J', full: 'jueves' },
                          { value: 5, label: 'V', full: 'viernes' },
                          { value: 6, label: "S", full: "s\u00e1bado" },
                          { value: 0, label: 'D', full: 'domingo' },
                        ]
                        const patchRecurrence = (patch: Partial<Event>) => {
                          if (isCreating) setNewEvent(prev => ({ ...prev, ...patch }))
                          else setSelectedEvent(prev => prev ? ({ ...prev, ...patch }) : null)
                        }
                        const toggleDay = (day: number) => {
                          const nextDays = selectedDays.includes(day)
                            ? selectedDays.filter(d => d !== day)
                            : [...selectedDays, day]
                          patchRecurrence({
                            recurrence: nextDays.length ? (currentRec === 'custom' ? 'custom' : 'weekly') : 'none',
                            recurrenceDays: nextDays,
                            recurrenceInterval: currentRec === 'custom' ? interval : 1,
                            recurrenceUnit: 'weeks',
                          })
                        }
                        const selectedDayNames = weekDays
                          .filter(d => selectedDays.includes(d.value))
                          .map(d => d.full)
                        const unitLabel: Record<string, [string, string]> = {
                          days: ["d\u00eda", "d\u00edas"],
                          weeks: ['semana', 'semanas'],
                          months: ['mes', 'meses'],
                          years: ["a\u00f1o", "a\u00f1os"],
                        }
                        const baseSummary = (() => {
                          if (!currentRec || currentRec === 'none') return 'No se repite'
                          if (currentRec === "daily") return "Se repite cada d\u00eda"
                          if (currentRec === 'monthly') return 'Se repite cada mes'
                          if (currentRec === "yearly") return "Se repite cada a\u00f1o"
                          if (currentRec === 'weekdays') return 'Se repite de lunes a viernes'
                          if (currentRec === 'biweekly') return selectedDayNames.length ? `Se repite cada 2 semanas: ${selectedDayNames.join(', ')}` : 'Se repite cada 2 semanas'
                          if (currentRec === 'weekly') return selectedDayNames.length ? `Se repite cada ${selectedDayNames.join(', ')}` : 'Se repite cada semana'
                          const [singular, plural] = unitLabel[unit] || ['periodo', 'periodos']
                          const cadence = `Se repite cada ${interval} ${interval === 1 ? singular : plural}`
                          return unit === 'weeks' && selectedDayNames.length ? `${cadence}: ${selectedDayNames.join(', ')}` : cadence
                        })()
                        const endSummary = endType === 'date' && endDate
                          ? ` hasta ${format(new Date(`${endDate}T12:00:00`), 'd MMM yyyy', { locale: es })}`
                          : endType === 'count'
                            ? ` durante ${endCount} eventos`
                            : ''
                        const liveSummary = `${titleVal || 'Nombre del evento'}: ${baseSummary}${endSummary}.`
                        const customOpen = currentRec === 'custom'
                        const reminderEnabled = !!recEvent?.reminderEnabled
                        const reminderMinutes = recEvent?.reminderMinutesBefore ?? 15
                        const quickReminders = REMINDER_OPTIONS
                        const patchReminder = (patch: Partial<Event>) => {
                          if (isCreating) setCreateReminderDefaultActive(false)
                          patchRecurrence(patch)
                        }
                        const cycleReminder = () => {
                          if (isCreating && createReminderDefaultActive && reminderEnabled && reminderMinutes === 0) {
                            setCreateReminderDefaultActive(false)
                            patchRecurrence({ reminderEnabled: false, reminderMinutesBefore: 0 })
                            return
                          }

                          patchReminder(getNextReminderState(reminderEnabled, reminderMinutes))
                        }

                        return (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between px-1">
                                <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider">Color del evento</label>
                                <Palette className="w-3.5 h-3.5 text-muted-foreground/40" />
                              </div>
                              <div className="rounded-[22px] border border-outline-variant/15 bg-surface-container/25 p-3">
                                <div className="grid grid-cols-5 gap-2">
                                  {colorChoices.map((color) => {
                                    const active = colorVal?.toLowerCase?.() === color.value.toLowerCase()
                                    return (
                                      <div key={color.id} className="relative group/color">
                                        <button
                                          type="button"
                                          onClick={() => patchRecurrence({ color: color.value })}
                                          className={cn(
                                            "h-10 w-full rounded-full border transition-all flex items-center justify-center text-[9px] font-black",
                                            active ? "border-foreground scale-105" : "border-outline-variant/20 hover:border-primary/40"
                                          )}
                                          style={{ backgroundColor: color.value }}
                                          aria-label={`Usar color ${color.label}`}
                                        >
                                          {active && <Check className="w-4 h-4 text-white drop-shadow" />}
                                        </button>
                                        {color.isCustom && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              removeCustomColor(color.id)
                                              // If this was the selected color, reset to p4
                                              if (active) patchRecurrence({ color: priorityColors.p4 })
                                            }}
                                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover/color:opacity-100 transition-opacity shadow-sm z-10"
                                            aria-label="Eliminar color"
                                          >
                                            <X className="w-2.5 h-2.5" />
                                          </button>
                                        )}
                                      </div>
                                    )
                                  })}
                                  {/* + button always visible */}
                                  <label
                                    className="h-10 rounded-full border border-dashed border-outline-variant/30 text-muted-foreground hover:text-primary hover:border-primary/40 transition-all flex items-center justify-center cursor-pointer"
                                    style={{ backgroundColor: pendingCustomColor }}
                                  >
                                    <Plus className="w-4 h-4 text-white drop-shadow" />
                                    <input
                                      type="color"
                                      className="sr-only"
                                      value={pendingCustomColor}
                                      onChange={(e) => setPendingCustomColor(e.target.value)}
                                    />
                                  </label>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    addCustomColor(pendingCustomColor)
                                    patchRecurrence({ color: pendingCustomColor })
                                    setPendingCustomColor('#5B7CFA')
                                  }}
                                  className="mt-3 w-full rounded-2xl bg-primary/10 border border-primary/20 py-2.5 text-[10px] font-black uppercase tracking-wider text-primary hover:bg-primary/15 transition-colors"
                                >
                                  Guardar color
                                </button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between px-1">
                                <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider">{"Notificaci\u00f3n"}</label>
                                  <button
                                    type="button"
                                  onClick={cycleReminder}
                                  className={cn(
                                    "h-9 rounded-full px-3 flex items-center justify-center gap-2 border transition-all text-[10px] font-black",
                                    reminderEnabled ? "bg-primary/15 text-primary border-primary/25" : "bg-surface-container/30 text-muted-foreground border-outline-variant/15"
                                  )}
                                  aria-label={reminderEnabled ? "Desactivar notificaci\u00f3n" : "Activar notificaci\u00f3n"}
                                >
                                  {reminderEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                                  <span>{getReminderDisplayLabel(reminderEnabled, reminderMinutes)}</span>
                                </button>
                              </div>
                              {reminderEnabled && (
                                <div className="rounded-[22px] border border-outline-variant/15 bg-surface-container/25 p-3 space-y-3">
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {quickReminders.map((option) => (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => patchReminder({ reminderEnabled: true, reminderMinutesBefore: option.value })}
                                        className={cn(
                                          "h-9 rounded-xl text-[10px] font-black transition-all border",
                                          reminderMinutes === option.value
                                            ? "bg-primary/15 text-primary border-primary/30"
                                            : "bg-surface/50 text-muted-foreground border-outline-variant/15 hover:text-primary"
                                        )}
                                      >
                                        {option.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider ml-1">{"Repetici\u00f3n"}</label>
                              <button
                                type="button"
                                onClick={() => patchRecurrence({
                                  recurrence: customOpen ? (selectedDays.length ? 'weekly' : 'none') : 'custom',
                                  recurrenceInterval: interval,
                                  recurrenceUnit: unit,
                                  recurrenceDays: selectedDays,
                                  recurrenceEndType: endType,
                                })}
                                className={cn(
                                  "rounded-full px-3 py-1.5 text-[10px] font-black transition-all",
                                  !recurrenceEditorOpen && "hidden",
                                  customOpen ? "bg-primary/15 text-primary" : "bg-surface-container/40 text-muted-foreground hover:text-primary"
                                )}
                              >
                                A medida
                              </button>
                              <button
                                type="button"
                                onClick={() => setRecurrenceEditorOpen((open) => !open)}
                                className="rounded-full px-3 py-1.5 text-[10px] font-black bg-surface-container/40 text-muted-foreground hover:text-primary transition-all"
                              >
                                {recurrenceEditorOpen ? 'Cerrar' : 'Editar'}
                              </button>
                            </div>

                            <div className="rounded-[22px] border border-outline-variant/15 bg-surface-container/25 p-3 space-y-3">
                              <div className="rounded-2xl bg-primary/10 border border-primary/15 px-4 py-3 text-[12px] font-bold text-foreground leading-relaxed">
                                {liveSummary}
                              </div>

                              {recurrenceEditorOpen && (
                                <>
                              <div className="grid grid-cols-7 gap-1.5">
                                {weekDays.map(day => {
                                  const active = selectedDays.includes(day.value)
                                  return (
                                    <button
                                      key={day.value}
                                      type="button"
                                      onClick={() => toggleDay(day.value)}
                                      className={cn(
                                        "h-10 rounded-full text-xs font-black transition-all border",
                                        active
                                          ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                                          : "bg-surface/60 text-muted-foreground border-outline-variant/20 hover:border-primary/30 hover:text-primary"
                                      )}
                                      aria-label={`Repetir los ${day.full}`}
                                    >
                                      {day.label}
                                    </button>
                                  )
                                })}
                              </div>

                              {selectedDays.length > 0 && !customOpen && (
                                <button
                                  type="button"
                                  onClick={() => patchRecurrence({ recurrence: 'none', recurrenceDays: [] })}
                                  className="w-full rounded-2xl py-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  {"Quitar repetici\u00f3n"}
                                </button>
                              )}

                              {customOpen && (
                                <div className="space-y-3 border-t border-outline-variant/10 pt-3">
                                  <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">Cada</span>
                                    <div className="grid grid-cols-[72px_1fr] gap-2">
                                      <input
                                        type="number"
                                        min={1}
                                        max={365}
                                        value={interval}
                                        onChange={(e) => patchRecurrence({ recurrence: 'custom', recurrenceInterval: Math.max(1, Number(e.target.value) || 1) })}
                                        className="h-10 rounded-xl bg-surface/70 border border-outline-variant/20 px-3 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/30"
                                      />
                                      <select
                                        value={unit}
                                        onChange={(e) => patchRecurrence({ recurrence: 'custom', recurrenceUnit: e.target.value as Event['recurrenceUnit'] })}
                                        className="h-10 rounded-xl bg-surface/70 border border-outline-variant/20 px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"
                                      >
                                        <option value="days">{"d\u00edas"}</option>
                                        <option value="weeks">semanas</option>
                                        <option value="months">meses</option>
                                        <option value="years">{"a\u00f1os"}</option>
                                      </select>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">Finaliza</span>
                                    <div className="grid grid-cols-3 gap-1.5">
                                      {[
                                        { id: 'never', label: 'Nunca' },
                                        { id: 'date', label: 'Fecha' },
                                        { id: 'count', label: 'Eventos' },
                                      ].map(opt => (
                                        <button
                                          key={opt.id}
                                          type="button"
                                          onClick={() => patchRecurrence({ recurrence: 'custom', recurrenceEndType: opt.id as Event['recurrenceEndType'] })}
                                          className={cn(
                                            "h-9 rounded-xl text-[10px] font-black transition-all border",
                                            endType === opt.id
                                              ? "bg-primary/15 text-primary border-primary/30"
                                              : "bg-surface/50 text-muted-foreground border-outline-variant/15 hover:text-primary"
                                          )}
                                        >
                                          {opt.label}
                                        </button>
                                      ))}
                                    </div>

                                    {endType === 'date' && (
                                      <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => patchRecurrence({ recurrence: 'custom', recurrenceEndDate: e.target.value })}
                                        className="w-full h-10 rounded-xl bg-surface/70 border border-outline-variant/20 px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"
                                      />
                                    )}

                                    {endType === 'count' && (
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          min={1}
                                          max={999}
                                          value={endCount}
                                          onChange={(e) => patchRecurrence({ recurrence: 'custom', recurrenceEndCount: Math.max(1, Number(e.target.value) || 1) })}
                                          className="h-10 w-24 rounded-xl bg-surface/70 border border-outline-variant/20 px-3 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        />
                                        <span className="text-xs font-bold text-muted-foreground">eventos</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRecurrenceEditorOpen(false)
                                      if (titleVal?.trim()) {
                                        if (isCreating) handleCreateEvent()
                                        else handleUpdateEvent()
                                      }
                                    }}
                                    className="w-full rounded-2xl bg-primary text-primary-foreground py-2.5 text-[10px] font-black uppercase tracking-wider shadow-lg shadow-primary/15 hover:scale-[1.01] active:scale-95 transition-all"
                                  >
                                    {"Guardar repetici\u00f3n"}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })()}

                      {/* LINKS O REFERENCIAS */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">Links o Referencias</label>
                        <div className="flex flex-col gap-2">
                          {linksVal.length === 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <LinkIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 pointer-events-none" />
                                <input
                                  id="new-link-input"
                                  type="text"
                                  placeholder="https://..."
                                  className="w-full text-sm bg-surface-container/30 border border-outline-variant/10 rounded-[24px] pl-12 pr-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/20"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const val = e.currentTarget.value.trim();
                                      if (!val) return;
                                      if (isCreating) setNewEvent(prev => ({ ...prev, links: [val] }));
                                      else setSelectedEvent(prev => prev ? ({ ...prev, links: [val] }) : null);
                                      e.currentTarget.value = '';
                                    }
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const inp = document.getElementById('new-link-input') as HTMLInputElement;
                                  const val = inp?.value.trim();
                                  if (val) {
                                    if (isCreating) setNewEvent(prev => ({ ...prev, links: [val] }));
                                    else setSelectedEvent(prev => prev ? ({ ...prev, links: [val] }) : null);
                                    if (inp) inp.value = '';
                                  }
                                }}
                                className="w-[52px] h-[52px] flex-shrink-0 flex items-center justify-center rounded-[24px] bg-surface-container/30 border border-outline-variant/10 text-muted-foreground/50 hover:text-primary hover:bg-surface-container hover:border-primary/30 transition-all"
                              >
                                <span className="text-xl leading-none">+</span>
                              </button>
                            </div>
                          ) : (
                            linksVal.map((l, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <LinkIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 pointer-events-none" />
                                  <input
                                    type="text"
                                    value={l}
                                    onChange={(e) => {
                                      const updated = [...linksVal]; updated[i] = e.target.value;
                                      if (isCreating) setNewEvent(prev => ({ ...prev, links: updated }));
                                      else setSelectedEvent(prev => prev ? ({ ...prev, links: updated }) : null);
                                    }}
                                    placeholder=""
                                    className="w-full text-sm bg-surface-container/30 border border-outline-variant/10 rounded-[24px] pl-12 pr-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/20"
                                  />
                                </div>
                                {i === linksVal.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isCreating) setNewEvent(prev => ({ ...prev, links: [...(prev.links || []), ''] }));
                                      else setSelectedEvent(prev => prev ? ({ ...prev, links: [...(prev.links || []), ''] }) : null);
                                    }}
                                    className="w-[52px] h-[52px] flex-shrink-0 flex items-center justify-center rounded-[24px] bg-surface-container/30 border border-outline-variant/10 text-muted-foreground/50 hover:text-primary hover:bg-surface-container hover:border-primary/30 transition-all"
                                  >
                                    <span className="text-xl leading-none">+</span>
                                  </button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* DESCRIPCION */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">{"Descripci\u00f3n"}</label>
                        <Textarea
                          value={descVal}
                          onChange={(e) => isCreating
                            ? setNewEvent({ ...newEvent, description: e.target.value })
                            : setSelectedEvent(prev => prev ? ({ ...prev, description: e.target.value }) : null)
                          }
                          placeholder=""
                          className="w-full text-sm bg-surface-container/30 border border-outline-variant/10 rounded-[24px] p-5 focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[100px] placeholder:text-muted-foreground/20 transition-all resize-none"
                        />
                      </div>

                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

      <AnimatePresence>
        {confirmCloseOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(containedScroll ? "absolute" : "fixed", "inset-0 bg-black/80 backdrop-blur-2xl z-[90]")}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className={cn(containedScroll ? "absolute" : "fixed", "inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none")}
            >
              <div className="w-full max-w-sm rounded-[28px] border border-outline-variant/20 bg-background p-5 shadow-2xl pointer-events-auto">
                <h3 className="text-base font-semibold text-foreground">{"\u00bfQuieres guardar los cambios?"}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Hay cambios pendientes en este elemento.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={discardDialogChanges}
                    className="h-11 rounded-2xl border border-outline-variant/20 bg-surface-container/30 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Descartar
                  </button>
                  <button
                    type="button"
                    onClick={saveAndCloseDialog}
                    className="h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/15 hover:scale-[1.01] active:scale-95 transition-all"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>



      {/* Quick Preview Dialog */}
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        <Dialog open={isQuickPreviewOpen} onOpenChange={(open) => { if (!open) { setIsQuickPreviewOpen(false); setIsQuickPreviewExpanded(false); setQuickPreviewEvent(null); } }}>
          <DialogContent 
            className={cn(
              "left-0 top-0 h-[100dvh] max-h-[100dvh] w-screen translate-x-0 translate-y-0 bg-background border-0 rounded-none shadow-[0_28px_80px_rgba(0,0,0,0.22)] p-4 overflow-hidden outline-none flex flex-col transition-[max-width,max-height] duration-300 sm:left-[50%] sm:top-[50%] sm:h-auto sm:w-full sm:translate-x-[-50%] sm:translate-y-[-50%] sm:border sm:border-outline-variant/25 sm:rounded-[30px] sm:p-5",
              isQuickPreviewExpanded
                ? "sm:max-w-[430px] sm:max-h-[88vh]"
                : "sm:max-w-[430px] sm:max-h-[min(560px,calc(100vh-48px))]"
            )}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            hideCloseButton={true}
          >
            <DialogTitle className="sr-only">{"Vista r\u00e1pida del evento"}</DialogTitle>
            <DialogDescription className="sr-only">Edita los datos principales del evento seleccionado.</DialogDescription>
            
            {/* Controladores X | Basura en la esquina superior izquierda */}
            <div className="absolute left-5 top-5 flex items-center gap-3 z-20">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsQuickPreviewOpen(false);
                  setIsQuickPreviewExpanded(false);
                  setQuickPreviewEvent(null);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-90 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:outline-none focus-visible:ring-0"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
              
              {quickPreviewEvent && (
                <>
                  <span className="w-px h-4 bg-border" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (quickPreviewEvent) {
                        handleDeleteEvent(quickPreviewEvent.id);
                        setIsQuickPreviewOpen(false);
                        setIsQuickPreviewExpanded(false);
                        setQuickPreviewEvent(null);
                      }
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    title="Eliminar evento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>

            {/* Contenedor del Formulario sin labels */}
            <div className="space-y-3 pt-12 flex-1 overflow-y-auto min-h-0 pr-1">
              {/* TITULO */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Tarea</label>
                <input
                  type="text"
                  value={previewTitle}
                  onChange={(e) => setPreviewTitle(e.target.value)}
                  className="w-full text-[15px] font-bold bg-surface/70 border border-outline-variant/25 rounded-[22px] px-4 py-3.5 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/20 text-foreground shadow-sm"
                  placeholder="Nombre del evento"
                />
              </div>

              {isQuickPreviewExpanded && (
                <>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Fecha</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="w-full h-11 flex items-center gap-3 bg-surface/70 border border-outline-variant/25 rounded-[18px] px-4 cursor-pointer hover:border-primary/40 hover:bg-surface transition-all shadow-sm group"
                          >
                            <Calendar className="w-4 h-4 text-primary/40 group-hover:text-primary transition-colors" />
                            <span className="text-[11px] font-bold text-primary truncate">
                              {format(previewStartTime, "EEE, d MMM", { locale: es }).toUpperCase()}
                            </span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-[28px] overflow-hidden border-outline-variant/10 shadow-2xl" align="start">
                          <CalendarPicker
                            mode="single"
                            selected={previewStartTime}
                            onSelect={(date) => {
                              if (!date) return;
                              const nextStart = new Date(previewStartTime);
                              nextStart.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                              const nextEnd = new Date(previewEndTime);
                              nextEnd.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                              setPreviewStartTime(nextStart);
                              setPreviewEndTime(nextEnd);
                            }}
                            initialFocus
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Prioridad</label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          const nextImportance = !previewImportance;
                          setPreviewImportance(nextImportance);
                          setPreviewColor(priorityColors[getPriorityKey(previewUrgency, nextImportance)]);
                        }}
                        className={cn(
                          "flex items-center justify-center rounded-[20px] font-black uppercase tracking-widest text-[9px] transition-all border h-12",
                          previewImportance
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/30 shadow-lg shadow-amber-500/5"
                            : "bg-surface-container/30 text-muted-foreground border-outline-variant/10 hover:bg-surface-container/50"
                        )}
                      >
                        Importante
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nextUrgency = !previewUrgency;
                          setPreviewUrgency(nextUrgency);
                          setPreviewColor(priorityColors[getPriorityKey(nextUrgency, previewImportance)]);
                        }}
                        className={cn(
                          "flex items-center justify-center rounded-[20px] font-black uppercase tracking-widest text-[9px] transition-all border h-12",
                          previewUrgency
                            ? "bg-red-500/10 text-red-500 border-red-500/30 shadow-lg shadow-red-500/5"
                            : "bg-surface-container/30 text-muted-foreground border-outline-variant/10 hover:bg-surface-container/50"
                        )}
                      >
                        Urgente
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* DESCRIPCION */}
              <textarea
                value={previewDescription}
                onChange={(e) => setPreviewDescription(e.target.value)}
                style={{ fieldSizing: 'content' } as React.CSSProperties}
                className="w-full text-sm bg-surface-container/30 border border-outline-variant/10 rounded-[22px] p-4 focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[56px] max-h-[120px] placeholder:text-muted-foreground/20 transition-all resize-none text-foreground leading-[1.5] overflow-y-auto block"
                placeholder={"A\u00f1adir descripci\u00f3n..."}
              />

              {/* COLOR Y NOTIFICACION EN LA MISMA LINEA */}
              <div className="flex items-center gap-2">
                {/* Selector de Colores */}
                <div className="flex-1 flex flex-nowrap gap-1.5 p-2 bg-surface-container/25 border border-outline-variant/15 rounded-[20px] items-center min-h-[40px] overflow-x-auto no-scrollbar">
                  {[
                    { value: priorityColors.p1, label: 'P1' },
                    { value: priorityColors.p2, label: 'P2' },
                    { value: priorityColors.p3, label: 'P3' },
                    { value: priorityColors.p4, label: 'P4' },
                    ...customColors.map((c, i) => ({ value: c.value, label: `${i + 1}` }))
                  ].map((color, idx) => {
                    const active = previewColor.toLowerCase() === color.value.toLowerCase();
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPreviewColor(color.value)}
                        className={cn(
                          "h-5 w-5 shrink-0 rounded-full border transition-all flex items-center justify-center relative",
                          active 
                            ? "ring-2 ring-primary ring-offset-1 ring-offset-background scale-110 z-10 border-transparent" 
                            : "border-outline-variant/20 hover:scale-105"
                        )}
                        style={{ backgroundColor: color.value }}
                        aria-label={`Usar color ${color.label}`}
                      />
                    );
                  })}
                  <label
                    className="h-5 w-5 shrink-0 rounded-full border border-dashed border-outline-variant/30 text-muted-foreground/70 hover:text-primary hover:border-primary/40 transition-all flex items-center justify-center cursor-pointer"
                    style={{ backgroundColor: pendingCustomColor }}
                    title="Agregar color personalizado"
                  >
                    <Plus className="w-3 h-3 text-white drop-shadow" />
                    <input
                      type="color"
                      className="sr-only"
                      value={pendingCustomColor}
                      onChange={(e) => {
                        const next = e.target.value;
                        setPendingCustomColor(next);
                        addCustomColor(next);
                        setPreviewColor(next);
                      }}
                    />
                  </label>
                </div>

                {/* Boton de Notificacion (Cicla minutos) */}
                <button
                  type="button"
                  onClick={() => {
                    const nextReminder = getNextReminderState(previewReminderEnabled, previewReminderMinutes)
                    setPreviewReminderEnabled(nextReminder.reminderEnabled)
                    setPreviewReminderMinutes(nextReminder.reminderMinutesBefore)
                  }}
                  className={cn(
                    "h-9 rounded-full px-3 flex items-center justify-center gap-2 border transition-all text-[10px] font-black whitespace-nowrap",
                    previewReminderEnabled 
                      ? "bg-primary/15 text-primary border-primary/25 shadow-sm" 
                      : "bg-surface-container/30 text-muted-foreground border-outline-variant/15 hover:border-primary/30 hover:text-primary"
                  )}
                >
                  {previewReminderEnabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                  <span>{getReminderDisplayLabel(previewReminderEnabled, previewReminderMinutes)}</span>
                </button>
              </div>

              {/* DONDE QUIERES VERLO (Solo si aplica) */}
              {quickPreviewEvent && !quickPreviewEvent.id.startsWith('google-') && (
                <div className="flex p-1 bg-surface-container/30 border border-outline-variant/20 rounded-[20px] gap-1">
                  {[
                    { id: true, label: 'SOLO CALENDARIO' },
                    { id: false, label: 'TAREA Y CALENDARIO' },
                  ].map(opt => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setPreviewIsEvent(opt.id)}
                      className={cn(
                        "flex-1 py-2 rounded-[14px] text-[9px] font-black uppercase tracking-tight transition-all",
                        previewIsEvent === opt.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {isQuickPreviewExpanded && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Repetición</label>
                  </div>
                  <div className="rounded-[22px] border border-outline-variant/15 bg-surface-container/25 p-3 space-y-3">
                    <div className="rounded-2xl bg-primary/10 border border-primary/15 px-4 py-3 text-[12px] font-bold text-foreground leading-relaxed">
                      {previewRecurrenceSummary}
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {([
                        { id: 'none', label: 'No' },
                        { id: 'daily', label: 'Diario' },
                        { id: 'weekdays', label: 'L-V' },
                        { id: 'weekly', label: 'Semanal' },
                        { id: 'biweekly', label: '2 sem' },
                        { id: 'monthly', label: 'Mensual' },
                        { id: 'yearly', label: 'Anual' },
                        { id: 'custom', label: 'A medida' },
                      ] as const).map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => applyPreviewRecurrenceMode(option.id)}
                          className={cn(
                            "h-9 rounded-xl text-[10px] font-black transition-all border",
                            previewRecurrence === option.id
                              ? "bg-primary/15 text-primary border-primary/30"
                              : "bg-surface/50 text-muted-foreground border-outline-variant/15 hover:text-primary"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    {(previewRecurrence === 'weekly' ||
                      previewRecurrence === 'biweekly' ||
                      previewRecurrence === 'weekdays' ||
                      (previewRecurrence === 'custom' && previewRecurrenceUnit === 'weeks')) && (
                      <div className="grid grid-cols-7 gap-1.5">
                        {WEEK_DAYS.map((day) => {
                          const active = previewRecurrenceDays.includes(day.value)
                          return (
                            <button
                              key={day.value}
                              type="button"
                              onClick={() => togglePreviewRecurrenceDay(day.value)}
                              className={cn(
                                "h-10 rounded-full text-xs font-black transition-all border",
                                active
                                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                                  : "bg-surface/60 text-muted-foreground border-outline-variant/20 hover:border-primary/30 hover:text-primary"
                              )}
                              aria-label={`Repetir los ${day.full}`}
                            >
                              {day.label}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {previewRecurrence !== 'none' && (
                      <div className="space-y-3 border-t border-outline-variant/10 pt-3">
                        {previewRecurrence === 'custom' && (
                          <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">Cada</span>
                            <div className="grid grid-cols-[72px_1fr] gap-2">
                              <input
                                type="number"
                                min={1}
                                max={365}
                                value={previewRecurrenceInterval}
                                onChange={(e) => setPreviewRecurrenceInterval(Math.max(1, Number(e.target.value) || 1))}
                                className="h-10 rounded-xl bg-surface/70 border border-outline-variant/20 px-3 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                              <select
                                value={previewRecurrenceUnit}
                                onChange={(e) => {
                                  setPreviewRecurrenceUnit(e.target.value as RecurrenceUnit)
                                  if (e.target.value !== 'weeks') setPreviewRecurrenceDays([])
                                }}
                                className="h-10 rounded-xl bg-surface/70 border border-outline-variant/20 px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"
                              >
                                <option value="days">días</option>
                                <option value="weeks">semanas</option>
                                <option value="months">meses</option>
                                <option value="years">años</option>
                              </select>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">Finaliza</span>
                          <div className="grid grid-cols-3 gap-1.5">
                            {([
                              { id: 'never', label: 'Nunca' },
                              { id: 'date', label: 'Fecha' },
                              { id: 'count', label: 'Eventos' },
                            ] as const).map((option) => (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => setPreviewRecurrenceEndType(option.id)}
                                className={cn(
                                  "h-9 rounded-xl text-[10px] font-black transition-all border",
                                  previewRecurrenceEndType === option.id
                                    ? "bg-primary/15 text-primary border-primary/30"
                                    : "bg-surface/50 text-muted-foreground border-outline-variant/15 hover:text-primary"
                                )}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>

                          {previewRecurrenceEndType === 'date' && (
                            <input
                              type="date"
                              value={previewRecurrenceEndDate}
                              onChange={(e) => setPreviewRecurrenceEndDate(e.target.value)}
                              className="w-full h-10 rounded-xl bg-surface/70 border border-outline-variant/20 px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                          )}

                          {previewRecurrenceEndType === 'count' && (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                max={999}
                                value={previewRecurrenceEndCount}
                                onChange={(e) => setPreviewRecurrenceEndCount(Math.max(1, Number(e.target.value) || 1))}
                                className="h-10 w-24 rounded-xl bg-surface/70 border border-outline-variant/20 px-3 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                              <span className="text-xs font-bold text-muted-foreground">eventos</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ENLACES (LINKS) */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">Links o referencias</label>
                <div className="flex flex-col gap-2">
                  {(previewLinks.length > 0 ? previewLinks : ['']).map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <LinkIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 pointer-events-none" />
                        <input
                          type="text"
                          value={link}
                          onChange={(e) => {
                            const nextValue = e.target.value;
                            if (previewLinks.length === 0) {
                              setPreviewLinks([nextValue]);
                              return;
                            }
                            const updated = [...previewLinks];
                            updated[idx] = nextValue;
                            setPreviewLinks(updated);
                          }}
                          className="w-full text-sm bg-surface-container/30 border border-outline-variant/10 rounded-[24px] pl-12 pr-5 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground transition-all placeholder:text-muted-foreground/20"
                          placeholder="https://..."
                        />
                      </div>
                      {idx === (previewLinks.length > 0 ? previewLinks.length - 1 : 0) && (
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewLinks(prev => {
                              const links = prev.length > 0 ? prev : [''];
                              const lastLink = links[links.length - 1]?.trim();
                              return lastLink ? [...links, ''] : links;
                            });
                          }}
                          className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-[24px] bg-surface-container/30 border border-outline-variant/10 text-muted-foreground/50 hover:text-primary hover:bg-surface-container hover:border-primary/30 transition-all"
                          aria-label="Agregar enlace"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* ACCIONES DEL FOOTER */}
            <div className="flex items-center justify-between gap-3 pt-2.5 mt-3 border-t border-outline-variant/10 flex-shrink-0">
              <button
                type="button"
                onClick={toggleQuickPreviewDetails}
                className={cn(
                  "h-9 px-4 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-outline-variant/30 text-foreground hover:bg-black/5 dark:hover:bg-white/5",
                  !hasChanges && "w-full bg-primary text-primary-foreground border-transparent hover:bg-primary/95"
                )}
              >
                {isQuickPreviewExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5" />}
                <span>{isQuickPreviewExpanded ? 'Vista previa' : 'Detalles'}</span>
              </button>
              
              {hasChanges && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickPreviewOpen(false);
                      setIsQuickPreviewExpanded(false);
                      setQuickPreviewEvent(null);
                    }}
                    className="px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveQuickPreview}
                    className="px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Guardar
                  </button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>



      <Dialog open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <DialogContent className="max-w-2xl bg-surface-container-high/95 backdrop-blur-3xl border border-outline-variant/10 rounded-[32px] shadow-2xl p-0 overflow-hidden outline-none">
          <DialogTitle className="sr-only">{"Agenda del d\u00eda"}</DialogTitle>
          <DialogDescription className="sr-only">Revisa los eventos del dia seleccionado.</DialogDescription>
          <div className="h-[70vh] flex flex-col relative">
            <button 
              onClick={() => setIsSheetOpen(false)}
              className="absolute top-5 right-6 z-50 p-2 rounded-full hover:bg-white/10 transition-colors text-on-surface-variant/40 hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-10 pb-6">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">{"Agenda del d\u00eda"}</h2>
              <h3 className="text-3xl font-black font-headline tracking-tighter uppercase leading-none">
                {selectedDayForSheet && format(selectedDayForSheet, "EEEE, d 'de' MMMM", { locale: es })}
              </h3>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="space-y-2 p-10 pt-2">
                {selectedDayForSheet && filteredEvents
                  .filter(e => e.startTime.toDateString() === selectedDayForSheet.toDateString())
                  .length > 0 ? (
                    filteredEvents
                      .filter(e => e.startTime.toDateString() === selectedDayForSheet.toDateString())
                      .map(event => {
                        const evColor = (event.color && (event.color.startsWith('#') || event.color.startsWith('var'))) ? event.color : undefined;
                        const priorityBg = (() => { const pc = priorityColors[getPriorityKey(event.urgency || false, event.importance || false)]; return pc && pc !== 'transparent' ? `${pc}4D` : (evColor ? `${evColor}4D` : undefined); })();
                        return (
                          <div 
                            key={event.id}
                            onClick={() => {
                              handleEventClickInternal(event);
                              setIsSheetOpen(false);
                            }}
                            className="group flex items-start gap-4 p-5 rounded-[28px] cursor-pointer transition-all duration-300 hover:bg-primary/5 border border-outline-variant/5 hover:border-primary/20"
                            style={{ backgroundColor: priorityBg }}
                          >
                            <div 
                              className="w-10 h-10 rounded-2xl flex items-center justify-center border border-outline-variant/10 group-hover:border-primary/30 transition-colors"
                              style={{ borderColor: evColor ? `${evColor}40` : undefined }}
                            >
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: evColor || 'var(--primary)' }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-0.5">
                                <p className={cn(
                                  "text-[16px] font-semibold text-foreground leading-tight group-hover:text-primary transition-colors truncate",
                                  event.completed && "text-muted-foreground/40 line-through decoration-primary/30"
                                )}>
                                  {event.title}
                                </p>
                              </div>
                              {event.description && (
                                <p className={cn(
                                  "text-[13px] font-medium text-muted-foreground/60 line-clamp-1 mt-2",
                                  event.completed && "opacity-40"
                                )}>
                                  {event.description}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 opacity-20">
                      <Calendar className="w-16 h-16" />
                      <div className="space-y-2">
                        <h3 className="text-xl font-black uppercase tracking-widest">Nada planeado</h3>
                        <p className="text-xs font-bold opacity-60">{"Tu agenda est\u00e1 despejada por ahora."}</p>
                      </div>
                    </div>
                  )}
              </div>
            </ScrollArea>
            
            <div className="p-10 pt-6 border-t border-outline-variant/5 bg-surface-container/30">
              <Button 
                onClick={() => {
                  if (selectedDayForSheet) {
                    const start = new Date(selectedDayForSheet);
                    start.setHours(9, 0, 0, 0);
                    openCreateDialog(start);
                    setIsSheetOpen(false);
                  }
                }}
                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] bg-primary text-primary-foreground shadow-2xl hover:scale-[1.01] transition-all"
              >
                <Plus className="w-4 h-4 mr-3" />
                Nueva Tarea
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating input bar for draft events */}
      {draftEvent && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/10 pointer-events-none"
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-8 lg:bottom-8 lg:left-1/2 lg:-translate-x-1/2 lg:max-w-md"
          >
            <div className="bg-background border border-border rounded-2xl shadow-2xl p-4 flex items-center gap-3">
              <input
                ref={draftInputRef}
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmDraft()
                  if (e.key === 'Escape') cancelDraft()
                }}
                placeholder="Nombre del evento..."
                className="flex-1 bg-transparent text-base font-bold outline-none placeholder:text-muted-foreground/30"
                autoFocus
              />
              <button
                onClick={confirmDraft}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.03] active:scale-95 transition-all"
              >
                Guardar
              </button>
              <button
                onClick={cancelDraft}
                className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </>
      )}



      {/* Global ghost for sidebar drag previews */}
      <div
        ref={globalGhostRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          display: 'none',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: 9999,
          transition: 'opacity 0.15s ease',
          willChange: 'transform',
        }}
        className="flex items-center gap-2 px-4 py-2 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-md bg-surface-container/90 text-foreground font-black text-[11px] uppercase tracking-widest"
      >
        {globalDragEvent && (
          <>
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: (globalDragEvent.color?.startsWith('#') || globalDragEvent.color?.startsWith('var')) ? globalDragEvent.color : 'var(--primary)' }}
            />
            <span className="truncate max-w-[160px]">{globalDragEvent.title}</span>
          </>
        )}
      </div>
    </div>
  )
}
function TimeGridView({
  view,
  currentDate,
  events,
  setEvents,
  onEventClick,
  onCellClick,
  onDrop,
  getColorClasses,
  onEventUpdate,
  onRegisterPendingDrop,
  draggedEvent,
  previewTime,
  setPreviewTime,
  setIsCreating,
  setNewEvent,
  setIsDialogOpen,
  colors,
  categories,
  openCreateDialog,
  className,
  dragDisabled = false,
  draftEvent,
  draftTitle,
  setDraftTitle,
  startDraft,
  confirmDraft,
  cancelDraft,
  updateDraftTime,
  containedScroll = false,
  hideGridHeader = false,
  hourZoom = 160,
}: {
  view: "week" | "day" | "3day"
  currentDate: Date
  events: Event[]
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>
  onEventClick: (event: Event) => void
  onCellClick?: (date: Date) => void
  onDrop: (date: Date, hour: number, minutes?: number) => void
  getColorClasses: (color: string) => { bg: string; text: string }
  onEventUpdate?: (id: string, updates: Partial<Event>) => void
  draggedEvent?: Event | null
  previewTime?: { day: Date; hour: number; minutes?: number } | null
  setPreviewTime?: (time: { day: Date; hour: number; minutes?: number } | null) => void
  setIsCreating: (val: boolean) => void
  setNewEvent: React.Dispatch<React.SetStateAction<Partial<Event>>>
  setIsDialogOpen: (val: boolean) => void
  colors: unknown[]
  categories: string[]
  openCreateDialog: (startTime: Date, endTime?: Date, cellClickDate?: Date) => void
  className?: string
  dragDisabled?: boolean
  draftEvent?: Event | null
  draftTitle?: string
  setDraftTitle?: React.Dispatch<React.SetStateAction<string>>
  startDraft?: (startTime: Date, endTime?: Date) => void
  confirmDraft?: () => void
  cancelDraft?: () => void
  updateDraftTime?: (startTime: Date, endTime: Date) => void
  containedScroll?: boolean
  hideGridHeader?: boolean
}) {
  const HOUR_HEIGHT = hourZoom;
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const initialEventsRef = useRef<Event[]>([])
  const [currentNow, setCurrentNow] = useState(() => new Date())

  useEffect(() => {
    const tick = window.setInterval(() => setCurrentNow(new Date()), 60_000)
    return () => window.clearInterval(tick)
  }, [])
  
  const days = useMemo(() => {
    if (view === "day") return [currentDate]
    if (view === "3day") {
      return Array.from({ length: 3 }, (_, i) => {
        const d = new Date(currentDate)
        d.setDate(d.getDate() + i)
        return d
      })
    }
    const start = new Date(currentDate)
    start.setDate(start.getDate() - start.getDay() + (start.getDay() === 0 ? -6 : 1)) // Monday start
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [currentDate, view])

  const isShowingToday = useMemo(() => {
    const today = new Date()
    return days.some(day => isSameDay(day, today))
  }, [days])

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const isMobileViewport = useIsMobile()

  const eventLayouts = useMemo(() => {
    const layouts = new Map<string, { left: number; width: number; zIndex: number; contentWidth: number }>()

    days.forEach(day => {
      const dayEvents = events
        .filter(event => !event.isAllDay && isSameDay(event.startTime, day))
        .sort((a, b) => {
          const startDiff = a.startTime.getTime() - b.startTime.getTime()
          if (startDiff !== 0) return startDiff
          return b.endTime.getTime() - b.startTime.getTime() - (a.endTime.getTime() - a.startTime.getTime())
        })

      const clusters: Event[][] = []
      let currentCluster: Event[] = []
      let clusterEnd = 0

      dayEvents.forEach(event => {
        if (currentCluster.length === 0 || event.startTime.getTime() < clusterEnd) {
          currentCluster.push(event)
          clusterEnd = Math.max(clusterEnd, event.endTime.getTime())
        } else {
          clusters.push(currentCluster)
          currentCluster = [event]
          clusterEnd = event.endTime.getTime()
        }
      })
      if (currentCluster.length > 0) clusters.push(currentCluster)

      clusters.forEach(cluster => {
        const columns: Event[][] = []
        const assignments = new Map<string, number>()

        cluster.forEach(event => {
          let columnIndex = columns.findIndex(column => {
            const last = column[column.length - 1]
            return last.endTime.getTime() <= event.startTime.getTime()
          })
          if (columnIndex === -1) {
            columnIndex = columns.length
            columns.push([])
          }
          columns[columnIndex].push(event)
          assignments.set(event.id, columnIndex)
        })

        const columnCount = Math.max(1, columns.length)
        const columnWidth = 100 / columnCount
        const gap = isMobileViewport ? 2.5 : 1.25
        const baseLayouts = new Map<string, { left: number; width: number; columnIndex: number; zIndex: number }>()

        cluster.forEach(event => {
          const columnIndex = assignments.get(event.id) || 0
          const left = columnWidth * columnIndex
          const width = Math.max(8, 100 - left - gap)
          baseLayouts.set(event.id, { left, width, columnIndex, zIndex: 20 + columnIndex })
        })

        cluster.forEach(event => {
          const layout = baseLayouts.get(event.id)
          if (!layout) return

          const blockingLeft = cluster.reduce<number | null>((closestLeft, candidate) => {
            const candidateLayout = baseLayouts.get(candidate.id)
            if (!candidateLayout || candidateLayout.columnIndex <= layout.columnIndex) return closestLeft

            const overlapsVertically =
              candidate.startTime.getTime() < event.endTime.getTime() &&
              candidate.endTime.getTime() > event.startTime.getTime()

            if (!overlapsVertically) return closestLeft
            return closestLeft === null ? candidateLayout.left : Math.min(closestLeft, candidateLayout.left)
          }, null)

          const safeTextWidth = blockingLeft === null
            ? 100
            : Math.max(8, Math.min(100, ((blockingLeft - layout.left - gap) / layout.width) * 100))

          layouts.set(event.id, { ...layout, contentWidth: safeTextWidth })
        })
      })
    })

    return layouts
  }, [days, events, isMobileViewport])

  useEffect(() => {
    if (!isShowingToday) return

    const scrollToCurrentTime = () => {
      const now = new Date()
      const currentHourPosition = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT

      if (!containedScroll) {
        const calendarTop = scrollContainerRef.current
          ? scrollContainerRef.current.getBoundingClientRect().top + window.scrollY
          : window.scrollY
        const targetY = Math.max(0, calendarTop + currentHourPosition - window.innerHeight * 0.42)
        window.scrollTo({ top: targetY, behavior: 'auto' })
        return
      }

      const scrollEl = scrollContainerRef.current
      if (!scrollEl) return

      const centeredPosition = currentHourPosition - scrollEl.clientHeight * 0.42
      const maxScrollTop = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight)
      scrollEl.scrollTop = Math.max(0, Math.min(maxScrollTop, centeredPosition))
    }

    let firstFrame = 0
    let secondFrame = 0
    firstFrame = window.requestAnimationFrame(() => {
      scrollToCurrentTime()
      secondFrame = window.requestAnimationFrame(scrollToCurrentTime)
    })

    return () => {
      window.cancelAnimationFrame(firstFrame)
      window.cancelAnimationFrame(secondFrame)
    }
  }, [containedScroll, isShowingToday, currentDate, view, HOUR_HEIGHT])

  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [isResizingTop, setIsResizingTop] = useState(false);
  const [isMoving, setIsMoving] = useState<string | null>(null);
  const [initialMouseY, setInitialMouseY] = useState(0);
  const [initialMouseX, setInitialMouseX] = useState(0);
  const [initialStartTime, setInitialStartTime] = useState<Date | null>(null);
  const [initialEndTime, setInitialEndTime] = useState<Date | null>(null);
  const [initialDuration, setInitialDuration] = useState(0);
  const [draftResizing, setDraftResizing] = useState(false);
  const [draftResizingTop, setDraftResizingTop] = useState(false);
  const [draftHintVisible, setDraftHintVisible] = useState(false);
  const [descDialogEvent, setDescDialogEvent] = useState<Event | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [mobileEditEvent, setMobileEditEvent] = useState<Event | null>(null);
  const [mobileEditOriginalEvent, setMobileEditOriginalEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (draftEvent) {
      setDraftHintVisible(true);
      const timer = setTimeout(() => setDraftHintVisible(false), 5000);
      return () => clearTimeout(timer);
    } else {
      setDraftHintVisible(false);
    }
  }, [draftEvent])

  const handleMobileSave = () => {
    if (!mobileEditEvent) return;
    const finalEvent = events.find(ev => ev.id === mobileEditEvent.id);
    if (!finalEvent) return;
    if (findTimedEventConflict(events, finalEvent, finalEvent.id)) {
      notifyCalendarConflict();
      return;
    }
    if (onEventUpdate) {
      onEventUpdate(finalEvent.id, {
        startTime: finalEvent.startTime,
        endTime: finalEvent.endTime,
      });
    }
    setMobileEditEvent(null);
    setMobileEditOriginalEvent(null);
    window.dispatchEvent(new CustomEvent('adonai:draft-state-change', { detail: { active: false } }));
  };

  const handleMobileCancel = () => {
    if (mobileEditOriginalEvent) {
      setEvents(prev => prev.map(ev => ev.id === mobileEditOriginalEvent.id ? mobileEditOriginalEvent : ev));
    }
    setMobileEditEvent(null);
    setMobileEditOriginalEvent(null);
    window.dispatchEvent(new CustomEvent('adonai:draft-state-change', { detail: { active: false } }));
  };

  const ghostRef = useRef<HTMLDivElement>(null);
  const isHoveringSidebarRef = useRef<boolean>(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialCalendarScrollTopRef = useRef(0);
  const lastDragClientYRef = useRef<number | null>(null);
  const autoScrollFrameRef = useRef<number | null>(null);
  const mobileEditTimerRef = useRef<number | null>(null);
  
  // Track whether the user is dragging so that mouseup/click after drag doesn't open the dialog
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const handleExternalDragEnd = () => {
      // Small buffer to prevent click event after touch drag drop
      isDraggingRef.current = true;
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 300);
    };
    window.addEventListener('adonai:external-drag-end', handleExternalDragEnd);
    return () => window.removeEventListener('adonai:external-drag-end', handleExternalDragEnd);
  }, []);

  const handleResizeStart = (e: React.MouseEvent, event: Event, isTop: boolean) => {
    e.stopPropagation();
    isDraggingRef.current = true;
    setIsResizing(event.id);
    setIsResizingTop(isTop);
    setInitialMouseY(e.pageY);
    initialCalendarScrollTopRef.current = getCalendarScrollTop();
    setInitialStartTime(new Date(event.startTime));
    setInitialEndTime(new Date(event.endTime));
  };

  const getCalendarScrollTop = useCallback(() => {
    if (containedScroll) return scrollContainerRef.current?.scrollTop || 0;
    return window.scrollY || 0;
  }, [containedScroll]);

  const getDragScrollOffset = useCallback(() => {
    return getCalendarScrollTop() - initialCalendarScrollTopRef.current;
  }, [getCalendarScrollTop]);

  const hideTemporaryMobileEdit = useCallback(() => {
    if (mobileEditTimerRef.current) {
      window.clearTimeout(mobileEditTimerRef.current);
      mobileEditTimerRef.current = null;
    }
    setMobileEditEvent(null);
    setMobileEditOriginalEvent(null);
    window.dispatchEvent(new CustomEvent('adonai:draft-state-change', { detail: { active: false } }));
  }, []);

  const showTemporaryMobileEdit = useCallback((event: Event) => {
    if (mobileEditTimerRef.current) {
      window.clearTimeout(mobileEditTimerRef.current);
    }
    setMobileEditEvent(event);
    setMobileEditOriginalEvent(null);
    window.dispatchEvent(new CustomEvent('adonai:draft-state-change', { detail: { active: true } }));
    mobileEditTimerRef.current = window.setTimeout(() => {
      hideTemporaryMobileEdit();
    }, 3000);
  }, [hideTemporaryMobileEdit]);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
    lastDragClientYRef.current = null;
  }, []);

  const autoScrollCalendar = useCallback((clientY: number) => {
    lastDragClientYRef.current = clientY;
    if (autoScrollFrameRef.current !== null) return;

    const step = () => {
      const lastY = lastDragClientYRef.current;
      const scrollEl = scrollContainerRef.current;
      if (lastY === null || !scrollEl) {
        autoScrollFrameRef.current = null;
        return;
      }

      const rect = containedScroll
        ? scrollEl.getBoundingClientRect()
        : { top: 0, bottom: window.innerHeight } as DOMRect;
      const edgeSize = Math.min(120, Math.max(72, (rect.bottom - rect.top) * 0.18));
      const topDistance = lastY - rect.top;
      const bottomDistance = rect.bottom - lastY;
      let velocity = 0;

      if (topDistance < edgeSize) {
        velocity = -Math.round(((edgeSize - Math.max(0, topDistance)) / edgeSize) * 18);
      } else if (bottomDistance < edgeSize) {
        velocity = Math.round(((edgeSize - Math.max(0, bottomDistance)) / edgeSize) * 18);
      }

      if (velocity !== 0) {
        if (containedScroll) {
          const maxScrollTop = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
          scrollEl.scrollTop = Math.max(0, Math.min(maxScrollTop, scrollEl.scrollTop + velocity));
        } else {
          window.scrollBy({ top: velocity, behavior: 'auto' });
        }
        autoScrollFrameRef.current = window.requestAnimationFrame(step);
        return;
      }

      autoScrollFrameRef.current = null;
    };

    autoScrollFrameRef.current = window.requestAnimationFrame(step);
  }, [containedScroll]);

  // Cleanup mobile edit draft mode when view or currentDate changes.
  useEffect(() => {
    if (mobileEditEvent) {
      hideTemporaryMobileEdit();
    }
  }, [view, currentDate]);

  useEffect(() => {
    return () => {
      if (mobileEditTimerRef.current) {
        window.clearTimeout(mobileEditTimerRef.current);
      }
      stopAutoScroll();
    };
  }, [stopAutoScroll]);

  useEffect(() => {
    if (!isMoving && !isResizing) return;
    if (mobileEditTimerRef.current) {
      window.clearTimeout(mobileEditTimerRef.current);
      mobileEditTimerRef.current = null;
    }
  }, [isMoving, isResizing]);

  const currentEventsRef = useRef(events);
  useEffect(() => {
    currentEventsRef.current = events;
  }, [events]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      // Prevent scrolling when dragging on mobile
      if ('touches' in e && (isResizing || isMoving) && e.cancelable) {
        e.preventDefault();
      }

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const pageX = 'touches' in e ? e.touches[0].pageX : e.pageX;
      const pageY = 'touches' in e ? e.touches[0].pageY : e.pageY;
      autoScrollCalendar(clientY);

      // Use initialEventsRef.current for all collision logic to prevent infinite render loops and compounding errors
      const baseEvents = initialEventsRef.current.length > 0 ? initialEventsRef.current : events;

      if (isResizing && initialStartTime && initialEndTime) {
        isDraggingRef.current = true;
        const deltaY = pageY - initialMouseY + getDragScrollOffset();
        const minutesDiff = snapMinutes((deltaY / HOUR_HEIGHT) * 60);
        
        const event = baseEvents.find(ev => ev.id === isResizing);
        if (!event) return;

        if (isResizingTop) {
          let newStartTime = new Date(initialStartTime.getTime() + minutesDiff * 60000);
          
          // Mantener duracion minima de 5 minutos para que la tarea no desaparezca ni se trabe
          const maxStartTime = new Date(initialEndTime.getTime() - MIN_EVENT_DURATION_MINUTES * 60000);
          if (newStartTime > maxStartTime) newStartTime = maxStartTime;

          setEvents(baseEvents.map(ev => ev.id === isResizing ? { ...ev, startTime: newStartTime } : ev));
        } else {
          let newEndTime = new Date(initialEndTime.getTime() + minutesDiff * 60000);
          
          // Mantener duracion minima de 5 minutos
          const minEndTime = new Date(initialStartTime.getTime() + MIN_EVENT_DURATION_MINUTES * 60000);
          if (newEndTime < minEndTime) newEndTime = minEndTime;

          setEvents(baseEvents.map(ev => ev.id === isResizing ? { ...ev, endTime: newEndTime } : ev));
        }
      } else if (isMoving && initialStartTime) {
        const deltaY = pageY - initialMouseY + getDragScrollOffset();
        const deltaX = Math.abs(pageX - initialMouseX);
        
        if (Math.abs(deltaY) > 3 || deltaX > 3) {
          isDraggingRef.current = true;
        }

        if (!isDraggingRef.current) return;

        // Ghost logic - always visible while dragging calendar events
        if (isMoving && ghostRef.current) {
          const isMobile = window.matchMedia('(max-width: 767px)').matches;
          if (isMobile) {
            ghostRef.current.style.display = 'none';
            ghostRef.current.style.opacity = '0';
          } else {
            ghostRef.current.style.transform = `translate(${clientX - 70}px, ${clientY - 20}px)`;
            ghostRef.current.style.display = 'flex';
            ghostRef.current.style.opacity = '1';
          }

          // Detect if hovering the sidebar drop target
          const sidebarEl = document.querySelector('[data-sidebar-droptarget]') as HTMLElement;
          if (sidebarEl) {
            const sidebarRect = sidebarEl.getBoundingClientRect();
            isHoveringSidebarRef.current = clientX >= sidebarRect.left && clientX <= sidebarRect.right && clientY >= sidebarRect.top && clientY <= sidebarRect.bottom;
          } else {
            isHoveringSidebarRef.current = clientX < 320;
          }

          // Dim original event element while dragging (or style as draft on mobile)
          const originalCol = document.querySelector(`[data-event-id="${isMoving}"]`) as HTMLElement;
          if (originalCol) {
            if (isMobile) {
              originalCol.style.opacity = '0.95';
              originalCol.style.border = '2px dashed rgba(255, 255, 255, 0.7)';
              originalCol.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.4)';
              originalCol.style.transform = 'none';
            } else {
              originalCol.style.opacity = isHoveringSidebarRef.current ? '0' : '0.3';
              originalCol.style.transform = isHoveringSidebarRef.current ? 'scale(0.8)' : 'none';
            }
          }
        }

        const minutesDiff = snapMinutes((deltaY / HOUR_HEIGHT) * 60);
        
        const columns = document.querySelectorAll('.day-column');
        let targetDayIndex = days.findIndex(d => d.toDateString() === initialStartTime.toDateString());
        if (targetDayIndex < 0) targetDayIndex = 0;
        
        columns.forEach((col) => {
          const rect = col.getBoundingClientRect();
          if (clientX >= rect.left && clientX <= rect.right) {
            const index = col.getAttribute('data-day-index');
            if (index !== null) targetDayIndex = parseInt(index);
          }
        });

        const targetDay = days[targetDayIndex];
        const newStartTimeBase = new Date(targetDay);
        newStartTimeBase.setHours(initialStartTime.getHours(), initialStartTime.getMinutes(), 0, 0);
        const movedStartCandidate = new Date(newStartTimeBase.getTime() + minutesDiff * 60000);
        const stableDuration = Math.max(initialDuration, MIN_EVENT_DURATION_MINUTES) * 60000;
        const { startTime: movedStartTime, endTime: movedEndTime } = clampEventWithinDay(movedStartCandidate, stableDuration);

        setEvents(baseEvents.map(ev =>
          ev.id === isMoving ? { ...ev, startTime: movedStartTime, endTime: movedEndTime } : ev
        ));
      }
    };

    const handleMouseUp = (e: MouseEvent | TouchEvent) => {
      if (isResizing || isMoving) {
        if (isMoving && isHoveringSidebarRef.current) {
          // Drop on sidebar - unschedule the event (convert to allDay task)
          const movingId = isMoving;
          setEvents(prev => prev.map(ev => 
            ev.id === movingId ? { ...ev, isAllDay: true, startTime: new Date(new Date().setHours(0,0,0,0)), endTime: new Date(new Date().setHours(0,0,0,0)) } : ev
          ));
          if (onEventUpdate) {
            onEventUpdate(movingId, { isAllDay: true });
          }
          // Reset visual state of original event element
          const originalCol = document.querySelector(`[data-event-id="${movingId}"]`);
          if (originalCol) {
            (originalCol as HTMLElement).style.opacity = '1';
            (originalCol as HTMLElement).style.transform = 'none';
          }
        } else {
          const activeId = isMoving || isResizing;
          const changedEvent = activeId ? currentEventsRef.current.find(ev => ev.id === activeId) : undefined;
          const initial = activeId ? initialEventsRef.current.find(ev => ev.id === activeId) : undefined;
          const changed =
            changedEvent &&
            initial &&
            (initial.startTime.getTime() !== changedEvent.startTime.getTime() ||
              initial.endTime.getTime() !== changedEvent.endTime.getTime());

          const isMobile = window.matchMedia('(max-width: 767px)').matches;
          if (isMobile) {
            if (changedEvent) {
              if (changed && findTimedEventConflict(currentEventsRef.current, changedEvent, changedEvent.id)) {
                notifyCalendarConflict();
                if (initial) {
                  setEvents(prev => prev.map(ev => ev.id === changedEvent.id ? initial : ev));
                }
              } else {
                if (onEventUpdate && changed) {
                  onRegisterPendingDrop?.(changedEvent);
                  onEventUpdate(changedEvent.id, {
                    startTime: changedEvent.startTime,
                    endTime: changedEvent.endTime,
                  });
                }
                showTemporaryMobileEdit(changedEvent);
              }
            }
          } else {
            if (onEventUpdate && changedEvent && changed) {
              if (findTimedEventConflict(currentEventsRef.current, changedEvent, changedEvent.id)) {
                notifyCalendarConflict();
                if (initial) {
                  setEvents(prev => prev.map(ev => ev.id === changedEvent.id ? initial : ev));
                }
              } else {
                onRegisterPendingDrop?.(changedEvent);
                onEventUpdate(changedEvent.id, {
                  startTime: changedEvent.startTime,
                  endTime: changedEvent.endTime,
                });
              }
            }
          }
        }
        
        if (ghostRef.current) {
          ghostRef.current.style.display = 'none';
          ghostRef.current.style.opacity = '0';
        }
        // Restore original event opacity in all cases (dragged within calendar)
        if (isMoving) {
          const originalEl = document.querySelector(`[data-event-id="${isMoving}"]`) as HTMLElement;
          if (originalEl) { 
            originalEl.style.opacity = '1'; 
            originalEl.style.transform = 'none';
            originalEl.style.border = '';
            originalEl.style.boxShadow = '';
          }
        }
        isHoveringSidebarRef.current = false;
        
        setIsResizing(null);
        setIsMoving(null);
        stopAutoScroll();
        initialEventsRef.current = [];
        // Clear dragging flag after a delay to prevent click from firing
        setTimeout(() => { isDraggingRef.current = false; }, 300);
      }
    };

    if (isResizing || isMoving) {
      if (initialEventsRef.current.length === 0) {
        initialEventsRef.current = [...events];
      }
      // Prevent text selection while resizing/moving
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
      window.addEventListener('touchcancel', handleMouseUp);
    } else {
      document.body.style.userSelect = '';
    }
    return () => {
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
      window.removeEventListener('touchcancel', handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResizing, isMoving, initialMouseX, initialMouseY, initialStartTime, initialEndTime, initialDuration, onEventUpdate, HOUR_HEIGHT, days, autoScrollCalendar, getDragScrollOffset, onRegisterPendingDrop, showTemporaryMobileEdit, stopAutoScroll]);

  // Draft resize handler - uses refs to avoid re-creating effect on each position update
  const draftEventRef = useRef(draftEvent)
  draftEventRef.current = draftEvent
  useEffect(() => {
    if (!draftResizing || !draftEventRef.current || !initialStartTime || !initialEndTime) return
    document.body.style.userSelect = 'none'
    const handleMove = (clientY: number) => {
      const de = draftEventRef.current
      if (!de) return
      const deltaY = clientY - initialMouseY
      const minutesDiff = Math.round((deltaY / HOUR_HEIGHT) * 60 / 5) * 5
      if (draftResizingTop) {
        let newStart = new Date(initialStartTime.getTime() + minutesDiff * 60000)
        const maxStart = new Date(initialEndTime.getTime() - 5 * 60000)
        if (newStart > maxStart) newStart = maxStart
        if (updateDraftTime) updateDraftTime(newStart, de.endTime)
      } else {
        let newEnd = new Date(initialEndTime.getTime() + minutesDiff * 60000)
        const minEnd = new Date(initialStartTime.getTime() + 5 * 60000)
        if (newEnd < minEnd) newEnd = minEnd
        if (updateDraftTime) updateDraftTime(de.startTime, newEnd)
      }
    }
    const handleMouseMove = (e: MouseEvent) => handleMove(e.pageY)
    const handleTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault()
      handleMove(e.touches[0].pageY)
    }
    const handleMouseUp = () => {
      setDraftResizing(false)
      document.body.style.userSelect = ''
    }
    const handleTouchEnd = () => {
      setDraftResizing(false)
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)
    window.addEventListener('touchcancel', handleTouchEnd)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchEnd)
      document.body.style.userSelect = ''
    }
  }, [draftResizing, draftResizingTop, initialMouseY, initialStartTime, initialEndTime, updateDraftTime, HOUR_HEIGHT])

  const movingEventObj = useMemo(() => {
    return isMoving ? events.find(e => e.id === isMoving) : null;
  }, [isMoving, events]);

  const handleRootWheelCapture = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!containedScroll) return
    const target = e.target as Node | null
    if (!target) return

    const root = e.currentTarget as HTMLElement | null
    const calendarEl = scrollContainerRef.current

    if (!root || !root.contains(target)) return

    const scrollTarget = calendarEl
    if (!scrollTarget) return
    if (e.deltaY === 0) return

    const canScrollVertically = scrollTarget.scrollHeight > scrollTarget.clientHeight + 1
    if (!canScrollVertically) return

    const maxScrollTop = scrollTarget.scrollHeight - scrollTarget.clientHeight
    const nextScrollTop = Math.max(0, Math.min(maxScrollTop, scrollTarget.scrollTop + e.deltaY))
    if (nextScrollTop === scrollTarget.scrollTop) return

    scrollTarget.scrollTop = nextScrollTop
    e.preventDefault()
    e.stopPropagation()
  }, [containedScroll])

  const handleCalendarScroll = useCallback(() => {
    if (!mobileEditEvent || isMoving || isResizing) return;
    hideTemporaryMobileEdit();
  }, [hideTemporaryMobileEdit, isMoving, isResizing, mobileEditEvent]);

  useEffect(() => {
    if (containedScroll || !mobileEditEvent) return;
    window.addEventListener('scroll', handleCalendarScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleCalendarScroll);
  }, [containedScroll, handleCalendarScroll, mobileEditEvent]);

  return (
    <Card
      className={cn(
        "flex w-full flex-col rounded-none border-x-0 border-outline-variant/20 bg-card shadow-none lg:rounded-none lg:border-x-0",
        containedScroll ? "h-full" : "h-auto overflow-visible",
        className
      )}
      onWheelCapture={handleRootWheelCapture}
    >
      {/* Ghost is rendered via portal at body level so backdrop-blur on Card doesn't clip it */}

      {!hideGridHeader && (
        <div
          className={cn(
            "sticky z-20 hidden overflow-x-auto border-b border-outline-variant/10 bg-background sm:flex",
            containedScroll ? "top-0" : "top-[57px] lg:top-[57px]"
          )}
        >
          <div className="w-12 lg:w-16 flex-shrink-0 border-r border-outline-variant/10 bg-background sticky left-0 z-30" />
          <div
            className={cn(
              "flex-1 grid bg-background min-w-0",
              view === "week"
                ? "grid-cols-7 md:min-w-[620px] lg:min-w-0"
                : view === "3day"
                  ? "grid-cols-3 md:min-w-[360px] lg:min-w-0"
                  : "grid-cols-1"
            )}
          >
            {days.map((day, idx) => (
              <div key={idx} className="min-h-[58px] p-2.5 lg:p-3 text-center border-r border-outline-variant/10 last:border-r-0 bg-background">
                <span className="text-[11px] font-black uppercase tracking-wide text-muted-foreground block mb-1">
                  {format(day, "EEE", { locale: es }).toUpperCase().replace('.', '')}
                </span>
                <span className={cn(
                  "inline-flex items-center justify-center h-8 min-w-8 rounded-lg px-2 text-sm font-black transition-all",
                  day.toDateString() === new Date().toDateString() ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-transparent text-foreground/80"
                )}>
                  {day.getDate()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid Body */}
      <div
        ref={scrollContainerRef}
        className={cn(
          "min-h-0",
          containedScroll ? "flex-1 overflow-auto overscroll-contain" : "overflow-visible"
        )}
        style={{ touchAction: 'pan-y' }}
        data-calendar-scroll="true"
        onScroll={handleCalendarScroll}
      >
        <div className="relative flex w-full" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
          {/* Time Labels - Sticky Left */}
          <div className="w-12 lg:w-16 flex-shrink-0 border-r border-outline-variant/20 bg-card sticky left-0 z-20">
            {hours.map((hour) => (
              <div key={hour} className="relative" style={{ height: `${HOUR_HEIGHT}px` }}>
                <span className="absolute -top-2 right-1.5 lg:right-2 text-[10px] lg:text-[12px] font-black text-foreground uppercase tracking-tighter drop-shadow-sm">
                  {hour === 0 ? "" : format(new Date().setHours(hour, 0, 0, 0), "h a", { locale: es })}
                </span>
              </div>
            ))}
          </div>

          {/* Grid Columns */}
          <div
            className={cn(
              "flex-1 grid relative min-w-0",
              view === "week"
                ? "grid-cols-7 md:min-w-[620px] lg:min-w-0"
                : view === "3day"
                  ? "grid-cols-3 md:min-w-[360px] lg:min-w-0"
                  : "grid-cols-1"
            )}
          >
             {/* Horizontal Grid Lines */}
             {hours.map((hour) => (
               <div key={hour} className="absolute w-full" style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}>
                 <div className="w-full h-px bg-outline-variant/20" />
                 {/* 15 min grid lines */}
                 {[15, 30, 45].map((mins) => (
                   <div 
                     key={mins} 
                     className="absolute w-full h-px border-b border-outline-variant/10 border-dashed" 
                     style={{ top: `${(mins / 60) * HOUR_HEIGHT}px` }} 
                   />
                 ))}
               </div>
             ))}

             {/* Event Slots */}
             {days.map((day, dayIdx) => (
               <div 
                 key={dayIdx} 
                 data-day-index={dayIdx}
                 className="relative h-full border-r border-outline-variant/20 last:border-r-0 day-column"
               >
                 {hours.map((hour) => (
                   <div
                     key={hour}
                     className="relative"
                     style={{ height: `${HOUR_HEIGHT}px` }}
                   >
                     {/* Render 4 slots of 15 minutes each for better hover and selection */}
                     {[0, 15, 30, 45].map((mins) => (
                       <div
                         key={mins}
                         className="cursor-pointer hover:bg-white/10 transition-colors group relative"
                         data-cell-day={day.toISOString()}
                         data-cell-hour={hour}
                         data-cell-mins={mins}
                         style={{ height: `${HOUR_HEIGHT / 4}px` }}
                         onDragOver={(e) => e.preventDefault()}
                         onDragEnter={() => {
                           setPreviewTime?.({ day, hour, minutes: mins });
                         }}
                         onDrop={(e) => {
                           onDrop(day, hour, mins);
                           setTimeout(() => { isDraggingRef.current = false; }, 150);
                         }}
                           onClick={(e) => {
                             if (mobileEditEvent) return;
                             if (isDraggingRef.current) return;
                             const d = new Date(day)
                             d.setHours(hour, mins, 0, 0)
                             if (onCellClick) onCellClick(d)
                             if (startDraft) {
                               const dayEvents = events.filter(ev => isSameDay(ev.startTime, day) && ev.startTime >= startOfDay(day) && ev.startTime < endOfDay(day))
                               const sorted = [...dayEvents].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
                               let slotStart = new Date(d)
                               for (const ev of sorted) {
                                 if (d >= ev.startTime && d < ev.endTime) {
                                   slotStart = new Date(ev.endTime)
                                   break
                                 }
                               }
                               let slotEnd = addMinutes(slotStart, 30)
                               const nextEvent = sorted.find(ev => ev.startTime >= slotStart)
                               if (nextEvent) {
                                 slotEnd = new Date(Math.min(slotEnd.getTime(), nextEvent.startTime.getTime()))
                               }
                               startDraft(slotStart, slotEnd)
                             } else {
                               openCreateDialog(d, addMinutes(d, 30), d)
                             }
                            }}
                        >
                          {/* subtle hint on hover */}
                         <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all pointer-events-none">
                           <div className="w-full h-px bg-primary/20 absolute top-1/2 -translate-y-1/2" />
                           <span className="text-[9px] font-black uppercase tracking-widest text-primary/70 bg-surface-container/90 px-3 py-1 rounded-full relative z-10 shadow-sm backdrop-blur-md">
                              Toca para crear
                           </span>
                         </div>
                       </div>
                     ))}
                   </div>
                 ))}

                {/* Drag Preview (Ghost) */}
                {draggedEvent && previewTime && isSameDay(previewTime.day, day) && (
                  <div
                    className={cn(
                      "absolute inset-x-1 rounded-xl p-2 text-[10px] font-bold text-white shadow-lg z-20 opacity-40 pointer-events-none border-2 border-dashed border-white/50",
                      draggedEvent.color && !draggedEvent.color.startsWith('#') && !draggedEvent.color.startsWith('var') && getColorClasses(draggedEvent.color).bg
                    )}
                    style={{
                      top: `${(previewTime.hour + (previewTime.minutes || 0) / 60) * HOUR_HEIGHT}px`,
                      height: `${(draggedEvent.isAllDay ? 10/60 : (draggedEvent.endTime.getTime() - draggedEvent.startTime.getTime()) / (1000 * 60 * 60)) * HOUR_HEIGHT}px`,
                      backgroundColor: (draggedEvent.color && (draggedEvent.color.startsWith('#') || draggedEvent.color.startsWith('var'))) ? hexToRgba(draggedEvent.color, 0.65) : undefined
                    }}
                  >
                    <p className="truncate font-semibold opacity-60 italic">{draggedEvent.title}</p>
                  </div>
                )}

                {/* Events for this day - exclude allDay (those live in the sidebar task list) */}
                {events
                  .filter((event) => !event.isAllDay && isSameDay(event.startTime, day))
                  .map((event) => {
                    const startHour = event.startTime.getHours() + event.startTime.getMinutes() / 60
                    const duration = Math.max(0.25, (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60 * 60))
                    const layout = eventLayouts.get(event.id) || { left: 0, width: 98, zIndex: 20, contentWidth: 100 }
                    const isVeryShortEvent = duration < 0.35
                    const eventTitleFontSize = isVeryShortEvent
                      ? (isMobileViewport ? '8.5px' : '10px')
                      : isMobileViewport
                        ? (hourZoom >= 240 ? '12px' : hourZoom >= 120 ? '11px' : '10.5px')
                        : (hourZoom >= 240 ? '14.3px' : hourZoom >= 120 ? '13.2px' : '12.1px')
                    const eventMetaFontSize = isMobileViewport
                      ? (hourZoom >= 160 ? '9.9px' : '9.4px')
                      : (hourZoom >= 160 ? '11px' : '9.9px')
                    const eventZIndex =
                      isResizing === event.id || isMoving === event.id
                        ? 50
                        : mobileEditEvent?.id === event.id
                          ? 40
                          : layout.zIndex
                    
                    return (
                      <div
                        key={event.id}
                        data-event-id={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          // If the user just finished dragging, don't open the dialog
                          if (mobileEditEvent?.id === event.id) return;
                          if (isDraggingRef.current) return;
                          onEventClick(event);
                        }}
                          className={cn(
                            "absolute rounded-xl hover:brightness-110 overflow-hidden group select-none",
                            "transition-[opacity,transform] duration-200 ease-out",
                            isVeryShortEvent ? "px-1.5 py-0.5" : isMobileViewport ? "px-1.5 py-1" : "px-2 py-1.5",
                            duration < 0.35 ? "font-semibold" : "font-bold",
                            event.color && !event.color.startsWith('#') && !event.color.startsWith('var') && cn(getColorClasses(event.color).bg, getColorClasses(event.color).text, "dark:text-white"),
                            !dragDisabled && "cursor-grab active:cursor-grabbing",
                            event.completed && "opacity-50 grayscale-[0.3]",
                            !(isMoving === event.id || isResizing === event.id || mobileEditEvent?.id === event.id) && "z-10",
                            isResizing === event.id && "z-50 shadow-xl brightness-125 ring-2 ring-white/50 transition-none",
                            isMoving === event.id && "z-50 shadow-xl scale-[1.02] brightness-110 ring-2 ring-white/30 transition-none cursor-grabbing",
                            isDraggingRef.current && "transition-none",
                            mobileEditEvent?.id === event.id && "z-40 shadow-2xl border-2 border-dashed border-white/80 ring-2 ring-white/20 brightness-[1.05]"
                          )}
                          style={{
                            top: `${startHour * HOUR_HEIGHT + 2}px`,
                            left: `${layout.left + 0.5}%`,
                            width: `${layout.width}%`,
                            height: `${Math.max(isMobileViewport ? 22 : 18, duration * HOUR_HEIGHT - 4)}px`,
                            zIndex: eventZIndex,
                            userSelect: 'none',
                            touchAction: (isMoving === event.id || isResizing === event.id) ? 'none' : 'pan-y',
                            ...getEventStyles(event.color)
                          }}
                          onMouseDown={(e) => {
                            if (e.button !== 0) return;
                            if (dragDisabled) return;
                            // On mobile, dragging is handled by onTouchStart with long-press timer
                            if (window.matchMedia('(max-width: 767px)').matches) return;
                            e.stopPropagation();
                            isDraggingRef.current = false;
                            setIsMoving(event.id);
                            setInitialMouseY(e.pageY);
                            setInitialMouseX(e.pageX);
                            initialCalendarScrollTopRef.current = getCalendarScrollTop();
                            setInitialStartTime(new Date(event.startTime));
                            setInitialDuration((event.endTime.getTime() - event.startTime.getTime()) / 60000);
                          }}
                          onTouchStart={(e) => {
                            if (dragDisabled) return;
                            e.stopPropagation();
                            const touch = e.touches[0];
                            const startX = touch.pageX;
                            const startY = touch.pageY;
                            
                            const isMobile = window.matchMedia('(max-width: 767px)').matches;
                            
                            if (isMobile && mobileEditEvent?.id === event.id) {
                              if (e.cancelable) e.preventDefault();
                              isDraggingRef.current = false;
                              setIsMoving(event.id);
                              setInitialMouseY(startY);
                              setInitialMouseX(startX);
                              initialCalendarScrollTopRef.current = getCalendarScrollTop();
                              setInitialStartTime(new Date(event.startTime));
                              setInitialDuration((event.endTime.getTime() - event.startTime.getTime()) / 60000);
                            } else {
                              // Store start coords in the ref for tolerance check in touchmove
                              longPressTimerRef._startX = startX;
                              longPressTimerRef._startY = startY;
                              longPressTimerRef.current = setTimeout(() => {
                                longPressTimerRef.current = null;
                                isDraggingRef.current = false;
                                setIsMoving(event.id);
                                setInitialMouseY(startY);
                                setInitialMouseX(startX);
                                initialCalendarScrollTopRef.current = getCalendarScrollTop();
                                setInitialStartTime(new Date(event.startTime));
                                setInitialDuration((event.endTime.getTime() - event.startTime.getTime()) / 60000);
                                
                                if (isMobile) {
                                  setMobileEditEvent(event);
                                  setMobileEditOriginalEvent({ ...event });
                                  window.dispatchEvent(new CustomEvent('adonai:draft-state-change', { detail: { active: true } }));
                                }
                                
                                if (window.navigator && window.navigator.vibrate) {
                                  window.navigator.vibrate(50);
                                }
                              }, 650);
                            }
                          }}
                          onTouchEnd={() => {
                            if (longPressTimerRef.current) {
                              clearTimeout(longPressTimerRef.current);
                              longPressTimerRef.current = null;
                            }
                          }}
                          onTouchMove={(e) => {
                            if (!isMoving && longPressTimerRef.current) {
                              const touch = e.touches[0];
                              const dx = Math.abs(touch.pageX - (longPressTimerRef._startX ?? touch.pageX));
                              const dy = Math.abs(touch.pageY - (longPressTimerRef._startY ?? touch.pageY));
                              // Only cancel if finger moves more than 12px (ignore natural trembling)
                              if (dx > 12 || dy > 12) {
                                clearTimeout(longPressTimerRef.current);
                                longPressTimerRef.current = null;
                              }
                            }
                          }}
                          onContextMenu={(e) => e.preventDefault()}
                        >
                          {/* Top Resize Handle */}
                          <div 
                            className={cn(
                              "absolute top-0 left-1/2 -translate-x-1/2 cursor-ns-resize z-30 flex items-start justify-center transition-opacity w-14",
                              duration < 0.35 ? "h-3.5" : "h-5",
                              (isMoving === event.id || isResizing === event.id || mobileEditEvent?.id === event.id)
                                ? "opacity-100"
                                : "opacity-0 md:opacity-0 md:group-hover:opacity-100 pointer-events-none md:pointer-events-auto"
                            )}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              // On mobile, resizing is handled by onTouchStart
                              if (window.matchMedia('(max-width: 767px)').matches) return;
                              isDraggingRef.current = false;
                              setIsResizing(event.id);
                              setIsResizingTop(true);
                              setInitialMouseY(e.pageY);
                              initialCalendarScrollTopRef.current = getCalendarScrollTop();
                              setInitialStartTime(new Date(event.startTime));
                              setInitialEndTime(new Date(event.endTime));
                            }}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              const touch = e.touches[0];
                              isDraggingRef.current = false;
                              setIsResizing(event.id);
                              setIsResizingTop(true);
                              setInitialMouseY(touch.pageY);
                              initialCalendarScrollTopRef.current = getCalendarScrollTop();
                              setInitialStartTime(new Date(event.startTime));
                              setInitialEndTime(new Date(event.endTime));
                            }}
                          >
                            <div className={cn(
                              "rounded-full bg-white/85 shadow-md transition-all",
                              duration < 0.35 ? "w-8 h-1 mt-0.5" : "w-10 h-1.5 mt-1"
                            )} />
                          </div>

                          <div className={cn("flex items-start h-full gap-1 px-0.5", isVeryShortEvent ? "flex-row items-start py-0" : "flex-row py-0.5")}>
                            <div
                              className="min-w-0 flex flex-1 flex-col items-start justify-start leading-tight"
                              style={{ width: `${layout.contentWidth}%` }}
                            >
                              <p
                                className={cn(
                                  "m-0 break-words text-left",
                                  isMobileViewport ? "leading-[1.16] drop-shadow-none" : "leading-[1.14] drop-shadow-sm",
                                  isMobileViewport && (duration < 0.5 ? "line-clamp-2" : duration < 0.9 ? "line-clamp-3" : "line-clamp-4"),
                                  event.completed && "line-through"
                                )}
                                style={{ fontSize: eventTitleFontSize, color: 'inherit' }}
                              >
                                {event.title}
                              </p>
                              {!event.isAllDay && duration > 0.3 && (
                                <p className="mt-[1px] opacity-85 leading-tight drop-shadow-sm text-left"
                                  style={{ fontSize: eventMetaFontSize, color: 'inherit' }}>
                                  {(() => {
                                    const totalMin = Math.round(duration * 60);
                                    if (totalMin < 60) return `${totalMin} min`;
                                    const h = Math.floor(totalMin / 60);
                                    const m = totalMin % 60;
                                    return m === 0 ? `${h}h` : `${h}h ${m}min`;
                                  })()}
                                </p>
                              )}
                              {event.description && duration > 0.6 && cleanDescription(event.description) && (
                                <>
                                  <p
                                    className={cn("mt-0.5 opacity-70 whitespace-pre-line text-left", isMobileViewport ? "leading-[1.15] line-clamp-2" : "leading-snug line-clamp-3")}
                                    style={{ fontSize: eventMetaFontSize, color: 'inherit' }}
                                  >
                                    <span
                                      className="cursor-pointer hover:opacity-100 hover:underline hover:decoration-dotted hover:decoration-1 hover:underline-offset-2 transition-all inline"
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onMouseUp={(e) => e.stopPropagation()}
                                      onTouchStart={(e) => e.stopPropagation()}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditDescription(cleanDescription(event.description || ''));
                                        setDescDialogEvent(event);
                                      }}
                                    >
                                      {cleanDescription(event.description)}
                                    </span>
                                  </p>
                                  {/* Wrapper stops any portal click from bubbling to the event chip */}
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onMouseUp={(e) => e.stopPropagation()}
                                  >
                                    <Dialog open={descDialogEvent?.id === event.id} onOpenChange={(open) => { if (!open) setDescDialogEvent(null); }}>
                                      <DialogContent
                                        className="w-full max-w-[430px] rounded-[20px] shadow-2xl p-0 outline-none overflow-hidden border-0"
                                      >
                                      <DialogTitle className="sr-only">{"Descripci\u00f3n del evento"}</DialogTitle>
                                        <DialogDescription className="sr-only">Edita la descripcion del evento seleccionado.</DialogDescription>
                                        {/* pt-10 deja espacio para la X integrada de Radix (top-4 right-4) */}
                                        <div className="px-5 pt-10 pb-3">
                                          <textarea
                                            className="w-full text-[14.5px] text-foreground leading-[1.7] bg-transparent border-0 p-0 resize-none focus:outline-none font-sans min-h-[100px] max-h-[240px] overflow-y-auto block"
                                            value={editDescription}
                                            onChange={(e) => setEditDescription(e.target.value)}
                                            autoFocus
                                            style={{ fieldSizing: 'content' } as React.CSSProperties}
                                          />
                                        </div>
                                        {editDescription !== (descDialogEvent?.description || '') && (
                                          <div className="px-5 pb-4 flex justify-end">
                                            <button
                                              onClick={() => {
                                                onEventUpdate?.(event.id, { description: editDescription });
                                                setDescDialogEvent(null);
                                              }}
                                              className="px-5 h-9 rounded-xl bg-primary text-primary-foreground text-[11px] font-black uppercase tracking-wider transition-all hover:opacity-90 active:scale-95"
                                            >
                                              Guardar
                                            </button>
                                          </div>
                                        )}
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                </>
                              )}
                            </div>
                            {event.links && getEventLinks(event.links).length > 0 && duration > 0 && (
                              <div className="shrink-0 pt-0.5">
                                <EventLinkClips links={event.links} color={event.color} />
                              </div>
                            )}
                          </div>

                          {/* Bottom Resize Handle */}
                          <div 
                            className={cn(
                              "absolute bottom-0 left-1/2 -translate-x-1/2 cursor-ns-resize z-30 flex items-end justify-center transition-opacity w-14",
                              duration < 0.35 ? "h-3.5" : "h-5",
                              (isMoving === event.id || isResizing === event.id || mobileEditEvent?.id === event.id)
                                ? "opacity-100"
                                : "opacity-0 md:opacity-0 md:group-hover:opacity-100 pointer-events-none md:pointer-events-auto"
                            )}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              // On mobile, resizing is handled by onTouchStart
                              if (window.matchMedia('(max-width: 767px)').matches) return;
                              isDraggingRef.current = false;
                              setIsResizing(event.id);
                              setIsResizingTop(false);
                              setInitialMouseY(e.pageY);
                              initialCalendarScrollTopRef.current = getCalendarScrollTop();
                              setInitialStartTime(new Date(event.startTime));
                              setInitialEndTime(new Date(event.endTime));
                            }}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              const touch = e.touches[0];
                              isDraggingRef.current = false;
                              setIsResizing(event.id);
                              setIsResizingTop(false);
                              setInitialMouseY(touch.pageY);
                              initialCalendarScrollTopRef.current = getCalendarScrollTop();
                              setInitialStartTime(new Date(event.startTime));
                              setInitialEndTime(new Date(event.endTime));
                            }}
                          >
                            <div className={cn(
                              "rounded-full bg-white/85 shadow-md transition-all",
                              duration < 0.35 ? "w-8 h-1 mb-0.5" : "w-10 h-1.5 mb-1"
                            )} />
                          </div>
                      </div>
                    )
                  })}
                  {/* Draft Event Block */}
                  {draftEvent && isSameDay(draftEvent.startTime, day) && (
                      <motion.div
                        initial={{ opacity: 0, scaleY: 0.8 }}
                        animate={{ opacity: 1, scaleY: 1 }}
                        className="absolute inset-x-1 z-20 rounded-xl border-2 border-dashed border-gray-400 bg-gray-500/10 shadow-sm touch-pan-y"
                      style={{
                        top: `${(draftEvent.startTime.getHours() + draftEvent.startTime.getMinutes() / 60) * HOUR_HEIGHT + 2}px`,
                        height: `${Math.max(0.5, (draftEvent.endTime.getTime() - draftEvent.startTime.getTime()) / (1000 * 60 * 60)) * HOUR_HEIGHT - 4}px`,
                      }}
                    >
                      {draftHintVisible && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap z-40"
                        >
                          <div className="bg-foreground text-background text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-lg">
                            Arrastra los bordes
                          </div>
                        </motion.div>
                      )}
                      <div className="flex flex-col h-full py-2 px-2">
                        <p className="truncate font-bold text-[11px] text-gray-400 leading-tight">
                          {draftTitle || 'Nuevo evento...'}
                        </p>
                        <div className="flex-1 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-gray-500">
                            {Math.round((draftEvent.endTime.getTime() - draftEvent.startTime.getTime()) / 60000)} min
                          </span>
                        </div>
                      </div>
                      {/* Top Resize Handle */}
                      <div
                        className="absolute top-0 inset-x-0 cursor-ns-resize z-30 flex items-start justify-center h-4 touch-none"
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          setDraftResizing(true)
                          setDraftResizingTop(true)
                          setInitialMouseY(e.pageY)
                          setInitialStartTime(new Date(draftEvent.startTime))
                          setInitialEndTime(new Date(draftEvent.endTime))
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          const touch = e.touches[0]
                          setDraftResizing(true)
                          setDraftResizingTop(true)
                          setInitialMouseY(touch.pageY)
                          setInitialStartTime(new Date(draftEvent.startTime))
                          setInitialEndTime(new Date(draftEvent.endTime))
                        }}
                      >
                        <motion.div
                          animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.1, 1] }}
                          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                          className="flex items-center justify-center gap-px px-1.5 py-0.5 rounded-full bg-gray-500/20 border border-gray-400/40 shadow-sm"
                        >
                          <ChevronUp className="w-2 h-2 text-gray-400" />
                          <GripHorizontal className="w-2.5 h-2.5 text-gray-400" />
                          <ChevronUp className="w-2 h-2 text-gray-400" />
                        </motion.div>
                      </div>
                      {/* Bottom Resize Handle */}
                      <div
                        className="absolute bottom-0 inset-x-0 cursor-ns-resize z-30 flex items-end justify-center h-4 touch-none"
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          setDraftResizing(true)
                          setDraftResizingTop(false)
                          setInitialMouseY(e.pageY)
                          setInitialStartTime(new Date(draftEvent.startTime))
                          setInitialEndTime(new Date(draftEvent.endTime))
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          const touch = e.touches[0]
                          setDraftResizing(true)
                          setDraftResizingTop(false)
                          setInitialMouseY(touch.pageY)
                          setInitialStartTime(new Date(draftEvent.startTime))
                          setInitialEndTime(new Date(draftEvent.endTime))
                        }}
                      >
                        <motion.div
                          animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.1, 1] }}
                          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", delay: 0.3 }}
                          className="flex items-center justify-center gap-px px-1.5 py-0.5 rounded-full bg-gray-500/20 border border-gray-400/40 shadow-sm"
                        >
                          <ChevronDown className="w-2 h-2 text-gray-400" />
                          <GripHorizontal className="w-2.5 h-2.5 text-gray-400" />
                          <ChevronDown className="w-2 h-2 text-gray-400" />
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
              </div>
            ))}

            {/* Current Time Indicator */}
            {days.some(d => d.toDateString() === currentNow.toDateString()) && (
              <div 
                className="absolute w-full flex items-center z-30 pointer-events-none"
                style={{ top: `${(currentNow.getHours() + currentNow.getMinutes() / 60) * HOUR_HEIGHT}px` }}
              >
                <div className="relative flex items-center justify-center -ml-1">
                  <div className="h-2.5 w-2.5 rounded-full border border-background bg-[#111827] shadow-sm dark:border-[#111827] dark:bg-white" />
                </div>
                <div className="flex-1 h-px bg-[#111827]/70 dark:bg-white/80" />
                <span className="ml-2 rounded-full bg-background/88 px-1.5 py-0.5 text-[8px] font-semibold text-[#111827]/70 shadow-sm backdrop-blur-sm dark:bg-[#111827]/88 dark:text-white/80">
                  {format(currentNow, "h:mm a", { locale: es })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ghost element for internal calendar drag - always follows mouse */}
      <div
        ref={ghostRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          display: 'none',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: 9999,
          willChange: 'transform',
        }}
        className="flex items-center gap-2 px-4 py-2 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-md bg-surface-container/90 text-foreground font-black text-[11px] uppercase tracking-widest"
      >
        {(() => { const ev = events.find(e => e.id === isMoving); return ev ? (
          <>
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: (ev.color?.startsWith('#') || ev.color?.startsWith('var')) ? ev.color : 'var(--primary)' }}
            />
            <span className="truncate max-w-[160px]">{ev.title}</span>
          </>
        ) : null; })()}
      </div>

      {/* Floating Save/Cancel bar for mobile event draft edit mode */}
      {mobileEditEvent && (
        <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-[calc(100vw-32px)] flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-3 bg-surface-container-high border border-outline-variant/15 p-1.5 rounded-full shadow-2xl backdrop-blur-md w-full pointer-events-auto">
            <button
              onClick={handleMobileCancel}
              className="flex-1 h-[38px] rounded-full text-muted-foreground hover:text-foreground font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              onClick={handleMobileSave}
              className="flex-[2] h-[38px] rounded-full bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              Guardar
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}

