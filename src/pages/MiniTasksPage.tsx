/**
 * MiniTasksPage — Floating pill widget.
 * - Pill (3 dots) colapsa/expande al hacer clic
 * - Panel expandido: reloj, barra de progreso, tareas con subtareas
 * - Sin botón X — se cierra desde la app base
 * - Fondo transparente real (ventana Electron con transparent: true)
 */
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useSubtasks } from '@/hooks/useSubtasks';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, MoreHorizontal, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import '../index.css';

// ─── Colores del panel ───────────────────────────────────────────────────────
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

// ─── Fila de subtarea ────────────────────────────────────────────────────────
const SubtaskRow = ({ sub, onToggle }: { sub: any; onToggle: (sub: any) => void }) => {
  const isDone = sub.status === 'done';
  return (
    <div
      onClick={() => onToggle(sub)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 8px 6px 28px',
        borderRadius: 8, cursor: 'pointer',
        background: C.subBg,
        marginBottom: 2,
        opacity: isDone ? 0.45 : 1,
      }}
    >
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
      }}>
        {sub.title}
      </span>
    </div>
  );
};

// ─── Fila de tarea con subtareas ─────────────────────────────────────────────
const TaskRow = ({
  task,
  onToggle,
}: {
  task: any;
  onToggle: (task: any) => void;
}) => {
  const isDone = task.status === 'done';
  const [open, setOpen] = useState(false);
  const { subtasks, toggleSubtask } = useSubtasks(task.id);
  const hasSubtasks = subtasks.length > 0;
  const doneSubCount = subtasks.filter((s: any) => s.status === 'done').length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{ marginBottom: 4 }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 10px',
          borderRadius: 12, cursor: 'pointer',
          background: isDone ? 'transparent' : C.taskBg,
          border: `1px solid ${isDone ? 'transparent' : C.taskBorder}`,
          opacity: isDone ? 0.45 : 1,
        }}
      >
        {/* Checkbox */}
        <div
          onClick={() => onToggle(task)}
          style={{
            width: 26, height: 26, borderRadius: 8, flexShrink: 0,
            background: isDone ? C.accent : 'transparent',
            border: `2px solid ${isDone ? C.accent : 'rgba(255,255,255,0.22)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {isDone && <Check style={{ width: 13, height: 13, color: '#000', strokeWidth: 3 }} />}
        </div>

        {/* Title */}
        <span
          onClick={() => onToggle(task)}
          style={{
            flex: 1, fontSize: 13, fontWeight: 600, lineHeight: 1.3,
            color: isDone ? C.muted : C.text,
            textDecoration: isDone ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </span>

        {/* Subtask toggle */}
        {hasSubtasks && (
          <div
            onClick={() => setOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 3,
              padding: '2px 6px', borderRadius: 6,
              background: C.accentBg, cursor: 'pointer', flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: C.accent }}>
              {doneSubCount}/{subtasks.length}
            </span>
            <ChevronRight style={{
              width: 11, height: 11, color: C.accent,
              transform: open ? 'rotate(90deg)' : 'none',
              transition: 'transform 0.2s',
            }} />
          </div>
        )}
      </div>

      <AnimatePresence>
        {open && hasSubtasks && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', paddingTop: 2 }}
          >
            {subtasks.map((sub: any) => (
              <SubtaskRow
                key={sub.id}
                sub={sub}
                onToggle={(s) => toggleSubtask.mutate({ id: s.id, done: s.status !== 'done' })}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Componente principal ────────────────────────────────────────────────────
const MiniTaskList = () => {
  const { user, loading } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  const { tasks, updateTask, isLoading } = useTasks({ date: today });
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [now, setNow] = useState(new Date());

  // Reloj en tiempo real
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fondo transparente real
  useEffect(() => {
    document.documentElement.style.cssText += ';background:transparent!important';
    document.body.style.cssText += ';background:transparent!important';
    const root = document.getElementById('root');
    if (root) root.style.cssText += ';background:transparent!important';
  }, []);

  const sortedTasks = useMemo(() =>
    [...tasks].sort((a: any, b: any) => {
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (b.status === 'done' && a.status !== 'done') return -1;
      return (a.sort_order || 0) - (b.sort_order || 0);
    }),
    [tasks]
  );

  const completedCount = tasks.filter((t: any) => t.status === 'done').length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleToggle = (task: any) => {
    if (task.status === 'done') {
      updateTask.mutate({ id: task.id, status: 'pending', completed_at: null });
    } else {
      setCompletingId(task.id);
      setTimeout(() => {
        updateTask.mutate(
          { id: task.id, status: 'done', completed_at: new Date().toISOString() },
          { onSettled: () => setCompletingId(null) }
        );
      }, 350);
    }
  };

  // ── PILL colapsada: flotando arriba-centro de la ventana transparente ──
  if (!isExpanded) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 10,
        pointerEvents: 'none',
      }}>
        <div
          style={{
            width: 64, height: 32, borderRadius: 999,
            background: C.bg,
            border: `1px solid ${C.border}`,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            userSelect: 'none',
            pointerEvents: 'all',
            WebkitAppRegion: 'drag',
          } as any}
        >
          <div
            onClick={() => setIsExpanded(true)}
            style={{
              WebkitAppRegion: 'no-drag',
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 999, cursor: 'pointer',
            } as any}
          >
            <MoreHorizontal style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.75)' }} />
          </div>
        </div>
      </div>
    );
  }

  // ── EXPANDED ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      width: '100%', height: '100%',
      background: C.bg,
      borderRadius: 20,
      border: `1px solid ${C.border}`,
      boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: C.text,
    }}>

      {/* ── Top: 3 puntos + reloj (arrastrable) ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px 6px',
        WebkitAppRegion: 'drag',
        flexShrink: 0,
      } as any}>

        {/* 3 puntos — clic para colapsar */}
        <div
          onClick={() => setIsExpanded(false)}
          style={{
            WebkitAppRegion: 'no-drag',
            width: 52, height: 26, borderRadius: 999,
            background: 'rgba(255,255,255,0.07)',
            border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          } as any}
          title="Colapsar"
        >
          <MoreHorizontal style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.5)' }} />
        </div>

        {/* Reloj */}
        <div style={{ textAlign: 'right', WebkitAppRegion: 'drag' } as any}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: C.text, lineHeight: 1 }}>
            {format(now, 'h:mm')}
            <span style={{ fontSize: 13, fontWeight: 600, color: C.muted, marginLeft: 3 }}>
              {format(now, 'a')}
            </span>
          </div>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {format(now, 'EEE d MMM', { locale: es })}
          </div>
        </div>
      </div>

      {/* ── Barra de progreso ── */}
      {totalCount > 0 && (
        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', flexShrink: 0, margin: '0 0 2px' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ height: '100%', background: C.accent }}
          />
        </div>
      )}

      {/* ── Lista de tareas ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px 10px' }}>
        {loading || isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
            <div style={{
              width: 20, height: 20,
              border: `2px solid ${C.accent}`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        ) : !user ? (
          <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, padding: 16 }}>
            Abre la app principal primero.
          </p>
        ) : sortedTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <span style={{ fontSize: 28 }}>🎉</span>
            <p style={{ fontSize: 12, fontWeight: 800, marginTop: 8, color: C.text }}>¡Día despejado!</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {sortedTasks.map((task: any) => (
              <TaskRow
                key={task.id}
                task={completingId === task.id ? { ...task, status: 'done' } : task}
                onToggle={handleToggle}
              />
            ))}
          </AnimatePresence>
        )}

        {totalCount > 0 && completedCount === totalCount && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              margin: '6px 0', padding: '10px',
              borderRadius: 12, textAlign: 'center',
              background: C.accentBg, border: `1px solid rgba(163,230,53,0.2)`,
            }}
          >
            <span style={{ fontSize: 20 }}>🏆</span>
            <p style={{ fontSize: 12, fontWeight: 800, color: C.accent, marginTop: 4 }}>¡Todo completado!</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const MiniTasksPage = () => <MiniTaskList />;
export default MiniTasksPage;
