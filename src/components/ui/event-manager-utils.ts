import { startOfDay } from "date-fns"

import type { Event } from "./event-manager-types"

const hexToRgba = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const stripHtml = (html: string): string => {
  if (!html) return ''

  if (typeof window !== 'undefined' && window.DOMParser) {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html')

      doc.querySelectorAll('ol').forEach(ol => {
        const startNum = parseInt(ol.getAttribute('start') || '1', 10)
        const items: string[] = []
        ol.querySelectorAll(':scope > li').forEach((li, idx) => {
          items.push(`${startNum + idx}. ${li.textContent?.trim() || ''}`)
        })
        const textNode = doc.createTextNode('\n' + items.join('\n') + '\n')
        ol.replaceWith(textNode)
      })

      doc.querySelectorAll('ul').forEach(ul => {
        const items: string[] = []
        ul.querySelectorAll(':scope > li').forEach(li => {
          items.push(`- ${li.textContent?.trim() || ''}`)
        })
        const textNode = doc.createTextNode('\n' + items.join('\n') + '\n')
        ul.replaceWith(textNode)
      })

      doc.querySelectorAll('br').forEach(br => br.replaceWith('\n'))
      doc.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6').forEach(el => {
        el.prepend('\n')
        el.append('\n')
      })

      return (doc.body.textContent || '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    } catch {
      // Fall through to regex fallback.
    }
  }

  let text = html
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<p[^>]*>/gi, '')
  text = text.replace(/<\/p>/gi, '\n')
  text = text.replace(/<li[^>]*>/gi, '- ')
  text = text.replace(/<\/li>/gi, '\n')
  return text.replace(/<[^>]*?>/g, '').trim()
}

const hue2rgb = (p: number, q: number, t: number) => {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}

const darkenColor = (hex: string): string => {
  if (!hex || !hex.startsWith('#')) return '#FFFFFF'
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  if (isDarkMode) return '#FFFFFF'

  const clean = hex.replace('#', '')
  let r = parseInt(clean.substring(0, 2), 16)
  let g = parseInt(clean.substring(2, 4), 16)
  let b = parseInt(clean.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '#FFFFFF'

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  let amount: number
  if (luminance > 0.55) amount = 0.65
  else if (luminance > 0.3) amount = 0.5
  else amount = 0.35

  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let s = 0
  let h = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  s = Math.min(1, s * 1.5)
  const newL = l * (1 - amount)

  let rr: number
  let gg: number
  let bb: number
  if (s === 0) {
    rr = gg = bb = newL
  } else {
    const qq = newL < 0.5 ? newL * (1 + s) : newL + s - newL * s
    const pp = 2 * newL - qq
    rr = hue2rgb(pp, qq, h + 1 / 3)
    gg = hue2rgb(pp, qq, h)
    bb = hue2rgb(pp, qq, h - 1 / 3)
  }

  return `#${[rr, gg, bb].map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('')}`
}

export const getEventLinks = (links?: string[]) => {
  return (links || []).flatMap(link => link.split(/\s+/)).map(link => link.trim()).filter(Boolean)
}

export const getEventStyles = (hexColor?: string) => {
  if (!hexColor) return {}
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

  if (!hexColor.startsWith('#')) return {}

  if (isDarkMode) {
    const bgColor = hexToRgba(hexColor, 0.3)
    return {
      backgroundColor: bgColor,
      color: '#FFFFFF',
      borderLeft: `4px solid ${hexColor}`,
      borderRight: '1px solid rgba(255, 255, 255, 0.05)',
      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    }
  }

  const bgColor = hexToRgba(hexColor, 0.15)
  const textColor = darkenColor(hexColor)
  return {
    backgroundColor: bgColor,
    color: textColor,
    borderLeft: `4px solid ${hexColor}`,
    borderRight: '1px solid rgba(0, 0, 0, 0.04)',
    borderTop: '1px solid rgba(0, 0, 0, 0.04)',
    borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
  }
}

export const cleanDescription = (desc?: string): string => {
  if (!desc) return ''

  const trimmed = desc.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed.description && typeof parsed.description === 'string') {
        return cleanDescription(parsed.description)
      }
      if (parsed.notes && typeof parsed.notes === 'string') {
        return cleanDescription(parsed.notes)
      }
      return ''
    } catch {
      return ''
    }
  }

  let text = desc
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&middot;/g, '.')
    .replace(/&bull;/g, '-')

  text = stripHtml(text)
  text = text.replace(/\[Adonai[^\]]*\]/gi, '')
  text = text.replace(/adonai[-_]task[-_]id:\s*[a-z0-9-]+/gi, '')
  text = text.replace(/google[-_]calendar[-_]event[-_]id:\s*[a-z0-9_]+/gi, '')

  return text.trim()
}

export const MIN_EVENT_DURATION_MINUTES = 5
export const DEFAULT_EVENT_DURATION_MINUTES = 30
export const SNAP_MINUTES = 5

export const snapMinutes = (minutes: number) => Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES

export const getStableDurationMs = (startTime?: Date, endTime?: Date, fallbackMinutes = DEFAULT_EVENT_DURATION_MINUTES) => {
  const start = startTime ? new Date(startTime).getTime() : NaN
  const end = endTime ? new Date(endTime).getTime() : NaN
  const duration = end - start
  const minDuration = MIN_EVENT_DURATION_MINUTES * 60 * 1000
  if (!Number.isFinite(duration) || duration < minDuration) return fallbackMinutes * 60 * 1000
  return duration
}

export const clampEventWithinDay = (startTime: Date, durationMs: number) => {
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

export const areEventListsEquivalent = (left: Event[], right: Event[]) => {
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
      event.color === other.color
  })
}

export const doTimedEventsOverlap = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => {
  return aStart < bEnd && aEnd > bStart
}

export const findTimedEventConflict = (
  _events: Event[],
  _candidate: Pick<Event, 'startTime' | 'endTime'> & { id?: string; isAllDay?: boolean },
  _ignoreId?: string
) => {
  return null
}

export const notifyCalendarConflict = () => {
  window.dispatchEvent(new CustomEvent('adonai:notify', {
    detail: {
      type: 'error',
      message: 'Ese horario ya esta ocupado. Elige un espacio libre.',
    },
  }))
}
