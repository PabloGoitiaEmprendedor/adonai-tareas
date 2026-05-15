"use client"
import { format, addHours, addMinutes, addDays, isSameDay, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns"
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
import { Calendar, Clock, LayoutGrid, List, Folder, FolderOpen, Plus, Search, Filter, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check, MoreHorizontal, Link as LinkIcon, Trash2, Repeat, Zap, Menu, GripHorizontal, GripVertical } from "lucide-react"
import ScrollableTimePicker from "./scrollable-time-picker"
import { usePriorityColors, getPriorityKey } from "@/hooks/usePriorityColors"
import { cn } from "@/lib/utils"
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

export interface Event {
  id: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  color: string
  category?: string
  attendees?: string[]
  tags?: string[]
  priority?: number
  recurrence?: 'none' | 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom'
  recurrenceDays?: number[]
  recurrenceInterval?: number
  recurrenceUnit?: 'days' | 'weeks' | 'months' | 'years'
  urgency?: boolean
  importance?: boolean
  links?: string[]
  isAllDay?: boolean
  completed?: boolean
  isEvent?: boolean
}

export interface EventManagerProps {
  events?: Event[]
  onEventCreate?: (event: Omit<Event, "id">) => void
  onEventUpdate?: (id: string, event: Partial<Event>) => void
  onEventDelete?: (id: string) => void
  onCellClick?: (date: Date) => void
  categories?: string[]
  colors?: { name: string; value: string; bg: string; text: string }[]
  defaultView?: "month" | "week" | "day" | "list" | "schedule" | "3day"
  className?: string
  recurrenceExceptions?: Set<string>
  availableTags?: string[]
  onEventClick?: (event: Event) => void
  dragDisabled?: boolean
}

const defaultColors = [
  { name: "Blue", value: "blue", bg: "bg-blue-500", text: "text-blue-700" },
  { name: "Green", value: "green", bg: "bg-green-500", text: "text-green-700" },
  { name: "Purple", value: "purple", bg: "bg-purple-500", text: "text-purple-700" },
  { name: "Orange", value: "orange", bg: "bg-orange-500", text: "text-orange-700" },
  { name: "Pink", value: "pink", bg: "bg-pink-500", text: "text-pink-700" },
  { name: "Red", value: "red", bg: "bg-red-500", text: "text-red-700" },
]

export function EventManager({
  events: initialEvents = [],
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  onEventClick,
  onCellClick,
  categories = ["Meeting", "Task", "Reminder", "Personal"],
  colors = defaultColors,
  defaultView = "month",
  className,
  availableTags = ["Important", "Urgent", "Work", "Personal", "Team", "Client"],
  recurrenceExceptions,
  dragDisabled = false,
}: EventManagerProps) {
  const { colors: priorityColors } = usePriorityColors()
  const [events, setEvents] = useState<Event[]>(initialEvents)
  // Map of eventId -> optimistic event for drops currently pending Supabase confirmation.
  // Prevents a stale React Query refetch from overwriting the optimistic local state.
  const pendingDropsRef = useRef<Map<string, Event>>(new Map())

  useEffect(() => {
    if (pendingDropsRef.current.size === 0) {
      setEvents(initialEvents)
      return
    }
    // Smart merge: preserve optimistic drops/updates until Supabase confirms
    setEvents(() => {
      const merged = initialEvents.map(extEvent => {
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

          const isConfirmed = timeMatches && priorityMatches && completionMatches

          if (isConfirmed) {
            pendingDropsRef.current.delete(extEvent.id)
            return extEvent
          }
          return pending
        }
        return extEvent
      })
      return merged
    })
  }, [initialEvents])

  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"month" | "week" | "day" | "list" | "schedule" | "3day">(defaultView)
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

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
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
  })

  const [selectedCategory, setSelectedCategory] = useState<string | null>('General');

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    cats.add('General');
    events.forEach(e => {
      const catName = e.category || 'General';
      cats.add(catName);
    });
    return Array.from(cats).sort();
  }, [events]);

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null)
  const [selectedDayForSheet, setSelectedDayForSheet] = useState<Date | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState<'list' | 'folders'>('list');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['General']));
  const [showRecurrenceOptions, setShowRecurrenceOptions] = useState(false);
  const [showCustomRec, setShowCustomRec] = useState(false)
  const [isRecPopoverOpen, setIsRecPopoverOpen] = useState(false)
  const [recDays, setRecDays] = useState<number[]>([])
  const [recInterval, setRecInterval] = useState(2)
  const [recUnit, setRecUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('weeks')
  const [recEndType, setRecEndType] = useState<'never' | 'count' | 'date'>('never')
  const [recEndCount, setRecEndCount] = useState(5)
  const [recEndDate, setRecEndDate] = useState('')
  const [recSummary, setRecSummary] = useState('')
  const [draftEvent, setDraftEvent] = useState<Event | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const draftInputRef = useRef<HTMLInputElement>(null)

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
    const event: Event = {
      ...draftEvent,
      title: draftTitle.trim(),
      color: '#9e9e9e',
    }
    pendingDropsRef.current.set(event.id, event)
    setTimeout(() => { pendingDropsRef.current.delete(event.id) }, 5000)
    setEvents(prev => [...prev, event])
    onEventCreate?.(event)
    setDraftEvent(null)
    setDraftTitle('')
  }, [draftEvent, draftTitle, onEventCreate])

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
  }, [isDialogOpen])

  const toggleFolder = (folder: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folder)) {
      newExpanded.delete(folder);
    } else {
      newExpanded.add(folder);
    }
    setExpandedFolders(newExpanded);
  };

  useEffect(() => {
    if (!isRecPopoverOpen) return; // Only update when opening/already open
    const currentRec = isCreating ? newEvent.recurrence : selectedEvent?.recurrence
    if (['weekdays', 'biweekly', 'yearly'].includes(currentRec || '')) {
      setShowCustomRec(true)
    } else {
      setShowCustomRec(false)
    }
  }, [isRecPopoverOpen, selectedEvent?.recurrence, newEvent.recurrence, isCreating])

  // Initialize recSummary from event recurrence data when dialog opens
  useEffect(() => {
    if (!isDialogOpen) return;
    const event = isCreating ? newEvent : selectedEvent;
    const days = event?.recurrenceDays;
    if (days && days.length > 0) {
      const dayLabels = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
      const selectedLabels = [...days].sort().map(d => dayLabels[d]).join(', ');
      const interval = (event as any)?.recurrenceInterval || 1;
      const unit = (event as any)?.recurrenceUnit || 'weeks';
      const unitMap: Record<string, string> = { days: interval === 1 ? 'día' : 'días', weeks: interval === 1 ? 'semana' : 'semanas', months: interval === 1 ? 'mes' : 'meses', years: interval === 1 ? 'año' : 'años' };
      let text = `Cada ${interval} ${unitMap[unit] || unit}`;
      if (unit === 'weeks') text += ` en ${selectedLabels}`;
      setRecSummary(text);
    } else {
      setRecSummary('');
    }
  }, [isDialogOpen, isCreating, selectedEvent, newEvent.recurrenceDays])

  // Sync view state with defaultView prop
  useEffect(() => {
    if (defaultView) {
      setView(defaultView)
    }
  }, [defaultView])

  const filteredEvents = useMemo(() => {
    const baseEvents = events.filter((event) => {
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
    if (view === 'month') {
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
      if (!event.recurrence || event.recurrence === 'none') return

      const anchorDate = new Date(event.startTime)
      const anchorEnd = new Date(event.endTime)

      if (isNaN(anchorDate.getTime()) || isNaN(anchorEnd.getTime())) return

      const duration = anchorEnd.getTime() - anchorDate.getTime()
      const anchorDayStart = startOfDay(anchorDate)
      const anchorHour = anchorDate.getHours()
      const anchorMin = anchorDate.getMinutes()
      const anchorSec = anchorDate.getSeconds()

      // Iterate each day in the visible range and check against recurrence rule
      const daysInRange = eachDayOfInterval({ start: visibleStart, end: visibleEnd })

      daysInRange.forEach(day => {
        const dayStart = startOfDay(day)

        // Skip the anchor date itself (base event already represents it)
        if (dayStart.getTime() === anchorDayStart.getTime()) return

        // Skip dates before the anchor date (event didn't exist yet)
        if (day < anchorDayStart) return

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
            const interval = (event as any)?.recurrenceInterval || 1;
            const unit = (event as any)?.recurrenceUnit || 'weeks';
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

        const nextStart = new Date(day)
        nextStart.setHours(anchorHour, anchorMin, anchorSec, 0)
        const nextEnd = new Date(nextStart.getTime() + duration)
        const instanceId = `${event.id}-rec-${format(day, 'yyyy-MM-dd')}`
        if (skipRecurrenceId(instanceId)) return

        recurringInstances.push({
          ...event,
          id: instanceId,
          startTime: nextStart,
          endTime: nextEnd,
        })
      })
    })

    return [...baseEvents, ...recurringInstances]
  }, [events, searchQuery, selectedColors, selectedTags, selectedCategories, currentDate, view, recurrenceExceptions])

  const tasksByFolder = useMemo(() => {
    const tasks = filteredEvents.filter(e => {
      const inTimeRange = (isSameDay(e.startTime, currentDate)) || 
        (e.startTime < startOfDay(currentDate) && !e.completed);
      const taskCat = e.category || 'General';
      const matchesCategory = !selectedCategory || taskCat === selectedCategory;
      return inTimeRange && matchesCategory;
    });
    const grouped: Record<string, Event[]> = {};
    
    tasks.forEach(task => {
      const folder = task.category || 'General';
      if (!grouped[folder]) grouped[folder] = [];
      grouped[folder].push(task);
    });

    // Sort tasks in each folder by priority
    Object.keys(grouped).forEach(folder => {
      grouped[folder].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    });

    return grouped;
  }, [filteredEvents, currentDate, selectedCategory]);

  const hasActiveFilters = selectedColors.length > 0 || selectedTags.length > 0 || selectedCategories.length > 0

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
    });
    setCreationSource('calendar_only');
    setDurationMinutes(30);
    setCustomDuration('');
    setIsCreating(true);
    setIsDialogOpen(true);
  }, [onCellClick, colors, categories, events]);

  const handleCreateEvent = useCallback(() => {
    if (!newEvent.title) return

    if (creationSource === 'task_only') {
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
      })
      return
    }

    if (!newEvent.startTime || !newEvent.endTime) return

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
      links: newEvent.links || [],
      urgency: newEvent.urgency,
      importance: newEvent.importance,
      isAllDay: false,
      isEvent: creationSource === 'calendar_only',
    }

    setEvents((prev) => [...prev, event])
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
    })
  }, [newEvent, colors, categories, onEventCreate, creationSource])

  const handleUpdateEvent = useCallback(() => {
    if (!selectedEvent) return

    const updatedEvent = { ...selectedEvent }
    
    // Optimistically track this update
    pendingDropsRef.current.set(selectedEvent.id, updatedEvent)

    setEvents((prev) => prev.map((e) => (e.id === selectedEvent.id ? updatedEvent : e)))
    onEventUpdate?.(selectedEvent.id, updatedEvent)
    setIsDialogOpen(false)
    setSelectedEvent(null)
  }, [selectedEvent, onEventUpdate])

  const handleDeleteEvent = useCallback(
    (id: string) => {
      setEvents((prev) => prev.filter((e) => e.id !== id))
      onEventDelete?.(id)
      setIsDialogOpen(false)
      setSelectedEvent(null)
    },
    [onEventDelete],
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

  // ─── Shared ghost ref for both sidebar and grid drags ───
  const globalGhostRef = useRef<HTMLDivElement>(null)
  const [globalDragEvent, setGlobalDragEvent] = useState<Event | null>(null)

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
    pendingDropsRef.current.set(event.id, updatedEvent)
    setTimeout(() => { pendingDropsRef.current.delete(event.id) }, 5000)
    setEvents(prev => prev.map(e => e.id === event.id ? updatedEvent : e))
    onEventUpdate?.(event.id, updatedEvent)
  }, [onEventUpdate])

  // Sidebar custom mouse drag – mirrors the calendar ghost system
  const handleSidebarMouseDown = useCallback((e: React.MouseEvent, event: Event) => {
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
        setGlobalDragEvent(event)
      }
      if (dragging) showGhost(ev.clientX, ev.clientY)
    }

    const onUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      hideGhost()
      setGlobalDragEvent(null)
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
  }, [dropEventOnCalendar])

  // Sidebar touch drag for mobile
  const handleSidebarTouchStart = useCallback((e: React.TouchEvent, event: Event) => {
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
        setGlobalDragEvent(event)
      }
      if (dragging) showGhost(ev.touches[0].clientX, ev.touches[0].clientY)
    }

    const onEnd = (ev: TouchEvent) => {
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      hideGhost()
      setGlobalDragEvent(null)
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
  }, [dropEventOnCalendar])

  // External drag listeners (for MobileDynamicIsland long press)
  useEffect(() => {
    const handleExternalDragStart = (e: any) => {
      const { task, x, y } = e.detail;
      setGlobalDragEvent(task);
      const g = globalGhostRef.current;
      if (g) {
        g.style.display = 'flex';
        g.style.opacity = '1';
        g.style.transform = `translate(${x - 70}px, ${y - 20}px)`;
      }
    };

    const handleExternalDragMove = (e: any) => {
      const { x, y } = e.detail;
      const g = globalGhostRef.current;
      if (g) {
        g.style.transform = `translate(${x - 70}px, ${y - 20}px)`;
      }
    };

    const handleExternalDragEnd = (e: any) => {
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

      if (globalDragEvent) {
        const els = document.elementsFromPoint(x + 70, y + 20) as HTMLElement[];
        const cell = els.find(el => el.dataset && el.dataset.cellHour !== undefined);
        if (cell && cell.dataset.cellDay && cell.dataset.cellHour !== undefined) {
          const day = new Date(cell.dataset.cellDay);
          const hour = parseInt(cell.dataset.cellHour);
          const mins = parseInt(cell.dataset.cellMins || '0');
          dropEventOnCalendar(globalDragEvent, day, hour, mins);
        }
      }
      setGlobalDragEvent(null);
    };

    window.addEventListener('adonai:external-drag-start', handleExternalDragStart);
    window.addEventListener('adonai:external-drag-move', handleExternalDragMove);
    window.addEventListener('adonai:external-drag-end', handleExternalDragEnd);
    return () => {
      window.removeEventListener('adonai:external-drag-start', handleExternalDragStart);
      window.removeEventListener('adonai:external-drag-move', handleExternalDragMove);
      window.removeEventListener('adonai:external-drag-end', handleExternalDragEnd);
    };
  }, [globalDragEvent, dropEventOnCalendar]);

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

      let duration = draggedEvent.endTime.getTime() - draggedEvent.startTime.getTime()
      
      // If dropping an all-day task from sidebar, default to 30 minutes duration
      if (draggedEvent.isAllDay) {
        duration = 30 * 60 * 1000 // 30 minutes
      }

      const newStartTime = new Date(date)
      if (hour !== undefined) {
        newStartTime.setHours(hour, minutes, 0, 0)
      } else if (!draggedEvent.isAllDay) {
        // Preserve original time if not provided and not an all-day event
        newStartTime.setHours(draggedEvent.startTime.getHours(), draggedEvent.startTime.getMinutes(), 0, 0)
      }
      const newEndTime = new Date(newStartTime.getTime() + duration)

      const updatedEvent = {
        ...draggedEvent,
        startTime: newStartTime,
        endTime: newEndTime,
        isAllDay: hour === undefined ? draggedEvent.isAllDay : false, // Keep all-day if dropped on a day cell, otherwise make timed
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
    [draggedEvent, onEventUpdate],
  )

  const navigateDate = useCallback(
    (direction: "prev" | "next") => {
      setCurrentDate((prev) => {
        const newDate = new Date(prev)
        if (view === "month") {
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
    [view],
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

  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [searchOpen])

  return (
    <div data-calendar-grid className={cn("flex flex-col gap-4", className)}>
      {/* Sticky Header - Google-like */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-outline-variant/10 px-2 pb-3 pt-6 lg:pt-3 -mx-0 mb-2 shadow-sm">
        {/* Single-line header: Month + Day + Nav + View tabs */}
        <div className="flex items-center gap-2 pl-12 lg:pl-0">
          {/* Month name (opens date picker) */}
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity shrink-0">
                <span className="text-2xl lg:text-3xl font-black tracking-tight text-foreground leading-none flex items-center gap-2">
                  {format(currentDate, "MMMM", { locale: es }).charAt(0).toUpperCase() + format(currentDate, "MMMM", { locale: es }).slice(1)}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-outline-variant/10 bg-surface-container/95 backdrop-blur-3xl shadow-2xl" align="start">
              <div className="p-2 border-b border-outline-variant/5 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2">Seleccionar Fecha</span>
                <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="text-[9px] font-black uppercase tracking-widest h-7 px-2 rounded-md hover:bg-primary/10 text-primary">
                  Ir a Hoy
                </Button>
              </div>
              <CalendarPicker mode="single" selected={currentDate} onSelect={(date) => date && setCurrentDate(date)} initialFocus className="p-3" />
            </PopoverContent>
          </Popover>

          {/* Nav arrows */}
          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => navigateDate("prev")} className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigateDate("next")} className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Spacer */}
          <div className="flex-1 min-w-0" />

          {/* View toggle */}
          <div className="flex bg-surface-container-low/80 rounded-xl p-0.5 border border-outline-variant/10 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => setView("day")} className={cn("text-[9px] font-black uppercase tracking-widest h-6 px-3 rounded-xl transition-all shrink-0", view === "day" ? "bg-white dark:bg-surface-container-high shadow-lg text-primary" : "opacity-40 hover:opacity-100")}>
              Día
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setView("week")} className={cn("text-[9px] font-black uppercase tracking-widest h-6 px-3 rounded-xl transition-all shrink-0", view === "week" ? "bg-white dark:bg-surface-container-high shadow-lg text-primary" : "opacity-40 hover:opacity-100")}>
              Semana
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setView("month")} className={cn("text-[9px] font-black uppercase tracking-widest h-6 px-3 rounded-xl transition-all shrink-0", view === "month" ? "bg-white dark:bg-surface-container-high shadow-lg text-primary" : "opacity-40 hover:opacity-100")}>
              Mes
            </Button>
          </div>

          {/* Search toggle */}
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-surface-container/80 transition-all shrink-0"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* Search bar (expandable) */}
        {searchOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-2 pl-10 lg:pl-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 pointer-events-none" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar eventos..."
                className="w-full h-9 text-sm bg-surface-container/50 border border-outline-variant/20 rounded-xl pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="h-full"
          >
            {view === "month" && (
              <MonthView
                currentDate={currentDate}
                events={filteredEvents}
                onEventClick={(event) => {
                  if (onEventClick) {
                    onEventClick(event)
                  } else {
                    setSelectedEvent(event)
                    setIsDialogOpen(true)
                  }
                }}
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
                onHoverDay={setHoveredDay}
                dragDisabled={dragDisabled}
              />
            )}
            {(view === "week" || view === "day" || view === "3day") && (
              <div className="flex gap-4 relative items-start">
                {(view === "day" || view === "week") && (
                  <Card 
                    data-sidebar-droptarget="true"

                    className="hidden lg:flex w-64 flex-shrink-0 flex-col border-outline-variant/10 bg-surface-container/30 backdrop-blur-sm shadow-sm overflow-hidden sticky top-[4.5rem] z-10 h-[calc(100vh-140px)]"
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
                    <div className="p-4 border-b border-outline-variant/5">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-[12px] font-black tracking-[0.1em] text-primary">Tareas de hoy</h3>
                      </div>
                      <p className="text-[10px] text-on-surface-variant/40 font-black tracking-wider leading-tight">Mantén presionado para arrastras al calendario</p>
                    </div>

                    {/* Folder filter bar */}
                    {uniqueCategories.length > 0 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-4 py-2 border-b border-outline-variant/5">
                        {uniqueCategories.map(cat => {
                          const isSelected = selectedCategory === cat;
                          return (
                            <button
                              key={cat}
                              onClick={() => setSelectedCategory(cat)}
                              className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                  : 'bg-surface-container text-on-surface-variant/70 hover:text-primary border-outline-variant/20 hover:border-primary/30'
                              }`}
                            >
                              <motion.div
                                key={isSelected ? 'open' : 'closed'}
                                initial={{ rotateY: isSelected ? 180 : -180, scale: 0.8 }}
                                animate={{ rotateY: 0, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                                style={{ display: 'flex' }}
                              >
                                {isSelected ? (
                                  <FolderOpen className="w-3 h-3" />
                                ) : (
                                  <Folder className="w-3 h-3" />
                                )}
                              </motion.div>
                              {cat}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                      {sidebarView === 'list' ? (
                        <div className="space-y-2">
                          {filteredEvents.filter(e => {
                            const inTimeRange = (isSameDay(e.startTime, currentDate)) || (e.startTime < startOfDay(currentDate) && !e.completed);
                            const matchesCategory = !selectedCategory || e.category === selectedCategory;
                            return inTimeRange && matchesCategory;
                          }).length > 0 ? (
                            filteredEvents
                              .filter(e => {
                                const inTimeRange = (isSameDay(e.startTime, currentDate)) || (e.startTime < startOfDay(currentDate) && !e.completed);
                                const matchesCategory = !selectedCategory || e.category === selectedCategory;
                                return inTimeRange && matchesCategory;
                              })
                              .sort((a, b) => (b.priority || 0) - (a.priority || 0))
                              .map((event) => {
                                const evColor = (event.color.startsWith('#') || event.color.startsWith('var')) ? event.color : undefined;
                                return (
                                  <div
                                    key={event.id}
                                    onMouseDown={(e) => handleSidebarMouseDown(e, event)}
                                    onTouchStart={(e) => handleSidebarTouchStart(e, event)}
                                    onClick={() => {
                                      if (onEventClick) {
                                        onEventClick(event)
                                      } else {
                                        setSelectedEvent(event)
                                        setIsDialogOpen(true)
                                      }
                                    }}
                                    className="group flex items-start gap-3 p-4 rounded-[20px] hover:bg-surface-container transition-all cursor-grab active:cursor-grabbing border border-transparent hover:border-primary/20 touch-none"
                                    style={{ 
                                      backgroundColor: (() => { const pc = priorityColors[getPriorityKey(event.urgency || false, event.importance || false)]; return pc && pc !== 'transparent' ? `${pc}4D` : 'transparent'; })(),
                                    }}
                                  >
                                    <div
                                      className="w-2 h-2 rounded-full mt-2 shrink-0"
                                      style={{ backgroundColor: evColor || priorityColors[getPriorityKey(event.urgency || false, event.importance || false)] }}
                                    />
                                    <div className={cn("flex-1 min-w-0", event.completed && "opacity-40 grayscale-[0.5]")}>
                                      <span className={cn("text-[13px] font-black leading-tight block group-hover:text-primary transition-colors text-foreground", event.completed && "line-through")}>{event.title}</span>
                                      {event.description && (
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="text-[10px] font-medium text-on-surface-variant/50 line-clamp-1 italic">{event.description}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                          ) : (
                            <div className="flex flex-col items-center justify-center py-8 opacity-40 text-center px-2">
                              <List className="w-6 h-6 mb-2" />
                              <p className="text-[9px] font-black uppercase tracking-widest">Sin tareas sueltas</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {Object.keys(tasksByFolder).length > 0 ? (
                            Object.entries(tasksByFolder).sort().map(([folder, tasks]) => (
                              <div key={folder} className="space-y-1">
                                <button
                                  onClick={() => toggleFolder(folder)}
                                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-surface-container transition-all group"
                                >
                                  <div className="flex items-center gap-3">
                                    <motion.div 
                                      animate={{ 
                                        rotate: expandedFolders.has(folder) ? 0 : 0,
                                        scale: expandedFolders.has(folder) ? 1.1 : 1
                                      }}
                                      className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-transform group-hover:scale-110"
                                    >
                                      {expandedFolders.has(folder) ? (
                                        <FolderOpen className="w-4 h-4 fill-primary/20" />
                                      ) : (
                                        <Folder className="w-4 h-4 fill-primary/20" />
                                      )}
                                    </motion.div>
                                    <div className="text-left">
                                      <span className="text-[12px] font-black text-foreground block">{folder}</span>
                                    </div>
                                  </div>
                                  <ChevronRight className={cn("w-4 h-4 text-on-surface-variant/30 transition-transform duration-300", expandedFolders.has(folder) && "rotate-90")} />
                                </button>
                                
                                <AnimatePresence initial={false}>
                                  {expandedFolders.has(folder) && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.3, ease: "easeInOut" }}
                                      className="overflow-hidden"
                                    >
                                      <div className="space-y-1.5 pt-1 pl-4 pb-2">
                                        {tasks.map((task) => {
                                          const taskColor = (task.color.startsWith('#') || task.color.startsWith('var')) ? task.color : undefined;
                                          return (
                                            <div
                                              key={task.id}
                                              onMouseDown={(e) => handleSidebarMouseDown(e, task)}
                                              onTouchStart={(e) => handleSidebarTouchStart(e, task)}
                                              onClick={() => {
                                                if (onEventClick) {
                                                  onEventClick(task)
                                                } else {
                                                  setSelectedEvent(task)
                                                  setIsDialogOpen(true)
                                                }
                                              }}
                                              className="group flex items-start gap-3 p-3 rounded-xl hover:bg-surface-container transition-all cursor-grab active:cursor-grabbing border hover:border-primary/30 touch-none"
                                              style={{ 
                                                backgroundColor: `color-mix(in srgb, ${priorityColors[getPriorityKey(task.urgency || false, task.importance || false)]}, transparent 85%)`,
                                                borderColor: `color-mix(in srgb, ${priorityColors[getPriorityKey(task.urgency || false, task.importance || false)]}, transparent 80%)`
                                              }}
                                            >
                                              <div
                                                className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                                                style={{ backgroundColor: taskColor || priorityColors[getPriorityKey(task.urgency || false, task.importance || false)] }}
                                              />
                                              <div className={cn("flex-1 min-w-0", task.completed && "opacity-40 grayscale-[0.5]")}>
                                                <span className={cn("text-[12px] font-black leading-tight block group-hover:text-primary transition-colors text-foreground", task.completed && "line-through")}>{task.title}</span>
                                                {task.description && (
                                                  <span className="text-[9px] font-medium text-on-surface-variant/50 line-clamp-1 italic mt-0.5">{task.description}</span>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            ))
                          ) : (
                            <div className="flex flex-col items-center justify-center py-8 opacity-40 text-center px-2">
                              <Folder className="w-6 h-6 mb-2" />
                              <p className="text-[9px] font-black uppercase tracking-widest">Sin carpetas</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                )}
                <div className="flex-1 min-w-0">
                  <TimeGridView
                    view={view as "week" | "day" | "3day"}
                    currentDate={currentDate}
                    events={filteredEvents.filter(e => !e.isAllDay)}
                    setEvents={setEvents}
                    onEventClick={(event) => {
                      if (onEventClick) {
                        onEventClick(event)
                      } else {
                        setSelectedEvent(event)
                        setIsDialogOpen(true)
                      }
                    }}
                    onCellClick={onCellClick}
                    onDrop={handleDrop}
                    getColorClasses={getColorClasses}
                    onEventUpdate={onEventUpdate}
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
                    draftEvent={draftEvent}
                    draftTitle={draftTitle}
                    setDraftTitle={setDraftTitle}
                    startDraft={startDraft}
                    confirmDraft={confirmDraft}
                    cancelDraft={cancelDraft}
                    updateDraftTime={updateDraftTime}
                  />
                </div>
              </div>
            )}



            {view === "schedule" && (
              <ScheduleView
                events={filteredEvents}
                currentDate={currentDate}
                onEventClick={(event) => {
                  if (onEventClick) {
                    onEventClick(event)
                  } else {
                    setSelectedEvent(event)
                    setIsDialogOpen(true)
                  }
                }}
                onToggleComplete={handleToggleComplete}
                getColorClasses={getColorClasses}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>


      {/* Event Dialog — pixel-match TaskDetailModal + time section */}
      <AnimatePresence>
        {isDialogOpen && (() => {
          const hasTime = isCreating ? !newEvent.isAllDay : !selectedEvent?.isAllDay;
          const titleVal = isCreating ? (newEvent.title ?? '') : (selectedEvent?.title ?? '');
          const descVal  = isCreating ? (newEvent.description ?? '') : (selectedEvent?.description ?? '');
          const linksVal = (isCreating ? newEvent.links : selectedEvent?.links) || [];
          const importanceVal = isCreating ? !!newEvent.importance : !!selectedEvent?.importance;
          const urgencyVal    = isCreating ? !!newEvent.urgency    : !!selectedEvent?.urgency;

          const isTask = isCreating ? creationSource !== 'calendar_only' : selectedEvent?.id.startsWith('task-');
          const isBlock = isCreating ? (creationSource === 'calendar_only' || creationSource === 'both') : selectedEvent?.id.startsWith('block-');

          return (
            <>
              {/* Backdrop */}
              <motion.div
                key="event-backdrop"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-[60]"
                onClick={() => setIsDialogOpen(false)}
              />

              {/* Modal panel — identical container to TaskDetailModal */}
              <motion.div
                key="event-modal"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', damping: 22, stiffness: 260 }}
                className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
              >
                <div className="relative mx-auto w-full max-w-[400px] max-h-[90vh] overflow-y-auto pointer-events-auto rounded-[32px] no-scrollbar shadow-[0_20px_60px_-10px_hsla(140,95%,8%,0.15)] bg-background border border-border">
                  <div className="flex flex-col p-6 gap-6">

                    {/* ── Header ── same as TaskDetailModal */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setIsDialogOpen(false)}
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
                        className="px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.03] active:scale-95 transition-all"
                      >
                        {isCreating
                        ? creationSource === 'calendar_only' ? 'Confirmar Evento'
                        : creationSource === 'task_only' ? 'Crear Tarea'
                        : 'Guardar'
                        : 'Guardar Cambios'}
                      </button>
                    </div>

                    <div className="space-y-6">

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
                              "w-full text-xl font-bold bg-surface/50 border border-outline-variant/30 rounded-[22px] px-6 py-5 focus:outline-none focus:ring-4 focus:ring-primary/10 placeholder:text-muted-foreground/20 transition-all shadow-sm",
                              !isCreating && selectedEvent?.completed && "text-muted-foreground/50 line-through decoration-primary/30"
                            )}
                            placeholder="Título"
                            autoFocus
                          />
                        </div>
                      </div>

                      {/* CONFIGURACIÓN RÁPIDA (Grid layout) */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* FECHA */}
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider ml-1">Fecha</label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <div
                                className="flex items-center gap-3 bg-surface/50 border border-outline-variant/30 rounded-[18px] px-4 py-3.5 cursor-pointer hover:border-primary/40 hover:bg-surface transition-all shadow-sm group"
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

                        {/* HORA */}
                        {!isCreating ? (
                          <div className="space-y-2">
                             <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider ml-1">Horario</label>
                             <div className="flex flex-col gap-1.5">
                                <ScrollableTimePicker
                                  value={format(selectedEvent?.startTime || new Date(), 'HH:mm')}
                                  onChange={(val) => {
                                    const [h, m] = val.split(':').map(Number);
                                    const d = new Date(selectedEvent?.startTime || new Date());
                                    d.setHours(h, m);
                                    setSelectedEvent(prev => prev ? ({ ...prev, startTime: d }) : null);
                                  }}
                                  className="w-full h-11"
                                />
                             </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider ml-1">Hora inicio</label>
                            <ScrollableTimePicker
                              value={format(newEvent.startTime || new Date(), 'HH:mm')}
                              onChange={(val) => {
                                const [h, m] = val.split(':').map(Number);
                                const d = new Date(newEvent.startTime || new Date());
                                d.setHours(h, m);
                                const end = addMinutes(d, durationMinutes);
                                setNewEvent(prev => ({ ...prev, startTime: d, endTime: end }));
                              }}
                              className="w-full h-11"
                            />
                          </div>
                        )}
                      </div>

                      {/* MODO (Segmented style) */}
                      {isCreating && (
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider ml-1">¿Dónde aparecerá?</label>
                          <div className="flex p-1 bg-surface-container/30 border border-outline-variant/10 rounded-[20px] gap-1">
                            {[
                              { id: 'calendar_only' as const, label: 'Solo Calendario' },
                              { id: 'task_only' as const, label: 'Solo Tarea' },
                              { id: 'both' as const, label: 'Ambos' },
                            ].map(opt => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  setCreationSource(opt.id)
                                  if (opt.id === 'task_only') {
                                    setNewEvent(prev => ({ ...prev, isAllDay: true }))
                                  } else {
                                    const d = newEvent.startTime || new Date()
                                    setNewEvent(prev => ({ ...prev, isAllDay: false, startTime: d, endTime: addMinutes(d, durationMinutes) }))
                                  }
                                }}
                                className={cn(
                                  "flex-1 py-2.5 rounded-[14px] text-[10px] font-bold uppercase tracking-tight transition-all",
                                  creationSource === opt.id
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

                      {/* DURACIÓN (Pills style) */}
                      {(creationSource === 'calendar_only' || creationSource === 'both') && isCreating && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between px-1">
                             <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider">Duración estimada</label>
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
                        <div className="flex gap-2">
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (isCreating) setNewEvent(prev => ({ ...prev, importance: !prev.importance }))
                              else setSelectedEvent(prev => prev ? ({ ...prev, importance: !prev.importance }) : null)
                            }}
                            className={cn(
                              "flex flex-col items-center justify-center gap-1 rounded-[22px] font-black uppercase tracking-widest text-[9px] transition-all border h-14",
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
                              if (isCreating) setNewEvent(prev => ({ ...prev, urgency: !prev.urgency }))
                              else setSelectedEvent(prev => prev ? ({ ...prev, urgency: !prev.urgency }) : null)
                            }}
                            className={cn(
                              "flex flex-col items-center justify-center gap-1 rounded-[22px] font-black uppercase tracking-widest text-[9px] transition-all border h-14",
                              urgencyVal 
                                ? "bg-red-500/10 text-red-500 border-red-500/30 shadow-lg shadow-red-500/5" 
                                : "bg-surface-container/30 text-muted-foreground border-outline-variant/10 hover:bg-surface-container/50"
                            )}
                          >
                            <span>URGENTE</span>
                          </button>
                        </div>
                      </div>

                      {/* REPETICIÓN */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider ml-1">Repetición</label>
                        <Popover open={isRecPopoverOpen} onOpenChange={setIsRecPopoverOpen}>
                          <PopoverTrigger asChild>
                            <div className="flex items-center justify-between bg-surface/50 border border-outline-variant/30 rounded-[18px] px-4 py-3.5 cursor-pointer hover:border-primary/40 hover:bg-surface transition-all shadow-sm group">
                              <div className="flex items-center gap-3">
                                <Repeat className="w-4 h-4 text-primary/40 group-hover:text-primary transition-colors" />
                                <span className="text-[11px] font-bold text-primary">
                                  {isCreating ? (newEvent.recurrence === 'none' || !newEvent.recurrence ? 'No se repite' : 
                                    newEvent.recurrence === 'daily' ? 'Diario' : 
                                    newEvent.recurrence === 'weekly' ? 'Semanal' : 
                                    newEvent.recurrence === 'monthly' ? 'Mensual' : 
                                    newEvent.recurrence === 'weekdays' ? 'Días laborales' : 
                                    newEvent.recurrence === 'biweekly' ? 'Quincenal' : 
                                    newEvent.recurrence === 'yearly' ? 'Anual' : 
                                    newEvent.recurrence === 'custom' ? (recSummary || 'Personalizado') : 'Personalizado') : 
                                    (selectedEvent?.recurrence === 'none' || !selectedEvent?.recurrence ? 'No se repite' : 
                                    selectedEvent?.recurrence === 'daily' ? 'Diario' : 
                                    selectedEvent?.recurrence === 'weekly' ? 'Semanal' : 
                                    selectedEvent?.recurrence === 'monthly' ? 'Mensual' : 
                                    selectedEvent?.recurrence === 'weekdays' ? 'Días laborales' : 
                                    selectedEvent?.recurrence === 'biweekly' ? 'Quincenal' : 
                                    selectedEvent?.recurrence === 'yearly' ? 'Anual' : 
                                    selectedEvent?.recurrence === 'custom' ? (recSummary || 'Personalizado') : 'Personalizado')}
                                </span>
                              </div>
                              <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-2 rounded-[24px] bg-background border-outline-variant/10 shadow-2xl" align="start">
                            <div className="flex flex-col gap-1">
                              {[
                                { id: 'none', label: 'No se repite' },
                                { id: 'daily', label: 'Diario' },
                                { id: 'weekly', label: 'Semanal' },
                                { id: 'monthly', label: 'Mensual' },
                                { id: 'weekdays', label: 'Días laborales' },
                                { id: 'biweekly', label: 'Quincenal' },
                                { id: 'yearly', label: 'Anual' },
                                { id: 'custom', label: 'Personalizado...' },
                              ].map(opt => (
                                <button
                                  key={opt.id}
                                  onClick={() => {
                                    const val = opt.id as any
                                    if (isCreating) setNewEvent(prev => ({ ...prev, recurrence: val }))
                                    else setSelectedEvent(prev => prev ? ({ ...prev, recurrence: val }) : null)
                                    if (val !== 'custom') setIsRecPopoverOpen(false)
                                  }}
                                  className={cn(
                                    "flex items-center justify-between px-3 py-2.5 rounded-[14px] text-[11px] font-bold transition-all",
                                    (isCreating ? newEvent.recurrence : selectedEvent?.recurrence) === opt.id
                                      ? "bg-primary/10 text-primary"
                                      : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"
                                  )}
                                >
                                  {opt.label}
                                  {(isCreating ? newEvent.recurrence : selectedEvent?.recurrence) === opt.id && <Check className="w-3 h-3" />}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

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

                      {/* DESCRIPCIÓN */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">Descripción</label>
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



      <Dialog open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <DialogContent className="max-w-lg bg-surface-container-high/95 backdrop-blur-3xl border border-outline-variant/10 rounded-[32px] shadow-2xl p-0 overflow-hidden outline-none">
          <div className="h-[70vh] flex flex-col relative">
            <button 
              onClick={() => setIsSheetOpen(false)}
              className="absolute top-5 right-6 z-50 p-2 rounded-full hover:bg-white/10 transition-colors text-on-surface-variant/40 hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-10 pb-6">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">Agenda del día</h2>
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
                              setSelectedEvent(event);
                              setIsCreating(false);
                              setIsDialogOpen(true);
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
                                  "text-[16px] font-black text-foreground leading-tight group-hover:text-primary transition-colors truncate",
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
                        <p className="text-xs font-bold opacity-60">Tu agenda está despejada por ahora.</p>
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
  colors: any[]
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
}) {
  const HOUR_HEIGHT = 120; // Revertido al largo anterior (antes 160)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const initialEventsRef = useRef<Event[]>([])
  
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

  const hours = Array.from({ length: 24 }, (_, i) => i)

  useEffect(() => {
    if (scrollContainerRef.current) {
      const now = new Date()
      const scrollPosition = (now.getHours() * HOUR_HEIGHT) - 100
      scrollContainerRef.current.scrollTop = Math.max(0, scrollPosition)
    }
  }, [HOUR_HEIGHT])

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
  
  useEffect(() => {
    if (draftEvent) {
      setDraftHintVisible(true);
      const timer = setTimeout(() => setDraftHintVisible(false), 5000);
      return () => clearTimeout(timer);
    } else {
      setDraftHintVisible(false);
    }
  }, [draftEvent])

  const ghostRef = useRef<HTMLDivElement>(null);
  const isHoveringSidebarRef = useRef<boolean>(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  
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
    setInitialStartTime(new Date(event.startTime));
    setInitialEndTime(new Date(event.endTime));
  };

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

      // Use initialEventsRef.current for all collision logic to prevent infinite render loops and compounding errors
      const baseEvents = initialEventsRef.current.length > 0 ? initialEventsRef.current : events;

      if (isResizing && initialStartTime && initialEndTime) {
        isDraggingRef.current = true;
        const deltaY = pageY - initialMouseY;
        const minutesDiff = Math.round((deltaY / HOUR_HEIGHT) * 60 / 5) * 5;
        
        const event = baseEvents.find(ev => ev.id === isResizing);
        if (!event) return;

        const sameDayEvents = baseEvents.filter(ev => 
          ev.id !== isResizing && 
          isSameDay(ev.startTime, event.startTime) &&
          !ev.isAllDay
        );

        if (isResizingTop) {
          let newStartTime = new Date(initialStartTime.getTime() + minutesDiff * 60000);
          
          // Mantener duración mínima de 5 minutos para que la tarea no desaparezca ni se trabe
          const maxStartTime = new Date(initialEndTime.getTime() - 5 * 60000);
          if (newStartTime > maxStartTime) newStartTime = maxStartTime;

          // Find event above and adjust it
          const aboveEvent = sameDayEvents.find(other => 
            other.endTime > newStartTime && other.startTime < newStartTime
          );

          if (aboveEvent) {
            const newEndTime = newStartTime;
            if (newEndTime.getTime() - aboveEvent.startTime.getTime() >= 15 * 60000) {
              setEvents(baseEvents.map(ev => 
                ev.id === isResizing ? { ...ev, startTime: newStartTime } :
                ev.id === aboveEvent.id ? { ...ev, endTime: newStartTime } : ev
              ));
            }
          } else {
            // Standard move if no collision
            const isBlocked = sameDayEvents.some(other => newStartTime < other.endTime && event.endTime > other.startTime);
            if (!isBlocked) {
              setEvents(baseEvents.map(ev => ev.id === isResizing ? { ...ev, startTime: newStartTime } : ev));
            }
          }
        } else {
          let newEndTime = new Date(initialEndTime.getTime() + minutesDiff * 60000);
          
          // Mantener duración mínima de 5 minutos
          const minEndTime = new Date(initialStartTime.getTime() + 5 * 60000);
          if (newEndTime < minEndTime) newEndTime = minEndTime;

          // Find event below and adjust it
          const belowEvent = sameDayEvents.find(other => 
            other.startTime < newEndTime && other.endTime > newEndTime
          );

          if (belowEvent) {
            const newStartTime = newEndTime;
            if (belowEvent.endTime.getTime() - newStartTime.getTime() >= 15 * 60000) {
              setEvents(baseEvents.map(ev => 
                ev.id === isResizing ? { ...ev, endTime: newEndTime } :
                ev.id === belowEvent.id ? { ...ev, startTime: newEndTime } : ev
              ));
            }
          } else {
            // Standard move if no collision
            const isBlocked = sameDayEvents.some(other => newEndTime > other.startTime && event.startTime < other.endTime);
            if (!isBlocked) {
              setEvents(baseEvents.map(ev => ev.id === isResizing ? { ...ev, endTime: newEndTime } : ev));
            }
          }
        }
      } else if (isMoving && initialStartTime) {
        const deltaY = pageY - initialMouseY;
        const deltaX = Math.abs(pageX - initialMouseX);
        
        if (Math.abs(deltaY) > 3 || deltaX > 3) {
          isDraggingRef.current = true;
        }

        if (!isDraggingRef.current) return;

        // Ghost logic — always visible while dragging calendar events
        if (isMoving && ghostRef.current) {
          ghostRef.current.style.transform = `translate(${clientX - 70}px, ${clientY - 20}px)`;
          ghostRef.current.style.display = 'flex';
          ghostRef.current.style.opacity = '1';

          // Detect if hovering the sidebar drop target
          const sidebarEl = document.querySelector('[data-sidebar-droptarget]') as HTMLElement;
          if (sidebarEl) {
            const sidebarRect = sidebarEl.getBoundingClientRect();
            isHoveringSidebarRef.current = clientX >= sidebarRect.left && clientX <= sidebarRect.right && clientY >= sidebarRect.top && clientY <= sidebarRect.bottom;
          } else {
            isHoveringSidebarRef.current = clientX < 320;
          }

          // Dim original event element while dragging
          const originalCol = document.querySelector(`[data-event-id="${isMoving}"]`) as HTMLElement;
          if (originalCol) {
            originalCol.style.opacity = isHoveringSidebarRef.current ? '0' : '0.3';
            originalCol.style.transform = isHoveringSidebarRef.current ? 'scale(0.8)' : 'none';
          }
        }

        const minutesDiff = Math.round((deltaY / HOUR_HEIGHT) * 60 / 5) * 5;
        
        const columns = document.querySelectorAll('.day-column');
        let targetDayIndex = days.findIndex(d => d.toDateString() === initialStartTime.toDateString());
        
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
        const movedStartTime = new Date(newStartTimeBase.getTime() + minutesDiff * 60000);
        const movedEndTime = new Date(movedStartTime.getTime() + initialDuration * 60000);

        const sameDayEvents = baseEvents.filter(ev => 
          ev.id !== isMoving && 
          isSameDay(ev.startTime, targetDay) &&
          !ev.isAllDay
        );

        // Find overlapping events
        const overlappingAbove = sameDayEvents.find(other => 
          movedStartTime < other.endTime && movedStartTime > other.startTime
        );
        const overlappingBelow = sameDayEvents.find(other => 
          movedEndTime > other.startTime && movedEndTime < other.endTime
        );

        if (overlappingAbove || overlappingBelow) {
          setEvents(baseEvents.map(ev => {
            if (ev.id === isMoving) return { ...ev, startTime: movedStartTime, endTime: movedEndTime };
            
            // Adjust above event if it still has at least 5 mins duration
            if (overlappingAbove && ev.id === overlappingAbove.id) {
              const newEndTime = movedStartTime;
              if (newEndTime.getTime() - ev.startTime.getTime() >= 5 * 60000) {
                return { ...ev, endTime: newEndTime };
              }
              return ev;
            }
            
            // Adjust below event if it still has at least 5 mins duration
            if (overlappingBelow && ev.id === overlappingBelow.id) {
              const newStartTime = movedEndTime;
              if (ev.endTime.getTime() - newStartTime.getTime() >= 5 * 60000) {
                return { ...ev, startTime: newStartTime };
              }
              return ev;
            }
            return ev;
          }));
        } else {
          // Standard move if no direct intersection with body (could still overlap entirely)
          const totalOverlap = sameDayEvents.some(other => movedStartTime < other.endTime && movedEndTime > other.startTime);
          if (!totalOverlap) {
            setEvents(baseEvents.map(ev => 
              ev.id === isMoving ? { ...ev, startTime: movedStartTime, endTime: movedEndTime } : ev
            ));
          }
        }
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
          // Persist all changed events (both the dragged one and any pushed ones)
          const changedEvents = currentEventsRef.current.filter(ev => {
            const initial = initialEventsRef.current.find(i => i.id === ev.id);
            if (!initial) return false;
            return initial.startTime.getTime() !== ev.startTime.getTime() || 
                   initial.endTime.getTime() !== ev.endTime.getTime();
          });

          if (onEventUpdate) {
            changedEvents.forEach(ev => {
              onEventUpdate(ev.id, { 
                startTime: ev.startTime,
                endTime: ev.endTime 
              });
            });
          }
        }
        
        if (ghostRef.current) {
          ghostRef.current.style.display = 'none';
          ghostRef.current.style.opacity = '0';
        }
        // Restore original event opacity in all cases (dragged within calendar)
        if (isMoving) {
          const originalEl = document.querySelector(`[data-event-id="${isMoving}"]`) as HTMLElement;
          if (originalEl) { originalEl.style.opacity = '1'; originalEl.style.transform = 'none'; }
        }
        isHoveringSidebarRef.current = false;
        
        setIsResizing(null);
        setIsMoving(null);
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
  }, [isResizing, isMoving, initialMouseX, initialMouseY, initialStartTime, initialEndTime, initialDuration, onEventUpdate, HOUR_HEIGHT, days]);

  // Draft resize handler - uses refs to avoid re-creating effect on each position update
  const draftEventRef = useRef(draftEvent)
  draftEventRef.current = draftEvent
  useEffect(() => {
    if (!draftResizing || !draftEventRef.current || !initialStartTime || !initialEndTime) return
    document.body.style.userSelect = 'none'
    const handleMouseMove = (e: MouseEvent) => {
      const de = draftEventRef.current
      if (!de) return
      const deltaY = e.pageY - initialMouseY
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
    const handleMouseUp = () => {
      setDraftResizing(false)
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
    }
  }, [draftResizing, draftResizingTop, initialMouseY, initialStartTime, initialEndTime, updateDraftTime, HOUR_HEIGHT])

  const movingEventObj = useMemo(() => {
    return isMoving ? events.find(e => e.id === isMoving) : null;
  }, [isMoving, events]);

  return (
    <Card className={cn("flex flex-col h-full border-outline-variant/20 bg-card shadow-sm", className)}>
      {/* Ghost is rendered via portal at body level so backdrop-blur on Card doesn't clip it */}

      {/* Grid Header - Sticky */}
      <div className="sticky top-[64px] z-20 bg-background/95 backdrop-blur-md flex border-b border-outline-variant/20 shadow-sm">
        <div className="w-16 flex-shrink-0 border-r border-outline-variant/20 bg-surface-container/50 sticky left-0 z-30" />
        <div className={cn("flex-1 grid", view === "week" ? "grid-cols-7" : view === "3day" ? "grid-cols-3" : "grid-cols-1")}>
          {days.map((day, idx) => (
            <div key={idx} className="p-3 text-center border-r border-outline-variant/20 last:border-r-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">
                {format(day, "EEE", { locale: es }).toUpperCase().replace('.', '')}
              </span>
              <span className={cn(
                "inline-flex items-center justify-center w-8 h-8 rounded-xl text-sm font-black transition-all",
                day.toDateString() === new Date().toDateString() ? "bg-primary text-black shadow-lg shadow-primary/20 scale-110" : "text-on-surface"
              )}>
                {day.getDate()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid Body */}
      <div ref={scrollContainerRef} className="flex-1 scroll-smooth overflow-x-auto">
        <div className="relative flex" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
          {/* Time Labels - Sticky Left */}
          <div className="w-16 flex-shrink-0 border-r border-outline-variant/20 bg-surface-container/50 sticky left-0 z-20 backdrop-blur-sm">
            {hours.map((hour) => (
              <div key={hour} className="relative" style={{ height: `${HOUR_HEIGHT}px` }}>
                <span className="absolute -top-2 right-2 text-[11px] font-black text-foreground uppercase tracking-tighter drop-shadow-sm">
                  {hour === 0 ? "" : format(new Date().setHours(hour, 0, 0, 0), "h a", { locale: es })}
                </span>
              </div>
            ))}
          </div>

          {/* Grid Columns */}
          <div className={cn("flex-1 grid relative", view === "week" ? "grid-cols-7" : view === "3day" ? "grid-cols-3" : "grid-cols-1")}>
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
                      backgroundColor: (draggedEvent.color && (draggedEvent.color.startsWith('#') || draggedEvent.color.startsWith('var'))) ? draggedEvent.color : undefined
                    }}
                  >
                    <p className="truncate font-black opacity-60 italic">{draggedEvent.title}</p>
                  </div>
                )}

                {/* Events for this day - exclude allDay (those live in the sidebar task list) */}
                {events
                  .filter((event) => !event.isAllDay && event.startTime.toDateString() === day.toDateString())
                  .map((event) => {
                    const startHour = event.startTime.getHours() + event.startTime.getMinutes() / 60
                    const duration = Math.max(0.25, (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60 * 60))
                    
                    return (
                      <div
                        key={event.id}
                        data-event-id={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          // If the user just finished dragging, don't open the dialog
                          if (isDraggingRef.current) return;
                          onEventClick(event);
                        }}
                        className={cn(
                          "absolute inset-x-1 rounded-xl p-2 text-[10px] font-bold text-white shadow-lg cursor-grab active:cursor-grabbing hover:brightness-110 z-10 overflow-hidden group select-none",
                          "transition-all duration-200 ease-out", // Smooth transitions
                          event.color && !event.color.startsWith('#') && !event.color.startsWith('var') && getColorClasses(event.color).bg,
                          isResizing === event.id && "z-50 shadow-2xl brightness-125 ring-2 ring-white/50 transition-none", // Disable transitions while resizing
                          isMoving === event.id && "z-50 shadow-2xl scale-[1.02] brightness-110 ring-2 ring-white/30 transition-none cursor-grabbing", // Premium feedback while moving
                          isDraggingRef.current && "transition-none", // Disable transitions while dragging
                          event.completed && "opacity-50 grayscale-[0.3]"
                        )}
                        style={{
                          top: `${startHour * HOUR_HEIGHT + 2}px`, // 2px gap at top
                          height: `${duration * HOUR_HEIGHT - 4}px`, // 4px total gap (2px top, 2px bottom)
                          backgroundColor: (event.color && (event.color.startsWith('#') || event.color.startsWith('var'))) ? event.color : undefined,
                          userSelect: 'none',
                        }}
                        onMouseDown={(e) => {
                          if (e.button !== 0) return;
                          if (dragDisabled) return;
                          e.stopPropagation();
                          isDraggingRef.current = false;
                          setIsMoving(event.id);
                          setInitialMouseY(e.pageY);
                          setInitialMouseX(e.pageX);
                          setInitialStartTime(new Date(event.startTime));
                          setInitialDuration((event.endTime.getTime() - event.startTime.getTime()) / 60000);
                        }}
                        onTouchStart={(e) => {
                          if (dragDisabled) return;
                          e.stopPropagation();
                          const touch = e.touches[0];
                          const startX = touch.pageX;
                          const startY = touch.pageY;
                          
                          // Long press for mobile dragging
                          longPressTimerRef.current = setTimeout(() => {
                            isDraggingRef.current = false;
                            setIsMoving(event.id);
                            setInitialMouseY(startY);
                            setInitialMouseX(startX);
                            setInitialStartTime(new Date(event.startTime));
                            setInitialDuration((event.endTime.getTime() - event.startTime.getTime()) / 60000);
                            
                            // Vibrate if supported for haptic feedback
                            if (window.navigator && window.navigator.vibrate) {
                              window.navigator.vibrate(50);
                            }
                          }, 500); // 500ms for long press
                        }}
                        onTouchEnd={() => {
                          if (longPressTimerRef.current) {
                            clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = null;
                          }
                        }}
                        onTouchMove={() => {
                          // If moved too much before long press, cancel it
                          if (!isMoving && longPressTimerRef.current) {
                            clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = null;
                          }
                        }}
                      >
                          {/* Top Resize Handle */}
                          <div 
                            className={cn(
                              "absolute top-0 inset-x-0 cursor-ns-resize z-30 flex items-start pt-0.5 justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                              duration <= 0.25 ? "h-1" : "h-2"
                            )}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              isDraggingRef.current = false;
                              setIsResizing(event.id);
                              setIsResizingTop(true);
                              setInitialMouseY(e.pageY);
                              setInitialStartTime(new Date(event.startTime));
                              setInitialEndTime(new Date(event.endTime));
                            }}
                          >
                            <div className="w-8 h-1 rounded-full bg-white/80 shadow-md" />
                          </div>

                          <div className="flex flex-col h-full py-1 px-1 pointer-events-none">
                            <p className={cn("truncate font-black select-none leading-tight", event.completed && "line-through")}>{event.title}</p>
                            {duration > 0.4 && (
                              <p className="opacity-70 text-[8px] font-medium mt-0.5 select-none">
                                {format(event.startTime, "h:mm a", { locale: es })} - {format(event.endTime, "h:mm a", { locale: es })}
                              </p>
                            )}
                          </div>

                          {/* Bottom Resize Handle */}
                          <div 
                            className={cn(
                              "absolute bottom-0 inset-x-0 cursor-ns-resize z-30 flex items-end pb-0.5 justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                              duration <= 0.25 ? "h-1" : "h-2"
                            )}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              isDraggingRef.current = false;
                              setIsResizing(event.id);
                              setIsResizingTop(false);
                              setInitialMouseY(e.pageY);
                              setInitialStartTime(new Date(event.startTime));
                              setInitialEndTime(new Date(event.endTime));
                            }}
                          >
                            <div className="w-8 h-1 rounded-full bg-white/80 shadow-md" />
                          </div>
                      </div>
                    )
                  })}
                  {/* Draft Event Block */}
                  {draftEvent && isSameDay(draftEvent.startTime, day) && (
                    <motion.div
                      initial={{ opacity: 0, scaleY: 0.8 }}
                      animate={{ opacity: 1, scaleY: 1 }}
                      className="absolute inset-x-1 z-20 rounded-xl border-2 border-dashed border-gray-400 bg-gray-500/10 shadow-sm"
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
                            Arrastra los bordes ↕
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
                        className="absolute top-0 inset-x-0 cursor-ns-resize z-30 flex items-start justify-center h-4"
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          setDraftResizing(true)
                          setDraftResizingTop(true)
                          setInitialMouseY(e.pageY)
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
                        className="absolute bottom-0 inset-x-0 cursor-ns-resize z-30 flex items-end justify-center h-4"
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          setDraftResizing(true)
                          setDraftResizingTop(false)
                          setInitialMouseY(e.pageY)
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
            {days.some(d => d.toDateString() === new Date().toDateString()) && (
              <div 
                className="absolute w-full flex items-center z-20 pointer-events-none"
                style={{ top: `${(new Date().getHours() + new Date().getMinutes() / 60) * HOUR_HEIGHT}px` }}
              >
                <div className="relative flex items-center justify-center -ml-1.5">
                  <div className="absolute w-4 h-4 rounded-full bg-red-500 animate-ping opacity-20" />
                  <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm" />
                </div>
                <div className="flex-1 h-0.5 bg-gradient-to-r from-red-500 to-transparent opacity-40" />
                <span className="text-[8px] font-black text-red-500 bg-white dark:bg-surface-container-high px-1.5 py-0.5 rounded-full ml-2 shadow-sm border border-red-500/10">
                  {format(new Date(), "h:mm a", { locale: es })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ghost element for internal calendar drag — always follows mouse */}
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
    </Card>
  )
}

function MonthView({
  currentDate,
  events,
  onEventClick,
  onCellClick,
  onDragStart,
  onDragEnd,
  onDrop,
  getColorClasses,
  hoveredDay: externalHoveredDay,
  onHoverDay: externalOnHoverDay,
  dragDisabled = false,
}: {
  currentDate: Date
  events: Event[]
  onEventClick: (event: Event) => void
  onCellClick?: (date: Date) => void
  onDragStart?: (event: Event) => void
  onDragEnd?: () => void
  onDrop?: (date: Date) => void
  getColorClasses: (color: string) => { bg: string; text: string }
  hoveredDay?: Date | null
  onHoverDay?: (date: Date | null) => void
  dragDisabled?: boolean
}) {
  const [internalHoveredDay, setInternalHoveredDay] = useState<Date | null>(null);
  const hoveredDay = externalHoveredDay !== undefined ? externalHoveredDay : internalHoveredDay;
  const onHoverDay = externalOnHoverDay || setInternalHoveredDay;

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  const startDate = new Date(firstDayOfMonth)
  startDate.setDate(startDate.getDate() - startDate.getDay())

  const days = []
  const currentDay = new Date(startDate)

  for (let i = 0; i < 42; i++) {
    days.push(new Date(currentDay))
    currentDay.setDate(currentDay.getDate() + 1)
  }

  const getEventsForDay = (date: Date) => {
    return events
      .filter((event) => {
        const eventDate = new Date(event.startTime)
        return (
          eventDate.getDate() === date.getDate() &&
          eventDate.getMonth() === date.getMonth() &&
          eventDate.getFullYear() === date.getFullYear()
        )
      })
      .sort((a, b) => (a.priority || 0) - (b.priority || 0))
  }

  return (
    <Card className="overflow-hidden border-outline-variant/10 bg-surface-container/30 backdrop-blur-sm shadow-sm">
      <div className="grid grid-cols-7 border-b border-outline-variant/5 sticky top-[64px] z-10 bg-background/95 backdrop-blur-md">
        {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
          <div key={day} className="p-3 text-center text-xs font-black uppercase tracking-widest text-muted-foreground">
            {day.toUpperCase()}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dayEvents = getEventsForDay(day)
          const isCurrentMonth = day.getMonth() === currentDate.getMonth()
          const isToday = day.toDateString() === new Date().toDateString()

          const isHovered = hoveredDay && day.toDateString() === hoveredDay.toDateString()

          return (
            <div
              key={index}
              className={cn(
                "min-h-[90px] border-b border-r border-outline-variant/5 p-1 transition-all duration-300 last:border-r-0 relative group",
                !isCurrentMonth && "opacity-20",
                "hover:bg-primary/5 cursor-pointer",
                isHovered && "bg-primary/10 shadow-inner z-10"
              )}
              onMouseEnter={() => onHoverDay(day)}
              onMouseLeave={() => onHoverDay(null)}
              onClick={() => onCellClick?.(day)}
              onDragOver={(e) => {
                e.preventDefault()
                onHoverDay(day)
              }}
              onDrop={(e) => {
                e.preventDefault()
                onDrop?.(day)
                onHoverDay(null)
              }}
            >
              <div className={cn(
                "mb-2 flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold transition-all",
                isToday && "bg-primary text-black font-black shadow-lg shadow-primary/20 scale-110",
                isHovered && !isToday && "bg-primary/20 text-primary scale-110"
              )}>
                {day.getDate()}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <div 
                    key={event.id}
                    draggable={!dragDisabled}
                    onDragStart={(e) => {
                      if (dragDisabled) return
                      e.stopPropagation()
                      onDragStart?.(event)
                    }}
                    onDragEnd={() => onDragEnd?.()}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEventClick(event)
                    }}
                    className={cn(
                      "relative cursor-pointer rounded-md px-2 py-1 text-[9px] font-bold truncate transition-all duration-300",
                      "hover:scale-110 hover:z-50 hover:shadow-xl hover:text-[10px] hover:py-1.5",
                      event.color && !event.color.startsWith('#') && !event.color.startsWith('var') && getColorClasses(event.color).bg,
                      "text-white shadow-sm",
                      event.completed && "opacity-40 line-through grayscale-[0.5]"
                    )}
                    style={{ backgroundColor: (event.color && (event.color.startsWith('#') || event.color.startsWith('var'))) ? event.color : undefined }}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[9px] font-black text-on-surface-variant/40 pl-2 flex items-center gap-1">
                    <Plus className="w-2 h-2" />
                    {dayEvents.length - 3} más
                  </div>
                )}
              </div>
              
              {/* Visual selection indicator */}
              {isHovered && (
                <motion.div 
                  layoutId="hover-indicator"
                  className="absolute inset-0 border-2 border-primary/30 rounded-lg pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function ScheduleView({
  events,
  currentDate,
  onEventClick,
  onToggleComplete,
  getColorClasses,
}: {
  events: Event[]
  currentDate: Date
  onEventClick: (event: Event) => void
  onToggleComplete: (id: string, completed: boolean) => void
  getColorClasses: (color: string) => { bg: string; text: string }
}) {
  const { colors: priorityColors } = usePriorityColors()
  const groupedEvents = useMemo(() => {
    const groups: Record<string, Event[]> = {}
    
    // Sort events by date
    const sorted = [...events].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    
    sorted.forEach(event => {
      const dateKey = event.startTime.toDateString()
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(event)
    })
    
    return Object.entries(groups)
      .map(([date, evs]) => ({
        date: new Date(date),
        events: evs
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [events])

  return (
    <Card className="flex-1 border-outline-variant/10 bg-surface-container/30 backdrop-blur-sm shadow-sm overflow-hidden p-6">
      <ScrollArea className="h-full">
        <div className="space-y-8 pr-4">
          {groupedEvents.length > 0 ? groupedEvents.map(({ date, events: dayEvents }, idx) => (
            <div key={idx} className="space-y-4">
              <div className="sticky top-0 z-20 bg-surface-container-high/80 backdrop-blur-xl py-2 px-4 rounded-2xl border border-outline-variant/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-primary">{format(date, "d")}</span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{format(date, "EEEE", { locale: es })}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">{format(date, "MMMM", { locale: es })}</span>
                  </div>
                </div>
                {date.toDateString() === new Date().toDateString() && (
                  <Badge className="bg-primary text-black font-black text-[8px] uppercase tracking-widest border-none">Hoy</Badge>
                )}
              </div>
              
              <div className="grid gap-3 pl-4">
                {dayEvents.map(event => (
                  <div 
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className={cn(
                      "group flex items-center gap-4 p-4 rounded-2xl hover:bg-primary/10 border transition-all cursor-pointer active:scale-[0.98]",
                      event.completed && "opacity-60"
                    )}
                    style={{ 
                      backgroundColor: (() => { const pc = priorityColors[getPriorityKey(event.urgency || false, event.importance || false)]; return pc && pc !== 'transparent' ? `${pc}4D` : (event.color && (event.color.startsWith('#') || event.color.startsWith('var')) ? `color-mix(in srgb, ${event.color}, transparent 85%)` : 'transparent'); })(),
                      borderColor: (event.color && (event.color.startsWith('#') || event.color.startsWith('var')))
                        ? `color-mix(in srgb, ${event.color}, transparent 60%)`
                        : 'rgba(var(--outline-variant), 0.08)'
                    }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: (event.color && (event.color.startsWith('#') || event.color.startsWith('var'))) ? event.color : 'var(--primary)' }}
                    />

                    <div className="flex flex-col items-center justify-center min-w-[60px] border-r border-outline-variant/10 pr-4">
                      <span className="text-[11px] font-black text-foreground">{format(event.startTime, "h:mm a")}</span>
                      <span className="text-[9px] font-bold opacity-30">{format(event.endTime, "h:mm a")}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div 
                          className={cn("w-2 h-2 rounded-full", event.color && !event.color.startsWith('#') && !event.color.startsWith('var') && getColorClasses(event.color).bg)} 
                          style={{ backgroundColor: (event.color && (event.color.startsWith('#') || event.color.startsWith('var'))) ? event.color : undefined }}
                        />
                      </div>
                      <h3 className={cn("text-sm font-black text-foreground truncate group-hover:text-primary transition-colors", event.completed && "line-through")}>{event.title}</h3>
                      {event.description && (
                        <p className="text-[11px] font-medium text-on-surface-variant/40 line-clamp-1 mt-1">{event.description}</p>
                      )}
                    </div>
                    
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )) : (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 opacity-20">
              <Calendar className="w-16 h-16" />
              <div className="space-y-2">
                <h3 className="text-xl font-black uppercase tracking-widest">Nada planeado</h3>
                <p className="text-xs font-bold opacity-60">Tu agenda está despejada por ahora.</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}

