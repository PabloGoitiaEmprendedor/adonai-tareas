/**
 * MiniTasksPage — Adaptive floating pill widget.
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
import { useSubtasks } from '@/hooks/useSubtasks';
import { format, parseISO, addMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, ChevronRight, CalendarDays, Plus, Mic, Repeat, Paperclip, Folder, FolderOpen, X, Users as UsersIcon, GripHorizontal, ChevronsUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { compareTasksWithinQuadrants, getTaskManualOrderGroupKey } from '@/lib/taskOrdering';
import { trackAnalyticsEvent } from '@/lib/analytics';
import '../index.css';

const FOLDER_COLORS = ['#5B7CFA', '#4F6EE8', '#6FCF97', '#F4B860', '#EB5757', '#7C97FF', '#9CA3AF', '#E5E7EB'];

const PANEL_W = 340;
const PANEL_H = 500;
const CALENDAR_W = 600;
const PILL_W = 100;
const PILL_H = 52;
const PILL_TIMER_W = 130;

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

const getMiniThemeVars = (isDarkMode: boolean): MiniThemeVars => ({
 '--mini-bg': isDarkMode? '#0B1220': '#F7F8FC',
 '--mini-border': isDarkMode? 'rgba(91, 124, 250, 0.12)': 'rgba(21, 24, 32, 0.1)',
 '--mini-text': isDarkMode? 'rgba(245,247,255,0.94)': '#151820',
 '--mini-muted': isDarkMode? 'rgba(211,219,245,0.56)': 'rgba(21,24,32,0.54)',
 '--mini-accent': isDarkMode? '#3E5CC8': '#5B7CFA',
 '--mini-accent-bg': isDarkMode? 'rgba(62, 92, 200, 0.08)': 'rgba(91, 124, 250, 0.1)',
 '--mini-accent-soft': isDarkMode? 'rgba(62, 92, 200, 0.16)': 'rgba(91, 124, 250, 0.14)',
 '--mini-accent-border': isDarkMode? 'rgba(91, 124, 250, 0.22)': 'rgba(91, 124, 250, 0.26)',
 '--mini-accent-glow': isDarkMode? 'rgba(62, 92, 200, 0.16)': 'rgba(91, 124, 250, 0.16)',
 '--mini-task-bg': isDarkMode? '#101826': '#FFFFFF',
 '--mini-task-border': isDarkMode? 'rgba(255, 255, 255, 0.07)': 'rgba(21, 24, 32, 0.08)',
 '--mini-sub-bg': isDarkMode? '#080F1B': '#EEF2FA',
});

const getApplePillStyles = (isDarkMode: boolean) => ({
 background: isDarkMode? 'linear-gradient(180deg, rgba(255,255,255,0.11), rgba(255,255,255,0.035))': 'linear-gradient(180deg, rgba(91,124,250,0.18), rgba(62,92,200,0.08))',
 border: isDarkMode? 'rgba(255,255,255,0.14)': 'rgba(91,124,250,0.18)',
 shadow: isDarkMode? '0 10px 26px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(0,0,0,0.18)': '0 10px 24px rgba(4,10,24,0.22), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.18)',
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
 background: isDarkMode? 'linear-gradient(180deg, rgba(124,151,255,0.82), rgba(62,92,200,0.52))': 'linear-gradient(180deg, rgba(20,32,56,0.88), rgba(20,32,56,0.48))',
 boxShadow: isDarkMode? '0 1px 2px rgba(0,0,0,0.42), 0 0 8px rgba(62,92,200,0.18), inset 0 1px 0 rgba(255,255,255,0.12)': '0 1px 2px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.58)',
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

// ─── Subtask Row ─────────────────────────────────────────────────────────────
const SubtaskRowRaw = ({ sub, onToggle, onUpdate }: { sub: any; onToggle: (sub: any) => void; onUpdate: (title: string) => void }) => {
 const isDone = sub.status === 'done';
 const [isEditing, setIsEditing] = useState(false);
 const [draftTitle, setDraftTitle] = useState(sub.title);

 const submitEdit = () => {
 setIsEditing(false);
 if (draftTitle.trim() && draftTitle.trim()!== sub.title) {
 onUpdate(draftTitle.trim());
 } else {
 setDraftTitle(sub.title);
 }
 };

 return (
 <div onClick={() => onToggle(sub)} style={{
 display: 'flex', alignItems: 'center', gap: 8,
 padding: '6px 8px 6px 28px', borderRadius: 8, cursor: isEditing? 'default': 'pointer',
 background: C.subBg, marginBottom: 2, opacity: isDone? 0.45: 1,
 }}>
 <div onClick={(e) => { e.stopPropagation(); onToggle(sub); }} style={{ flexShrink: 0, cursor: 'pointer' }}>
 <TaskCheckbox checked={isDone} size="sm" />
 </div>
 {isEditing? (
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
 ): (
 <span 
 onClick={(e) => { e.stopPropagation(); setIsEditing(true); setDraftTitle(sub.title); }}
 title="Haz clic para editar"
 style={{
 flex: 1, fontSize: 12, color: isDone? C.muted: C.text,
 textDecoration: isDone? 'line-through': 'none',
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
const TaskRowRaw = ({ task, onToggle, onDetail, activeTimerId, onTimerToggle, updateTask, folders, currentDate, ensureCalendarOpen }: {
 task: any; onToggle: (task: any) => void; onDetail: (task: any) => void;
 activeTimerId: string | null; onTimerToggle: (taskId: string, estimatedMinutes?: number) => void;
 updateTask: any; folders: any[]; currentDate: Date; ensureCalendarOpen?: () => void;
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
 if (draftTitle.trim() && draftTitle.trim()!== task.title) {
 updateTask.mutate({ id: task.id, title: draftTitle.trim() });
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
 const baseBg = priorityColor === 'transparent'? C.taskBg: `${priorityColor}4D`;

 const actualSeconds = task.actual_duration_seconds || 0;

 const TIME_PREFIX_REGEX = /^\[T:(\d{2}:\d{2})-(\d{2}:\d{2})\]/;
 const parseTimeFromDescription = (desc: string | null) => {
 if (!desc) return null;
 const match = desc.match(TIME_PREFIX_REGEX);
 if (!match) return null;
 return { start: match[1], end: match[2] };
 };

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

 return (
 <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95 }} style={{ marginBottom: 4 }}>
 <div 
 onClick={() => onDetail(task)}
 style={{
 display: 'flex', alignItems: 'center', gap: 10, padding: '10px',
 borderRadius: 12, cursor: 'pointer',
 background: isDone? 'transparent': isTimerActive? C.accentBg: baseBg,
 border: `1px solid ${isDone? 'transparent': isTimerActive? C.accentBorder: C.taskBorder}`,
 opacity: isDone? 0.45: 1,
 }}
 >
 {!isDone? (
 <div
 onClick={(e) => e.stopPropagation()}
 title="Arrastra para ordenar"
 aria-label="Arrastra para ordenar"
 style={{
 width: 16,
 height: 28,
 flexShrink: 0,
 borderRadius: 8,
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 color: C.muted,
 opacity: 0.62,
 cursor: 'grab',
 }}
 >
 <ChevronsUpDown style={{ width: 13, height: 13, strokeWidth: 1.8 }} />
 </div>
 ): (
 <div style={{ width: 16, flexShrink: 0 }} />
 )}

 <div 
 onClick={(e) => { e.stopPropagation(); onToggle(task); }} 
 style={{ flexShrink: 0 }}
 >
 <TaskCheckbox checked={isDone} priorityColor={priorityColor} size="sm" />
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
 transform: open? 'rotate(45deg)': 'none',
 color: open? C.accent: C.muted
 }}>
 +
 </span>
 </button>
 )}

 <div style={{ flex: 1, minWidth: 0 }}>
 {isEditing? (
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
 ): (
 <span 
 onClick={(e) => { e.stopPropagation(); setIsEditing(true); setDraftTitle(task.title); }}
 title="Haz clic para editar"
 style={{
 display: 'block', fontSize: 13, fontWeight: 550, lineHeight: 1.35,
 color: isDone? C.muted: C.text,
 textDecoration: isDone? 'line-through': 'none',
 cursor: 'text'
 }}
 >
 {task.title}
 </span>
 )}

 </div>

 {/* Link / Timer / Duration Result */}
 <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
 {isDone? (
 actualSeconds > 0 && (
 <TaskDurationBadge seconds={actualSeconds} estimatedMinutes={task.estimated_minutes} compact />
 )
 ): (
 <>
 {task.link && task.link.split(/\s+/).filter(Boolean).map((url: string, i: number) => {
 const href = url.startsWith('http')? url: `https://${url}`;
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
 <Paperclip style={{ width: 12, height: 12, color: priorityColor === 'transparent'? 'var(--primary)': priorityColor }} />
 </div>
 );
 })}
 
 {isEditing? (
 <div
 onClick={(e) => { e.stopPropagation(); submitEdit(); }}
 style={{
 width: 24, height: 24, borderRadius: 6, flexShrink: 0,
 background: C.accentSoft,
 border: `1px solid ${C.accentBorder}`,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 cursor: 'pointer',
 }}
 >
 <Check style={{ width: 12, height: 12, color: C.accent, strokeWidth: 3 }} />
 </div>
 ): (
 <TaskTimerButton
 active={isTimerActive}
 priorityColor={priorityColor}
 size="sm"
 onClick={(e) => { e.stopPropagation(); onTimerToggle(task.id, task.estimated_minutes || 30); }}
 />
 )}

 {!isDone && (
 <button
 type="button"
 title="Arrastrar al calendario"
 onMouseDown={handleMouseDownDrag}
 onTouchStart={handleTouchStartDrag}
 onClick={(e) => e.stopPropagation()}
 style={{
 width: 24, height: 24, borderRadius: 6, flexShrink: 0,
 background: 'transparent',
 border: '1px solid transparent',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 cursor: 'grab',
 opacity: 0.48,
 }}
 >
 <GripHorizontal style={{ width: 11, height: 11, color: C.muted }} />
 </button>
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
 onToggle={(s) => toggleSubtask.mutate({ id: s.id, done: s.status!== 'done' })}
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
 if (e.button!== 0) return;
 isDraggingRef.current = true;
 hasMovedRef.current = false;
 (window as any).electronAPI?.startDrag?.();
 }, []);

 return { onMouseDown, hasMovedRef, isDraggingRef };
}

