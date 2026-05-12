with open('src/components/ui/event-manager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# ─────────────────────────────────────────────────────────────
# 1. Add createPortal import
# ─────────────────────────────────────────────────────────────
old = 'import { useState, useCallback, useMemo, useEffect, useRef } from "react"'
new = 'import { useState, useCallback, useMemo, useEffect, useRef } from "react"\nimport { createPortal } from "react-dom"'
if old in content:
    content = content.replace(old, new, 1)
    print('1. createPortal import OK')
else:
    print('1. WARN: import not found')

# ─────────────────────────────────────────────────────────────
# 2. Add sidebar ghost ref + sidebar drop helper in EventManager
#    (insert after handleDragEnd, before handleDrop)
# ─────────────────────────────────────────────────────────────
old2 = '  const handleDragStart = useCallback((event: Event) => {\n    setDraggedEvent(event)\n  }, [])\n\n  const handleDragEnd = useCallback(() => {\n    setDraggedEvent(null)\n  }, [])\n\n  const handleDrop = useCallback('
new2 = '''  // ─── Shared ghost ref for both sidebar and grid drags ───
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
    const duration = event.isAllDay ? 30 * 60 * 1000 : (event.endTime.getTime() - event.startTime.getTime())
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
      g.style.transform = `translate(${x + 12}px, ${y + 12}px)`
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

      // Detect calendar cell at drop point
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

  const handleDrop = useCallback('''

if old2 in content:
    content = content.replace(old2, new2, 1)
    print('2. Sidebar drag code OK')
else:
    print('2. WARN: handleDragStart block not found, trying CRLF version')
    old2b = old2.replace('\n', '\r\n')
    new2b = new2.replace('\n', '\r\n')
    if old2b in content:
        content = content.replace(old2b, new2b, 1)
        print('2. Sidebar drag code OK (CRLF)')
    else:
        print('2. ERROR: not found')

# ─────────────────────────────────────────────────────────────
# 3. Add data-cell-* attributes to TimeGridView calendar cells
# ─────────────────────────────────────────────────────────────
old3 = '''                        className="cursor-pointer hover:bg-white/10 transition-colors group relative"
                          style={{ height: `${HOUR_HEIGHT / 4}px` }}
                          onDragOver={(e) => e.preventDefault()}'''
new3 = '''                        className="cursor-pointer hover:bg-white/10 transition-colors group relative"
                          data-cell-day={day.toISOString()}
                          data-cell-hour={hour}
                          data-cell-mins={mins}
                          style={{ height: `${HOUR_HEIGHT / 4}px` }}
                          onDragOver={(e) => e.preventDefault()}'''
if old3 in content:
    content = content.replace(old3, new3, 1)
    print('3. data-cell-* attributes OK')
else:
    print('3. WARN: cell className not found, trying CRLF')
    old3b = old3.replace('\n', '\r\n')
    new3b = new3.replace('\n', '\r\n')
    if old3b in content:
        content = content.replace(old3b, new3b, 1)
        print('3. data-cell-* attributes OK (CRLF)')
    else:
        print('3. ERROR: not found')

# ─────────────────────────────────────────────────────────────
# 4. Move ghost OUT of Card (portal) in TimeGridView
#    Replace the ghost div inside Card with a createPortal version
# ─────────────────────────────────────────────────────────────
old4 = '      {/* Ghost Element for Dragging Outside */}\n      <div\n        ref={ghostRef}\n        className="fixed top-0 left-0 pointer-events-none z-[9999] hidden flex-col w-auto min-w-[140px] max-w-[220px] bg-surface-container-highest/95 backdrop-blur-xl border border-outline-variant/30 rounded-xl p-2.5 shadow-2xl transition-[transform,opacity] duration-150 ease-out opacity-0"\n        style={{ transform: `translate(-1000px, -1000px)` }}\n      >\n        {movingEventObj && (\n          <div className="flex items-center gap-3">\n            <div \n              className="w-3 h-3 rounded-full shadow-sm shrink-0" \n              style={{ backgroundColor: (movingEventObj.color && (movingEventObj.color.startsWith(\'#\') || movingEventObj.color.startsWith(\'var\'))) ? movingEventObj.color : \'var(--primary)\' }} \n            />\n            <span className="text-xs font-black text-foreground line-clamp-1">{movingEventObj.title}</span>\n          </div>\n        )}\n      </div>'
new4 = '      {/* Ghost is rendered via portal at body level so backdrop-blur on Card doesn\'t clip it */}'

if old4 in content:
    content = content.replace(old4, new4, 1)
    print('4. Ghost removed from Card OK')
else:
    print('4. WARN: ghost block not found, trying CRLF')
    old4b = old4.replace('\n', '\r\n')
    new4b = new4.replace('\n', '\r\n')
    if old4b in content:
        content = content.replace(old4b, new4b, 1)
        print('4. Ghost removed from Card OK (CRLF)')
    else:
        print('4. ERROR: not found')

# ─────────────────────────────────────────────────────────────
# 5. Replace sidebar items: draggable -> onMouseDown
# ─────────────────────────────────────────────────────────────
old5 = '                                    draggable="true"\n                                    onDragStart={() => handleDragStart(event)}\n                                    onClick={() => {'
new5 = '                                    onMouseDown={(e) => handleSidebarMouseDown(e, event)}\n                                    onClick={() => {'
if old5 in content:
    content = content.replace(old5, new5, 1)
    print('5. Sidebar draggable -> onMouseDown OK')
else:
    print('5. WARN: trying CRLF')
    old5b = old5.replace('\n', '\r\n')
    new5b = new5.replace('\n', '\r\n')
    if old5b in content:
        content = content.replace(old5b, new5b, 1)
        print('5. Sidebar draggable -> onMouseDown OK (CRLF)')
    else:
        print('5. ERROR: not found')

with open('src/components/ui/event-manager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('DONE - File written')
