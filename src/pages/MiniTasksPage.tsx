/**
 * MiniTasksPage â€” Adaptive floating pill widget.
 * - Pill (collapsed): small window, draggable ANYWHERE freely
 * - Expanded: panel that adapts direction based on screen position
 * - Inline per-task timer with primary accent
 * - When timer active: pill shows running time with primary numbers
 */
import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import type { CSSProperties } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useFolders } from '@/hooks/useFolders';
import { format, parseISO, addMinutes, startOfMonth, endOfMonth } from 'date-fns';
import { Check, CalendarDays, Plus, Repeat, Paperclip, X, ChevronsLeft, Search, Music, Clock3, Pause, Play, Folder, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import TaskCaptureModal, { type TaskCaptureModalHandle } from '@/components/TaskCaptureModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import QuickRecurrenceFlow from '@/components/QuickRecurrenceFlow';
import FirstTaskSignupModal from '@/components/FirstTaskSignupModal';
import { TaskCheckbox } from '@/components/TaskCheckbox';
import { TaskDurationBadge, TaskTimerButton } from '@/components/TaskTime';
import { useGamification } from '@/hooks/useGamification';
import { triggerTaskCelebration, triggerDailyCelebration, triggerOnTimeCelebration } from '@/lib/celebrations';
import { useProfile } from '@/hooks/useProfile';
import { usePriorityColors } from '@/hooks/usePriorityColors';
import { useTheme } from '@/contexts/ThemeProvider';
import AdonaiCalendarView from '@/components/calendar/AdonaiCalendarView';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { compareTasksWithinQuadrants, getTaskManualOrderGroupKey } from '@/lib/taskOrdering';
import { buildTaskDateSections, getFutureTaskGroupLabel } from '@/lib/taskDateGroups';
import { trackAnalyticsEvent } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import {
  readStoredCalendarDate,
  readStoredCalendarViewMode,
  subscribeCalendarState,
  writeCalendarDate,
  writeCalendarViewMode,
} from '@/lib/calendarStateSync';
import '../index.css';

type MiniTask = {
 id: string;
 title: string;
 status?: string | null;
 link?: string | null;
 description?: string | null;
 due_date?: string | null;
 folder_id?: string | null;
 parent_task_id?: string | null;
 urgency?: boolean | null;
 importance?: boolean | null;
 estimated_minutes?: number | null;
  actual_duration_seconds?: number | null;
  recurrence_id?: string | null;
  sort_order?: number | null;
  subtasks?: unknown[] | null;
  subtasks_count?: number | null;
  subtask_count?: number | null;
  children?: unknown[] | null;
};

type MiniTaskMutation = {
 mutate: (payload: { id: string } & Record<string, unknown>) => void;
};

type MiniFolder = {
 id: string;
 name?: string | null;
 deleted_at?: string | null;
 isShared?: boolean;
};

const FOLDER_COLORS = ['#5B7CFA', '#4F6EE8', '#6FCF97', '#F4B860', '#EB5757', '#7C97FF', '#9CA3AF', '#E5E7EB'];

const PANEL_W = 408;
const PANEL_H = 550;
const CALENDAR_W = 600;
const PILL_W = 24;
const PILL_H = 104;
const PILL_TIMER_W = 24;
const MINI_FOLDER_TABS_STORAGE_KEY = 'adonai_mini_folder_tabs_open';
const CURSOR_CLICK = 'var(--cursor-hand-point), pointer';
const CURSOR_GRAB = 'var(--cursor-hand), grab';

const C = {
 bg: 'var(--mini-bg)',
 border: 'var(--mini-border)',
 text: 'var(--mini-text)',
 muted: 'var(--mini-muted)',
 accent: 'var(--mini-accent)',
 accentBg: 'var(--mini-accent-bg)',
 accentSoft: 'var(--mini-accent-soft)',
 accentBorder: 'var(--mini-accent-border)',
 accentGlow: 'var(--mini-accent-glow)',
 taskBg: 'var(--mini-task-bg)',
 taskBorder: 'var(--mini-task-border)',
 subBg: 'var(--mini-sub-bg)',
};

type MiniThemeVars = CSSProperties & Record<`--mini-${string}`, string>;

const getMiniThemeVars = (_isDarkMode: boolean): MiniThemeVars => ({
 '--mini-bg': '#F5F0E1',
 '--mini-border': 'rgba(30, 41, 59, 0.12)',
 '--mini-text': '#1F2937',
 '--mini-muted': 'rgba(75, 85, 99, 0.58)',
 '--mini-accent': '#111827',
 '--mini-accent-bg': 'rgba(255, 255, 255, 0.34)',
 '--mini-accent-soft': '#111827',
 '--mini-accent-border': '#111827',
 '--mini-accent-glow': 'rgba(17, 24, 39, 0.14)',
 '--mini-task-bg': 'rgba(255, 255, 255, 0.34)',
 '--mini-task-border': 'rgba(30, 41, 59, 0.12)',
 '--mini-sub-bg': 'rgba(255, 255, 255, 0.42)',
});

const getApplePillStyles = (isDarkMode: boolean) => ({
 background: isDarkMode? 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(242,245,250,0.90))': 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(242,245,250,0.90))',
 border: 'rgba(255,255,255,0)',
 shadow: '0 14px 30px rgba(15,23,42,0.18), 0 2px 8px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.72)',
});

const AppleDots = ({ size = 6, isDarkMode }: { size?: number; isDarkMode: boolean }) => (
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: size * 0.72 }}>
 {[0, 1, 2].map((dot) => (
 <span
 key={dot}
 style={{
 width: size,
 height: size,
 borderRadius: '50%',
 background: 'linear-gradient(180deg, rgba(91,124,250,0.90), rgba(54,75,156,0.58))',
 boxShadow: '0 1px 2px rgba(15,23,42,0.14), inset 0 1px 0 rgba(255,255,255,0.70)',
 opacity: dot === 1? 0.82: 0.68,
 }}
 />
 ))}
 </div>
);

const TimerText = ({ seconds, compact = false }: { seconds: number; compact?: boolean }) => (
 <span style={{
 fontSize: compact? 13.5: 15.5,
 fontWeight: compact? 780: 820,
 color: seconds < 0? '#FF9B9B': '#F8FAFF',
 fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Rounded", "SF Pro Display", system-ui, sans-serif',
 fontVariantNumeric: 'tabular-nums',
 letterSpacing: 0,
 lineHeight: 1,
 textShadow: seconds < 0? '0 0 8px rgba(255,122,122,0.24)': '0 1px 3px rgba(0,0,0,0.72)',
 }}>
 {formatTimer(seconds)}
 </span>
);

