import { eachDayOfInterval, endOfMonth, format, isSameDay, startOfMonth } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronRight, Plus } from "lucide-react"
import { motion } from "framer-motion"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { usePriorityColors, getPriorityKey } from "@/hooks/usePriorityColors"
import { cn } from "@/lib/utils"

import { EventLinkClips } from "./event-link-clips"
import type { Event } from "./event-manager-types"
import { getEventLinks, getEventStyles } from "./event-manager-utils"

export function MonthView({
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
  const hoveredDay = externalHoveredDay
  const onHoverDay = externalOnHoverDay

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const startDate = new Date(firstDayOfMonth)
  startDate.setDate(startDate.getDate() - startDate.getDay())

  const days: Date[] = []
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
        {["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"].map((day) => (
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
              onMouseEnter={() => onHoverDay?.(day)}
              onMouseLeave={() => onHoverDay?.(null)}
              onClick={() => onCellClick?.(day)}
              onDragOver={(e) => {
                e.preventDefault()
                onHoverDay?.(day)
              }}
              onDrop={(e) => {
                e.preventDefault()
                onDrop?.(day)
                onHoverDay?.(null)
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
                      "relative cursor-pointer rounded-md px-2 py-1 text-[9px] font-medium truncate transition-all duration-300 flex items-center gap-1",
                      "hover:scale-110 hover:z-50 hover:shadow-xl hover:text-[10px] hover:py-1.5",
                      event.color && !event.color.startsWith('#') && !event.color.startsWith('var') && getColorClasses(event.color).bg,
                      "shadow-sm",
                      event.completed && "opacity-40 line-through grayscale-[0.5]"
                    )}
                    style={getEventStyles(event.color)}
                  >
                    {event.links && getEventLinks(event.links).length > 0 && (
                      <span className="shrink-0 opacity-70 text-[7px] leading-none">&#x1F517;</span>
                    )}
                    <span className="whitespace-normal break-words">{event.title}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[9px] font-black text-on-surface-variant/40 pl-2 flex items-center gap-1">
                    <Plus className="w-2 h-2" />
                    {dayEvents.length - 3} mas
                  </div>
                )}
              </div>

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

export function YearView({
  currentDate,
  events,
  onSelectMonth,
}: {
  currentDate: Date
  events: Event[]
  onSelectMonth: (date: Date) => void
}) {
  const months = Array.from({ length: 12 }, (_, month) => new Date(currentDate.getFullYear(), month, 1))
  const today = new Date()

  const getEventsForMonth = (monthDate: Date) => events.filter((event) => {
    const eventDate = new Date(event.startTime)
    return eventDate.getFullYear() === monthDate.getFullYear() && eventDate.getMonth() === monthDate.getMonth()
  })

  return (
    <div className="grid grid-cols-2 gap-2 px-3 pb-6 sm:grid-cols-3 lg:grid-cols-4 lg:px-0">
      {months.map((monthDate) => {
        const monthEvents = getEventsForMonth(monthDate)
        const isCurrentMonth = today.getFullYear() === monthDate.getFullYear() && today.getMonth() === monthDate.getMonth()

        return (
          <button
            key={monthDate.toISOString()}
            type="button"
            onClick={() => onSelectMonth(monthDate)}
            className={cn(
              "min-h-[132px] rounded-2xl border border-outline-variant/10 bg-surface-container/35 p-3 text-left transition-all hover:border-primary/30 hover:bg-primary/5 active:scale-[0.98]",
              isCurrentMonth && "border-primary/30 bg-primary/10"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-black capitalize text-foreground">
                {format(monthDate, "MMMM", { locale: es })}
              </span>
              <span className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-black text-muted-foreground">
                {monthEvents.length}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-1">
              {eachDayOfInterval({ start: startOfMonth(monthDate), end: endOfMonth(monthDate) }).slice(0, 35).map((day) => {
                const hasEvent = monthEvents.some((event) => isSameDay(event.startTime, day))
                return (
                  <span
                    key={day.toISOString()}
                    className={cn(
                      "h-1.5 rounded-full bg-outline-variant/20",
                      hasEvent && "bg-primary",
                      isSameDay(day, today) && "bg-foreground"
                    )}
                  />
                )
              })}
            </div>
          </button>
        )
      })}
    </div>
  )
}

export function ScheduleView({
  events,
  onEventClick,
  onToggleComplete: _onToggleComplete,
}: {
  events: Event[]
  currentDate: Date
  onEventClick: (event: Event) => void
  onToggleComplete: (id: string, completed: boolean) => void
  getColorClasses: (color: string) => { bg: string; text: string }
}) {
  const { colors: priorityColors } = usePriorityColors()
  const groupedEvents = Object.entries(
    [...events]
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      .reduce<Record<string, Event[]>>((groups, event) => {
        const dateKey = event.startTime.toDateString()
        if (!groups[dateKey]) groups[dateKey] = []
        groups[dateKey].push(event)
        return groups
      }, {})
  )
    .map(([date, dayEvents]) => ({
      date: new Date(date),
      events: dayEvents,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

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
                      "group flex items-start gap-3 p-4 rounded-2xl hover:brightness-105 border transition-all cursor-pointer active:scale-[0.98]",
                      event.completed && "opacity-60"
                    )}
                    style={{
                      ...((event.color && (event.color.startsWith('#') || event.color.startsWith('var')))
                        ? getEventStyles(event.color)
                        : {
                            backgroundColor: (() => {
                              const pc = priorityColors[getPriorityKey(event.urgency || false, event.importance || false)]
                              return pc && pc !== 'transparent' ? `${pc}4D` : 'transparent'
                            })(),
                            borderColor: 'rgba(var(--outline-variant), 0.08)',
                            color: '#FFFFFF',
                          }),
                    }}
                  >
                    <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: (event.color && (event.color.startsWith('#') || event.color.startsWith('var'))) ? event.color : 'var(--primary)' }}
                      />
                      {event.links && getEventLinks(event.links).length > 0 && (
                        <EventLinkClips links={event.links} color={event.color} />
                      )}
                    </div>

                    <div className="flex flex-col items-center justify-center min-w-[60px] border-r border-white/20 pr-4">
                      <span className="text-[13px]" style={{ color: 'inherit' }}>{format(event.startTime, "h:mm a")}</span>
                      <span className="text-[11px] opacity-50" style={{ color: 'inherit' }}>{format(event.endTime, "h:mm a")}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className={cn("text-[15px] break-words whitespace-normal transition-colors", event.completed && "line-through")} style={{ color: 'inherit' }}>{event.title}</h3>
                      {event.description && (
                        <p className="text-[11px] font-medium line-clamp-1 mt-1" style={{ color: 'inherit', opacity: 0.7 }}>{event.description}</p>
                      )}
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <ChevronRight className="w-4 h-4" style={{ color: 'inherit', opacity: 0.5 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )) : (
            <div className="py-16 text-center text-sm text-muted-foreground">No hay eventos</div>
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}
