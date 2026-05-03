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
import { useSubtasks } from '@/hooks/useSubtasks';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, MoreHorizontal, ChevronRight, Clock, Pause, Plus, Mic, Repeat, Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TaskCaptureModal from '@/components/TaskCaptureModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import QuickRecurrenceFlow from '@/components/QuickRecurrenceFlow';
import { useGamification } from '@/hooks/useGamification';
import { triggerTaskCelebration, triggerDailyCelebration, triggerOnTimeCelebration } from '@/lib/celebrations';
import { usePriorityColors } from '@/hooks/usePriorityColors';
import '../index.css';

const PANEL_W = 340;
const PANEL_H = 500;
const PILL_W = 100;
const PILL_H = 52;
const PILL_TIMER_W = 130;

// Use CSS variables from index.css instead of hardcoded objects
const C = {
  bg: 'hsl(var(--background))',
  border: 'hsl(var(--outline-variant))',
  text: 'hsl(var(--foreground))',
  muted: 'hsl(var(--on-surface-variant))',
  accent: 'hsl(var(--primary))',
  accentBg: 'hsl(var(--primary-container))',
  taskBg: 'hsl(var(--surface-container-low))',
  taskBorder: 'hsl(var(--outline-variant))',
  subBg: 'hsl(var(--surface-container-lowest))',
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
        border: `2px solid ${isDone ? C.accent : 'var(--outline-variant)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isDone && <Check style={{ width: 10, height: 10, color: 'var(--primary-foreground)', strokeWidth: 3 }} />}
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
const TaskRowRaw = ({ task, onToggle, onDetail, activeTimerId, onTimerToggle, updateTask }: {
  task: any; onToggle: (task: any) => void; onDetail: (task: any) => void;
  activeTimerId: string | null; onTimerToggle: (taskId: string, estimatedMinutes?: number) => void;
  updateTask: any;
}) => {
  const isDone = task.status === 'done';
  const [open, setOpen] = useState(false);
  const { subtasks, toggleSubtask, updateSubtask } = useSubtasks(task.id);
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

  const { colors: priorityColors } = usePriorityColors();

  const getPriorityColor = () => {
    if (task.urgency && task.importance) return priorityColors.p1;
    if (task.urgency && !task.importance) return priorityColors.p2;
    if (!task.urgency && task.importance) return priorityColors.p3;
    return priorityColors.p4;
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }} style={{ marginBottom: 4 }}>
      <div 
        onClick={() => onDetail(task)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px',
          borderRadius: 12, cursor: 'pointer',
          background: isDone ? 'transparent' : isTimerActive ? 'var(--primary-container)' : C.taskBg,
          border: `1px solid ${isDone ? 'transparent' : isTimerActive ? 'var(--primary)' : C.taskBorder}`,
          opacity: isDone ? 0.45 : 1,
          position: 'relative',
        }}
      >
        <div 
          onClick={(e) => { e.stopPropagation(); onToggle(task); }} 
          style={{
            width: 26, height: 26, borderRadius: 8, flexShrink: 0,
            background: isDone ? C.accent : 'transparent',
            border: `2px solid ${isDone ? C.accent : 'var(--outline)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {isDone && <Check style={{ width: 13, height: 13, color: 'var(--primary-foreground)', strokeWidth: 3 }} />}
        </div>

        {/* Priority Dot */}
        <div style={{
          width: 4, height: 4, borderRadius: '50%',
          backgroundColor: getPriorityColor(),
          position: 'absolute', left: 22, top: 12, zIndex: 1
        }} />
        
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
              flex: 1, fontSize: 13, fontWeight: 600, lineHeight: 1.3,
              color: C.text, background: 'transparent', border: 'none',
              borderBottom: `1px solid ${C.accent}`, outline: 'none', padding: 0
            }}
          />
        ) : (
          <span 
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); setDraftTitle(task.title); }}
            title="Haz clic para editar"
            style={{
              flex: 1, fontSize: 13, fontWeight: 600, lineHeight: 1.3,
              color: isDone ? C.muted : C.text,
              textDecoration: isDone ? 'line-through' : 'none',
              cursor: 'text'
            }}
          >
            {task.title}
          </span>
        )}

        {/* Link / Timer / Duration Result */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isDone ? (
            actualSeconds > 0 && (
              <div style={{
                fontSize: 10, fontWeight: 700,
                color: isOverTime ? '#F87171' : '#A3E635',
                fontFamily: 'monospace',
                padding: '2px 6px',
                borderRadius: 6,
                background: isOverTime ? 'rgba(248,113,113,0.1)' : 'rgba(163,230,53,0.1)',
                border: `1px solid ${isOverTime ? 'rgba(248,113,113,0.2)' : 'rgba(163,230,53,0.2)'}`
              }}>
                {formatTimer(actualSeconds)}
              </div>
            )
          ) : (
            <>
              {task.link && (
                <div
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if ((window as any).electronAPI?.openExternal) {
                      (window as any).electronAPI.openExternal(task.link);
                    } else {
                      window.open(task.link, '_blank');
                    }
                  }}
                  style={{
                    width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                  title="Abrir link"
                >
                  <LinkIcon style={{ width: 12, height: 12, color: '#10b981' }} />
                </div>
              )}
              
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
                    background: isTimerActive ? 'rgba(33, 217, 4, 0.15)' : 'transparent',
                    border: `1px solid ${isTimerActive ? 'rgba(33, 217, 4, 0.3)' : 'rgba(1, 38, 14, 0.1)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                    {isTimerActive
                    ? <Pause style={{ width: 12, height: 12, color: C.accent }} />
                    : <Clock style={{ width: 12, height: 12, color: 'var(--on-surface-variant)', opacity: 0.3 }} />
                  }
                </div>
              )}
            </>
          )}
        </div>

        {hasSubtasks && (
          <div 
            onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }} 
            style={{
              display: 'flex', alignItems: 'center', gap: 3,
              padding: '2px 6px', borderRadius: 6,
              background: C.accentBg, cursor: 'pointer', flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: C.accent }}>{doneSubCount}/{subtasks.length}</span>
            <ChevronRight style={{
              width: 11, height: 11, color: C.accent,
              transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s',
            }} />
          </div>
        )}
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
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.screenX - startRef.current.x;
      const dy = e.screenY - startRef.current.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        hasMovedRef.current = true;
        (window as any).electronAPI?.moveWindow?.(dx, dy);
        startRef.current = { x: e.screenX, y: e.screenY };
      }
    };
    const onUp = () => { isDraggingRef.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startRef.current = { x: e.screenX, y: e.screenY };
  }, []);

  return { onMouseDown, hasMovedRef };
}

// ─── Main component ──────────────────────────────────────────────────────────
const MiniTaskList = () => {
  const { user, loading } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  const { tasks, updateTask, isLoading } = useTasks({ date: today });
  const { checkAndUnlock } = useGamification();
  const { profile } = useProfile();
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [now, setNow] = useState(new Date());

  // Timer state
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState<'text' | 'voice' | 'recurrence'>('text');
  const [captureCreationSource, setCaptureCreationSource] = useState<'mini_plus' | 'mini_voice'>('mini_plus');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [recurrenceFlowOpen, setRecurrenceFlowOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartRef = useRef<number>(0);

  const { onMouseDown: onDragMouseDown, hasMovedRef } = useDragWindow();

  // Store original pill position before expanding (to restore on collapse)
  const originalPosRef = useRef<{ x: number; y: number } | null>(null);

  // LED animation state
  const [showLedGlow, setShowLedGlow] = useState(false);
  const hasInteractedRef = useRef(false);

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

      api.setMiniBounds({ x: Math.round(panelX), y: Math.round(panelY), w: PANEL_W, h: PANEL_H });
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

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    // Ensure window is solid if expanded or if any modal is open
    if (isExpanded || captureOpen || detailOpen || recurrenceFlowOpen) {
      (window as any).electronAPI?.setIgnoreMouseEvents?.(false);
    }
    return () => clearInterval(t);
  }, [isExpanded, captureOpen, detailOpen, recurrenceFlowOpen]);

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
      (window as any).electronAPI?.setIgnoreMouseEvents?.(ready, { forward: true });
      (window as any).electronAPI?.miniReady?.({ hasSession: ready });

      // Trigger LED glow on first session start
      if (ready && !hasInteractedRef.current) {
        setShowLedGlow(true);
      }
    }
  }, [loading, user]);

  const handleMouseEnterUI = useCallback(() => {
    if (user) (window as any).electronAPI?.setIgnoreMouseEvents?.(false);
  }, [user]);
  const handleMouseLeaveUI = useCallback(() => {
    // Only ignore mouse events when collapsed (pill mode)
    // When expanded, always keep mouse events active
    if (user && !isExpanded) (window as any).electronAPI?.setIgnoreMouseEvents?.(true, { forward: true });
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

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a: any, b: any) => {
      const doneA = a.status === 'done' ? 1 : 0;
      const doneB = b.status === 'done' ? 1 : 0;
      if (doneA !== doneB) return doneA - doneB;

      const rankDiff = quadrantRank(a) - quadrantRank(b);
      if (rankDiff !== 0) return rankDiff;

      return (a.sort_order || 0) - (b.sort_order || 0);
    });
  }, [tasks, quadrantRank]);

  const completedCount = tasks.filter((t: any) => t.status === 'done').length;
  const totalCount = tasks.length;
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
    return <div style={{ width: '100vw', height: '100vh' }} />;
  }

  if (!isExpanded) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                : '0 4px 20px rgba(0, 0, 0, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            userSelect: 'none', cursor: 'grab',
            position: 'relative',
            animation: showLedGlow ? 'ledPulse 1.5s ease-in-out infinite' : 'none',
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
                width: 6, height: 6, borderRadius: '50%',
                background: timerSeconds < 0 ? '#F87171' : C.accent, animation: 'pulse 1.5s ease-in-out infinite',
              }} />
              <span style={{
                fontSize: 14, fontWeight: 800, 
                color: timerSeconds < 0 ? '#F87171' : C.accent,
                fontFamily: 'monospace', letterSpacing: '0.05em',
              }}>
                {formatTimer(timerSeconds)}
              </span>
            </>
          ) : (
            <MoreHorizontal style={{ width: 20, height: 20, color: 'var(--on-surface-variant)', opacity: 0.5 }} />
          )}
        </div>
      </div>
    );
  }

  // ── EXPANDED PANEL ──
  return (
    <div
      onMouseEnter={handleMouseEnterUI}
      onMouseLeave={(e) => {
        // Don't ignore mouse events when expanded - panel is solid
        if (showLedGlow && !hasInteractedRef.current) {
          hasInteractedRef.current = true;
          setShowLedGlow(false);
        }
        handleMouseLeaveUI(e as any);
      }}
      style={{
        position: 'fixed', inset: 0,
        background: C.bg, borderRadius: 20,
        border: `1px solid ${C.border}`,
        boxShadow: '0 12px 48px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: C.text,
        paddingTop: window.electronAPI ? 10 : 0, // Avoid system buttons
      }}
    >
      {/* Top bar — fully draggable */}
      <div onMouseDown={onDragMouseDown} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 16px 10px', flexShrink: 0, cursor: 'grab', userSelect: 'none',
      }}>
        {/* LEFT: collapse pill (…) + direct action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Collapse / timer pill — same ... design as collapsed state */}
          <div onClick={handleToggleExpand} style={{
            height: 28, borderRadius: 999,
            padding: activeTimerId ? '0 10px' : '0',
            width: activeTimerId ? 'auto' : 52,
            minWidth: activeTimerId ? 90 : 52,
            background: 'var(--surface-container)',
            border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            cursor: 'pointer',
          }} title="Colapsar">
            {activeTimerId ? (
              <>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.accent, animation: 'pulse 1.5s ease-in-out infinite' }} />
                <span style={{ 
                   fontSize: 11, fontWeight: 900, 
                   color: C.accent, 
                   fontFamily: 'monospace' 
                }}>
                  {formatTimer(timerSeconds)}
                </span>
              </>
            ) : (
              <MoreHorizontal style={{ width: 16, height: 16, color: 'var(--on-surface-variant)' }} />
            )}
          </div>

          {/* VOICE button */}
          <div
            onClick={(e) => { e.stopPropagation(); setCaptureMode('voice'); setCaptureCreationSource('mini_voice'); setCaptureOpen(true); }}
            style={{
              width: 32, height: 28, borderRadius: 999,
              background: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
            title="Añadir por voz"
          >
            <Mic style={{ width: 13, height: 13, color: 'var(--primary-foreground)' }} />
          </div>

          {/* RECURRENCE button */}
          <div
            onClick={(e) => { 
              e.stopPropagation(); 
              setRecurrenceFlowOpen(true);
            }}
            style={{
              width: 32, height: 28, borderRadius: 999,
              background: 'var(--surface-container)',
              border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
            title="Crear tarea recurrente"
          >
            <Repeat style={{ width: 12, height: 12, color: 'var(--on-surface-variant)' }} />
          </div>

          {/* TEXT button */}
          <div
            onClick={(e) => { e.stopPropagation(); setCaptureMode('text'); setCaptureCreationSource('mini_plus'); setCaptureOpen(true); }}
            style={{
              width: 32, height: 28, borderRadius: 999,
              background: 'var(--surface-container)',
              border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
            title="Añadir tarea"
          >
            <Plus style={{ width: 14, height: 14, color: 'var(--on-surface-variant)' }} />
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--foreground)', lineHeight: 1 }}>
            {format(now, 'h:mm')}
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', opacity: 0.5, marginLeft: 3 }}>{format(now, 'a')}</span>
          </div>
          <div style={{ fontSize: 9, color: 'var(--on-surface-variant)', opacity: 0.4, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>
            {format(now, 'EEE d MMM', { locale: es })}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div style={{ height: 3, background: 'var(--surface-container-high)', flexShrink: 0, margin: '0 0 2px' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ height: '100%', background: C.accent }} />
        </div>
      )}

      {/* Task list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px 10px' }}>
        {loading || isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
            <div style={{
              width: 20, height: 20, border: `2px solid ${C.accent}`,
              borderTopColor: 'transparent', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        ) : !user ? (
          <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, padding: 16 }}>Abre la app principal primero.</p>
        ) : sortedTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <span style={{ fontSize: 28 }}>🎉</span>
            <p style={{ fontSize: 12, fontWeight: 800, marginTop: 8, color: C.text }}>¡Día despejado!</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {sortedTasks.map((task: any) => (
              <TaskRow key={task.id}
                task={completingId === task.id ? { ...task, status: 'done' } : task}
                onToggle={handleToggle}
                onDetail={(t) => { setSelectedTask(t); setDetailOpen(true); }}
                activeTimerId={activeTimerId}
                onTimerToggle={handleTimerToggle}
                updateTask={updateTask} />
            ))}
          </AnimatePresence>
        )}
        {totalCount > 0 && completedCount === totalCount && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            style={{ margin: '6px 0', padding: '10px', borderRadius: 12, textAlign: 'center',
              background: C.accentBg, border: '1px solid rgba(163,230,53,0.2)' }}>
            <span style={{ fontSize: 20 }}>🏆</span>
            <p style={{ fontSize: 12, fontWeight: 800, color: C.accent, marginTop: 4 }}>¡Todo completado!</p>
          </motion.div>
        )}
      </div>

      <TaskCaptureModal
        open={captureOpen}
        onClose={() => setCaptureOpen(false)}
        initialMode={captureMode}
        creationSource={captureCreationSource}
      />
      <TaskDetailModal task={selectedTask} open={detailOpen} onClose={() => setDetailOpen(false)} />
      <QuickRecurrenceFlow open={recurrenceFlowOpen} onClose={() => setRecurrenceFlowOpen(false)} />
    </div>
  );
};

const MiniTasksPage = () => <MiniTaskList />;
export default MiniTasksPage;
