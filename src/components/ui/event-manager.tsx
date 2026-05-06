"use client"
import { format } from "date-fns"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
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
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, Grid3x3, List, Search, Filter, X, ChevronDown } from "lucide-react"
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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

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
}

export interface EventManagerProps {
  events?: Event[]
  onEventCreate?: (event: Omit<Event, "id">) => void
  onEventUpdate?: (id: string, event: Partial<Event>) => void
  onEventDelete?: (id: string) => void
  categories?: string[]
  colors?: { name: string; value: string; bg: string; text: string }[]
  defaultView?: "month" | "week" | "day" | "list"
  className?: string
  availableTags?: string[]
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
  categories = ["Meeting", "Task", "Reminder", "Personal"],
  colors = defaultColors,
  defaultView = "month",
  className,
  availableTags = ["Important", "Urgent", "Work", "Personal", "Team", "Client"],
}: EventManagerProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents)
  
  useEffect(() => {
    setEvents(initialEvents)
  }, [initialEvents])

  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"month" | "week" | "day" | "list">(defaultView)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [draggedEvent, setDraggedEvent] = useState<Event | null>(null)
  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    title: "",
    description: "",
    color: colors[0].value,
    category: categories[0],
    tags: [],
  })

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
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
  }, [events, searchQuery, selectedColors, selectedTags, selectedCategories])

  const hasActiveFilters = selectedColors.length > 0 || selectedTags.length > 0 || selectedCategories.length > 0

  const clearFilters = () => {
    setSelectedColors([])
    setSelectedTags([])
    setSelectedCategories([])
    setSearchQuery("")
  }

  const handleCreateEvent = useCallback(() => {
    if (!newEvent.title || !newEvent.startTime || !newEvent.endTime) return

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
    })
  }, [newEvent, colors, categories, onEventCreate])

  const handleUpdateEvent = useCallback(() => {
    if (!selectedEvent) return

    setEvents((prev) => prev.map((e) => (e.id === selectedEvent.id ? selectedEvent : e)))
    onEventUpdate?.(selectedEvent.id, selectedEvent)
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

  const handleDragStart = useCallback((event: Event) => {
    setDraggedEvent(event)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedEvent(null)
  }, [])

  const handleDrop = useCallback(
    (date: Date, hour?: number) => {
      if (!draggedEvent) return

      const duration = draggedEvent.endTime.getTime() - draggedEvent.startTime.getTime()
      const newStartTime = new Date(date)
      if (hour !== undefined) {
        newStartTime.setHours(hour, 0, 0, 0)
      }
      const newEndTime = new Date(newStartTime.getTime() + duration)

      const updatedEvent = {
        ...draggedEvent,
        startTime: newStartTime,
        endTime: newEndTime,
      }

      setEvents((prev) => prev.map((e) => (e.id === draggedEvent.id ? updatedEvent : e)))
      onEventUpdate?.(draggedEvent.id, updatedEvent)
      setDraggedEvent(null)
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
        } else if (view === "day") {
          newDate.setDate(prev.getDate() + (direction === "next" ? 1 : -1))
        }
        return newDate
      })
    },
    [view],
  )

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

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between px-2 sticky top-[150px] z-40 bg-background/95 backdrop-blur-3xl py-4 -mx-2 border-b border-outline-variant/5">
        <div className="flex items-center justify-between w-full lg:w-auto gap-4">
          <h2 className="text-[16px] font-black font-headline tracking-tight text-foreground uppercase">
            {view === "month" &&
              currentDate.toLocaleDateString("es-ES", {
                month: "long",
                year: "numeric",
              })}
            {view === "week" &&
              `Semana del ${currentDate.toLocaleDateString("es-ES", {
                month: "short",
                day: "numeric",
              })}`}
            {view === "day" &&
              currentDate.toLocaleDateString("es-ES", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
          </h2>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" onClick={() => navigateDate("prev")} className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="text-[11px] font-black uppercase tracking-widest h-8 px-3 rounded-lg hover:bg-primary/10 hover:text-primary">
              Hoy
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigateDate("next")} className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex bg-surface-container-low/80 rounded-[18px] p-1 border border-outline-variant/10">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setView("month")} 
            className={cn("text-[9px] font-black uppercase tracking-widest h-8 px-4 rounded-xl transition-all", view === "month" ? "bg-white dark:bg-surface-container-high shadow-lg text-primary" : "opacity-40 hover:opacity-100")}
          >
            Mes
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setView("week")} 
            className={cn("text-[9px] font-black uppercase tracking-widest h-8 px-4 rounded-xl transition-all", view === "week" ? "bg-white dark:bg-surface-container-high shadow-lg text-primary" : "opacity-40 hover:opacity-100")}
          >
            Semana
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setView("day")} 
            className={cn("text-[9px] font-black uppercase tracking-widest h-8 px-4 rounded-xl transition-all", view === "day" ? "bg-white dark:bg-surface-container-high shadow-lg text-primary" : "opacity-40 hover:opacity-100")}
          >
            Día
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0">
        {view === "month" && (
          <MonthView
            currentDate={currentDate}
            events={filteredEvents}
            onEventClick={(event) => {
              setSelectedEvent(event)
              setIsDialogOpen(true)
            }}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            getColorClasses={getColorClasses}
          />
        )}
        {(view === "week" || view === "day") && (
          <TimeGridView
            view={view}
            currentDate={currentDate}
            events={filteredEvents}
            onEventClick={(event) => {
              setSelectedEvent(event)
              setIsDialogOpen(true)
            }}
            onDrop={handleDrop}
            getColorClasses={getColorClasses}
          />
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isCreating ? "Crear Evento" : "Detalles del Evento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input 
                value={isCreating ? newEvent.title : selectedEvent?.title}
                onChange={(e) => isCreating 
                  ? setNewEvent(prev => ({...prev, title: e.target.value}))
                  : setSelectedEvent(prev => prev ? ({...prev, title: e.target.value}) : null)
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={isCreating ? handleCreateEvent : handleUpdateEvent}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TimeGridView({
  view,
  currentDate,
  events,
  onEventClick,
  onDrop,
  getColorClasses,
}: {
  view: "week" | "day"
  currentDate: Date
  events: Event[]
  onEventClick: (event: Event) => void
  onDrop: (date: Date, hour: number) => void
  getColorClasses: (color: string) => { bg: string; text: string }
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  const days = useMemo(() => {
    if (view === "day") return [currentDate]
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
      const scrollPosition = (now.getHours() * 60) - 100
      scrollContainerRef.current.scrollTop = Math.max(0, scrollPosition)
    }
  }, [])

  return (
    <Card className="flex flex-col overflow-hidden border-outline-variant/10 bg-surface-container/30 backdrop-blur-sm shadow-sm">
      {/* Grid Header - Sticky below main calendar nav */}
      <div className="flex border-b border-outline-variant/5 bg-surface-container/80 sticky top-[230px] z-30 backdrop-blur-xl">
        <div className="w-16 flex-shrink-0 border-r border-outline-variant/5" />
        <div className={cn("flex-1 grid", view === "week" ? "grid-cols-7" : "grid-cols-1")}>
          {days.map((day) => (
            <div key={day.toISOString()} className="py-3 text-center border-r border-outline-variant/5 last:border-r-0">
              <p className={cn(
                "text-[9px] font-black uppercase tracking-widest mb-1",
                day.toDateString() === new Date().toDateString() ? "text-primary" : "text-muted-foreground/60"
              )}>
                {day.toLocaleDateString("es-ES", { weekday: "short" })}
              </p>
              <p className={cn(
                "text-sm font-black",
                day.toDateString() === new Date().toDateString() && "text-primary"
              )}>
                {day.getDate()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Grid Body */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
        <div className="relative flex h-[1440px]">
          {/* Time Labels */}
          <div className="w-16 flex-shrink-0 border-r border-outline-variant/5 bg-surface-container/20">
            {hours.map((hour) => (
              <div key={hour} className="h-[60px] relative">
                <span className="absolute -top-2 right-2 text-[9px] font-black text-muted-foreground/40 uppercase">
                  {hour === 0 ? "" : `${hour}:00`}
                </span>
              </div>
            ))}
          </div>

          {/* Grid Columns */}
          <div className={cn("flex-1 grid relative", view === "week" ? "grid-cols-7" : "grid-cols-1")}>
            {/* Horizontal Grid Lines */}
            {hours.map((hour) => (
              <div key={hour} className="absolute w-full border-b border-outline-variant/5" style={{ top: `${hour * 60}px`, height: "60px" }} />
            ))}

            {/* Event Slots */}
            {days.map((day, dayIdx) => (
              <div key={dayIdx} className="relative h-full border-r border-outline-variant/5 last:border-r-0">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="h-[60px] cursor-pointer hover:bg-primary/5 transition-colors"
                    onClick={() => {
                      const d = new Date(day)
                      d.setHours(hour, 0, 0, 0)
                      // Handle click to create if needed
                    }}
                  />
                ))}

                {/* Events for this day */}
                {events
                  .filter((event) => event.startTime.toDateString() === day.toDateString())
                  .map((event) => {
                    const startHour = event.startTime.getHours() + event.startTime.getMinutes() / 60
                    const duration = Math.max(0.5, (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60 * 60))
                    
                    return (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onEventClick(event)
                        }}
                        className={cn(
                          "absolute inset-x-1 rounded-lg p-2 text-[10px] font-bold text-white shadow-lg cursor-pointer hover:brightness-110 transition-all z-10 overflow-hidden",
                          !event.color.startsWith('#') && !event.color.startsWith('var') && getColorClasses(event.color).bg
                        )}
                        style={{
                          top: `${startHour * 60}px`,
                          height: `${duration * 60}px`,
                          backgroundColor: (event.color.startsWith('#') || event.color.startsWith('var')) ? event.color : undefined
                        }}
                      >
                        <p className="truncate">{event.title}</p>
                        {duration > 0.7 && <p className="opacity-70 text-[8px]">{format(event.startTime, "HH:mm")} - {format(event.endTime, "HH:mm")}</p>}
                      </div>
                    )
                  })}
              </div>
            ))}

            {/* Current Time Indicator */}
            {days.some(d => d.toDateString() === new Date().toDateString()) && (
              <div 
                className="absolute w-full flex items-center z-20 pointer-events-none"
                style={{ top: `${(new Date().getHours() + new Date().getMinutes() / 60) * 60}px` }}
              >
                <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 border border-white" />
                <div className="flex-1 h-px bg-red-500 opacity-50" />
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

function MonthView({
  currentDate,
  events,
  onEventClick,
  onDragStart,
  onDragEnd,
  onDrop,
  getColorClasses,
}: {
  currentDate: Date
  events: Event[]
  onEventClick: (event: Event) => void
  onDragStart: (event: Event) => void
  onDragEnd: () => void
  onDrop: (date: Date) => void
  getColorClasses: (color: string) => { bg: string; text: string }
}) {
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
    return events.filter((event) => {
      const eventDate = new Date(event.startTime)
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      )
    })
  }

  return (
    <Card className="overflow-hidden border-outline-variant/10 bg-surface-container/30 backdrop-blur-sm shadow-sm">
      <div className="grid grid-cols-7 border-b border-outline-variant/5">
        {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
          <div key={day} className="p-3 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dayEvents = getEventsForDay(day)
          const isCurrentMonth = day.getMonth() === currentDate.getMonth()
          const isToday = day.toDateString() === new Date().toDateString()

          return (
            <HoverCard key={index} openDelay={100} closeDelay={100}>
              <HoverCardTrigger asChild>
                <div
                  className={cn(
                    "min-h-24 border-b border-r border-outline-variant/5 p-2 transition-colors last:border-r-0",
                    !isCurrentMonth && "opacity-20",
                    "hover:bg-primary/5 cursor-default",
                  )}
                >
                  <div className={cn(
                    "mb-2 flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold transition-all",
                    isToday && "bg-primary text-black font-black shadow-lg shadow-primary/20 scale-110"
                  )}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map(event => (
                      <div 
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className={cn(
                          "cursor-pointer rounded-md px-2 py-0.5 text-[9px] font-bold truncate transition-all hover:brightness-110 active:scale-95",
                          !event.color.startsWith('#') && !event.color.startsWith('var') && getColorClasses(event.color).bg,
                          "text-white shadow-sm"
                        )}
                        style={{ backgroundColor: (event.color.startsWith('#') || event.color.startsWith('var')) ? event.color : undefined }}
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
                </div>
              </HoverCardTrigger>
              {dayEvents.length > 0 && (
                <HoverCardContent 
                  className="w-64 p-3 bg-surface-container-high/95 backdrop-blur-xl border-outline-variant/20 shadow-2xl rounded-[20px]"
                  side="right"
                  align="start"
                  sideOffset={5}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2">
                      <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/60">
                        {day.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                      </p>
                      <Badge variant="secondary" className="text-[9px] font-black bg-primary/10 text-primary border-none">
                        {dayEvents.length} {dayEvents.length === 1 ? 'Tarea' : 'Tareas'}
                      </Badge>
                    </div>
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                      {dayEvents.map(event => (
                        <div 
                          key={event.id}
                          onClick={() => onEventClick(event)}
                          className={cn(
                            "group flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all hover:bg-white/5 border border-transparent hover:border-white/5",
                          )}
                        >
                          <div 
                            className={cn("w-1.5 h-1.5 rounded-full shrink-0", !event.color.startsWith('#') && !event.color.startsWith('var') && getColorClasses(event.color).bg)} 
                            style={{ backgroundColor: (event.color.startsWith('#') || event.color.startsWith('var')) ? event.color : undefined }}
                          />
                          <p className="text-[11px] font-black text-foreground truncate group-hover:text-primary">
                            {event.title}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </HoverCardContent>
              )}
            </HoverCard>
          )
        })}
      </div>
    </Card>
  )
}

