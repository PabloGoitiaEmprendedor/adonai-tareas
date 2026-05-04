/**
 * QuickRecurrenceFlow — Phased, Google-style recurring task creator.
 * Phase 1: Task name + quick frequency selection (Daily, Weekly, Custom)
 * Phase 2: Day/interval details depending on chosen frequency
 * Phase 3: Confirm & save
 *
 * Designed to be so simple a 6-year-old can use it.
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, Check, Repeat, Calendar } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useTasks } from '@/hooks/useTasks';
import { useRecurrenceRules } from '@/hooks/useRecurrenceRules';
import { toast } from 'sonner';

const C = {
  bg: '#F2F2F2',
  surface: 'rgba(1, 38, 14, 0.05)',
  border: 'rgba(1, 38, 14, 0.1)',
  text: '#01260E',
  muted: 'rgba(1, 38, 14, 0.5)',
  accent: '#21D904',
  accentBg: 'rgba(33, 217, 4, 0.1)',
};

type Frequency = 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly' | 'custom';

const QUICK_PRESETS: { id: Frequency; emoji: string; label: string; sub: string }[] = [
  { id: 'daily', emoji: '☀️', label: 'Todos los días', sub: 'Lun a Dom' },
  { id: 'weekdays', emoji: '💼', label: 'Días laborables', sub: 'Lun a Vie' },
  { id: 'weekly', emoji: '📅', label: 'Una vez/semana', sub: 'Elige el día' },
  { id: 'biweekly', emoji: '🔄', label: 'Cada 2 semanas', sub: 'Quincenal' },
  { id: 'monthly', emoji: '🗓️', label: 'Cada mes', sub: 'Elige el día' },
  { id: 'custom', emoji: '⚙️', label: 'Personalizado', sub: 'Tú decides' },
];

const WEEKDAY_LABELS = [
  { label: 'L', value: 1, full: 'Lunes' },
  { label: 'M', value: 2, full: 'Martes' },
  { label: 'X', value: 3, full: 'Miércoles' },
  { label: 'J', value: 4, full: 'Jueves' },
  { label: 'V', value: 5, full: 'Viernes' },
  { label: 'S', value: 6, full: 'Sábado' },
  { label: 'D', value: 0, full: 'Domingo' },
];

interface QuickRecurrenceFlowProps {
  open: boolean;
  onClose: () => void;
}

const QuickRecurrenceFlow = ({ open, onClose }: QuickRecurrenceFlowProps) => {
  const { createTask } = useTasks();
  const { createRule } = useRecurrenceRules();

  const [phase, setPhase] = useState(1);
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState<Frequency | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [interval, setInterval] = useState(1);
  const [monthDay, setMonthDay] = useState(new Date().getDate());
  const [customFreq, setCustomFreq] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setPhase(1);
      setTitle('');
      setFrequency(null);
      setSelectedDays([]);
      setInterval(1);
      setMonthDay(new Date().getDate());
      setCustomFreq('daily');
      setSaving(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  // Can we advance from current phase?
  const canAdvance =
    phase === 1 ? title.trim().length > 0 :
    phase === 2 ? frequency !== null :
    phase === 3 ? true : false;

  // Does phase 3 need detail input?
  const needsDetail =
    frequency === 'weekly' ||
    frequency === 'monthly' ||
    frequency === 'custom';

  const totalPhases = needsDetail ? 3 : 2;

  const handleNext = () => {
    if (!canAdvance) return;
    if (phase === 2 && !needsDetail) {
      handleSave();
      return;
    }
    if (phase === totalPhases) {
      handleSave();
      return;
    }
    setPhase(p => p + 1);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);

    try {
      // Build recurrence rule data
      const ruleData: any = {
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: null,
      };

      switch (frequency) {
        case 'daily':
          ruleData.frequency = 'daily';
          ruleData.interval = 1;
          break;
        case 'weekdays':
          ruleData.frequency = 'weekly';
          ruleData.interval = 1;
          ruleData.days_of_week = [1, 2, 3, 4, 5];
          break;
        case 'weekly':
          ruleData.frequency = 'weekly';
          ruleData.interval = 1;
          ruleData.days_of_week = selectedDays.length > 0 ? selectedDays : [new Date().getDay()];
          break;
        case 'biweekly':
          ruleData.frequency = 'weekly';
          ruleData.interval = 2;
          ruleData.days_of_week = [new Date().getDay()];
          break;
        case 'monthly':
          ruleData.frequency = 'monthly';
          ruleData.interval = 1;
          ruleData.day_of_month = monthDay;
          break;
        case 'custom':
          ruleData.frequency = customFreq;
          ruleData.interval = interval;
          if (customFreq === 'weekly') {
            ruleData.days_of_week = selectedDays.length > 0 ? selectedDays : [new Date().getDay()];
          }
          if (customFreq === 'monthly') {
            ruleData.day_of_month = monthDay;
          }
          break;
      }

      const newRule = await createRule.mutateAsync(ruleData);

      // Calculate first valid due date
      let firstValidDate = new Date();
      if (ruleData.frequency === 'weekly' && ruleData.days_of_week) {
        for (let i = 0; i <= 7; i++) {
          const d = addDays(new Date(), i);
          if (ruleData.days_of_week.includes(d.getDay())) {
            firstValidDate = d;
            break;
          }
        }
      } else if (ruleData.frequency === 'monthly' && ruleData.day_of_month) {
        for (let i = 0; i <= 31; i++) {
          const d = addDays(new Date(), i);
          if (d.getDate() === ruleData.day_of_month) {
            firstValidDate = d;
            break;
          }
        }
      }

      // Create the task linked to the recurrence rule
      createTask.mutate(
        {
          title: title.trim(),
          due_date: format(firstValidDate, 'yyyy-MM-dd'),
          recurrence_id: newRule.id,
          importance: false,
          urgency: false,
          priority: 'medium',
          status: 'pending',
          source_type: 'text',
          creation_source: 'secondary',
        },
        {
          onSuccess: () => {
            toast.success('¡Tarea recurrente creada!');
            (window as any).electronAPI?.syncData?.();
            onClose();
          },
          onError: () => {
            toast.error('Error al crear la tarea');
            setSaving(false);
          },
        }
      );
    } catch {
      toast.error('Error al crear la recurrencia');
      setSaving(false);
    }
  };

  if (!open) return null;

  // Summary text for review
  const getSummaryText = () => {
    switch (frequency) {
      case 'daily': return 'Todos los días';
      case 'weekdays': return 'Lunes a Viernes';
      case 'weekly':
        const dayNames = selectedDays.map(d => WEEKDAY_LABELS.find(w => w.value === d)?.full || '').join(', ');
        return `Cada semana: ${dayNames || 'Hoy'}`;
      case 'biweekly': return 'Cada 2 semanas';
      case 'monthly': return `Cada mes el día ${monthDay}`;
      case 'custom':
        if (customFreq === 'daily') return `Cada ${interval} día${interval > 1 ? 's' : ''}`;
        if (customFreq === 'weekly') {
          const cDays = selectedDays.map(d => WEEKDAY_LABELS.find(w => w.value === d)?.full || '').join(', ');
          return `Cada ${interval} semana${interval > 1 ? 's' : ''}: ${cDays || 'Hoy'}`;
        }
        return `Cada ${interval} mes${interval > 1 ? 'es' : ''}, día ${monthDay}`;
      default: return '';
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, 
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          zIndex: 9998,
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, pointerEvents: 'none',
        }}
      >
        <div style={{
          width: '100%', maxWidth: 340,
          background: C.bg, borderRadius: 28,
          border: `1px solid ${C.border}`,
          boxShadow: '0 20px 60px -10px hsla(140, 95%, 8%, 0.15)',
          pointerEvents: 'auto',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px 8px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexDirection: 'row-reverse', // Put close button on the left
          }}>
            <button onClick={onClose} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: 4, borderRadius: 8, display: 'flex', alignItems: 'center',
            }}>
              <X style={{ width: 16, height: 16, color: C.muted }} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Repeat style={{ width: 16, height: 16, color: C.accent }} />
              <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Tarea recurrente</span>
            </div>
          </div>

          {/* Phase dots */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 6,
            padding: '4px 0 10px',
          }}>
            {Array.from({ length: totalPhases + 1 }, (_, i) => i + 1).map(i => (
              <div key={i} style={{
                width: i === phase ? 20 : 6, height: 6,
                borderRadius: 999,
                background: i <= phase ? C.accent : 'rgba(1, 38, 14, 0.1)',
                transition: 'all 0.3s ease',
              }} />
            ))}
          </div>

          {/* Content area */}
          <div style={{ padding: '0 16px 16px', minHeight: 180 }}>
            <AnimatePresence mode="wait">
              {/* ── PHASE 1: Task name ── */}
              {phase === 1 && (
                <motion.div key="p1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    ¿Qué tarea quieres repetir?
                  </p>
                  <input
                    ref={inputRef}
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && canAdvance) handleNext(); }}
                    placeholder="Ej: Hacer ejercicio, Leer 20 min..."
                    style={{
                      width: '100%', padding: '12px 14px',
                      fontSize: 15, fontWeight: 600, color: C.text,
                      background: C.surface, border: `1px solid ${C.border}`,
                      borderRadius: 12, outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>
                    Escribe algo corto y claro 💡
                  </p>
                </motion.div>
              )}

              {/* ── PHASE 2: Frequency selection ── */}
              {phase === 2 && (
                <motion.div key="p2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    ¿Cada cuánto se repite?
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {QUICK_PRESETS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setFrequency(p.id);
                          // For simple presets, auto-advance
                          if (p.id === 'daily' || p.id === 'weekdays' || p.id === 'biweekly') {
                            // Will auto-save on next
                          }
                        }}
                        style={{
                          padding: '10px 10px',
                          borderRadius: 12,
                          border: `1.5px solid ${frequency === p.id ? C.accent : C.border}`,
                          background: frequency === p.id ? C.accentBg : C.surface,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ fontSize: 16, marginBottom: 2 }}>{p.emoji}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: frequency === p.id ? C.accent : C.text }}>
                          {p.label}
                        </div>
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{p.sub}</div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── PHASE 3: Details ── */}
              {phase === 3 && (
                <motion.div key="p3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  {/* Weekly: pick days */}
                  {(frequency === 'weekly' || (frequency === 'custom' && customFreq === 'weekly')) && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                        ¿Qué días?
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
                        {WEEKDAY_LABELS.map(d => (
                          <button
                            key={d.value}
                            onClick={() => toggleDay(d.value)}
                            style={{
                              width: 38, height: 38, borderRadius: '50%',
                              fontSize: 12, fontWeight: 800,
                              border: `2px solid ${selectedDays.includes(d.value) ? C.accent : C.border}`,
                              background: selectedDays.includes(d.value) ? C.accent : 'transparent',
                              color: selectedDays.includes(d.value) ? '#000' : C.text,
                              cursor: 'pointer', transition: 'all 0.15s ease',
                            }}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Monthly: pick day of month */}
                  {(frequency === 'monthly' || (frequency === 'custom' && customFreq === 'monthly')) && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                        ¿Qué día del mes?
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <button
                            key={day}
                            onClick={() => setMonthDay(day)}
                            style={{
                              height: 32, borderRadius: 8,
                              fontSize: 11, fontWeight: 700,
                              border: `1.5px solid ${monthDay === day ? C.accent : C.border}`,
                              background: monthDay === day ? C.accent : 'transparent',
                              color: monthDay === day ? '#000' : C.text,
                              cursor: 'pointer', transition: 'all 0.15s ease',
                            }}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom: interval + sub-freq */}
                  {frequency === 'custom' && (
                    <div style={{ marginTop: frequency === 'custom' && customFreq !== 'daily' ? 12 : 0 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                        Personalizar repetición
                      </p>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                        {(['daily', 'weekly', 'monthly'] as const).map(f => (
                          <button
                            key={f}
                            onClick={() => setCustomFreq(f)}
                            style={{
                              flex: 1, padding: '8px 0', borderRadius: 10,
                              fontSize: 11, fontWeight: 700,
                              border: `1.5px solid ${customFreq === f ? C.accent : C.border}`,
                              background: customFreq === f ? C.accentBg : 'transparent',
                              color: customFreq === f ? C.accent : C.text,
                              cursor: 'pointer', transition: 'all 0.15s ease',
                            }}
                          >
                            {f === 'daily' ? 'Días' : f === 'weekly' ? 'Semanas' : 'Meses'}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Cada</span>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={interval}
                          onChange={e => setInterval(Math.max(1, Number(e.target.value)))}
                          style={{
                            width: 56, padding: '8px 10px', borderRadius: 10,
                            fontSize: 16, fontWeight: 800, color: C.accent,
                            background: C.surface, border: `1.5px solid ${C.accent}`,
                            outline: 'none', textAlign: 'center',
                          }}
                        />
                        <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>
                          {customFreq === 'daily' ? (interval === 1 ? 'día' : 'días')
                            : customFreq === 'weekly' ? (interval === 1 ? 'semana' : 'semanas')
                            : (interval === 1 ? 'mes' : 'meses')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Summary preview */}
                  <div style={{
                    marginTop: 12, padding: '10px 12px', borderRadius: 12,
                    background: C.accentBg, border: `1px solid rgba(163,230,53,0.15)`,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <Calendar style={{ width: 14, height: 14, color: C.accent, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: C.text, margin: 0 }}>"{title}"</p>
                      <p style={{ fontSize: 10, color: C.accent, margin: 0, marginTop: 1, fontWeight: 600 }}>
                        {getSummaryText()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom action bar */}
          <div style={{
            padding: '0 16px 16px',
            display: 'flex', gap: 8,
          }}>
            {phase > 1 && (
              <button
                onClick={() => setPhase(p => p - 1)}
                style={{
                  flex: 0, padding: '10px 14px',
                  borderRadius: 12, border: `1px solid ${C.border}`,
                  background: 'transparent',
                  color: C.text, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <ArrowLeft style={{ width: 13, height: 13 }} />
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canAdvance || saving}
              style={{
                flex: 1, padding: '10px 0',
                borderRadius: 14, border: 'none',
                background: canAdvance
                  ? 'linear-gradient(135deg, #21D904, #1aa103)'
                  : 'rgba(1, 38, 14, 0.08)',
                color: canAdvance ? '#F2F2F2' : 'rgba(1, 38, 14, 0.25)',
                fontSize: 13, fontWeight: 800,
                cursor: canAdvance ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.15s ease',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? (
                <>Guardando...</>
              ) : phase === totalPhases || (phase === 2 && !needsDetail) ? (
                <>
                  <Check style={{ width: 14, height: 14, strokeWidth: 3 }} />
                  Crear tarea
                </>
              ) : (
                <>
                  Siguiente
                  <ArrowRight style={{ width: 14, height: 14, strokeWidth: 3 }} />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default QuickRecurrenceFlow;