// ─── Main component ──────────────────────────────────────────────────────────
const MiniTaskList = () => {
 const { user, loading } = useAuth();
 const { theme } = useTheme();
 const isDarkMode = theme === 'dark' || (theme === 'system' && document.documentElement.classList.contains('dark'));
 const miniThemeVars = getMiniThemeVars(isDarkMode);
 const applePill = getApplePillStyles(isDarkMode);
 const [viewDate, setViewDate] = useState(new Date());
 const { tasks, updateTask, createTask, isLoading } = useTasks({ 
 date: format(viewDate, 'yyyy-MM-dd'), 
 excludeEvents: false 
 });
 const { folders, createFolder } = useFolders();
 const { checkAndUnlock } = useGamification();
 const { profile } = useProfile();
 const [completingId, setCompletingId] = useState<string | null>(null);

 useEffect(() => {
 trackAnalyticsEvent('mini_window_viewed', {
 is_electron: Boolean((window as any).electronAPI),
 });
 }, []);
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

 const openTextCapture = useCallback(() => {
 setCaptureMode('text');
 setCaptureCreationSource('mini_plus');
 setCaptureOpen(true);
 captureModalRef.current?.openInTextMode(format(viewDate, 'yyyy-MM-dd'));
 }, [viewDate]);

 const openVoiceCapture = useCallback(() => {
 setCaptureMode('voice');
 setCaptureCreationSource('mini_voice');
 setCaptureOpen(true);
 void captureModalRef.current?.openInVoiceMode();
 }, []);

 const { onMouseDown: onDragMouseDown, hasMovedRef, isDraggingRef: isDraggingWindowRef } = useDragWindow();

 // Store original pill position before expanding (to restore on collapse)
 const originalPosRef = useRef<{ x: number; y: number } | null>(null);

 // LED animation state
 const [showLedGlow, setShowLedGlow] = useState(false);
 const hasInteractedRef = useRef(false);

 const [calendarOpen, setCalendarOpen] = useState(false);
 const [orderedTasks, setOrderedTasks] = useState<any[]>([]);
 const [reorderIdx, setReorderIdx] = useState<number | null>(null);
 const calendarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const calendarHoverRef = useRef(false);
 const calendarBusyRef = useRef(false);

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
 if (!api?.getMiniPosition ||!api?.setMiniBounds) return;
 api.getMiniPosition().then((pos: any) => {
 if (!pos) return;
 const newW = activeTimerId? PILL_TIMER_W: PILL_W;
 const dx = (pos.w - newW) / 2;
 api.setMiniBounds({ x: pos.x + dx, y: pos.y, w: newW, h: PILL_H });
 });
 }
 }, [activeTimerId, isExpanded]);

 const handleToggleExpand = useCallback(async () => {
 if (hasMovedRef.current) return;
 const api = (window as any).electronAPI;
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

 const api = (window as any).electronAPI;
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
 
 const api = (window as any).electronAPI;
 if (api?.getMiniPosition && api?.setMiniBounds) {
 const pos = await api.getMiniPosition();
 // Only expand if not already wide enough
 const expandedWidth = PANEL_W + CALENDAR_W;
 if (pos && pos.w < expandedWidth) {
 api.setMiniBounds({ x: pos.x, y: pos.y, w: expandedWidth, h: pos.h });
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
 const t = setInterval(() => setNow(new Date()), 30000);
 return () => clearInterval(t);
 }, []);

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

 // Hide window until session is ready and user is authenticated
 useEffect(() => {
 if (!loading) {
 const ready =!!user;
 setIsReady(ready);
 
 // Initial state: ignore mouse events if collapsed so background is clickable
 if (ready &&!isExpanded) {
 (window as any).electronAPI?.setIgnoreMouseEvents?.(true, { forward: true });
 } else if (ready && isExpanded) {
 (window as any).electronAPI?.setIgnoreMouseEvents?.(false);
 }
 
 (window as any).electronAPI?.miniReady?.({ hasSession: ready });

 if (ready &&!hasInteractedRef.current) {
 setShowLedGlow(true);
 }
 }
 }, [loading, user, isExpanded]);

 const handleMouseEnterUI = useCallback(() => {
 if (user) (window as any).electronAPI?.setIgnoreMouseEvents?.(false);
 }, [user]);
 const handleMouseLeaveUI = useCallback(() => {
 // Only ignore mouse events when collapsed (pill mode) and NOT dragging
 if (user &&!isExpanded &&!isDraggingWindowRef.current) {
 (window as any).electronAPI?.setIgnoreMouseEvents?.(true, { forward: true });
 }
 }, [user, isExpanded]);

 const quadrantRank = useCallback((t: any) =>
 t.urgency && t.importance? 0: t.urgency? 1: t.importance? 2: 3, []);

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
 return tasks.filter((t: any) =>!t.folder_id);
 }
 // Si hay una carpeta seleccionada, muestra solo las tareas de esa carpeta
 return tasks.filter((t: any) => t.folder_id === selectedFolderId);
 }, [tasks, selectedFolderId]);

 const sortedTasks = useMemo(() => {
 return [...filteredTasks].sort(compareTasksWithinQuadrants);
 }, [filteredTasks]);

 useEffect(() => {
 setOrderedTasks(sortedTasks);
 }, [sortedTasks]);

 const persistMiniOrder = useCallback((nextOrder: any[]) => {
 nextOrder.forEach((task, idx) => {
 if (task.status!== 'done' && (task.sort_order?? 0)!== idx) {
 updateTask.mutate({ id: task.id, sort_order: idx });
 }
 });
 }, [updateTask]);

 const handleMiniReorderStart = useCallback((idx: number) => {
 if (orderedTasks[idx]?.status === 'done') return;
 setReorderIdx(idx);
 }, [orderedTasks]);

 const handleMiniReorderOver = useCallback((event: React.DragEvent, idx: number) => {
 event.preventDefault();
 if (reorderIdx === null || reorderIdx === idx) return;
 const dragged = orderedTasks[reorderIdx];
 const target = orderedTasks[idx];
 if (!dragged ||!target || dragged.status === 'done' || target.status === 'done') return;
 if (getTaskManualOrderGroupKey(dragged)!== getTaskManualOrderGroupKey(target)) return;

 const next = [...orderedTasks];
 const [moved] = next.splice(reorderIdx, 1);
 next.splice(idx, 0, moved);
 setOrderedTasks(next);
 setReorderIdx(idx);
 }, [orderedTasks, reorderIdx]);

 const handleMiniReorderEnd = useCallback(() => {
 if (reorderIdx!== null) persistMiniOrder(orderedTasks);
 setReorderIdx(null);
 }, [orderedTasks, persistMiniOrder, reorderIdx]);

 const completedCount = filteredTasks.filter((t: any) => t.status === 'done').length;
 const totalCount = filteredTasks.length;
 const progress = totalCount > 0? (completedCount / totalCount) * 100: 0;

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
 const remainingTasks = currentTasks.filter((t: any) => t.status!== 'done' && t.id!== task.id);
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
 actual_duration_seconds: finalDuration,
 creation_source: 'mini_plus',
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
 height: activeTimerId? 34: 32, borderRadius: 999,
 padding: activeTimerId? '0 8px 0 7px': '0',
 width: activeTimerId? 'auto': 64,
 minWidth: activeTimerId? 92: 64,
 background: activeTimerId? 'linear-gradient(180deg, rgba(9,18,34,0.99), rgba(5,10,20,0.98))': 'linear-gradient(180deg, rgba(16,24,38,0.98), rgba(8,15,27,0.96))',
 border: `1px solid ${activeTimerId? (timerSeconds < 0? 'rgba(255,122,122,0.34)': 'rgba(124,151,255,0.28)'): 'rgba(91,124,250,0.16)'}`,
 boxShadow: showLedGlow? `0 0 0 0 rgba(62, 92, 200, 0.16), 0 0 16px 2px ${C.accentGlow}, 0 0 28px 4px rgba(62, 92, 200, 0.07), inset 0 0 6px rgba(62, 92, 200, 0.06)`: activeTimerId? (timerSeconds < 0? '0 10px 26px rgba(0,0,0,0.4), 0 0 18px rgba(255,122,122,0.16), inset 0 1px 0 rgba(255,255,255,0.1)': '0 10px 26px rgba(0,0,0,0.4), 0 0 18px rgba(62,92,200,0.14), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.24)'): '0 10px 26px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.24)',
 display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0,
 userSelect: 'none', cursor: 'grab',
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
 {activeTimerId? (
 <TimerText seconds={timerSeconds} />
 ): (
 <AppleDots size={5.5} isDarkMode />
 )}
 </div>
 </div>
 );
 }

 // Detect if running in browser (not Electron) for preview mode
 const isElectron =!!(window as any).electronAPI;

 // ── EXPANDED PANEL ──
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
 handleMouseLeaveUI(e as any);
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
 left: PANEL_W - 24,
 top: '50%',
 transform: 'translateY(-50%)',
 width: 48, height: 48, 
 borderRadius: '50%',
 background: 'linear-gradient(135deg, hsl(var(--surface-container-high)) 0%, hsl(var(--surface-container)) 100%)',
 border: `1.5px solid ${C.accentBorder}`,
 boxShadow: '4px 0 16px rgba(0,0,0,0.45)',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 cursor: 'pointer', 
 pointerEvents: calendarOpen? 'none': 'auto',
 }}
 title="Ver calendario"
 >
 <CalendarDays style={{ width: 22, height: 22, color: C.accent, marginLeft: 12 }} />
 </motion.div>

 {/* INNER: visual panel with clipping */}
 <div style={{
 position: 'absolute',
 left: 0, top: 0, bottom: 0,
 width: calendarOpen? PANEL_W + CALENDAR_W: PANEL_W,
 background: C.bg, borderRadius: isElectron? 20: 18,
 border: `1px solid ${C.border}`,
 boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
 display: 'flex', flexDirection: 'row',
 overflow: 'hidden',
 boxSizing: 'border-box',
 transition: 'width 0.34s cubic-bezier(0.16, 1, 0.3, 1)',
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
 {/* Collapse / timer pill — same... design as collapsed state */}
 <div onClick={handleToggleExpand} style={{
 height: activeTimerId? 28: 26, borderRadius: 999,
 padding: activeTimerId? '0 11px': '0',
 width: activeTimerId? 'auto': 52,
 minWidth: activeTimerId? 82: 52,
 background: activeTimerId? 'linear-gradient(180deg, rgba(9,18,34,0.99), rgba(5,10,20,0.98))': applePill.background,
 border: `1px solid ${activeTimerId? (timerSeconds < 0? 'rgba(255,122,122,0.3)': 'rgba(124,151,255,0.24)'): applePill.border}`,
 boxShadow: activeTimerId? '0 6px 18px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.2)': applePill.shadow,
 display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0,
 cursor: 'pointer',
 }} title="Colapsar">
 {activeTimerId? (
 <TimerText seconds={timerSeconds} compact />
 ): (
 <AppleDots size={4.5} isDarkMode={isDarkMode} />
 )}
 </div>

 {/* 1. TEXT button — + icon */}
 <div
 onClick={(e) => { e.stopPropagation(); openTextCapture(); }}
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
 onClick={(e) => { e.stopPropagation(); openVoiceCapture(); }}
 style={{
 width: 34, height: 28, borderRadius: 10,
 background: C.subBg,
 border: `1px solid ${C.border}`,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 cursor: 'pointer', flexShrink: 0,
 transition: 'all 0.2s ease',
 }}
 title="Añadir por voz"
 >
 <Mic style={{ width: 15, height: 15, color: C.text }} />
 </div>

 {/* 3. FOLDERS Toggle Button */}
 <div
 onClick={(e) => { e.stopPropagation(); setShowFolderBar(!showFolderBar); }}
 style={{
 width: 34, height: 28, borderRadius: 10,
 background: showFolderBar? C.accentSoft: C.subBg,
 border: `1px solid ${showFolderBar? C.accentBorder: C.border}`,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 cursor: 'pointer', flexShrink: 0,
 transition: 'all 0.2s ease',
 }}
 title="Ver carpetas"
 >
 <Folder style={{ width: 14, height: 14, color: showFolderBar? C.accent: C.text }} />
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
 style={{ height: '100%', background: 'rgba(62, 92, 200, 0.58)' }} />
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
 background:!selectedFolderId? C.accentSoft: 'transparent',
 color:!selectedFolderId? C.text: C.muted,
 border: `1px solid ${!selectedFolderId? C.accentBorder: C.border}`,
 display: 'flex', alignItems: 'center', gap: 4,
 transition: 'all 0.2s ease'
 }}
 >
 General
 </button>
 {folders.map(folder => (
 <div key={folder.id} style={{
 flexShrink: 0, display: 'flex', alignItems: 'center', borderRadius: 8,
 background: selectedFolderId === folder.id? C.accentSoft: 'transparent',
 border: `1px solid ${selectedFolderId === folder.id? C.accentBorder: C.border}`,
 overflow: 'hidden',
 transition: 'all 0.2s ease'
 }}>
 <button
 onClick={() => setSelectedFolderId(folder.id)}
 style={{
 padding: '4px 8px 4px 12px',
 fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
 color: selectedFolderId === folder.id? C.text: C.muted,
 border: 'none', background: 'transparent', cursor: 'pointer',
 display: 'flex', alignItems: 'center', gap: 4
 }}
 >
 {folder.isShared? (
 <UsersIcon style={{ width: 10, height: 10, color: selectedFolderId === folder.id? C.accent: folder.color }} />
 ): (
 <motion.div
 key={selectedFolderId === folder.id? 'open': 'closed'}
 initial={{ rotateY: selectedFolderId === folder.id? 180: -180, scale: 0.8 }}
 animate={{ rotateY: 0, scale: 1 }}
 transition={{ type: 'spring', stiffness: 400, damping: 15 }}
 style={{ display: 'flex' }}
 >
 {selectedFolderId === folder.id? (
 <FolderOpen style={{ width: 10, height: 10, color: C.accent }} />
 ): (
 <Folder style={{ width: 10, height: 10, color: folder.color }} />
 )}
 </motion.div>
 )}
 {folder.name}
 </button>
 </div>
 ))}
 {isCreatingFolder? (
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
 style={{ padding: 4, background: C.accentSoft, borderRadius: 6, border: `1px solid ${C.accentBorder}`, cursor: 'pointer', color: C.accent }}
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
 boxShadow: newFolderColor === c? `0 0 0 2px ${C.bg}, 0 0 0 4px ${c}`: 'none'
 }}
 />
 ))}
 </div>
 </div>
 ): (
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

 <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px 10px' }} data-sidebar-droptarget="true" tabIndex={0}>
 {selectedFolderId && (
 <div style={{ padding: '0 8px', marginBottom: 12, display: 'flex', gap: 8 }}>
 <button
 onClick={openTextCapture}
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
 onClick={openVoiceCapture}
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

 {loading || isLoading? (
 <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
 <div style={{ width: 20, height: 20, border: `2px solid ${C.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
 </div>
 ):!user? (
 <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, padding: 16 }}>Abre la app principal primero.</p>
 ): sortedTasks.length === 0? (
 <div style={{ textAlign: 'center', padding: 24 }}>
 <span style={{ fontSize: 28 }}></span>
 <p style={{ fontSize: 11, fontWeight: 800, marginTop: 8, color: C.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
 {selectedFolderId? 'Sin tareas en esta carpeta': '¡Día despejado!'}
 </p>
 </div>
 ): (
 <div key="task-list-items">
 <AnimatePresence mode="popLayout">
 {orderedTasks.map((task: any, idx: number) => (
 <div
 key={task.id}
 draggable={task.status!== 'done'}
 onDragStart={() => handleMiniReorderStart(idx)}
 onDragOver={(event) => handleMiniReorderOver(event, idx)}
 onDragEnd={handleMiniReorderEnd}
 style={{
 cursor: task.status === 'done'? 'default': 'grab',
 opacity: reorderIdx === idx? 0.72: 1,
 transition: 'opacity 120ms ease, transform 120ms ease',
 }}
 >
 <TaskRow
 task={completingId === task.id? {...task, status: 'done' }: task}
 onToggle={handleToggle}
 onDetail={handleDetail}
 activeTimerId={activeTimerId}
 onTimerToggle={handleTimerToggle}
 updateTask={updateTask}
 folders={folders}
 currentDate={viewDate}
 ensureCalendarOpen={openCalendarPanel}
 />
 </div>
 ))}
 </AnimatePresence>
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
 onSelectDate={setViewDate}
 viewMode="day"
 dragDisabled={false}
 className="h-full"
 hideSidebar
 fillHeight
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
 Vista previa — Mini Ventana
 </div>

 {/* Simulated window — overflow visible so tab protrudes */}
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
