/**
 * MiniTasksPage — Adaptive floating pill widget.
 * - Pill (collapsed): small window, draggable ANYWHERE freely
 * - Expanded: panel that adapts direction based on screen position
 * - Inline per-task timer with green accent
 * - When timer active: pill shows running time with green numbers
 */
import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useFolders } from '@/hooks/useFolders';
import { useSubtasks } from '@/hooks/useSubtasks';
import { format, parseISO, addMinutes, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, MoreHorizontal, ChevronRight, CalendarDays, Clock, Pause, Plus, Mic, Repeat, Paperclip, Folder, FolderOpen, X, Users as UsersIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TaskCaptureModal, { type TaskCaptureModalHandle } from '@/components/TaskCaptureModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import QuickRecurrenceFlow from '@/components/QuickRecurrenceFlow';
import { useGamification } from '@/hooks/useGamification';
import { triggerTaskCelebration, triggerDailyCelebration, triggerOnTimeCelebration } from '@/lib/celebrations';
import { useProfile } from '@/hooks/useProfile';
import { usePriorityColors } from '@/hooks/usePriorityColors';
import { MiniDayView, type DayEvent } from '@/components/MiniDayView';
import '../index.css';

const FOLDER_COLORS = ['#C3F53C', '#4BE277', '#6B9FFF', '#FF8B7C', '#FFB86C', '#BD93F9', '#FF79C6', '#C7C6C6'];

const PANEL_W = 340;
const PANEL_H = 500;
const PILL_W = 100;
const PILL_H = 52;
const PILL_TIMER_W = 130;

const C = {
  bg: 'hsl(var(--surface-container))',
  border: 'hsl(var(--outline))',
  text: 'hsl(var(--on-surface))',
  muted: 'hsl(var(--on-surface-variant))',
  accent: 'hsl(var(--primary))',
  accentBg: 'hsl(var(--primary) / 0.1)',
  taskBg: 'hsl(var(--surface))',
  taskBorder: 'hsl(var(--outline-variant))',
  subBg: 'hsl(var(--surface-dim))',
};

function formatTimer(seconds: number): string {
  const isNegative = seconds < 0;
  const absS = Math.abs(seconds);
  const m = Math.floor(absS / 60);
  const s = absS % 60;
  return `${isNegative ? '-' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ─── Subtask Row ─────────────────────────────────────────────────────────────
const SubtaskRowRaw = ({ sub, onToggle, onUpdate }: { sub: any; onToggle: (sub: any) => void; onUpdate: (title: string) => void }) => {
  const isDone = sub.status === 'done';
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(sub.title);

  const submitEdit = () => {
    setIsEditing(false);
    if (draftTitle.trim() && draftTitle.trim() !== sub.title) {
      onUpdate(draftTitle.trim());
    } else {
      setDraftTitle(sub.title);
    }
  };

  return (
    <div onClick={() => onToggle(sub)} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 8px 6px 28px', borderRadius: 8, cursor: isEditing ? 'default' : 'pointer',
      background: C.subBg, marginBottom: 2, opacity: isDone ? 0.45 : 1,
    }}>
      <div onClick={(e) => { e.stopPropagation(); onToggle(sub); }} style={{
        width: 18, height: 18, borderRadius: 5, flexShrink: 0, cursor: 'pointer',
        background: isDone ? C.accent : 'transparent',
        border: `2px solid ${isDone ? C.accent : 'rgba(1, 38, 14, 0.15)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isDone && <Check style={{ width: 10, height: 10, color: '#F2F2F2', strokeWidth: 3 }} />}
      </div>
      {isEditing ? (
        <input
          autoFocus
          value={draftTitle}
          onChange={e => setDraftTitle(e.target.value)}
          onBlur={submitEdit}
          onKeyDown={e => {
            if (e.key === 'Enter') submitEdit();
            if (e.key === 'Escape') {
              setDraftTitle(sub.title);
              setIsEditing(false);
            }
          }}
          onClick={e => e.stopPropagation()}
          style={{
            flex: 1, fontSize: 12, fontWeight: 500, lineHeight: 1.3,
            color: C.text, background: 'transparent', border: 'none',
            borderBottom: `1px solid ${C.accent}`, outline: 'none', padding: 0
          }}
        />
      ) : (
        <span 
          onClick={(e) => { e.stopPropagation(); setIsEditing(true); setDraftTitle(sub.title); }}
          title="Haz clic para editar"
          style={{
            flex: 1, fontSize: 12, color: isDone ? C.muted : C.text,
            textDecoration: isDone ? 'line-through' : 'none',
            fontWeight: 500, lineHeight: 1.3, cursor: 'text'
          }}
        >
          {sub.title}
        </span>
      )}
    </div>
  );
};
const SubtaskRow = memo(SubtaskRowRaw);

// ─── Task Row ────────────────────────────────────────────────────────────────
const TaskRowRaw = ({ task, onToggle, onDetail, activeTimerId, onTimerToggle, updateTask, folders }: {
  task: any; onToggle: (task: any) => void; onDetail: (task: any) => void;
  activeTimerId: string | null; onTimerToggle: (taskId: string, estimatedMinutes?: number) => void;
  updateTask: any; folders: any[];
}) => {
  const isDone = task.status === 'done';
  const [open, setOpen] = useState(false);
  const { subtasks, toggleSubtask, updateSubtask } = useSubtasks(task.id, { enabled: open });
  const hasSubtasks = subtasks.length > 0;
  const doneSubCount = subtasks.filter((s: any) => s.status === 'done').length;
  const isTimerActive = activeTimerId === task.id;
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);

  const submitEdit = () => {
    setIsEditing(false);
    if (draftTitle.trim() && draftTitle.trim() !== task.title) {
      updateTask.mutate({ id: task.id, title: draftTitle.trim() });
    } else {
      setDraftTitle(task.title);
    }
  };

  const { colors } = usePriorityColors();
  const getTaskPriorityColor = () => {
    if (task.urgency && task.importance) return colors.p1;
    if (task.urgency && !task.importance) return colors.p2;
    if (!task.urgency && task.importance) return colors.p3;
    return colors.p4;
  };
  const priorityColor = getTaskPriorityColor();
  const baseBg = priorityColor === 'transparent' ? C.taskBg : `${priorityColor}4D`;

  const actualSeconds = task.actual_duration_seconds || 0;
  const estimatedSeconds = (task.estimated_minutes || 0) * 60;
  const isOverTime = actualSeconds > estimatedSeconds && estimatedSeconds > 0;

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }} style={{ marginBottom: 4 }}>
      <div 
        onClick={() => onDetail(task)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px',
          borderRadius: 12, cursor: 'pointer',
          background: isDone ? 'transparent' : isTimerActive ? 'rgba(33, 217, 4, 0.06)' : baseBg,
          border: `1px solid ${isDone ? 'transparent' : isTimerActive ? 'rgba(33, 217, 4, 0.15)' : C.taskBorder}`,
          opacity: isDone ? 0.45 : 1,
        }}
      >
        <div 
          onClick={(e) => { e.stopPropagation(); onToggle(task); }} 
          style={{
            width: 26, height: 26, borderRadius: 8, flexShrink: 0,
            background: isDone ? C.accent : 'transparent',
            border: `2px solid ${isDone ? C.accent : 'rgba(1, 38, 14, 0.15)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {isDone && <Check style={{ width: 13, height: 13, color: '#F2F2F2', strokeWidth: 3 }} />}
        </div>
        
        {hasSubtasks && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
            style={{
              flexShrink: 0, color: C.muted, cursor: 'pointer', background: 'transparent', border: 'none', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <span style={{
              fontSize: '18px', fontWeight: 900, display: 'inline-block',
              transition: 'transform 0.2s, color 0.2s',
              transform: open ? 'rotate(45deg)' : 'none',
              color: open ? C.accent : C.muted
            }}>
              +
            </span>
          </button>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          {isEditing ? (
            <input
              autoFocus
              value={draftTitle}
              onChange={e => setDraftTitle(e.target.value)}
              onBlur={submitEdit}
              onKeyDown={e => {
                if (e.key === 'Enter') submitEdit();
                if (e.key === 'Escape') {
                  setDraftTitle(task.title);
                  setIsEditing(false);
                }
              }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', fontSize: 13, fontWeight: 600, lineHeight: 1.3,
                color: C.text, background: 'transparent', border: 'none',
                borderBottom: `1px solid ${C.accent}`, outline: 'none', padding: 0
              }}
            />
          ) : (
            <span 
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); setDraftTitle(task.title); }}
              title="Haz clic para editar"
              style={{
                display: 'block', fontSize: 13, fontWeight: 600, lineHeight: 1.3,
                color: isDone ? C.muted : C.text,
                textDecoration: isDone ? 'line-through' : 'none',
                cursor: 'text'
              }}
            >
              {task.title}
            </span>
          )}

        </div>

        {/* Link / Timer / Duration Result */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isDone ? (
            actualSeconds > 0 && (
                <div style={{
                  fontSize: 11, fontWeight: 800,
                  color: isOverTime ? '#F87171' : '#A3E635',
                  fontFamily: 'monospace',
                  padding: '2px 8px',
                  borderRadius: 999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '46px',
                  lineHeight: '1',
                  background: isOverTime ? 'rgba(248,113,113,0.2)' : 'rgba(163,230,53,0.2)',
                  border: `1px solid ${isOverTime ? 'rgba(248,113,113,0.3)' : 'rgba(163,230,53,0.3)'}`
                }}>
                {formatTimer(actualSeconds)}
              </div>
            )
          ) : (
            <>
              {task.link && task.link.split(/\s+/).filter(Boolean).map((url: string, i: number) => {
                const href = url.startsWith('http') ? url : `https://${url}`;
                return (
                <div
                  key={i}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if ((window as any).electronAPI?.openExternal) {
                      (window as any).electronAPI.openExternal(href);
                    } else {
                      window.open(href, '_blank');
                    }
                  }}
                  style={{
                    width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', 
                    background: C.subBg,
                    border: `1px solid ${C.border}`,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                  title="Abrir link"
                >
                  <Paperclip style={{ width: 12, height: 12, color: priorityColor === 'transparent' ? 'var(--primary)' : priorityColor }} />
                </div>
                );
              })}
              
              {isEditing ? (
                <div
                  onClick={(e) => { e.stopPropagation(); submitEdit(); }}
                  style={{
                    width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                    background: C.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Check style={{ width: 12, height: 12, color: '#000', strokeWidth: 3 }} />
                </div>
              ) : (
                <div
                  onClick={(e) => { e.stopPropagation(); onTimerToggle(task.id, task.estimated_minutes || 30); }}
                  style={{
                    width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                    background: isTimerActive ? (priorityColor === 'transparent' ? 'var(--primary)' : priorityColor) : C.subBg,
                    border: `1px solid ${isTimerActive ? 'transparent' : C.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                >
                  {isTimerActive
                    ? <Pause style={{ width: 12, height: 12, color: '#000' }} />
                    : <Clock style={{ width: 12, height: 12, color: priorityColor === 'transparent' ? 'var(--primary)' : priorityColor }} />
                  }
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <AnimatePresence>
        {open && hasSubtasks && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', paddingTop: 2 }}>
            {subtasks.map((sub: any) => (
              <SubtaskRow key={sub.id} sub={sub}
                onToggle={(s) => toggleSubtask.mutate({ id: s.id, done: s.status !== 'done' })}
                onUpdate={(title) => updateSubtask.mutate({ id: sub.id, title })} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
const TaskRow = memo(TaskRowRaw);

// ─── Drag hook ───────────────────────────────────────────────────────────────
function useDragWindow() {
  const isDraggingRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  useEffect(() => {
    const onUp = () => { 
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        (window as any).electronAPI?.stopDrag?.();
      }
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('blur', onUp); // Stop drag if window loses focus
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('blur', onUp);
    };
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    (window as any).electronAPI?.startDrag?.();
  }, []);

  return { onMouseDown, hasMovedRef, isDraggingRef };
}

// ─── Main component ──────────────────────────────────────────────────────────
const MiniTaskList = () => {
  const { user, loading } = useAuth();
  const isAdmin = user?.email === 'pablogoitiaemprendedor@gmail.com';
  const [viewDate, setViewDate] = useState(new Date());
  const { tasks, updateTask, createTask, isLoading } = useTasks({ 
    date: format(viewDate, 'yyyy-MM-dd'), 
    excludeEvents: false 
  });
  const { folders, createFolder } = useFolders();
  const { checkAndUnlock } = useGamification();
  const { profile } = useProfile();
  const { colors } = usePriorityColors();
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [now, setNow] = useState(new Date());
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showFolderBar, setShowFolderBar] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [isCreatingQuickTask, setIsCreatingQuickTask] = useState(false);

  // Timer state
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState<'text' | 'voice' | 'recurrence' | null>(null);
  const [captureCreationSource, setCaptureCreationSource] = useState<'mini_plus' | 'mini_voice'>('mini_plus');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [recurrenceFlowOpen, setRecurrenceFlowOpen] = useState(false);
  const handleDetail = useCallback((t: any) => { setSelectedTask(t); setDetailOpen(true); }, []);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartRef = useRef<number>(0);
  const captureModalRef = useRef<TaskCaptureModalHandle>(null);

  const { onMouseDown: onDragMouseDown, hasMovedRef, isDraggingRef: isDraggingWindowRef } = useDragWindow();

  // Store original pill position before expanding (to restore on collapse)
  const originalPosRef = useRef<{ x: number; y: number } | null>(null);

  // LED animation state
  const [showLedGlow, setShowLedGlow] = useState(false);
  const hasInteractedRef = useRef(false);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isCalendarInteracting, setIsCalendarInteracting] = useState(false);
  const calendarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const TIME_PREFIX_REGEX = /^\[T:(\d{2}:\d{2})-(\d{2}:\d{2})\]/;
  const parseTimeFromDescription = (desc: string | null) => {
    if (!desc) return null;
    const match = desc.match(TIME_PREFIX_REGEX);
    if (!match) return null;
    return { start: match[1], end: match[2] };
  };

  const calendarEvents = useMemo((): DayEvent[] => {
    return tasks
      .filter((t: any) => t.status !== 'done')
      .map((t: any) => {
        const parsed = parseTimeFromDescription(t.description);
        const dateStr = t.due_date || format(new Date(), 'yyyy-MM-dd');
        const startTime = parsed
          ? parseISO(`${dateStr}T${parsed.start}:00`)
          : parseISO(`${dateStr}T08:00:00`);
        const endTime = parsed
          ? parseISO(`${dateStr}T${parsed.end}:00`)
          : addMinutes(startTime, 30);

        let color = colors.p4;
        if (t.urgency && t.importance) color = colors.p1;
        else if (t.urgency && !t.importance) color = colors.p2;
        else if (!t.urgency && t.importance) color = colors.p3;

        return {
          id: t.id,
          title: t.title,
          startTime,
          endTime,
          color: color === 'transparent' ? 'var(--primary)' : color,
        };
      });
  }, [tasks, colors]);

  // Timer logic
  const handleTimerToggle = useCallback((taskId: string, estimatedMinutes: number = 30) => {
    // 1. If there's an active timer, stop it and save progress first
    if (activeTimerId) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;

      const activeTask = tasks.find((t: any) => t.id === activeTimerId);
      if (activeTask) {
        const sessionElapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
        const newTotal = (activeTask.actual_duration_seconds || 0) + sessionElapsed;
        updateTask.mutate({ id: activeTimerId, actual_duration_seconds: newTotal });
      }

      const wasSameTask = activeTimerId === taskId;
      setActiveTimerId(null);
      setTimerSeconds(0);
      
      if (wasSameTask) return; // We just wanted to stop it
    }

    // 2. Start the new timer
    const targetTask = tasks.find((t: any) => t.id === taskId);
    if (!targetTask) return;

    setActiveTimerId(taskId);
    sessionStartRef.current = Date.now();
    
    // Display countdown based on estimate minus total already spent
    const initialDisplay = (estimatedMinutes * 60) - (targetTask.actual_duration_seconds || 0);
    setTimerSeconds(initialDisplay);
    
    timerRef.current = setInterval(() => {
      setTimerSeconds(s => s - 1); // Allow negative for over-time
    }, 1000);
  }, [activeTimerId, tasks, updateTask]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Resize pill when timer starts/stops (wider to show time)
  useEffect(() => {
    if (!isExpanded) {
      const api = (window as any).electronAPI;
      if (!api?.getMiniPosition || !api?.setMiniBounds) return;
      api.getMiniPosition().then((pos: any) => {
        if (!pos) return;
        const newW = activeTimerId ? PILL_TIMER_W : PILL_W;
        const dx = (pos.w - newW) / 2;
        api.setMiniBounds({ x: pos.x + dx, y: pos.y, w: newW, h: PILL_H });
      });
    }
  }, [activeTimerId, isExpanded]);

  const handleToggleExpand = useCallback(async () => {
    if (hasMovedRef.current) return;
    const api = (window as any).electronAPI;
    if (!api?.getMiniPosition || !api?.setMiniBounds) {
      setIsExpanded(prev => !prev);
      return;
    }

    if (!isExpanded) {
      // EXPANDING — save current pill position for later restore
      const pos = await api.getMiniPosition();
      if (!pos) { setIsExpanded(true); return; }

      originalPosRef.current = { x: pos.x, y: pos.y };

      const pillCX = pos.x + pos.w / 2;
      const pillCY = pos.y + pos.h / 2;

      // Center panel on pill, then clamp to screen work area
      let panelX = pillCX - PANEL_W / 2;
      let panelY = pillCY - PANEL_H / 2;

      // Clamp X to screen
      const maxX = pos.screenX + pos.screenW - PANEL_W;
      panelX = Math.max(pos.screenX, Math.min(panelX, maxX));

      // Clamp Y to screen
      const maxY = pos.screenY + pos.screenH - PANEL_H;
      panelY = Math.max(pos.screenY, Math.min(panelY, maxY));

      // Add 32px buffer for the protruding calendar tab
      const WINDOW_W = PANEL_W + 32;
      api.setMiniBounds({ x: Math.round(panelX), y: Math.round(panelY), w: WINDOW_W, h: PANEL_H });
      setIsExpanded(true);
    } else {
      // COLLAPSING — restore pill to original saved position
      const pillW = activeTimerId ? PILL_TIMER_W : PILL_W;
      const pos = await api.getMiniPosition();
      if (originalPosRef.current) {
        api.setMiniBounds({
          x: originalPosRef.current.x,
          y: originalPosRef.current.y,
          w: pillW,
          h: PILL_H,
        });
      } else if (pos) {
        // Fallback: center pill within current panel bounds
        const pillX = pos.x + Math.round((pos.w - pillW) / 2);
        const pillY = pos.y + Math.round((pos.h - PILL_H) / 2);
        api.setMiniBounds({ x: pillX, y: pillY, w: pillW, h: PILL_H });
      }
      setIsExpanded(false);
    }
  }, [isExpanded, hasMovedRef, activeTimerId]);

  const handleCalendarEnter = useCallback(async () => {
    if (calendarTimerRef.current) {
      clearTimeout(calendarTimerRef.current);
      calendarTimerRef.current = null;
    }
    setCalendarOpen(true);
    
    const api = (window as any).electronAPI;
    if (api?.getMiniPosition && api?.setMiniBounds) {
      const pos = await api.getMiniPosition();
      // Only expand if not already wide enough
      if (pos && pos.w < 700) {
        api.setMiniBounds({ x: pos.x, y: pos.y, w: 750, h: pos.h });
      }
    }
  }, []);

  const updateDescriptionWithTime = (currentDesc: string | null, start: Date, end: Date) => {
    const startStr = format(start, 'HH:mm');
    const endStr = format(end, 'HH:mm');
    const newPrefix = `[T:${startStr}-${endStr}]`;
    let newDesc = currentDesc || '';
    if (TIME_PREFIX_REGEX.test(newDesc)) {
      return newDesc.replace(TIME_PREFIX_REGEX, newPrefix);
    } else {
      return `${newPrefix} ${newDesc}`.trim();
    }
  };

  const handleGridClick = useCallback((startTime: Date) => {
    const end = addMinutes(startTime, 30);
    const startStr = format(startTime, 'HH:mm');
    const endStr = format(end, 'HH:mm');
    setCaptureOpen(true);
    setCaptureMode('text');
    setCaptureCreationSource('mini_plus');
    setTimeout(() => {
      captureModalRef.current?.openInTextMode(
        format(viewDate, 'yyyy-MM-dd'),
        '', // Title empty
        '', // Description empty
        `[T:${startStr}-${endStr}]` // Time prefix passed as internal metadata
      );
    }, 100);
  }, []);

  const handleCalendarLeave = useCallback(() => {
    // DO NOT CLOSE if user is dragging an event, if the detail modal is open, or if capture modal is open
    if (isCalendarInteracting || detailOpen || captureOpen) return;

    // 3000ms delay for a very generous grace period
    calendarTimerRef.current = setTimeout(async () => {
      // Final double-check before closing
      if (isCalendarInteracting || detailOpen || captureOpen) return;

      setCalendarOpen(false);
      calendarTimerRef.current = null;
      
      const api = (window as any).electronAPI;
      if (api?.getMiniPosition && api?.setMiniBounds) {
        const pos = await api.getMiniPosition();
        if (pos && pos.w >= 700) {
          const newX = pos.x + Math.round((pos.w - (PANEL_W + 32)) / 2);
          api.setMiniBounds({ x: newX, y: pos.y, w: PANEL_W + 32, h: PANEL_H });
        }
      }
    }, 3000);
  }, [isCalendarInteracting, detailOpen, captureOpen]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    document.documentElement.style.cssText += ';background:transparent!important';
    document.body.style.cssText += ';background:transparent!important';
    const root = document.getElementById('root');
    if (root) root.style.cssText += ';background:transparent!important';

    // Inject LED animation keyframes
    if (!document.getElementById('mini-led-keyframes')) {
      const style = document.createElement('style');
      style.id = 'mini-led-keyframes';
      style.textContent = `
        @keyframes ledPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes ledBorder {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Hide window until session is ready and user is authenticated
  useEffect(() => {
    if (!loading) {
      const ready = !!user;
      setIsReady(ready);
      
      // Initial state: ignore mouse events if collapsed so background is clickable
      if (ready && !isExpanded) {
        (window as any).electronAPI?.setIgnoreMouseEvents?.(true, { forward: true });
      } else if (ready && isExpanded) {
        (window as any).electronAPI?.setIgnoreMouseEvents?.(false);
      }
      
      (window as any).electronAPI?.miniReady?.({ hasSession: ready });

      if (ready && !hasInteractedRef.current) {
        setShowLedGlow(true);
      }
    }
  }, [loading, user, isExpanded]);

  const handleMouseEnterUI = useCallback(() => {
    if (user) (window as any).electronAPI?.setIgnoreMouseEvents?.(false);
  }, [user]);
  const handleMouseLeaveUI = useCallback(() => {
    // Only ignore mouse events when collapsed (pill mode) and NOT dragging
    if (user && !isExpanded && !isDraggingWindowRef.current) {
      (window as any).electronAPI?.setIgnoreMouseEvents?.(true, { forward: true });
    }
  }, [user, isExpanded]);

  const quadrantRank = useCallback((t: any) =>
    t.urgency && t.importance ? 0
    : t.urgency ? 1
    : t.importance ? 2
    : 3, []);

  // Stop timer if the task is completed in another window
  useEffect(() => {
    if (activeTimerId) {
      const activeTask = tasks.find((t: any) => t.id === activeTimerId);
      if (activeTask && activeTask.status === 'done') {
        // Save current session progress before stopping
        const sessionElapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
        const newTotal = (activeTask.actual_duration_seconds || 0) + sessionElapsed;
        updateTask.mutate({ id: activeTimerId, actual_duration_seconds: newTotal });

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setActiveTimerId(null);
        setTimerSeconds(0);
      }
    }
  }, [tasks, activeTimerId, updateTask]);

  const filteredTasks = useMemo(() => {
    // La pestaña "General" (null) solo muestra las tareas que NO tienen carpeta asignada
    if (!selectedFolderId) {
      return tasks.filter((t: any) => !t.folder_id);
    }
    // Si hay una carpeta seleccionada, muestra solo las tareas de esa carpeta
    return tasks.filter((t: any) => t.folder_id === selectedFolderId);
  }, [tasks, selectedFolderId]);

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a: any, b: any) => {
      const rankDiff = quadrantRank(a) - quadrantRank(b);
      if (rankDiff !== 0) return rankDiff;

      return (a.sort_order || 0) - (b.sort_order || 0);
    });
  }, [filteredTasks, quadrantRank]);

  const completedCount = filteredTasks.filter((t: any) => t.status === 'done').length;
  const totalCount = filteredTasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleToggle = useCallback((task: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!task) return;

    const userName = profile?.name || 'Emprendedor';

    if (task.status === 'done') {
      updateTask.mutate({ id: task.id, status: 'pending', completed_at: null });
    } else {
      setCompletingId(task.id);
      
      // STOP TIMER IF ACTIVE FOR THIS TASK
      let finalDuration = task.actual_duration_seconds || 0;
      const isTimerForThisTask = activeTimerId === task.id;

      if (isTimerForThisTask) {
         if (timerRef.current) clearInterval(timerRef.current);
         timerRef.current = null;
         const sessionElapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
         finalDuration += sessionElapsed;
         setActiveTimerId(null);
         setTimerSeconds(0);
      }

      const estimatedSeconds = (task.estimated_minutes || 0) * 60;
      const isOnTime = estimatedSeconds > 0 && finalDuration <= estimatedSeconds;

      console.log("Completing task:", { id: task.id, finalDuration, isOnTime });

      setTimeout(() => {
        const currentTasks = tasks || [];
        const remainingTasks = currentTasks.filter((t: any) => t.status !== 'done' && t.id !== task.id);
        const isLastTask = currentTasks.length > 0 && remainingTasks.length === 0;

        console.log("Mutating task update with:", { 
          id: task.id, 
          status: 'done', 
          completed_at: new Date().toISOString(),
          actual_duration_seconds: finalDuration
        });

        updateTask.mutate(
          { 
            id: task.id, 
            status: 'done', 
            completed_at: new Date().toISOString(),
            actual_duration_seconds: finalDuration
          },
          { 
            onSuccess: () => {
              console.log("Task updated successfully");
              setCompletingId(null);
              checkAndUnlock.mutate({ type: 'task_completed' });
              
              if (isLastTask) {
                triggerDailyCelebration(userName);
              } else if (isOnTime) {
                triggerOnTimeCelebration(task.title, userName);
              } else {
                triggerTaskCelebration(task.title, userName);
              }
            },
            onError: (err: any) => {
              console.error("Mutation error in handleToggle:", err);
              setCompletingId(null);
            }
          }
        );
      }, 350);
    }
  }, [updateTask, tasks, checkAndUnlock, profile?.name, activeTimerId]);

  // ── COLLAPSED PILL ──
  if (!isReady) {
    return <div style={{ width: '100%', height: '100%' }} />;
  }

  if (!isExpanded) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          onMouseEnter={handleMouseEnterUI}
          onMouseLeave={handleMouseLeaveUI}
          onMouseDown={(e) => {
            onDragMouseDown(e);
            // First interaction dismisses LED animation
            if (showLedGlow && !hasInteractedRef.current) {
              hasInteractedRef.current = true;
              setShowLedGlow(false);
            }
          }}
          onClick={(e) => {
            // First click also dismisses LED animation
            if (showLedGlow && !hasInteractedRef.current) {
              hasInteractedRef.current = true;
              setShowLedGlow(false);
            }
            handleToggleExpand(e);
          }}
          style={{
            height: 32, borderRadius: 999,
            padding: activeTimerId ? '0 12px' : '0',
            width: activeTimerId ? 'auto' : 64,
            minWidth: activeTimerId ? 110 : 64,
            background: C.bg,
            border: `1px solid ${activeTimerId ? (timerSeconds < 0 ? 'rgba(248,113,113,0.25)' : 'rgba(33, 217, 4, 0.25)') : C.border}`,
            boxShadow: showLedGlow
              ? '0 0 0 0 rgba(33, 217, 4, 0.4), 0 0 20px 4px rgba(33, 217, 4, 0.3), 0 0 40px 8px rgba(33, 217, 4, 0.15), inset 0 0 8px rgba(33, 217, 4, 0.1)'
              : activeTimerId
                ? (timerSeconds < 0 ? '0 4px 20px rgba(248,113,113,0.15)' : '0 4px 20px rgba(33, 217, 4, 0.15)')
                : '0 4px 20px rgba(1, 38, 14, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            userSelect: 'none', cursor: 'grab',
            position: 'relative',
            animation: showLedGlow ? 'ledPulse 1.5s ease-in-out infinite' : 'none',
            willChange: 'transform, opacity',
          }}
        >
          {showLedGlow && (
            <div style={{
              position: 'absolute', inset: -3, borderRadius: 999,
              border: `2px solid rgba(33, 217, 4, 0.5)`,
              animation: 'ledBorder 2s ease-in-out infinite',
              pointerEvents: 'none',
            }} />
          )}
          {activeTimerId ? (
            <>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: timerSeconds < 0 ? '#F87171' : C.accent, animation: 'pulse 1.5s ease-in-out infinite',
              }} />
              <span style={{
                fontSize: 16, fontWeight: 900, 
                color: timerSeconds < 0 ? '#F87171' : C.accent,
                fontFamily: 'monospace', letterSpacing: '0.05em',
                textShadow: '0 0 10px rgba(33, 217, 4, 0.3)'
              }}>
                {formatTimer(timerSeconds)}
              </span>
            </>
          ) : (
            <MoreHorizontal style={{ width: 20, height: 20, color: C.text }} />
          )}
        </div>
      </div>
    );
  }

  // Detect if running in browser (not Electron) for preview mode
  const isElectron = !!(window as any).electronAPI;

  // ── EXPANDED PANEL ──
  // In browser: render inside a preview shell that simulates the floating window
  const panelContent = (
    <>
    {/* OUTER: position context — no overflow clip so the tab can protrude */}
    <div
      onMouseEnter={() => {
        handleMouseEnterUI();
        // Clear any pending calendar close timer when mouse enters the interface
        if (calendarTimerRef.current) {
          clearTimeout(calendarTimerRef.current);
          calendarTimerRef.current = null;
        }
      }}
      onMouseLeave={(e) => {
        if (showLedGlow && !hasInteractedRef.current) {
          hasInteractedRef.current = true;
          setShowLedGlow(false);
        }
        handleMouseLeaveUI(e as any);
        handleCalendarLeave();
      }}
      style={{
        position: isElectron ? 'fixed' : 'relative',
        inset: isElectron ? 0 : undefined,
        width: isElectron ? undefined : (calendarOpen ? PANEL_W + 410 : PANEL_W + 32),
        height: isElectron ? undefined : '100%',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: C.text,
        overflow: 'visible', // Ensure tab doesn't clip
      }}
    >
    {/* TAB: Put it BEFORE the Inner panel in JSX so it naturally renders 'behind' but is still interactive */}
    <motion.div
      onMouseEnter={isAdmin ? handleCalendarEnter : undefined}
      onMouseLeave={isAdmin ? handleCalendarLeave : undefined}
      animate={{ 
        opacity: calendarOpen ? 0 : 1, 
        x: calendarOpen ? 12 : 0 
      }}
      whileHover={isAdmin ? { 
        scale: 1.05,
        boxShadow: `0 0 25px rgba(34, 197, 94, 0.4)`,
        borderColor: '#4ADE80'
      } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        position: 'absolute',
        // Protrude relative to the TASK PANEL edge
        left: PANEL_W - 24,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 48, height: 48, 
        borderRadius: '50%',
        background: isAdmin ? 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)' : 'linear-gradient(135deg, #374151 0%, #1F2937 100%)', // Premium dark emerald or gray
        border: `1.5px solid ${isAdmin ? '#10B981' : '#4B5563'}`, // Vibrant emerald border or gray
        boxShadow: '4px 0 16px rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: isAdmin ? 'pointer' : 'not-allowed', 
        pointerEvents: calendarOpen ? 'none' : 'auto',
      }}
      title={isAdmin ? "Ver calendario" : "Calendario (Pronto)"}
    >
      <CalendarDays style={{ width: 22, height: 22, color: isAdmin ? '#4ADE80' : '#9CA3AF', marginLeft: 12 }} />
    </motion.div>

    {/* INNER: visual panel with clipping */}
    <div style={{
      position: 'absolute',
      left: 0, top: 0, bottom: 0,
      width: calendarOpen ? PANEL_W + 410 : PANEL_W,
      background: C.bg, borderRadius: isElectron ? 20 : 18,
      border: `1px solid ${C.border}`,
      boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
      display: 'flex', flexDirection: 'row',
      overflow: 'hidden',
      boxSizing: 'border-box',
      transition: 'width 0.3s ease', // Smoothly match the window expansion
    }}>
      {/* Left panel: tasks */}
      <div style={{ width: PANEL_W, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Top bar — fully draggable */}
      <div onMouseDown={onDragMouseDown} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px 6px', flexShrink: 0, cursor: 'grab', userSelect: 'none',
      }}>
        {/* LEFT: collapse pill (…) + direct action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Collapse / timer pill — same ... design as collapsed state */}
          <div onClick={handleToggleExpand} style={{
            height: 26, borderRadius: 999,
            padding: activeTimerId ? '0 10px' : '0',
            width: activeTimerId ? 'auto' : 52,
            minWidth: activeTimerId ? 90 : 52,
            background: activeTimerId ? 'rgba(33, 217, 4, 0.1)' : C.subBg,
            border: `1px solid ${activeTimerId ? 'rgba(33, 217, 4, 0.2)' : C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            cursor: 'pointer',
          }} title="Colapsar">
            {activeTimerId ? (
              <>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: timerSeconds < 0 ? '#F87171' : C.accent, animation: 'pulse 1.5s ease-in-out infinite' }} />
                <span style={{ 
                  fontSize: 13, fontWeight: 900, 
                  color: timerSeconds < 0 ? '#F87171' : C.accent, 
                  fontFamily: 'monospace',
                  textShadow: '0 0 8px rgba(33, 217, 4, 0.2)'
                }}>
                  {formatTimer(timerSeconds)}
                </span>
              </>
            ) : (
              <MoreHorizontal style={{ width: 16, height: 16, color: C.muted }} />
            )}
          </div>

          {/* 1. TEXT button — + icon */}
          <div
            onClick={(e) => { e.stopPropagation(); setCaptureMode('text'); setCaptureCreationSource('mini_plus'); setCaptureOpen(true); }}
            style={{
              width: 34, height: 28, borderRadius: 10,
              background: C.subBg,
              border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
              transition: 'all 0.2s ease',
            }}
            title="Añadir tarea"
          >
            <Plus style={{ width: 16, height: 16, color: C.text }} />
          </div>

          {/* 2. VOICE button — Audio icon */}
          <div
            onClick={(e) => { e.stopPropagation(); setCaptureMode('voice'); setCaptureCreationSource('mini_voice'); setCaptureOpen(true); }}
            style={{
              width: 34, height: 28, borderRadius: 10,
              background: C.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
              boxShadow: '0 4px 12px rgba(33, 217, 4, 0.3)',
            }}
            title="Añadir por voz"
          >
            <Mic style={{ width: 15, height: 15, color: C.bg }} />
          </div>

          {/* 3. FOLDERS Toggle Button */}
          <div
            onClick={(e) => { e.stopPropagation(); setShowFolderBar(!showFolderBar); }}
            style={{
              width: 34, height: 28, borderRadius: 10,
              background: showFolderBar ? C.accent : C.subBg,
              border: `1px solid ${showFolderBar ? 'transparent' : C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
              transition: 'all 0.2s ease',
            }}
            title="Ver carpetas"
          >
            <Folder style={{ width: 14, height: 14, color: showFolderBar ? '#000' : C.text }} />
          </div>

          {/* 4. RECURRENCE button — Repeat icon */}
          <div
            onClick={(e) => { 
              e.stopPropagation(); 
              setRecurrenceFlowOpen(true);
            }}
            style={{
              width: 34, height: 28, borderRadius: 10,
              background: C.subBg,
              border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
              transition: 'all 0.2s ease',
            }}
            title="Crear tarea recurrente"
          >
            <Repeat style={{ width: 14, height: 14, color: C.text }} />
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: C.text, lineHeight: 1 }}>
            {format(now, 'h:mm')}
            <span style={{ fontSize: 13, fontWeight: 600, color: C.muted, marginLeft: 3 }}>{format(now, 'a')}</span>
          </div>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {format(now, 'EEE d MMM', { locale: es })}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', flexShrink: 0, margin: '0 0 2px' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ height: '100%', background: C.accent }} />
        </div>
      )}

      {/* Folder bar — Toggleable */}
      <AnimatePresence>
        {showFolderBar && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: 6, 
              padding: '8px 12px', overflowX: 'auto', 
              borderBottom: `1px solid ${C.border}33`,
              background: 'rgba(255,255,255,0.02)'
            }} className="no-scrollbar">
              <button
                onClick={() => setSelectedFolderId(null)}
                style={{
                  flexShrink: 0, padding: '4px 12px', borderRadius: 8,
                  fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                  background: !selectedFolderId ? C.accent : 'transparent',
                  color: !selectedFolderId ? '#000' : C.muted,
                  border: `1px solid ${!selectedFolderId ? 'transparent' : C.border}`,
                  display: 'flex', alignItems: 'center', gap: 4,
                  transition: 'all 0.2s ease'
                }}
              >
                General
              </button>
              {folders.map(folder => (
                <div key={folder.id} style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', borderRadius: 8,
                  background: selectedFolderId === folder.id ? C.accent : 'transparent',
                  border: `1px solid ${selectedFolderId === folder.id ? 'transparent' : C.border}`,
                  overflow: 'hidden',
                  transition: 'all 0.2s ease'
                }}>
                  <button
                    onClick={() => setSelectedFolderId(folder.id)}
                    style={{
                      padding: '4px 8px 4px 12px',
                      fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                      color: selectedFolderId === folder.id ? '#000' : C.muted,
                      border: 'none', background: 'transparent', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    {folder.isShared ? (
                      <UsersIcon style={{ width: 10, height: 10, color: selectedFolderId === folder.id ? '#000' : folder.color }} />
                    ) : (
                      <motion.div
                        key={selectedFolderId === folder.id ? 'open' : 'closed'}
                        initial={{ rotateY: selectedFolderId === folder.id ? 180 : -180, scale: 0.8 }}
                        animate={{ rotateY: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                        style={{ display: 'flex' }}
                      >
                        {selectedFolderId === folder.id ? (
                          <FolderOpen style={{ width: 10, height: 10, color: '#000' }} />
                        ) : (
                          <Folder style={{ width: 10, height: 10, color: folder.color }} />
                        )}
                      </motion.div>
                    )}
                    {folder.name}
                  </button>
                </div>
              ))}
              {isCreatingFolder ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, background: 'rgba(0,0,0,0.15)', padding: 8, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      autoFocus
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newFolderName.trim()) {
                          createFolder.mutate({ name: newFolderName.trim(), color: newFolderColor });
                          setNewFolderName('');
                          setNewFolderColor(FOLDER_COLORS[0]);
                          setIsCreatingFolder(false);
                        }
                        if (e.key === 'Escape') {
                          setIsCreatingFolder(false);
                          setNewFolderName('');
                        }
                      }}
                      placeholder="Nombre del proyecto"
                      style={{
                        padding: '4px 8px', borderRadius: 8, fontSize: 10, fontWeight: 600,
                        background: 'rgba(0,0,0,0.2)', border: `1px solid ${C.border}`,
                        color: C.text, outline: 'none', width: 120
                      }}
                    />
                    <button
                      onClick={() => {
                        if (newFolderName.trim()) {
                          createFolder.mutate({ name: newFolderName.trim(), color: newFolderColor });
                          setNewFolderName('');
                          setNewFolderColor(FOLDER_COLORS[0]);
                          setIsCreatingFolder(false);
                        }
                      }}
                      style={{ padding: 4, background: C.accent, borderRadius: 6, border: 'none', cursor: 'pointer', color: '#000' }}
                      title="Guardar"
                    >
                      <Check style={{ width: 12, height: 12 }} />
                    </button>
                    <button
                      onClick={() => { setIsCreatingFolder(false); setNewFolderName(''); }}
                      style={{ padding: 4, background: 'transparent', border: 'none', cursor: 'pointer', color: C.muted }}
                      title="Cancelar"
                    >
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 4, paddingBottom: 2 }}>
                    {FOLDER_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setNewFolderColor(c)}
                        style={{
                          width: 14, height: 14, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                          boxShadow: newFolderColor === c ? `0 0 0 2px ${C.bg}, 0 0 0 4px ${c}` : 'none'
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreatingFolder(true)}
                  style={{
                    flexShrink: 0, padding: '4px 12px', borderRadius: 8,
                    fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                    background: 'transparent', color: C.muted, border: `1px dashed ${C.border}`,
                    display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s ease', cursor: 'pointer'
                  }}
                  title="Crear nueva carpeta"
                >
                  <Plus style={{ width: 10, height: 10 }} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px 10px' }}>
        {selectedFolderId && (
          <div style={{ padding: '0 8px', marginBottom: 12, display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setCaptureMode('text'); setCaptureCreationSource('mini_plus'); setCaptureOpen(true); }}
              style={{
                flex: 1, height: 36, borderRadius: 12,
                background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                color: C.text, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                cursor: 'pointer', transition: 'all 0.2s ease'
              }}
            >
              <Plus style={{ width: 14, height: 14, color: C.muted }} /> Texto
            </button>
            <button
              onClick={() => { setCaptureMode('voice'); setCaptureCreationSource('mini_voice'); setCaptureOpen(true); }}
              style={{
                flex: 1, height: 36, borderRadius: 12,
                background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                color: C.text, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                cursor: 'pointer', transition: 'all 0.2s ease'
              }}
            >
              <Mic style={{ width: 14, height: 14, color: C.accent }} /> Audio
            </button>
          </div>
        )}

        {loading || isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
            <div style={{ width: 20, height: 20, border: `2px solid ${C.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : !user ? (
          <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, padding: 16 }}>Abre la app principal primero.</p>
        ) : sortedTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <span style={{ fontSize: 28 }}>✨</span>
            <p style={{ fontSize: 11, fontWeight: 800, marginTop: 8, color: C.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {selectedFolderId ? 'Sin tareas en esta carpeta' : '¡Día despejado!'}
            </p>
          </div>
        ) : (
          <div key="task-list-items">
            <AnimatePresence mode="popLayout">
              {sortedTasks.map((task: any) => (
                <TaskRow 
                  key={task.id}
                  task={completingId === task.id ? { ...task, status: 'done' } : task}
                  onToggle={handleToggle}
                  onDetail={handleDetail}
                  activeTimerId={activeTimerId}
                  onTimerToggle={handleTimerToggle}
                  updateTask={updateTask}
                  folders={folders} 
                />
              ))}
            </AnimatePresence>
            {totalCount > 0 && completedCount === totalCount && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }}
                style={{ margin: '6px 0', padding: '10px', borderRadius: 12, textAlign: 'center', background: C.accentBg, border: '1px solid rgba(163,230,53,0.2)' }}
              >
                <span style={{ fontSize: 20 }}>🏆</span>
                <p style={{ fontSize: 12, fontWeight: 800, color: C.accent, marginTop: 4 }}>¡Todo completado!</p>
              </motion.div>
            )}
          </div>
        )}
      </div> {/* close Task list scroll area */}
      </div> {/* close Left content area */}

      <AnimatePresence>
        {calendarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0, x: 40, scale: 0.96 }}
            animate={{ width: 410, opacity: 1, x: 0, scale: 1 }}
            exit={{ width: 0, opacity: 0, x: 40, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 1 }}
            style={{ 
              flexShrink: 0, 
              borderLeft: `1px solid rgba(255,255,255,0.06)`, 
              display: 'flex', flexDirection: 'column', 
              overflow: 'hidden',
              background: 'rgba(20, 20, 20, 0.5)', // Slightly darker glass
              backdropFilter: 'blur(24px) saturate(120%)', // High-fidelity glass
              boxShadow: '-15px 0 40px rgba(0,0,0,0.4), inset 1px 0 0 rgba(255,255,255,0.03)',
            }}
            onMouseEnter={handleCalendarEnter}
            onMouseLeave={handleCalendarLeave}
          >
            <div 
              style={{ width: 410, height: '100%', flex: 1, minWidth: 410 }}
              onMouseEnter={() => {
                if (calendarTimerRef.current) {
                  clearTimeout(calendarTimerRef.current);
                  calendarTimerRef.current = null;
                }
              }}
            >
              <MiniDayView 
                events={calendarEvents} 
                currentDate={viewDate} 
                onDateChange={setViewDate}
                onEventClick={(id) => {
                  const task = tasks.find((t: any) => t.id === id);
                  if (task) handleDetail(task);
                }}
                onEventUpdate={(id, newStart) => {
                  const task = tasks.find((t: any) => t.id === id);
                  if (!task) return;
                  const event = calendarEvents.find(e => e.id === id);
                  if (!event) return;
                  const duration = differenceInMinutes(event.endTime, event.startTime);
                  const newEnd = addMinutes(newStart, duration);
                  const newDesc = updateDescriptionWithTime(task.description, newStart, newEnd);
                  updateTask.mutate({ id, description: newDesc });
                }}
                onEventResize={(id, newEnd) => {
                  const task = tasks.find((t: any) => t.id === id);
                  if (!task) return;
                  const event = calendarEvents.find(e => e.id === id);
                  if (!event) return;
                  const newDesc = updateDescriptionWithTime(task.description, event.startTime, newEnd);
                  updateTask.mutate({ id, description: newDesc });
                }}
                onGridClick={handleGridClick}
                onInteractionChange={setIsCalendarInteracting}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div> {/* close INNER visual panel */}
    </div> {/* close OUTER position context */}

    <TaskCaptureModal
      ref={captureModalRef}
      open={captureOpen}
      onClose={() => { setCaptureOpen(false); setCaptureMode(null); }}
      initialMode={captureMode}
      creationSource={captureCreationSource}
      folderId={selectedFolderId || undefined}
    />
    <TaskDetailModal task={selectedTask} open={detailOpen} onClose={() => setDetailOpen(false)} />
    <QuickRecurrenceFlow open={recurrenceFlowOpen} onClose={() => setRecurrenceFlowOpen(false)} />
  </>
  );

  // In Electron, render normally (full-window)
  if (isElectron) return panelContent;

  // In browser, wrap in a preview shell simulating the floating mini window
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(10,10,10,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Preview label */}
      <div style={{
        position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
        fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)',
        letterSpacing: '0.1em', textTransform: 'uppercase', userSelect: 'none',
      }}>
        Vista previa — Mini Ventana
      </div>

      {/* Simulated window — overflow visible so tab protrudes */}
      <div style={{
        width: PANEL_W + (calendarOpen ? 410 + 16 : 0),
        height: PANEL_H,
        position: 'relative',
        transition: 'width 0.3s ease',
        borderRadius: 20,
        overflow: 'visible',
      }}>
        {panelContent}
      </div>
    </div>
  );
};

const MiniTasksPage = () => <MiniTaskList />;
export default MiniTasksPage;
