export type CalendarViewMode = 'day' | 'week' | 'month'

export const CALENDAR_SELECTED_DATE_STORAGE_KEY = 'adonai:selected-date'
export const CALENDAR_VIEW_MODE_STORAGE_KEY = 'adonai:calendar-view-mode'
export const CALENDAR_SELECTED_DATE_CHANGE_EVENT = 'adonai:calendar-selected-date-change'
export const CALENDAR_VIEW_MODE_CHANGE_EVENT = 'adonai:calendar-view-mode-change'

export const normalizeCalendarViewMode = (value: string | null | undefined, fallback: CalendarViewMode = 'day'): CalendarViewMode => {
  if (value === 'day' || value === 'week' || value === 'month') return value
  return fallback
}

export const readStoredCalendarDate = () => {
  if (typeof localStorage === 'undefined') return new Date()
  const saved = localStorage.getItem(CALENDAR_SELECTED_DATE_STORAGE_KEY)
  if (!saved) return new Date()
  const parsed = new Date(saved)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

export const readStoredCalendarViewMode = (fallback: CalendarViewMode = 'day') => {
  if (typeof localStorage === 'undefined') return fallback
  return normalizeCalendarViewMode(localStorage.getItem(CALENDAR_VIEW_MODE_STORAGE_KEY), fallback)
}

export const writeCalendarDate = (date: Date) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(CALENDAR_SELECTED_DATE_STORAGE_KEY, date.toISOString())
  }
  window.dispatchEvent(new CustomEvent(CALENDAR_SELECTED_DATE_CHANGE_EVENT, { detail: { date } }))
}

export const writeCalendarViewMode = (viewMode: CalendarViewMode) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(CALENDAR_VIEW_MODE_STORAGE_KEY, viewMode)
  }
  window.dispatchEvent(new CustomEvent(CALENDAR_VIEW_MODE_CHANGE_EVENT, { detail: { viewMode } }))
}

export const subscribeCalendarState = (
  selectedDate: Date,
  viewMode: CalendarViewMode,
  onSelectedDateChange: (date: Date) => void,
  onViewModeChange: (viewMode: CalendarViewMode) => void,
) => {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === CALENDAR_SELECTED_DATE_STORAGE_KEY && e.newValue) {
      const parsedDate = new Date(e.newValue)
      if (!Number.isNaN(parsedDate.getTime()) && parsedDate.getTime() !== selectedDate.getTime()) {
        onSelectedDateChange(parsedDate)
      }
    }

    if (e.key === CALENDAR_VIEW_MODE_STORAGE_KEY && e.newValue) {
      const nextViewMode = normalizeCalendarViewMode(e.newValue, viewMode)
      if (nextViewMode !== viewMode) {
        onViewModeChange(nextViewMode)
      }
    }
  }

  const handleCustomDateChange = (e: CustomEvent<{ date: Date | string }>) => {
    const parsedDate = typeof e.detail.date === 'string' ? new Date(e.detail.date) : e.detail.date
    if (parsedDate && parsedDate.getTime() !== selectedDate.getTime()) {
      onSelectedDateChange(parsedDate)
    }
  }

  const handleCustomViewChange = (e: CustomEvent<{ viewMode: string }>) => {
    const nextViewMode = normalizeCalendarViewMode(e.detail.viewMode, viewMode)
    if (nextViewMode !== viewMode) {
      onViewModeChange(nextViewMode)
    }
  }

  window.addEventListener('storage', handleStorageChange)
  window.addEventListener(CALENDAR_SELECTED_DATE_CHANGE_EVENT, handleCustomDateChange as EventListener)
  window.addEventListener(CALENDAR_VIEW_MODE_CHANGE_EVENT, handleCustomViewChange as EventListener)

  return () => {
    window.removeEventListener('storage', handleStorageChange)
    window.removeEventListener(CALENDAR_SELECTED_DATE_CHANGE_EVENT, handleCustomDateChange as EventListener)
    window.removeEventListener(CALENDAR_VIEW_MODE_CHANGE_EVENT, handleCustomViewChange as EventListener)
  }
}
