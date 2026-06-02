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

export type CalendarViewMode = "month" | "week" | "day" | "year" | "list" | "schedule" | "3day"

export type ExternalDragDetail = { task: Event; x: number; y: number }
export type ExternalDragMoveDetail = { x: number; y: number }

export type EventColorOption = {
  name: string
  value: string
  bg: string
  text: string
}

export interface EventManagerProps {
  events?: Event[]
  onEventCreate?: (event: Omit<Event, "id">) => void
  onEventUpdate?: (id: string, event: Partial<Event>) => void
  onEventDelete?: (id: string) => void
  onCellClick?: (date: Date) => void
  categories?: string[]
  colors?: EventColorOption[]
  defaultView?: CalendarViewMode
  className?: string
  recurrenceExceptions?: Set<string>
  availableTags?: string[]
  onEventClick?: (event: Event) => void
  dragDisabled?: boolean
  focusedDate?: Date
  onDateChange?: (date: Date) => void
  hideSidebar?: boolean
  containedScroll?: boolean
  onViewChange?: (view: CalendarViewMode) => void
}

export const DEFAULT_EVENT_COLORS: EventColorOption[] = [
  { name: "Blue", value: "blue", bg: "bg-blue-500", text: "text-blue-700" },
  { name: "Green", value: "green", bg: "bg-green-500", text: "text-green-700" },
  { name: "Purple", value: "purple", bg: "bg-purple-500", text: "text-purple-700" },
  { name: "Orange", value: "orange", bg: "bg-orange-500", text: "text-orange-700" },
  { name: "Pink", value: "pink", bg: "bg-pink-500", text: "text-pink-700" },
  { name: "Red", value: "red", bg: "bg-red-500", text: "text-red-700" },
]