function formatTimer(seconds: number): string {
 const isNegative = seconds < 0;
 const absS = Math.abs(seconds);
 const m = Math.floor(absS / 60);
 const s = absS % 60;
 return `${isNegative? '-': ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const TIME_PREFIX_REGEX = /^\[T:(\d{2}:\d{2})-(\d{2}:\d{2})\]/;

const parseTimeFromDescription = (desc: string | null) => {
 if (!desc) return null;
 const match = desc.match(TIME_PREFIX_REGEX);
 if (!match) return null;
 return { start: match[1], end: match[2] };
};


// â”€â”€â”€ Task Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TaskRowRaw = ({ task, taskIdx, onToggle, onDetail, activeTimerId, onTimerToggle, updateTask, folders, currentDate, ensureCalendarOpen, onReorderPointerStart }: {
 task: MiniTask; onToggle: (task: MiniTask) => void; onDetail: (task: MiniTask) => void;
 activeTimerId: string | null; onTimerToggle: (taskId: string, estimatedMinutes?: number) => void;
 updateTask: MiniTaskMutation; folders: Array<{ id: string; name?: string }>; currentDate: Date; ensureCalendarOpen?: () => void;
 taskIdx?: number; onReorderPointerStart?: (idx: number, clientX: number, clientY: number) => void;
}) => {
 const isDone = task.status === 'done';
 const visibleSubtasks = useMemo(() => {
 const raw = Array.isArray(task.children) ? task.children : Array.isArray(task.subtasks) ? task.subtasks : [];
 return raw.filter((item): item is MiniTask => Boolean(item && typeof item === 'object' && 'id' in item && 'title' in item));
 }, [task.children, task.subtasks]);
 const hasSubtasks = Boolean(
   visibleSubtasks.length > 0 ||
   (typeof task.subtasks_count === 'number' && task.subtasks_count > 0) ||
   (typeof task.subtask_count === 'number' && task.subtask_count > 0)
 );
  const { createTask } = useTasks();
  const [open, setOpen] = useState(false);
 const isTimerActive = activeTimerId === task.id;
 const [isEditing, setIsEditing] = useState(false);
 const [draftTitle, setDraftTitle] = useState(task.title);
  const [isSubtaskOpen, setIsSubtaskOpen] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const subtaskEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const reorderPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const reorderStartRef = useRef<{ x: number; y: number; type: string } | null>(null);
 const suppressDetailClickRef = useRef(false);

 const resizeEditor = useCallback(() => {
 const editor = editorRef.current;
 if (!editor) return;
 editor.style.height = 'auto';
 editor.style.height = `${Math.min(editor.scrollHeight, 190)}px`;
 }, []);

 useEffect(() => {
 if (!isEditing) return;
 resizeEditor();
 }, [draftTitle, isEditing, resizeEditor]);

  const submitEdit = () => {
  setIsEditing(false);
  const normalizedTitle = draftTitle.replace(/\r\n/g, '\n');
  if (normalizedTitle.trim() && normalizedTitle !== task.title) {
  updateTask.mutate({ id: task.id, title: normalizedTitle });
 } else {
 setDraftTitle(task.title);
 }
 };

 const { colors } = usePriorityColors();
 const getTaskPriorityColor = () => {
 if (task.urgency && task.importance) return colors.p1;
 if (task.urgency &&!task.importance) return colors.p2;
 if (!task.urgency && task.importance) return colors.p3;
 return colors.p4;
 };
 const priorityColor = getTaskPriorityColor();
 const timerHoverColor = priorityColor === 'transparent'? 'rgba(31,41,55,0.075)': `${priorityColor}26`;
 const actualSeconds = task.actual_duration_seconds || 0;
  const buildCalendarEvent = useCallback(() => {
 const parsed = parseTimeFromDescription(task.description);
 const dateStr = task.due_date || format(currentDate, 'yyyy-MM-dd');
 const startTime = parsed? parseISO(`${dateStr}T${parsed.start}:00`): parseISO(`${dateStr}T08:00:00`);
 const endTime = parsed? parseISO(`${dateStr}T${parsed.end}:00`): addMinutes(startTime, 30);

 return {
 id: task.id,
 title: task.title,
 startTime,
 endTime,
 color: priorityColor === 'transparent'? 'var(--primary)': priorityColor,
 isAllDay: false,
 };
 }, [currentDate, priorityColor, task.description, task.due_date, task.id, task.title]);

 const startExternalDrag = useCallback((x: number, y: number) => {
 window.dispatchEvent(new CustomEvent('adonai:external-drag-start', {
 detail: { task: buildCalendarEvent(), x, y }
 }));
 }, [buildCalendarEvent]);

 const moveExternalDrag = useCallback((x: number, y: number) => {
 window.dispatchEvent(new CustomEvent('adonai:external-drag-move', { detail: { x, y } }));
 }, []);

 const endExternalDrag = useCallback(() => {
 window.dispatchEvent(new CustomEvent('adonai:external-drag-end'));
 }, []);

 const handleMouseDownDrag = useCallback((e: React.MouseEvent) => {
 e.preventDefault();
 e.stopPropagation();
 ensureCalendarOpen?.();
 const startX = e.clientX;
 const startY = e.clientY;
 let dragging = false;

 const onMove = (ev: MouseEvent) => {
 if (!dragging && (Math.abs(ev.clientX - startX) > 5 || Math.abs(ev.clientY - startY) > 5)) {
 dragging = true;
 startExternalDrag(startX, startY);
 }
 if (dragging) moveExternalDrag(ev.clientX, ev.clientY);
 };

 const onUp = (ev: MouseEvent) => {
 window.removeEventListener('mousemove', onMove);
 window.removeEventListener('mouseup', onUp);
 if (dragging) {
 moveExternalDrag(ev.clientX, ev.clientY);
 endExternalDrag();
 }
 };

 window.addEventListener('mousemove', onMove);
 window.addEventListener('mouseup', onUp);
 }, [endExternalDrag, ensureCalendarOpen, moveExternalDrag, startExternalDrag]);

 const handleTouchStartDrag = useCallback((e: React.TouchEvent) => {
 const touch = e.touches[0];
 if (!touch) return;
 ensureCalendarOpen?.();
 const startX = touch.clientX;
 const startY = touch.clientY;
 let dragging = false;
 let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
 dragging = true;
 startExternalDrag(startX, startY);
 if ('vibrate' in navigator) navigator.vibrate(30);
 }, 220);

 const onMove = (ev: TouchEvent) => {
 const current = ev.touches[0];
 if (!current) return;
 if (!dragging) {
 const moveX = Math.abs(current.clientX - startX);
 const moveY = Math.abs(current.clientY - startY);
 if (moveX > 10 || moveY > 10) {
 if (timer) clearTimeout(timer);
 timer = null;
 }
 return;
 }
 if (ev.cancelable) ev.preventDefault();
 moveExternalDrag(current.clientX, current.clientY);
 };

 const onEnd = (ev: TouchEvent) => {
 window.removeEventListener('touchmove', onMove);
 window.removeEventListener('touchend', onEnd);
 window.removeEventListener('touchcancel', onEnd);
 if (timer) clearTimeout(timer);
 if (dragging) {
 const endTouch = ev.changedTouches[0];
 if (endTouch) moveExternalDrag(endTouch.clientX, endTouch.clientY);
 endExternalDrag();
 }
 };

 window.addEventListener('touchmove', onMove, { passive: false });
 window.addEventListener('touchend', onEnd);
 window.addEventListener('touchcancel', onEnd);
 }, [endExternalDrag, ensureCalendarOpen, moveExternalDrag, startExternalDrag]);

 const clearReorderPressTimer = () => {
 if (reorderPressTimerRef.current) {
 clearTimeout(reorderPressTimerRef.current);
 reorderPressTimerRef.current = null;
 }
 };

 const handleRowPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
 const target = event.target as HTMLElement;
 if (
 isDone ||
 isEditing ||
 taskIdx === undefined ||
 !onReorderPointerStart ||
 target.closest('button, a, input, textarea, select')
 ) {
 return;
 }

 reorderStartRef.current = { x: event.clientX, y: event.clientY, type: event.pointerType };
 clearReorderPressTimer();
 reorderPressTimerRef.current = setTimeout(() => {
 const start = reorderStartRef.current;
 if (!start) return;
 suppressDetailClickRef.current = true;
 if ('vibrate' in navigator) navigator.vibrate(18);
 onReorderPointerStart(taskIdx, start.x, start.y);
 }, event.pointerType === 'touch' ? 300 : 170);
 }, [isDone, isEditing, onReorderPointerStart, taskIdx]);

 const handleRowPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
 const start = reorderStartRef.current;
 if (!start || !reorderPressTimerRef.current || start.type !== 'touch') return;
 if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) {
 clearReorderPressTimer();
 reorderStartRef.current = null;
 }
 }, []);

 const handleRowPointerEnd = useCallback(() => {
 clearReorderPressTimer();
 reorderStartRef.current = null;
 }, []);

 const handleRowDetail = useCallback(() => {
 if (suppressDetailClickRef.current) {
 suppressDetailClickRef.current = false;
 return;
 }
 onDetail(task);
 }, [onDetail, task]);

 return (
 <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95 }} style={{ marginBottom: 0 }}>
 <div 
 className="group/task"
 onClick={handleRowDetail}
 onPointerDown={handleRowPointerDown}
 onPointerMove={handleRowPointerMove}
 onPointerUp={handleRowPointerEnd}
 onPointerCancel={handleRowPointerEnd}
  style={{
  display: 'flex', alignItems: 'flex-start', gap: 9, padding: '10px 0 10px 0', flexWrap: 'wrap',
 borderRadius: 0, cursor: CURSOR_GRAB,
 background: 'transparent',
 borderTop: 'none',
 borderRight: 'none',
 borderLeft: 'none',
 opacity: isDone? 0.45: 1,
 }}
 >
 <div 
 onClick={(e) => { e.stopPropagation(); onToggle(task); }} 
 style={{ flexShrink: 0 }}
 >
 <TaskCheckbox checked={isDone} priorityColor={priorityColor} size="sm" />
 </div>

 <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
 {isEditing? (
 <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
 <textarea
 ref={editorRef}
 autoFocus
 value={draftTitle}
 onChange={e => {
 setDraftTitle(e.target.value);
 resizeEditor();
 }}
 onInput={resizeEditor}
 onKeyDown={e => {
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault();
 submitEdit();
 }
 if (e.key === 'Escape') {
 setDraftTitle(task.title);
 setIsEditing(false);
 }
 }}
 onClick={e => e.stopPropagation()}
 rows={Math.max(2, draftTitle.split('\n').length)}
 style={{
 width: '100%', minHeight: 34, fontSize: 15, fontWeight: 650, lineHeight: 1.34,
 color: C.text, background: 'transparent', border: 'none',
 borderBottom: `1px solid ${C.accent}`, outline: 'none', padding: 0,
 resize: 'none', overflow: 'hidden', whiteSpace: 'pre-wrap',
 overflowWrap: 'anywhere', wordBreak: 'break-word'
 }}
 />
 <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
 <button
 type="button"
 onClick={(e) => { e.stopPropagation(); submitEdit(); }}
 style={{
 width: 24, height: 24, borderRadius: 6, flexShrink: 0,
 background: C.accentSoft,
 border: `1px solid ${C.accentBorder}`,
 display: 'none', alignItems: 'center', justifyContent: 'center',
 cursor: CURSOR_CLICK,
 }}
 title="Guardar"
 aria-label="Guardar"
 >
 <Check style={{ width: 12, height: 12, color: '#ffffff', strokeWidth: 3 }} />
 </button>
 <button
 type="button"
 onClick={(e) => { e.stopPropagation(); setDraftTitle(task.title); setIsEditing(false); }}
 style={{
 width: 24, height: 24, borderRadius: 6, flexShrink: 0,
 background: 'rgba(0,0,0,0.04)',
 border: '1px solid rgba(0,0,0,0.08)',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 cursor: CURSOR_CLICK,
 }}
 title="Cancelar"
 aria-label="Cancelar"
 >
 <X style={{ width: 12, height: 12, color: '#6b7280', strokeWidth: 2 }} />
 </button>
 </div>
 </div>
 ): (
 <span 
 onClick={(e) => { e.stopPropagation(); setIsEditing(true); setDraftTitle(task.title); }}
 title="Haz clic para editar"
 style={{
 display: 'block', fontSize: 15, fontWeight: 650, lineHeight: 1.34,
 color: isDone? C.muted: C.text,
 textDecoration: isDone? 'line-through': 'none',
 cursor: 'text',
 whiteSpace: 'pre-wrap',
 overflowWrap: 'anywhere',
 wordBreak: 'break-word'
 }}
 >
 {task.title}
 </span>
 )}

  </div>

  {isSubtaskOpen && !isDone && (
    <div style={{ flexBasis: '100%', width: '100%', paddingLeft: 31, marginTop: 2 }} data-no-drag="true">
      {visibleSubtasks.map((subtask) => {
        const subtaskDone = subtask.status === 'done';
        return (
          <div
            key={subtask.id}
            onClick={(event) => event.stopPropagation()}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              minHeight: 28,
              padding: '4px 0',
              borderTop: '1px solid rgba(31,41,55,0.055)',
            }}
          >
            <TaskCheckbox
              checked={subtaskDone}
              priorityColor={priorityColor}
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                updateTask.mutate({ id: subtask.id, status: subtaskDone ? 'pending' : 'done' });
              }}
              ariaLabel="Completar subtarea"
            />
            <span
              style={{
                flex: 1,
                minWidth: 0,
                paddingTop: 1,
                color: subtaskDone ? C.muted : C.text,
                fontSize: 13.5,
                fontWeight: 620,
                lineHeight: 1.28,
                textDecoration: subtaskDone ? 'line-through' : 'none',
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
              }}
            >
              {subtask.title}
            </span>
          </div>
        );
      })}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minHeight: 30, padding: '4px 0' }}>
        <TaskCheckbox checked={false} priorityColor={priorityColor} size="sm" onClick={() => subtaskEditorRef.current?.focus()} ariaLabel="Nueva subtarea" />
        <textarea
          ref={subtaskEditorRef}
          value={subtaskTitle}
          onChange={(event) => setSubtaskTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              const title = subtaskTitle.trim();
              if (!title) return;
              createTask.mutate({
                title,
                parent_task_id: task.id,
                due_date: task.due_date || format(currentDate, 'yyyy-MM-dd'),
                folder_id: task.folder_id || null,
                urgency: task.urgency ?? undefined,
                importance: task.importance ?? undefined,
                estimated_minutes: task.estimated_minutes ?? undefined,
                creation_source: 'subtask',
              });
              setSubtaskTitle('');
              setIsSubtaskOpen(true);
              window.setTimeout(() => subtaskEditorRef.current?.focus(), 0);
            }
            if (event.key === 'Escape') {
              setIsSubtaskOpen(false);
              setSubtaskTitle('');
            }
          }}
          onClick={(event) => event.stopPropagation()}
          placeholder="Nueva subtarea"
          rows={1}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 20,
            resize: 'none',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: C.text,
            fontSize: 13.5,
            fontWeight: 620,
            lineHeight: 1.25,
            overflow: 'hidden',
          }}
        />
      </div>
    </div>
  )}

  {/* Link / Timer / Duration Result */}
 <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
 {isDone? (
 actualSeconds > 0 && (
 <TaskDurationBadge seconds={actualSeconds} estimatedMinutes={task.estimated_minutes} compact />
 )
 ): !isEditing ? (
 <>
 {task.link && task.link.split(/\s+/).filter(Boolean).map((url: string, i: number) => {
 const href = url.startsWith('http')? url: `https://${url}`;
 return (
 <div
 key={i}
 onClick={(e) => { 
 e.stopPropagation(); 
 if (window.electronAPI?.openExternal) {
 window.electronAPI.openExternal(href);
 } else {
 window.open(href, '_blank');
 }
 }}
 style={{
 width: 24, height: 24, borderRadius: 8, flexShrink: 0,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 cursor: CURSOR_CLICK, 
 background: C.subBg,
 border: `1px solid ${C.border}`,
 boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
 }}
 title="Abrir link"
 >
 <Paperclip style={{ width: 12, height: 12, color: priorityColor === 'transparent'? 'var(--primary)': priorityColor }} />
 </div>
 );
 })}
 
 <TaskTimerButton
 active={isTimerActive}
 priorityColor={priorityColor}
 size="sm"
 className="border-transparent bg-transparent text-on-surface-variant/65 shadow-none hover:bg-[var(--mini-task-timer-hover)] hover:text-foreground/75"
 style={{ '--mini-task-timer-hover': timerHoverColor } as CSSProperties}
 onClick={(e) => { e.stopPropagation(); onTimerToggle(task.id, task.estimated_minutes || 30); }}
 />
 {!isDone && (
     <button
       type="button"
       onClick={(e) => {
         e.stopPropagation();
         setIsSubtaskOpen((value) => {
           const next = !value;
           if (next) window.setTimeout(() => subtaskEditorRef.current?.focus(), 0);
           return next;
         });
       }}
     aria-label={isSubtaskOpen ? 'Recoger subtarea' : 'Desplegar subtarea'}
     style={{
       minHeight: 22,
       minWidth: 22,
       padding: 0,
       border: '1px solid rgba(31,41,55,0.08)',
       borderRadius: 999,
       background: hasSubtasks || isSubtaskOpen ? 'rgba(91,124,250,0.10)' : 'rgba(255,255,255,0.34)',
       color: hasSubtasks || isSubtaskOpen ? 'hsl(var(--primary))' : 'rgba(75,85,99,0.46)',
       display: 'flex',
       alignItems: 'center',
       justifyContent: 'center',
       gap: 4,
       cursor: CURSOR_CLICK,
       flexShrink: 0,
       opacity: hasSubtasks || isSubtaskOpen ? 1 : 0,
       transition: 'opacity 120ms ease, color 120ms ease, background 120ms ease, border-color 120ms ease',
     }}
     className={!hasSubtasks ? 'group-hover/task:opacity-100' : undefined}
   >
     <ChevronDown style={{ width: 13, height: 13, strokeWidth: 2.5 }} />
   </button>
 )}
 </>
 ) : null}
 </div>
 </div>
 </motion.div>
 );
};
const TaskRow = memo(TaskRowRaw);

