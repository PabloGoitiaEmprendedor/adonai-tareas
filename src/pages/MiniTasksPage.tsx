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
import { Check, MoreHorizontal, ChevronRight, Timer, Pause, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TaskCaptureModal from '@/components/TaskCaptureModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import { useGamification } from '@/hooks/useGamification';
import { triggerTaskCelebration, triggerDailyCelebration } from '@/lib/celebrations';
import { useProfile } from '@/hooks/useProfile';
import '../index.css';

const PANEL_W = 340;
const PANEL_H = 500;
const PILL_W = 100;
const PILL_H = 52;
const PILL_TIMER_W = 130;

const C = {
  bg: '#18181B',
  border: 'rgba(255,255,255,0.09)',
  text: '#F4F4F5',
  muted: 'rgba(255,255,255,0.35)',
  accent: '#A3E635',
  accentBg: 'rgba(163,230,53,0.13)',
  taskBg: 'rgba(255,255,255,0.05)',
  taskBorder: 'rgba(255,255,255,0.07)',
  subBg: 'rgba(255,255,255,0.03)',
};

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ─── Subtask Row ─────────────────────────────────────────────────────────────
const SubtaskRowRaw = ({ sub, onToggle }: { sub: any; onToggle: (sub: any) => void }) => {
  const isDone = sub.status === 'done';
  return (
    <div onClick={() => onToggle(sub)} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 8px 6px 28px', borderRadius: 8, cursor: 'pointer',
      background: C.subBg, marginBottom: 2, opacity: isDone ? 0.45 : 1,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
        background: isDone ? C.accent : 'transparent',
        border: `2px solid ${isDone ? C.accent : 'rgba(255,255,255,0.2)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isDone && <Check style={{ width: 10, height: 10, color: '#000', strokeWidth: 3 }} />}
      </div>
      <span style={{
        fontSize: 12, color: isDone ? C.muted : C.text,
        textDecoration: isDone ? 'line-through' : 'none',
        fontWeight: 500, lineHeight: 1.3,
      }}>{sub.title}</span>
    </div>
  );
};
const SubtaskRow = memo(SubtaskRowRaw);

// ─── Task Row ────────────────────────────────────────────────────────────────
const TaskRowRaw = ({ task, onToggle, onDetail, activeTimerId, onTimerToggle }: {
  task: any; onToggle: (task: any) => void; onDetail: (task: any) => void;
  activeTimerId: string | null; onTimerToggle: (taskId: string, estimatedMinutes?: number) => void;
}) => {
  const isDone = task.status === 'done';
  const [open, setOpen] = useState(false);
  const { subtasks, toggleSubtask } = useSubtasks(task.id);
  const hasSubtasks = subtasks.length > 0;
  const doneSubCount = subtasks.filter((s: any) => s.status === 'done').length;
  const isTimerActive = activeTimerId === task.id;

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }} style={{ marginBottom: 4 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px',
        borderRadius: 12, cursor: 'pointer',
        background: isDone ? 'transparent' : isTimerActive ? 'rgba(163,230,53,0.06)' : C.taskBg,
        border: `1px solid ${isDone ? 'transparent' : isTimerActive ? 'rgba(163,230,53,0.15)' : C.taskBorder}`,
        opacity: isDone ? 0.45 : 1,
      }}>
        <div onClick={() => onToggle(task)} style={{
          width: 26, height: 26, borderRadius: 8, flexShrink: 0,
          background: isDone ? C.accent : 'transparent',
          border: `2px solid ${isDone ? C.accent : 'rgba(255,255,255,0.22)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isDone && <Check style={{ width: 13, height: 13, color: '#000', strokeWidth: 3 }} />}
        </div>
        <span onClick={() => onDetail(task)} style={{
          flex: 1, fontSize: 13, fontWeight: 600, lineHeight: 1.3,
          color: isDone ? C.muted : C.text,
          textDecoration: isDone ? 'line-through' : 'none',
        }}>{task.title}</span>

        {/* Timer button */}
        {!isDone && (
          <div
            onClick={() => onTimerToggle(task.id, task.estimated_minutes)}
            style={{
              width: 24, height: 24, borderRadius: 6, flexShrink: 0,
              background: isTimerActive ? 'rgba(163,230,53,0.15)' : 'transparent',
              border: `1px solid ${isTimerActive ? 'rgba(163,230,53,0.3)' : 'rgba(255,255,255,0.1)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {isTimerActive
              ? <Pause style={{ width: 10, height: 10, color: C.accent }} />
              : <Timer style={{ width: 10, height: 10, color: 'rgba(255,255,255,0.3)' }} />
            }
          </div>
        )}

        {hasSubtasks && (
          <div onClick={() => setOpen(o => !o)} style={{
            display: 'flex', alignItems: 'center', gap: 3,
            padding: '2px 6px', borderRadius: 6,
            background: C.accentBg, cursor: 'pointer', flexShrink: 0,
          }}>
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
                onToggle={(s) => toggleSubtask.mutate({ id: s.id, done: s.status !== 'done' })} />
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
  const [now, setNow] = useState(new Date());

  // Timer state
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { onMouseDown: onDragMouseDown, hasMovedRef } = useDragWindow();

  // Timer logic
  const handleTimerToggle = useCallback((taskId: string, estimatedMinutes: number = 30) => {
    if (activeTimerId === taskId) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setActiveTimerId(null);
      setTimerSeconds(0);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setActiveTimerId(taskId);
      setTimerSeconds(estimatedMinutes * 60);
      timerRef.current = setInterval(() => {
        setTimerSeconds(s => Math.max(0, s - 1));
      }, 1000);
    }
  }, [activeTimerId]);

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

  // Save pill position before expanding so we can restore it on collapse
  const savedPillPos = useRef<{ x: number; y: number } | null>(null);

  // Smart expand
  const handleToggleExpand = useCallback(async () => {
    if (hasMovedRef.current) return;
    const api = (window as any).electronAPI;
    if (!api?.getMiniPosition || !api?.setMiniBounds) {
      setIsExpanded(prev => !prev);
      return;
    }

    if (!isExpanded) {
      // EXPANDING — save pill position first
      const pos = await api.getMiniPosition();
      if (!pos) { setIsExpanded(true); return; }
      savedPillPos.current = { x: pos.x, y: pos.y };

      const pillCX = pos.x + pos.w / 2;
      const spaceRight = (pos.screenX + pos.screenW) - pillCX;
      const spaceLeft = pillCX - pos.screenX;
      let panelX: number;
      if (spaceRight >= PANEL_W) { panelX = pos.x; }
      else if (spaceLeft >= PANEL_W) { panelX = pos.x + pos.w - PANEL_W; }
      else { panelX = pillCX - PANEL_W / 2; }

      const spaceBelow = (pos.screenY + pos.screenH) - pos.y;
      const spaceAbove = (pos.y + pos.h) - pos.screenY;
      let panelY: number;
      if (spaceBelow >= PANEL_H) { panelY = pos.y; }
      else if (spaceAbove >= PANEL_H) { panelY = pos.y + pos.h - PANEL_H; }
      else { panelY = pos.screenY + pos.screenH - PANEL_H; }

      panelX = Math.max(pos.screenX, Math.min(panelX, pos.screenX + pos.screenW - PANEL_W));
      panelY = Math.max(pos.screenY, Math.min(panelY, pos.screenY + pos.screenH - PANEL_H));
      api.setMiniBounds({ x: panelX, y: panelY, w: PANEL_W, h: PANEL_H });
      setIsExpanded(true);
    } else {
      // COLLAPSING — restore to saved pill position
      const pillW = activeTimerId ? PILL_TIMER_W : PILL_W;
      if (savedPillPos.current) {
        api.setMiniBounds({ x: savedPillPos.current.x, y: savedPillPos.current.y, w: pillW, h: PILL_H });
      } else {
        const pos = await api.getMiniPosition();
        if (pos) {
          api.setMiniBounds({ x: pos.x, y: pos.y, w: pillW, h: PILL_H });
        }
      }
      setIsExpanded(false);
    }
  }, [isExpanded, hasMovedRef, activeTimerId]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    document.documentElement.style.cssText += ';background:transparent!important';
    document.body.style.cssText += ';background:transparent!important';
    const root = document.getElementById('root');
    if (root) root.style.cssText += ';background:transparent!important';
    (window as any).electronAPI?.setIgnoreMouseEvents?.(true, { forward: true });
  }, []);

  const handleMouseEnterUI = useCallback(() => {
    (window as any).electronAPI?.setIgnoreMouseEvents?.(false);
  }, []);
  const handleMouseLeaveUI = useCallback(() => {
    (window as any).electronAPI?.setIgnoreMouseEvents?.(true, { forward: true });
  }, []);

  const quadrantRank = useCallback((t: any) =>
    t.urgency && t.importance ? 0
    : t.urgency ? 1
    : t.importance ? 2
    : 3, []);

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
    if (task.status === 'done') {
      updateTask.mutate({ id: task.id, status: 'pending', completed_at: null });
    } else {
      setCompletingId(task.id);
      setTimeout(() => {
        const remainingTasks = tasks.filter((t: any) => t.status !== 'done' && t.id !== task.id);
        const isLastTask = tasks.length > 0 && remainingTasks.length === 0;

        updateTask.mutate(
          { id: task.id, status: 'done', completed_at: new Date().toISOString() },
          { 
            onSuccess: () => {
              setCompletingId(null);
              checkAndUnlock.mutate({ type: 'task_completed' });
              if (isLastTask) {
                triggerDailyCelebration(profile?.name);
              } else {
                triggerTaskCelebration(task.title, profile?.name);
              }
            },
            onError: () => setCompletingId(null) 
          }
        );
      }, 350);
    }
  }, [updateTask, tasks, checkAndUnlock, profile?.name]);

  // ── COLLAPSED PILL ──
  if (!isExpanded) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          onMouseEnter={handleMouseEnterUI}
          onMouseLeave={handleMouseLeaveUI}
          onMouseDown={onDragMouseDown}
          onClick={handleToggleExpand}
          style={{
            height: 32, borderRadius: 999,
            padding: activeTimerId ? '0 12px' : '0',
            width: activeTimerId ? 'auto' : 64,
            minWidth: activeTimerId ? 110 : 64,
            background: C.bg,
            border: `1px solid ${activeTimerId ? 'rgba(163,230,53,0.25)' : C.border}`,
            boxShadow: activeTimerId
              ? '0 4px 20px rgba(163,230,53,0.15)'
              : '0 4px 20px rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            userSelect: 'none', cursor: 'grab',
          }}
        >
          {activeTimerId ? (
            <>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: C.accent, animation: 'pulse 1.5s ease-in-out infinite',
              }} />
              <span style={{
                fontSize: 14, fontWeight: 800, color: C.accent,
                fontFamily: 'monospace', letterSpacing: '0.05em',
              }}>
                {formatTimer(timerSeconds)}
              </span>
            </>
          ) : (
            <MoreHorizontal style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.75)' }} />
          )}
        </div>
      </div>
    );
  }

  // ── EXPANDED PANEL ──
  return (
    <div
      onMouseEnter={handleMouseEnterUI}
      onMouseLeave={handleMouseLeaveUI}
      style={{
        position: 'fixed', inset: 0,
        background: C.bg, borderRadius: 20,
        border: `1px solid ${C.border}`,
        boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: C.text,
      }}
    >
      {/* Top bar — fully draggable */}
      <div onMouseDown={onDragMouseDown} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px 6px', flexShrink: 0, cursor: 'grab', userSelect: 'none',
      }}>
        <div onClick={handleToggleExpand} style={{
          height: 26, borderRadius: 999,
          padding: activeTimerId ? '0 10px' : '0',
          width: activeTimerId ? 'auto' : 52,
          minWidth: activeTimerId ? 90 : 52,
          background: activeTimerId ? 'rgba(163,230,53,0.1)' : 'rgba(255,255,255,0.07)',
          border: `1px solid ${activeTimerId ? 'rgba(163,230,53,0.2)' : C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          cursor: 'pointer',
        }} title="Colapsar">
          {activeTimerId ? (
            <>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.accent, animation: 'pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: C.accent, fontFamily: 'monospace' }}>
                {formatTimer(timerSeconds)}
              </span>
            </>
          ) : (
            <MoreHorizontal style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.5)' }} />
          )}
        </div>
        
        {/* ADD TASK BUTTON */}
        <div 
          onClick={(e) => { e.stopPropagation(); setCaptureOpen(true); }}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)',
            border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', marginLeft: 8, marginRight: 'auto'
          }}
          title="Añadir tarea"
        >
          <Plus style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.8)' }} />
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
                onTimerToggle={handleTimerToggle} />
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

      <TaskCaptureModal open={captureOpen} onClose={() => setCaptureOpen(false)} />
      <TaskDetailModal task={selectedTask} open={detailOpen} onClose={() => setDetailOpen(false)} />
    </div>
  );
};

const MiniTasksPage = () => <MiniTaskList />;
export default MiniTasksPage;