const snapCollapsedMiniToEdge = async () => {
 const api = window.electronAPI;
 if (!api?.getMiniPosition || !api?.setMiniBounds) return;
 const pos = await api.getMiniPosition();
 if (!pos || pos.w > 160 || pos.h > 140) return;

 const distances = [
 { edge: 'left', value: Math.abs(pos.x - pos.screenX) },
 { edge: 'right', value: Math.abs(pos.screenX + pos.screenW - (pos.x + pos.w)) },
 { edge: 'top', value: Math.abs(pos.y - pos.screenY) },
 { edge: 'bottom', value: Math.abs(pos.screenY + pos.screenH - (pos.y + pos.h)) },
 ].sort((a, b) => a.value - b.value);

 let x = pos.x;
 let y = pos.y;
 const edge = distances[0]?.edge;
 if (edge === 'left') x = pos.screenX;
 if (edge === 'right') x = pos.screenX + pos.screenW - pos.w;
 if (edge === 'top') y = pos.screenY;
 if (edge === 'bottom') y = pos.screenY + pos.screenH - pos.h;

 x = Math.max(pos.screenX, Math.min(x, pos.screenX + pos.screenW - pos.w));
 y = Math.max(pos.screenY, Math.min(y, pos.screenY + pos.screenH - pos.h));
 api.setMiniBounds({ x: Math.round(x), y: Math.round(y), w: pos.w, h: pos.h });
};

const MiniIconButton = ({
 children,
 title,
 onClick,
 disabled = false,
}: {
 children: React.ReactNode;
 title: string;
 onClick?: () => void;
 disabled?: boolean;
}) => (
 <button
 type="button"
 title={title}
 aria-label={title}
 disabled={disabled}
 onMouseDown={(event) => event.stopPropagation()}
 onClick={(event) => {
 event.stopPropagation();
 if (!disabled) onClick?.();
 }}
 style={{
 width: 32,
 height: 32,
 borderRadius: 999,
 border: '1px solid rgba(31,41,55,0.11)',
 background: disabled ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.62)',
 color: disabled ? 'rgba(31,41,55,0.22)' : 'rgba(31,41,55,0.74)',
 boxShadow: disabled ? 'none' : '0 8px 18px rgba(31,41,55,0.10), inset 0 1px 0 rgba(255,255,255,0.78)',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 cursor: disabled ? 'default' : CURSOR_CLICK,
 padding: 0,
 flexShrink: 0,
 }}
 >
 {children}
 </button>
);

// â”€â”€â”€ Drag hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function useDragWindow() {
 const isDraggingRef = useRef(false);
 const startRef = useRef({ x: 0, y: 0 });
 const hasMovedRef = useRef(false);
 const clearMovedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

 useEffect(() => {
 const onUp = (event: MouseEvent | Event) => { 
 if (isDraggingRef.current) {
 const movedX = 'screenX' in event ? Math.abs(event.screenX - startRef.current.x) : 0;
 const movedY = 'screenY' in event ? Math.abs(event.screenY - startRef.current.y) : 0;
 if (movedX > 5 || movedY > 5) {
 hasMovedRef.current = true;
 if (clearMovedTimerRef.current) clearTimeout(clearMovedTimerRef.current);
 clearMovedTimerRef.current = setTimeout(() => {
 hasMovedRef.current = false;
 }, 180);
 }
 isDraggingRef.current = false;
 window.electronAPI?.stopDrag?.();
 window.setTimeout(() => {
 void snapCollapsedMiniToEdge();
 }, 30);
 }
 };
 window.addEventListener('mouseup', onUp);
 window.addEventListener('blur', onUp); // Stop drag if window loses focus
 return () => {
 window.removeEventListener('mouseup', onUp);
 window.removeEventListener('blur', onUp);
 if (clearMovedTimerRef.current) clearTimeout(clearMovedTimerRef.current);
 };
 }, []);

 const onMouseDown = useCallback((e: React.MouseEvent) => {
 if (e.button!== 0) return;
 isDraggingRef.current = true;
 hasMovedRef.current = false;
 startRef.current = { x: e.screenX, y: e.screenY };
 window.electronAPI?.startDrag?.();
 }, []);

 return { onMouseDown, hasMovedRef, isDraggingRef };
}

// â”€â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MiniTaskList = () => {
 const { user, loading } = useAuth();
 const { theme } = useTheme();
 const isDarkMode = theme === 'dark' || (theme === 'system' && document.documentElement.classList.contains('dark'));
  const miniThemeVars = getMiniThemeVars(isDarkMode);
  const applePill = getApplePillStyles(false);
  const [viewDate, setViewDate] = useState(() => {
    return readStoredCalendarDate();
  });
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>(() => {
    return readStoredCalendarViewMode('day');
  });
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const { tasks, updateTask, createTask, isLoading } = useTasks({ 
  date: today, 
  excludeEvents: false
  });
  const { tasks: allMiniTasks } = useTasks({ excludeEvents: false });
  const rangeStart = startOfMonth(viewDate);
  const rangeEnd = endOfMonth(viewDate);
  const { events: googleCalendarEvents } = useCalendarEvents(
    rangeStart.toISOString(),
    rangeEnd.toISOString()
  );
  const { folders, createFolder } = useFolders();
  const visibleFolders = useMemo<MiniFolder[]>(
  () => (folders as MiniFolder[]).filter((folder) => !folder.deleted_at),
  [folders]
  );
 const { checkAndUnlock } = useGamification();
 const { profile } = useProfile();
 const [completingId, setCompletingId] = useState<string | null>(null);

 useEffect(() => {
 trackAnalyticsEvent('mini_window_viewed', {
 is_electron: Boolean(window.electronAPI),
 });
 }, []);
 const [isExpanded, setIsExpanded] = useState(() => !window.electronAPI);
 const [isReady, setIsReady] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showFolderTabs, setShowFolderTabs] = useState(() => {
    try {
      return localStorage.getItem(MINI_FOLDER_TABS_STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  });
 useEffect(() => {
  try {
    localStorage.setItem(MINI_FOLDER_TABS_STORAGE_KEY, showFolderTabs ? 'true' : 'false');
  } catch {
    // LocalStorage can be unavailable in restricted embedded contexts.
  }
 }, [showFolderTabs]);
  const [miniSearchQuery, setMiniSearchQuery] = useState('');
 const [miniSearchOpen, setMiniSearchOpen] = useState(false);
  const [focusTimerMenuOpen, setFocusTimerMenuOpen] = useState(false);
  const [focusTimerPaused, setFocusTimerPaused] = useState(false);
 const [showUpcomingDays, setShowUpcomingDays] = useState(true);
 const [isCreatingFolder, setIsCreatingFolder] = useState(false);
 const [newFolderName, setNewFolderName] = useState('');
 const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);

 // Timer state
 const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
 const [timerSeconds, setTimerSeconds] = useState(0);
 const [captureOpen, setCaptureOpen] = useState(false);
 const [captureMode, setCaptureMode] = useState<'text' | 'voice' | 'recurrence' | null>(null);
 const [captureCreationSource, setCaptureCreationSource] = useState<'mini_plus' | 'mini_voice'>('mini_plus');
 const [selectedTask, setSelectedTask] = useState<MiniTask | null>(null);
 const [detailOpen, setDetailOpen] = useState(false);
 const [recurrenceFlowOpen, setRecurrenceFlowOpen] = useState(false);
 const handleDetail = useCallback((t: MiniTask) => { setSelectedTask(t); setDetailOpen(true); }, []);
 const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
 const sessionStartRef = useRef<number>(0);
 const captureModalRef = useRef<TaskCaptureModalHandle>(null);

  const openTextCapture = useCallback((date = today) => {
  setCaptureMode('text');
  setCaptureCreationSource('mini_plus');
  setCaptureOpen(true);
  captureModalRef.current?.openInTextMode(date);
  }, [today]);

 const startFocusTimer = useCallback((minutes: number) => {
  if (!Number.isFinite(minutes) || minutes <= 0) return;
  if (timerRef.current) clearInterval(timerRef.current);
  setActiveTimerId('__focus_timer__');
  setTimerSeconds(Math.round(minutes * 60));
  setFocusTimerPaused(false);
  setFocusTimerMenuOpen(false);
  }, []);

  useEffect(() => {
  if (activeTimerId !== '__focus_timer__') return;
  if (focusTimerPaused) {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    return;
  }

  if (timerRef.current) clearInterval(timerRef.current);
  timerRef.current = setInterval(() => {
    setTimerSeconds((seconds) => seconds - 1);
  }, 1000);

  return () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };
  }, [activeTimerId, focusTimerPaused]);

 const openFocusTimerPrompt = useCallback(() => {
 const raw = window.prompt('Cuantos minutos quieres contar?', '25');
 if (!raw) return;
 const minutes = Number(raw.replace(',', '.'));
 if (!Number.isFinite(minutes) || minutes <= 0) return;
 startFocusTimer(minutes);
 }, [startFocusTimer]);

 const { onMouseDown: onDragMouseDown, hasMovedRef, isDraggingRef: isDraggingWindowRef } = useDragWindow();

 // Store original pill position before expanding (to restore on collapse)
 const originalPosRef = useRef<{ x: number; y: number } | null>(null);

 // LED animation state
 const [showLedGlow, setShowLedGlow] = useState(false);
 const hasInteractedRef = useRef(false);

 const [calendarOpen, setCalendarOpen] = useState(false);
 const [orderedTasks, setOrderedTasks] = useState<MiniTask[]>([]);
 const [reorderIdx, setReorderIdx] = useState<number | null>(null);
 const reorderIdxRef = useRef<number | null>(null);
 const orderedTasksRef = useRef<MiniTask[]>([]);
 const suppressOrderSyncRef = useRef(false);
 const suppressOrderSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const calendarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const calendarHoverRef = useRef(false);
 const calendarBusyRef = useRef(false);

 // Timer logic
 const handleTimerToggle = useCallback((taskId: string, estimatedMinutes: number = 30) => {
 // 1. If there's an active timer, stop it and save progress first
  if (activeTimerId) {
  if (timerRef.current) clearInterval(timerRef.current);
  timerRef.current = null;

 const activeTask = tasks.find((t: MiniTask) => t.id === activeTimerId);
 if (activeTask) {
 const sessionElapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
 const newTotal = (activeTask.actual_duration_seconds || 0) + sessionElapsed;
 updateTask.mutate({ id: activeTimerId, actual_duration_seconds: newTotal });
 }

  const wasSameTask = activeTimerId === taskId;
  setActiveTimerId(null);
  setTimerSeconds(0);
  setFocusTimerPaused(false);
  
  if (wasSameTask) return; // We just wanted to stop it
  }

 // 2. Start the new timer
 const targetTask = tasks.find((t: MiniTask) => t.id === taskId);
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
 const api = window.electronAPI;
 if (!api?.getMiniPosition ||!api?.setMiniBounds) return;
 api.getMiniPosition().then((pos) => {
 if (!pos) return;
 const newW = activeTimerId? PILL_TIMER_W: PILL_W;
 const dx = (pos.w - newW) / 2;
 api.setMiniBounds({ x: pos.x + dx, y: pos.y, w: newW, h: PILL_H });
 });
 }
 }, [activeTimerId, isExpanded]);

 const handleToggleExpand = useCallback(async () => {
 if (hasMovedRef.current) return;
 const api = window.electronAPI;
 if (!api?.getMiniPosition ||!api?.setMiniBounds) {
 setIsExpanded(prev =>!prev);
 return;
 }

 if (!isExpanded) {
 // EXPANDING — save current pill position for later restore
 const pos = await api.getMiniPosition();
 if (!pos) { setIsExpanded(true); return; }

 originalPosRef.current = { x: pos.x, y: pos.y };

 const pillCX = pos.x + pos.w / 2;
 const pillCY = pos.y + pos.h / 2;
 const windowW = PANEL_W + 48;
 const screenLeft = pos.screenX;
 const screenTop = pos.screenY;
 const screenRight = pos.screenX + pos.screenW;
 const screenBottom = pos.screenY + pos.screenH;
 const edge = [
 { name: 'left', value: Math.abs(pos.x - screenLeft) },
 { name: 'right', value: Math.abs(screenRight - (pos.x + pos.w)) },
 { name: 'top', value: Math.abs(pos.y - screenTop) },
 { name: 'bottom', value: Math.abs(screenBottom - (pos.y + pos.h)) },
 ].sort((a, b) => a.value - b.value)[0]?.name;

 let panelX = pillCX - windowW / 2;
 let panelY = pillCY - PANEL_H / 2;

 if (edge === 'right') panelX = pos.x + pos.w - windowW;
 if (edge === 'left') panelX = pos.x;
 if (edge === 'bottom') panelY = pos.y + pos.h - PANEL_H;
 if (edge === 'top') panelY = pos.y;

 const maxX = screenRight - windowW;
 const maxY = screenBottom - PANEL_H;
 panelX = Math.max(screenLeft, Math.min(panelX, maxX));
 panelY = Math.max(screenTop, Math.min(panelY, maxY));

 api.setMiniBounds({ x: Math.round(panelX), y: Math.round(panelY), w: windowW, h: PANEL_H });
 setIsExpanded(true);
 } else {
 // COLLAPSING — restore pill to original saved position
 const pillW = activeTimerId? PILL_TIMER_W: PILL_W;
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

 const closeCalendarPanel = useCallback(async () => {
 setCalendarOpen(false);
 calendarTimerRef.current = null;

 const api = window.electronAPI;
 if (api?.getMiniPosition && api?.setMiniBounds) {
 const pos = await api.getMiniPosition();
 if (pos && pos.w >= 700) {
 api.setMiniBounds({ x: pos.x, y: pos.y, w: PANEL_W + 32, h: PANEL_H });
 }
 }
 }, []);

 const openCalendarPanel = useCallback(async () => {
 if (calendarTimerRef.current) {
 clearTimeout(calendarTimerRef.current);
 calendarTimerRef.current = null;
 }
 setCalendarOpen(true);
 
 const api = window.electronAPI;
 if (api?.getMiniPosition && api?.setMiniBounds) {
 const pos = await api.getMiniPosition();
 // Only expand if not already wide enough
 const expandedWidth = PANEL_W + CALENDAR_W;
 if (pos && pos.w < expandedWidth) {
 const screenRight = pos.screenX + pos.screenW;
 const nextX = Math.max(pos.screenX, Math.min(pos.x, screenRight - expandedWidth));
 api.setMiniBounds({ x: nextX, y: pos.y, w: expandedWidth, h: pos.h });
 }
 }
 }, []);

 const handleCalendarEnter = useCallback(() => {
 calendarHoverRef.current = true;
 openCalendarPanel();
 }, [openCalendarPanel]);

 const handleCalendarLeave = useCallback(() => {
 calendarHoverRef.current = false;
 if (detailOpen || captureOpen || calendarBusyRef.current) return;

 calendarTimerRef.current = setTimeout(() => {
 if (calendarHoverRef.current || detailOpen || captureOpen || calendarBusyRef.current) return;
 closeCalendarPanel();
 }, 450);
 }, [detailOpen, captureOpen, closeCalendarPanel]);

 useEffect(() => {
 const handleDragStart = () => {
 calendarBusyRef.current = true;
 openCalendarPanel();
 };
 const handleDragEnd = () => {
 calendarBusyRef.current = false;
 if (!calendarHoverRef.current &&!detailOpen &&!captureOpen) {
 calendarTimerRef.current = setTimeout(() => {
 if (!calendarHoverRef.current &&!calendarBusyRef.current) closeCalendarPanel();
 }, 650);
 }
 };
 const handleDialogState = (event: Event) => {
 const active =!!(event as CustomEvent).detail?.active;
 calendarBusyRef.current = active;
 if (!active &&!calendarHoverRef.current &&!detailOpen &&!captureOpen) {
 calendarTimerRef.current = setTimeout(() => {
 if (!calendarHoverRef.current &&!calendarBusyRef.current) closeCalendarPanel();
 }, 650);
 }
 };

 window.addEventListener('adonai:external-drag-start', handleDragStart);
 window.addEventListener('adonai:external-drag-end', handleDragEnd);
 window.addEventListener('adonai:dialog-state-change', handleDialogState);
 return () => {
 window.removeEventListener('adonai:external-drag-start', handleDragStart);
 window.removeEventListener('adonai:external-drag-end', handleDragEnd);
 window.removeEventListener('adonai:dialog-state-change', handleDialogState);
 };
 }, [captureOpen, closeCalendarPanel, detailOpen, openCalendarPanel]);

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

  // Bidirectional selectedDate and viewMode synchronization via localStorage and CustomEvents
  useEffect(() => {
    return subscribeCalendarState(viewDate, viewMode, setViewDate, setViewMode);
  }, [viewDate, viewMode]);

 // Hide window until session is ready and user is authenticated
 useEffect(() => {
 if (!loading) {
 const previewMode = !window.electronAPI;
 const ready = previewMode || !!user;
 setIsReady(ready);
 
 // Initial state: ignore mouse events if collapsed so background is clickable
 if (ready &&!isExpanded) {
 window.electronAPI?.setIgnoreMouseEvents?.(true, { forward: true });
 } else if (ready && isExpanded) {
 window.electronAPI?.setIgnoreMouseEvents?.(false);
 }
 
 window.electronAPI?.miniReady?.({ hasSession: !!user });

 if (ready &&!hasInteractedRef.current) {
 setShowLedGlow(true);
 }
 }
 }, [loading, user, isExpanded]);

 const handleMouseEnterUI = useCallback(() => {
 if (user) window.electronAPI?.setIgnoreMouseEvents?.(false);
 }, [user]);
 const handleMouseLeaveUI = useCallback(() => {
 // Only ignore mouse events when collapsed (pill mode) and NOT dragging
 if (user &&!isExpanded &&!isDraggingWindowRef.current) {
 window.electronAPI?.setIgnoreMouseEvents?.(true, { forward: true });
 }
 }, [user, isExpanded, isDraggingWindowRef]);

 const quadrantRank = useCallback((t: MiniTask) =>
 t.urgency && t.importance? 0: t.urgency? 1: t.importance? 2: 3, []);

 // Stop timer if the task is completed in another window
 useEffect(() => {
 if (activeTimerId) {
 const activeTask = tasks.find((t: MiniTask) => t.id === activeTimerId);
 if (activeTask && activeTask.status === 'done') {
 // Save current session progress before stopping
 const sessionElapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
 const newTotal = (activeTask.actual_duration_seconds || 0) + sessionElapsed;
 updateTask.mutate({ id: activeTimerId, actual_duration_seconds: newTotal });

  if (timerRef.current) clearInterval(timerRef.current);
  timerRef.current = null;
  setActiveTimerId(null);
  setTimerSeconds(0);
  setFocusTimerPaused(false);
  }
 }
 }, [tasks, activeTimerId, updateTask]);

 const filteredTasks = useMemo(() => {
 const todayTasks = tasks.filter((t: MiniTask) =>
 t.due_date === today || (t.due_date && t.due_date < today && t.status !== 'done')
 );
 const folderTasks = !selectedFolderId
 ? todayTasks.filter((t: MiniTask) => !t.folder_id)
 : todayTasks.filter((t: MiniTask) => t.folder_id === selectedFolderId);
 const query = miniSearchQuery.trim().toLowerCase();
 if (!query) return folderTasks;
 return folderTasks.filter((t: MiniTask) => {
 const title = t.title?.toLowerCase() || '';
 const link = t.link?.toLowerCase() || '';
 return title.includes(query) || link.includes(query);
 });
 }, [tasks, selectedFolderId, today, miniSearchQuery]);

 const sortedTasks = useMemo(() => {
 return [...filteredTasks].sort(compareTasksWithinQuadrants);
 }, [filteredTasks]);

 const upcomingTasksByDate = useMemo(() => {
 const query = miniSearchQuery.trim().toLowerCase();
 const futureTasks = allMiniTasks
 .filter((task: MiniTask) => task.status !== 'deleted')
 .filter((task: MiniTask) => task.due_date && task.due_date > today)
 .filter((task: MiniTask) => (selectedFolderId ? task.folder_id === selectedFolderId : !task.folder_id))
 .filter((task: MiniTask) => {
 if (!query) return true;
 const title = task.title?.toLowerCase() || '';
 const link = task.link?.toLowerCase() || '';
 return title.includes(query) || link.includes(query);
 });

  return buildTaskDateSections(futureTasks, new Date(today)).futureGroups.map((day) => ({
  ...day,
  tasks: [...day.tasks].sort(compareTasksWithinQuadrants),
  }));
 }, [allMiniTasks, miniSearchQuery, selectedFolderId, today]);

 const miniParentTaskIds = useMemo(() => {
 const ids = new Set<string>();
 sortedTasks.forEach((task) => {
 if (!task.id.startsWith('virtual-') && !task.id.startsWith('temp-')) ids.add(task.id);
 });
 upcomingTasksByDate.forEach((day) => {
 day.tasks.forEach((task) => {
 if (task.id && !task.id.startsWith('virtual-') && !task.id.startsWith('temp-')) ids.add(task.id);
 });
 });
 return Array.from(ids);
 }, [sortedTasks, upcomingTasksByDate]);

 const { data: miniSubtasks = [] } = useQuery({
 queryKey: ['tasks', user?.id, 'mini-subtasks', miniParentTaskIds],
 enabled: Boolean(user?.id && miniParentTaskIds.length > 0),
 queryFn: async () => {
 const { data, error } = await supabase
 .from('tasks')
 .select('*')
 .in('parent_task_id', miniParentTaskIds)
 .neq('status', 'deleted')
 .order('created_at', { ascending: true });
 if (error) throw error;
 return (data || []) as MiniTask[];
 },
 });

 const subtasksByParent = useMemo(() => {
 return miniSubtasks.reduce<Record<string, MiniTask[]>>((acc, task) => {
 const parentId = (task as MiniTask & { parent_task_id?: string | null }).parent_task_id;
 if (!parentId) return acc;
 if (!acc[parentId]) acc[parentId] = [];
 acc[parentId].push(task);
 return acc;
 }, {});
 }, [miniSubtasks]);

 useEffect(() => {
 if (suppressOrderSyncRef.current) return;
 setOrderedTasks(sortedTasks);
 }, [sortedTasks]);

 useEffect(() => {
 orderedTasksRef.current = orderedTasks;
 }, [orderedTasks]);

 useEffect(() => () => {
 if (suppressOrderSyncTimerRef.current) clearTimeout(suppressOrderSyncTimerRef.current);
 }, []);

 const persistMiniOrder = useCallback((nextOrder: MiniTask[]) => {
 nextOrder.forEach((task, idx) => {
 if (task.status!== 'done' && (task.sort_order?? 0)!== idx) {
 updateTask.mutate({ id: task.id, sort_order: idx });
 }
 });
 }, [updateTask]);

 const handleMiniReorderStart = useCallback((idx: number) => {
 if (orderedTasksRef.current[idx]?.status === 'done') return;
 reorderIdxRef.current = idx;
 setReorderIdx(idx);
 }, []);

 const handleMiniReorderOver = useCallback((event: React.DragEvent, idx: number) => {
 event.preventDefault();
 const currentReorderIdx = reorderIdxRef.current ?? reorderIdx;
 if (currentReorderIdx === null || currentReorderIdx === idx) return;
 const dragged = orderedTasks[currentReorderIdx];
 const target = orderedTasks[idx];
 if (!dragged ||!target || dragged.status === 'done' || target.status === 'done') return;
 if (getTaskManualOrderGroupKey(dragged)!== getTaskManualOrderGroupKey(target)) return;

 const next = [...orderedTasks];
 const [moved] = next.splice(currentReorderIdx, 1);
 next.splice(idx, 0, moved);
 setOrderedTasks(next);
 reorderIdxRef.current = idx;
 setReorderIdx(idx);
 }, [orderedTasks, reorderIdx]);

 const handleMiniReorderEnd = useCallback(() => {
 if ((reorderIdxRef.current ?? reorderIdx)!== null) {
 const finalOrder = orderedTasksRef.current;
 persistMiniOrder(finalOrder);
 const optimisticOrder = finalOrder.map((task, idx) => ({ ...task, sort_order: idx }));
 orderedTasksRef.current = optimisticOrder;
 suppressOrderSyncRef.current = true;
 if (suppressOrderSyncTimerRef.current) clearTimeout(suppressOrderSyncTimerRef.current);
 suppressOrderSyncTimerRef.current = setTimeout(() => {
 suppressOrderSyncRef.current = false;
 suppressOrderSyncTimerRef.current = null;
 }, 2200);
 setOrderedTasks(optimisticOrder);
 }
 reorderIdxRef.current = null;
 setReorderIdx(null);
 }, [persistMiniOrder, reorderIdx]);

 const moveMiniReorderToPoint = useCallback((clientX: number, clientY: number) => {
 const currentIdx = reorderIdxRef.current;
 if (currentIdx === null) return;

 const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-mini-task-idx]'));
 const targetEl = rows.find((row) => {
 const rect = row.getBoundingClientRect();
 return clientY >= rect.top && clientY <= rect.bottom && clientX >= rect.left - 36 && clientX <= rect.right + 36;
 }) || rows.reduce<HTMLElement | null>((closest, row) => {
 const rect = row.getBoundingClientRect();
 const rowCenter = rect.top + rect.height / 2;
 if (clientX < rect.left - 36 || clientX > rect.right + 36) return closest;
 if (!closest) return row;
 const closestRect = closest.getBoundingClientRect();
 const closestCenter = closestRect.top + closestRect.height / 2;
 return Math.abs(clientY - rowCenter) < Math.abs(clientY - closestCenter) ? row : closest;
 }, null);
 if (!targetEl) return;
 const targetIdx = Number(targetEl.dataset.miniTaskIdx);
 if (Number.isNaN(targetIdx) || targetIdx === currentIdx) return;

 const currentOrder = orderedTasksRef.current;
 const dragged = currentOrder[currentIdx];
 const target = currentOrder[targetIdx];
 if (!dragged || !target || dragged.status === 'done' || target.status === 'done') return;
 if (getTaskManualOrderGroupKey(dragged) !== getTaskManualOrderGroupKey(target)) return;

 const next = [...currentOrder];
 const [moved] = next.splice(currentIdx, 1);
 next.splice(targetIdx, 0, moved);
 orderedTasksRef.current = next;
 reorderIdxRef.current = targetIdx;
 setReorderIdx(targetIdx);
 setOrderedTasks(next);
 }, []);

 const handleMiniReorderPointerStart = useCallback((idx: number, clientX: number, clientY: number) => {
 if (orderedTasksRef.current[idx]?.status === 'done') return;
 reorderIdxRef.current = idx;
 setReorderIdx(idx);
 document.body.style.cursor = 'var(--cursor-hand-grabbing), grabbing';
 moveMiniReorderToPoint(clientX, clientY);

 const onMove = (event: MouseEvent) => {
 event.preventDefault();
 moveMiniReorderToPoint(event.clientX, event.clientY);
 };
 const onTouchMove = (event: TouchEvent) => {
 const touch = event.touches[0];
 if (!touch) return;
 if (event.cancelable) event.preventDefault();
 moveMiniReorderToPoint(touch.clientX, touch.clientY);
 };
 const finish = () => {
 window.removeEventListener('mousemove', onMove);
 window.removeEventListener('mouseup', finish);
 window.removeEventListener('touchmove', onTouchMove);
 window.removeEventListener('touchend', finish);
 window.removeEventListener('touchcancel', finish);
 document.body.style.cursor = '';
 if (reorderIdxRef.current !== null) {
 const finalOrder = orderedTasksRef.current;
 persistMiniOrder(finalOrder);
 const optimisticOrder = finalOrder.map((task, idx) => ({ ...task, sort_order: idx }));
 orderedTasksRef.current = optimisticOrder;
 suppressOrderSyncRef.current = true;
 if (suppressOrderSyncTimerRef.current) clearTimeout(suppressOrderSyncTimerRef.current);
 suppressOrderSyncTimerRef.current = setTimeout(() => {
 suppressOrderSyncRef.current = false;
 suppressOrderSyncTimerRef.current = null;
 }, 2200);
 setOrderedTasks(optimisticOrder);
 }
 reorderIdxRef.current = null;
 setReorderIdx(null);
 };

 window.addEventListener('mousemove', onMove);
 window.addEventListener('mouseup', finish);
 window.addEventListener('touchmove', onTouchMove, { passive: false });
 window.addEventListener('touchend', finish);
 window.addEventListener('touchcancel', finish);
 }, [moveMiniReorderToPoint, persistMiniOrder]);

 const completedCount = filteredTasks.filter((t: MiniTask) => t.status === 'done').length;
 const totalCount = filteredTasks.length;

 const handleToggle = useCallback((task: MiniTask, e?: React.MouseEvent) => {
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
  setFocusTimerPaused(false);
  }

 const estimatedSeconds = (task.estimated_minutes || 0) * 60;
 const isOnTime = estimatedSeconds > 0 && finalDuration <= estimatedSeconds;

 console.log("Completing task:", { id: task.id, finalDuration, isOnTime });

 setTimeout(() => {
 const currentTasks = tasks || [];
 const remainingTasks = currentTasks.filter((t: MiniTask) => t.status!== 'done' && t.id!== task.id);
 const isLastTask = currentTasks.length > 0 && remainingTasks.length === 0;

  const completionUpdate = {
  id: task.id,
  status: 'done',
  completed_at: new Date().toISOString(),
  creation_source: 'mini_plus',
  ...(isTimerForThisTask ? { actual_duration_seconds: finalDuration } : {}),
  };

  console.log("Mutating task update with:", completionUpdate);

  updateTask.mutate(
  completionUpdate,
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
 onError: (err: unknown) => {
 console.error("Mutation error in handleToggle:", err);
 setCompletingId(null);
 }
 }
 );
 }, 350);
 }
  }, [updateTask, tasks, checkAndUnlock, profile?.name, activeTimerId]);

 // ─── COLLAPSED PILL ───
 if (!isReady) {
 return <div style={{ width: '100%', height: '100%' }} />;
 }

 if (!isExpanded) {
 return (
 <div style={{...miniThemeVars, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
 <div
 onMouseEnter={handleMouseEnterUI}
 onMouseLeave={handleMouseLeaveUI}
 onMouseDown={(e) => {
 onDragMouseDown(e);
 // First interaction dismisses LED animation
 if (showLedGlow &&!hasInteractedRef.current) {
 hasInteractedRef.current = true;
 setShowLedGlow(false);
 }
 }}
 onClick={(e) => {
 // First click also dismisses LED animation
 if (showLedGlow &&!hasInteractedRef.current) {
 hasInteractedRef.current = true;
 setShowLedGlow(false);
 }
 handleToggleExpand(e);
 }}
  style={{
  height: 120, borderRadius: 999,
  padding: 0,
  width: 20,
  minWidth: 20,
  background: 'rgba(8,12,18,0.80)',
  border: '1px solid rgba(255,255,255,0.10)',
  boxShadow: showLedGlow? `0 0 16px 2px ${C.accentGlow}, inset 0 1px 0 rgba(255,255,255,0.12)`: '0 12px 26px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.10)',
 display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0,
 userSelect: 'none', cursor: CURSOR_GRAB,
 position: 'relative',
 animation: showLedGlow? 'ledPulse 1.5s ease-in-out infinite': 'none',
 willChange: 'transform, opacity',
 }}
 >
 {showLedGlow && (
 <div style={{
 position: 'absolute', inset: -3, borderRadius: 999,
 border: `1px solid ${C.accentBorder}`,
 animation: 'ledBorder 2s ease-in-out infinite',
 pointerEvents: 'none',
 }} />
 )}
  {activeTimerId && (
    <div style={{
      position: 'absolute',
      left: -76,
      top: '50%',
      transform: 'translateY(-50%)',
      height: 30,
      minWidth: activeTimerId === '__focus_timer__' ? 92 : 66,
      padding: '0 10px',
      borderRadius: 999,
      border: '1px solid rgba(15,23,42,0.14)',
      background: 'linear-gradient(180deg, rgba(17,24,39,0.97), rgba(7,10,18,0.95))',
      color: '#F8FAFF',
      boxShadow: '0 10px 24px rgba(15,23,42,0.22), inset 0 1px 0 rgba(255,255,255,0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      pointerEvents: 'auto',
    }}>
      <TimerText seconds={timerSeconds} compact />
      {activeTimerId === '__focus_timer__' && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setFocusTimerPaused((value) => !value);
          }}
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255,255,255,0.12)',
            color: '#F8FAFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: CURSOR_CLICK,
          }}
          aria-label={focusTimerPaused ? 'Reanudar contador' : 'Pausar contador'}
          title={focusTimerPaused ? 'Reanudar contador' : 'Pausar contador'}
        >
          {focusTimerPaused ? <Play style={{ width: 11, height: 11 }} /> : <Pause style={{ width: 11, height: 11 }} />}
        </button>
      )}
    </div>
  )}
  <div style={{ width: 6, height: 34, borderRadius: 999, background: 'rgba(255,255,255,0.10)' }} />
  </div>
 </div>
 );
 }

 // Detect if running in browser (not Electron) for preview mode
 const isElectron =!!window.electronAPI;

 // ─── EXPANDED PANEL ───
 // In browser: render inside a preview shell that simulates the floating window
 const panelContent = (
 <>
 {/* OUTER: position context — no overflow clip so the tab can protrude */}
 <div
 onMouseEnter={() => {
 handleMouseEnterUI();
 }}
 onMouseLeave={(e) => {
 if (showLedGlow &&!hasInteractedRef.current) {
 hasInteractedRef.current = true;
 setShowLedGlow(false);
 }
 handleMouseLeaveUI();
 }}
 style={{...miniThemeVars,
 position: isElectron? 'fixed': 'relative',
 inset: isElectron? 0: undefined,
 width: isElectron? undefined: (calendarOpen? PANEL_W + CALENDAR_W: PANEL_W + 32),
 height: isElectron? undefined: '100%',
 fontFamily: 'system-ui, -apple-system, sans-serif',
 color: C.text,
 overflow: 'visible', // Ensure tab doesn't clip
 }}
 >
 {/* TAB: Put it BEFORE the Inner panel in JSX so it naturally renders 'behind' but is still interactive */}
 <motion.div
 onMouseEnter={handleCalendarEnter}
 onMouseLeave={handleCalendarLeave}
 animate={{ 
 opacity: calendarOpen? 0: 1, 
 x: calendarOpen? 12: 0 
 }}
 whileHover={{ 
 scale: 1.05,
 boxShadow: `0 0 20px ${C.accentGlow}`,
 borderColor: C.accentBorder
 }}
 transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.8 }}
 style={{
 position: 'absolute',
 left: PANEL_W - 12,
 top: '50%',
 zIndex: 0,
 transform: 'translateY(-50%)',
 width: 46, height: 60,
 borderRadius: '0 18px 18px 0',
 background: C.bg,
 border: '1px solid rgba(31,41,55,0.16)',
 borderLeft: 'none',
 boxShadow: '8px 0 18px rgba(0,0,0,0.14)',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 cursor: CURSOR_CLICK, 
 pointerEvents: calendarOpen? 'none': 'auto',
 }}
 title="Ver calendario"
 >
 <CalendarDays style={{ width: 18, height: 18, color: 'rgba(31,41,55,0.64)', marginLeft: 10 }} />
 </motion.div>

 {/* INNER: visual panel with clipping */}
 <div style={{
 position: 'absolute',
 left: 0, top: 0, bottom: 0,
 width: calendarOpen? PANEL_W + CALENDAR_W: PANEL_W,
 background: C.bg,
 backgroundImage: 'radial-gradient(circle at 20% 22%, rgba(255,255,255,0.10) 0 1px, transparent 1.6px), radial-gradient(circle at 78% 62%, rgba(0,0,0,0.045) 0 1px, transparent 1.7px)',
 backgroundPosition: '0 17px',
 borderRadius: isElectron? 20: 18,
 border: `1px solid ${C.border}`,
 boxShadow: '0 18px 45px rgba(0,0,0,0.22)',
 display: 'flex', flexDirection: 'row',
 zIndex: 2,
 overflow: 'hidden',
 boxSizing: 'border-box',
 transition: 'width 0.34s cubic-bezier(0.16, 1, 0.3, 1)',
 }}>
 {/* Left panel: tasks */}
 <div className="notebook-cream-bg" style={{ width: PANEL_W, display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
 <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(255,255,255,0.035), transparent 54px)' }} />
 <div onMouseDown={onDragMouseDown} style={{
 padding: '12px 14px 8px',
 flexShrink: 0,
 cursor: CURSOR_GRAB,
 userSelect: 'none',
 position: 'relative',
 zIndex: 3,
 }}>
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
 <MiniIconButton title="Agregar tarea" onClick={openTextCapture}>
 <Plus style={{ width: 15, height: 15 }} />
 </MiniIconButton>
 <MiniIconButton title="Tarea recurrente" onClick={() => setRecurrenceFlowOpen(true)}>
 <Repeat style={{ width: 14, height: 14 }} />
 </MiniIconButton>
 <MiniIconButton title="Musica (pronto)" disabled>
 <Music style={{ width: 14, height: 14 }} />
 </MiniIconButton>
 <MiniIconButton title="Contador" onClick={() => setFocusTimerMenuOpen((value) => !value)}>
 <Clock3 style={{ width: 14, height: 14 }} />
 </MiniIconButton>
 <MiniIconButton title="Buscar tareas" onClick={() => setMiniSearchOpen((value) => !value)}>
 <Search style={{ width: 14, height: 14 }} />
 </MiniIconButton>
 </div>
 <button
 type="button"
 onClick={(event) => { event.stopPropagation(); handleToggleExpand(); }}
 style={{
 height: 31,
 minWidth: activeTimerId ? 86 : 36,
 borderRadius: 14,
 border: '1px solid rgba(31,41,55,0.12)',
 background: activeTimerId ? 'linear-gradient(180deg, rgba(9,18,34,0.98), rgba(5,10,20,0.98))' : 'rgba(255,255,255,0.58)',
 boxShadow: '0 8px 18px rgba(31,41,55,0.10), inset 0 1px 0 rgba(255,255,255,0.72)',
 color: activeTimerId ? '#F8FAFF' : 'rgba(31,41,55,0.68)',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 cursor: CURSOR_CLICK,
 padding: activeTimerId ? '0 10px' : 0,
 }}
 title="Recoger"
 >
 {activeTimerId ? <TimerText seconds={timerSeconds} compact /> : <ChevronsLeft style={{ width: 17, height: 17 }} />}
 </button>
 </div>

 {focusTimerMenuOpen && (
   <div style={{
   marginTop: 10,
   display: 'flex',
   flexWrap: 'wrap',
   gap: 8,
   borderRadius: 18,
   border: '1px solid rgba(31,41,55,0.10)',
   background: 'rgba(255,255,255,0.64)',
   padding: 10,
   boxShadow: '0 10px 24px rgba(31,41,55,0.10)',
   }}>
     {[15, 25, 45, 60].map((minutes) => (
       <button
         key={minutes}
         type="button"
         onClick={() => startFocusTimer(minutes)}
         style={{
           borderRadius: 999,
           border: '1px solid rgba(31,41,55,0.10)',
           background: 'rgba(255,255,255,0.92)',
           color: C.text,
           padding: '7px 12px',
           fontSize: 11,
           fontWeight: 850,
           cursor: CURSOR_CLICK,
         }}
       >
         {minutes} min
       </button>
     ))}
     <button
       type="button"
       onClick={openFocusTimerPrompt}
       style={{
         borderRadius: 999,
         border: '1px solid rgba(31,41,55,0.10)',
         background: 'rgba(17,24,39,0.92)',
         color: '#F8FAFF',
         padding: '7px 12px',
         fontSize: 11,
         fontWeight: 850,
         cursor: CURSOR_CLICK,
       }}
     >
       Personalizado
     </button>
   </div>
 )}

 {miniSearchOpen && (
 <div style={{
 marginTop: 10,
 display: 'flex',
 alignItems: 'center',
 gap: 8,
 borderRadius: 16,
 border: '1px solid rgba(31,41,55,0.10)',
 background: 'rgba(255,255,255,0.58)',
 padding: '8px 10px',
 cursor: 'text',
 }}>
 <Search style={{ width: 15, height: 15, color: 'rgba(31,41,55,0.44)', flexShrink: 0 }} />
 <input
 autoFocus
 value={miniSearchQuery}
 onChange={(event) => setMiniSearchQuery(event.target.value)}
 onMouseDown={(event) => event.stopPropagation()}
 placeholder="Buscar tareas..."
 style={{
 minWidth: 0,
 flex: 1,
 border: 'none',
 outline: 'none',
 background: 'transparent',
 color: C.text,
 fontSize: 12,
 fontWeight: 750,
 }}
 />
 {miniSearchQuery && (
 <button type="button" onClick={() => setMiniSearchQuery('')} style={{ border: 'none', background: 'transparent', cursor: CURSOR_CLICK, color: 'rgba(31,41,55,0.48)', padding: 2 }}>
 <X style={{ width: 14, height: 14 }} />
 </button>
 )}
 </div>
 )}

 <div style={{ marginTop: 10, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
 <div style={{ minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
 <button
   type="button"
   onClick={(event) => {
     event.stopPropagation();
     setShowFolderTabs((value) => !value);
   }}
   aria-label={showFolderTabs ? 'Recoger cuadernos' : 'Mostrar cuadernos'}
   style={{
     width: 28,
     height: 28,
     marginTop: 5,
     borderRadius: 999,
     border: `1px solid ${showFolderTabs ? 'hsl(var(--primary) / 0.28)' : 'rgba(30,41,59,0.14)'}`,
     background: showFolderTabs ? 'hsl(var(--primary) / 0.12)' : 'rgba(255,255,255,0.48)',
     color: showFolderTabs ? 'hsl(var(--primary))' : 'rgba(31,41,55,0.58)',
     display: 'flex',
     alignItems: 'center',
     justifyContent: 'center',
     cursor: CURSOR_CLICK,
     flexShrink: 0,
     boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
   }}
 >
   <Folder style={{ width: 14, height: 14 }} />
 </button>
 <p style={{
   margin: 0,
   color: C.text,
   fontSize: 38,
   lineHeight: 0.96,
   fontWeight: 850,
   letterSpacing: '-0.02em',
   fontFamily: 'var(--font-headline, ui-rounded, system-ui, sans-serif)',
 }}>
 Pendientes
 </p>
 </div>
 <div style={{ color: C.text, marginTop: 2, textAlign: 'center' }}>
   <div style={{ fontSize: 44, lineHeight: 0.88, fontWeight: 850, fontFamily: 'var(--font-headline, ui-rounded, system-ui, sans-serif)', fontVariantNumeric: 'tabular-nums' }}>
     {format(new Date(), 'd')}
   </div>
   <div style={{ marginTop: 4, fontSize: 13, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted }}>
     {format(new Date(), 'MMM')}
   </div>
 </div>
 </div>
 </div>
 {/* Top bar — fully draggable */}
 <div onMouseDown={onDragMouseDown} style={{
 display: 'none', alignItems: 'center', justifyContent: 'center',
 padding: '12px 16px 10px', flexShrink: 0, cursor: CURSOR_GRAB, userSelect: 'none',
 position: 'relative', zIndex: 2,
 }}>
 {/* LEFT: collapse pill (…) + direct action buttons */}
 <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
 {/* Collapse / timer pill — same... design as collapsed state */}
 <div onClick={handleToggleExpand} style={{
 height: 28, borderRadius: 999,
 padding: activeTimerId? '0 11px': '0',
 width: activeTimerId? 'auto': 52,
 minWidth: activeTimerId? 82: 52,
 background: activeTimerId? 'linear-gradient(180deg, rgba(9,18,34,0.99), rgba(5,10,20,0.98))': applePill.background,
 border: `1px solid ${activeTimerId? (timerSeconds < 0? 'rgba(255,122,122,0.3)': 'rgba(124,151,255,0.24)'): applePill.border}`,
 boxShadow: activeTimerId? '0 6px 18px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.2)': applePill.shadow,
 display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0,
 cursor: CURSOR_CLICK,
 }} title="Colapsar">
 {activeTimerId? (
 <TimerText seconds={timerSeconds} compact />
 ): (
 <AppleDots size={4.5} isDarkMode={false} />
 )}
 </div>

 {/* 1. TEXT button — + icon */}
 <div
 onClick={(e) => { e.stopPropagation(); openTextCapture(); }}
 style={{
 width: 30, height: 28, borderRadius: 10,
 background: 'rgba(255,255,255,0.42)',
 border: `1px solid ${C.border}`,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 cursor: CURSOR_CLICK, flexShrink: 0,
 transition: 'all 0.2s ease',
 }}
 title="Añadir tarea"
 >
 <Plus style={{ width: 16, height: 16, color: C.text }} />
 </div>

 {/* 2. RECURRENCE button — Repeat icon */}
 <div
 onClick={(e) => { 
 e.stopPropagation(); 
 setRecurrenceFlowOpen(true);
 }}
 style={{
 width: 30, height: 28, borderRadius: 10,
 background: C.subBg,
 border: `1px solid ${C.border}`,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 cursor: CURSOR_CLICK, flexShrink: 0,
 transition: 'all 0.2s ease',
 }}
 title="Crear tarea recurrente"
 >
 <Repeat style={{ width: 14, height: 14, color: C.text }} />
 </div>
 </div>

 </div>
 {/* Notebook bar — Toggleable */}
 <div style={{
 display: 'none',
 padding: '10px 12px 7px 38px',
 borderBottom: '1px solid rgba(30,41,59,0.10)',
 position: 'relative',
 zIndex: 2,
 }}>
 <h2 className="notebook-handwriting font-headline" style={{
 margin: 0,
 color: C.text,
 fontSize: 19,
 lineHeight: 1.05,
 fontWeight: 800,
 letterSpacing: 0,
 whiteSpace: 'nowrap',
 }}>
  Pendientes
 </h2>
 </div>
  <div
    style={{
      display: showFolderTabs ? 'flex' : 'none',
      alignItems: 'center',
      gap: 6,
      padding: '4px 16px 8px 26px',
      overflowX: 'auto',
      background: 'transparent',
    }}
    className="no-scrollbar"
  >
    <button
      onClick={() => setSelectedFolderId(null)}
      style={{
        flexShrink: 0,
        padding: '6px 14px',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        background: !selectedFolderId ? 'hsl(var(--primary) / 0.14)' : 'rgba(255,255,255,0.40)',
        color: !selectedFolderId ? 'hsl(var(--primary))' : 'rgba(75,85,99,0.82)',
        border: `1px solid ${!selectedFolderId ? 'hsl(var(--primary) / 0.34)' : 'rgba(30,41,59,0.18)'}`,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        cursor: CURSOR_CLICK,
      }}
    >
      General
    </button>

    {visibleFolders.map((folder) => (
      <button
        key={folder.id}
        onClick={() => setSelectedFolderId(selectedFolderId === folder.id ? null : folder.id)}
        style={{
          flexShrink: 0,
          padding: '6px 14px',
          borderRadius: 999,
          fontSize: 10,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          background: selectedFolderId === folder.id ? 'hsl(var(--primary) / 0.14)' : 'rgba(255,255,255,0.40)',
          color: selectedFolderId === folder.id ? 'hsl(var(--primary))' : 'rgba(75,85,99,0.82)',
          border: `1px solid ${selectedFolderId === folder.id ? 'hsl(var(--primary) / 0.34)' : 'rgba(30,41,59,0.18)'}`,
          display: 'flex',
          alignItems: 'center',
          cursor: CURSOR_CLICK,
          fontFamily: 'var(--font-headline, ui-rounded, system-ui, sans-serif)',
        }}
      >
        {folder.name}
      </button>
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
              padding: '4px 8px',
              borderRadius: 8,
              fontSize: 10,
              fontWeight: 600,
              background: 'rgba(0,0,0,0.2)',
              border: `1px solid ${C.border}`,
              color: C.text,
              outline: 'none',
              width: 120,
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
            style={{ padding: 4, background: C.accentSoft, borderRadius: 6, border: `1px solid ${C.accentBorder}`, cursor: CURSOR_CLICK, color: C.accent }}
            title="Guardar"
          >
            <Check style={{ width: 12, height: 12 }} />
          </button>
          <button
            onClick={() => { setIsCreatingFolder(false); setNewFolderName(''); }}
            style={{ padding: 4, background: 'transparent', border: 'none', cursor: CURSOR_CLICK, color: C.muted }}
            title="Cancelar"
          >
            <X style={{ width: 12, height: 12 }} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 4, paddingBottom: 2 }}>
          {FOLDER_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setNewFolderColor(c)}
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: c,
                border: 'none',
                cursor: CURSOR_CLICK,
                boxShadow: newFolderColor === c ? `0 0 0 2px ${C.bg}, 0 0 0 4px ${c}` : 'none',
              }}
            />
          ))}
        </div>
      </div>
    ) : (
      <button
        onClick={() => setIsCreatingFolder(true)}
        style={{
          flexShrink: 0,
          padding: '4px 12px',
          borderRadius: 8,
          fontSize: 10,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          background: 'transparent',
          color: C.muted,
          border: `1px dashed ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          transition: 'all 0.2s ease',
          cursor: CURSOR_CLICK,
        }}
        title="Crear nuevo cuaderno"
      >
        <Plus style={{ width: 10, height: 10 }} />
      </button>
    )}
  </div>

 <div
 style={{
 flex: 1,
 overflowY: 'auto',
 padding: '8px 18px 10px 26px',
 }}
 data-sidebar-droptarget="true"
 tabIndex={0}
 >
 {selectedFolderId && (
 <div style={{ padding: '0 8px', marginBottom: 12, display: 'flex', gap: 8 }}>
 <button
 onClick={openTextCapture}
 style={{
 flex: 1, height: 36, borderRadius: 12,
 background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`,
 display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
 color: C.text, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
 cursor: CURSOR_CLICK, transition: 'all 0.2s ease'
 }}
 >
 <Plus style={{ width: 14, height: 14, color: C.muted }} /> Texto
 </button>
 </div>
 )}

 {loading || isLoading? (
 <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
 <div style={{ width: 20, height: 20, border: `2px solid ${C.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
 </div>
 ):!user? (
 <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, padding: 16 }}>Abre la app principal primero.</p>
 ): sortedTasks.length === 0 && upcomingTasksByDate.length === 0? (
 <div style={{ textAlign: 'center', padding: 24 }}>
 <span style={{ fontSize: 28 }}></span>
 <p style={{ fontSize: 11, fontWeight: 800, marginTop: 8, color: C.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
 {selectedFolderId? 'Sin tareas en este cuaderno': '¡Día despejado!'}
 </p>
 </div>
 ): (
  <div key="task-list-items" className="notebook-task-list">
 <AnimatePresence mode="popLayout">
 {orderedTasks.map((task: MiniTask, idx: number) => (
 <div
 key={task.id}
 data-mini-task-idx={idx}
 onDragOver={(event) => handleMiniReorderOver(event, idx)}
 onDragEnd={handleMiniReorderEnd}
 style={{
 cursor: task.status === 'done'? 'default': CURSOR_GRAB,
 opacity: reorderIdx === idx? 0.72: 1,
 outline: reorderIdx === idx? '2px solid rgba(91,124,250,0.42)': 'none',
 outlineOffset: -2,
 transition: 'opacity 120ms ease, transform 120ms ease',
 }}
 >
 <TaskRow
 task={{ ...(completingId === task.id? {...task, status: 'done' }: task), children: subtasksByParent[task.id] || [], subtask_count: subtasksByParent[task.id]?.length || 0 }}
 taskIdx={task.status !== 'done' ? idx : undefined}
 onToggle={handleToggle}
 onDetail={handleDetail}
 activeTimerId={activeTimerId}
 onTimerToggle={handleTimerToggle}
 updateTask={updateTask}
 folders={visibleFolders}
 currentDate={viewDate}
 ensureCalendarOpen={openCalendarPanel}
 onReorderPointerStart={handleMiniReorderPointerStart}
 />
 </div>
 ))}
 </AnimatePresence>
  {upcomingTasksByDate.length > 0 && (
    <div style={{ marginTop: 14 }}>
      <button
        type="button"
        onClick={() => setShowUpcomingDays((value) => !value)}
       style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          border: 'none',
          background: 'transparent',
          padding: '5px 0',
          cursor: CURSOR_CLICK,
        }}
      >
       <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted }}>Siguientes días</span>
        <span style={{ fontSize: 12, fontWeight: 900, color: 'rgba(31,41,55,0.42)' }}>{showUpcomingDays ? 'v' : '>'}</span>
      </button>
 
      <AnimatePresence initial={false}>
        {showUpcomingDays && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            style={{ marginTop: 2, borderTop: '1px solid rgba(31,41,55,0.075)' }}
          >
            {upcomingTasksByDate.map((day) => (
              <details key={day.key} open style={{ borderBottom: '1px solid rgba(31,41,55,0.075)' }}>
                <summary style={{ listStyle: 'none', display: 'flex', alignItems: 'center', gap: 8, cursor: CURSOR_CLICK, padding: '11px 0 8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 760, letterSpacing: 0, color: 'rgba(31,41,55,0.54)' }}>
                    <span style={{ fontSize: 16, lineHeight: 1, color: 'rgba(31,41,55,0.36)' }}>›</span>
                    {day.label}
                  </span>
                  <span style={{ minWidth: 18, height: 18, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'rgba(31,41,55,0.36)' }}>{day.tasks.length}</span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (day.date) openTextCapture(format(day.date, 'yyyy-MM-dd'));
                    }}
                    style={{
                      width: 23,
                      height: 23,
                      borderRadius: 999,
                      border: '1px solid rgba(31,41,55,0.10)',
                      background: 'rgba(255,255,255,0.54)',
                      color: 'rgba(31,41,55,0.62)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: CURSOR_CLICK,
                      fontSize: 14,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                    title="Agregar tarea para este dia"
                    aria-label="Agregar tarea para este dia"
                  >
                    +
                  </button>
                </summary>

                <div className="notebook-task-list" style={{ paddingLeft: 18, paddingBottom: 5 }}>
                  {document.documentElement.dataset.renderLegacyUpcomingDays === 'true' && (
                    <details>
                      <summary style={{ listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, cursor: CURSOR_CLICK, padding: '2px 2px 6px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(31,41,55,0.45)' }}>
                          <span style={{ fontSize: 16, lineHeight: 1, color: 'rgba(31,41,55,0.36)' }}>›</span>
                          {getFutureTaskGroupLabel(day.date, new Date(today))}
                        </span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (day.date) openTextCapture(format(day.date, 'yyyy-MM-dd'));
                          }}
                          style={{
                            minWidth: 26,
                            height: 26,
                            borderRadius: 999,
                            border: '1px solid rgba(31,41,55,0.10)',
                            background: 'rgba(255,255,255,0.72)',
                            color: C.text,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: CURSOR_CLICK,
                            fontSize: 14,
                            fontWeight: 900,
                          }}
                          title="Agregar tarea para este día"
                          aria-label="Agregar tarea para este día"
                        >
                          +
                        </button>
                      </summary>

                      <div className="notebook-task-list">
                        {day.tasks.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={{ ...(completingId === task.id ? { ...task, status: 'done' } : task), children: subtasksByParent[task.id] || [], subtask_count: subtasksByParent[task.id]?.length || 0 }}
                            taskIdx={undefined}
                            onToggle={handleToggle}
                            onDetail={handleDetail}
                            activeTimerId={activeTimerId}
                            onTimerToggle={handleTimerToggle}
                            updateTask={updateTask}
                            folders={visibleFolders}
                            currentDate={viewDate}
                            ensureCalendarOpen={openCalendarPanel}
                            onReorderPointerStart={undefined}
                          />
                        ))}
                      </div>
                    </details>
                  )}
                  {day.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={{ ...(completingId === task.id ? { ...task, status: 'done' } : task), children: subtasksByParent[task.id] || [], subtask_count: subtasksByParent[task.id]?.length || 0 }}
                      taskIdx={undefined}
                      onToggle={handleToggle}
                      onDetail={handleDetail}
                      activeTimerId={activeTimerId}
                      onTimerToggle={handleTimerToggle}
                      updateTask={updateTask}
                      folders={visibleFolders}
                      currentDate={viewDate}
                      ensureCalendarOpen={openCalendarPanel}
                      onReorderPointerStart={undefined}
                    />
                  ))}
                </div>
              </details>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )}
 {totalCount > 0 && completedCount === totalCount && (
 <motion.div 
 initial={{ opacity: 0, scale: 0.9 }} 
 animate={{ opacity: 1, scale: 1 }}
 style={{ margin: '6px 0', padding: '10px', borderRadius: 12, textAlign: 'center', background: C.accentBg, border: `1px solid ${C.accentBorder}` }}
 >
 <span style={{ fontSize: 20 }}></span>
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
 initial={{ width: 0, opacity: 0, x: 28, scale: 0.985, filter: 'blur(6px)' }}
 animate={{ width: CALENDAR_W, opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
 exit={{ width: 0, opacity: 0, x: 24, scale: 0.985, filter: 'blur(6px)' }}
 transition={{ type: 'spring', stiffness: 360, damping: 34, mass: 0.85 }}
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
 style={{ width: CALENDAR_W, height: '100%', flex: 1, minWidth: CALENDAR_W }}
 onMouseEnter={() => {
 if (calendarTimerRef.current) {
 clearTimeout(calendarTimerRef.current);
 calendarTimerRef.current = null;
 }
 }}
 >
  <AdonaiCalendarView
    selectedDate={viewDate}
    onSelectDate={(date) => {
      setViewDate(date);
      writeCalendarDate(date);
    }}
    onViewModeChange={(mode) => {
      const nextMode = mode === 'week' || mode === 'month' ? mode : 'day';
      setViewMode(nextMode);
      writeCalendarViewMode(nextMode);
    }}
    viewMode={viewMode}
    dragDisabled={false}
    className="h-full"
    hideSidebar
    fillHeight
    googleEvents={googleCalendarEvents}
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
 <FirstTaskSignupModal />
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
 Vista previa - Mini Ventana
 </div>

 {/* Simulated window â€” overflow visible so tab protrudes */}
 <div style={{
 width: PANEL_W + (calendarOpen? CALENDAR_W + 16: 0),
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
