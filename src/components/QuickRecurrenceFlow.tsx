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
import { X, ArrowRight, ArrowLeft, Check, Repeat, Calendar, Clock, Sparkles, Paperclip, Trash2, Link as LinkIcon } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useTasks } from '@/hooks/useTasks';
import { useRecurrenceRules } from '@/hooks/useRecurrenceRules';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';



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
  const { user } = useAuth();
  const { createTask } = useTasks();
  const { createRule } = useRecurrenceRules();

  const [phase, setPhase] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [links, setLinks] = useState<string[]>(['']);
  const [frequency, setFrequency] = useState<Frequency | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [interval, setInterval] = useState(1);
  const [monthDay, setMonthDay] = useState(new Date().getDate());
  const [customFreq, setCustomFreq] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [estimatedMinutes, setEstimatedMinutes] = useState(15);
  const [customHours, setCustomHours] = useState(1);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [hasSpecificTime, setHasSpecificTime] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:30");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setPhase(1);
      setTitle('');
      setDescription('');
      setLinks(['']);
      setFrequency(null);
      setSelectedDays([]);
      setInterval(1);
      setMonthDay(new Date().getDate());
      setCustomFreq('daily');
      setEstimatedMinutes(15);
      setCustomHours(1);
      setIsCustomDuration(false);
      setHasSpecificTime(false);
      setStartTime("09:00");
      setEndTime("09:15");
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
    phase === 3 ? true : 
    phase === 4 ? true : false;

  // Does phase 3 need detail input?
  const needsDetail =
    frequency === 'weekly' ||
    frequency === 'biweekly' ||
    frequency === 'monthly' ||
    frequency === 'custom';

  const totalPhases = needsDetail ? 4 : 3;

  useEffect(() => {
    if (hasSpecificTime) {
      const [hours, minutes] = startTime.split(':').map(Number);
      const start = new Date();
      start.setHours(hours, minutes, 0, 0);
      const end = new Date(start.getTime() + estimatedMinutes * 60000);
      setEndTime(format(end, 'HH:mm'));
    }
  }, [startTime, estimatedMinutes, hasSpecificTime]);

  const handleNext = () => {
    if (!canAdvance) return;
    if (phase === 2 && !needsDetail) {
      setPhase(3);
      return;
    }
    if (phase === totalPhases) {
      handleSave();
      return;
    }
    setPhase(p => p + 1);
  };

  const handleSave = async () => {
    if (saving || !user) return;
    setSaving(true);

    try {
      // Build recurrence rule data
      const ruleData: any = {
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        link: links.filter(l => l.trim()).join(' '),
        frequency: frequency === 'biweekly' ? 'weekly' : frequency,
        interval: frequency === 'biweekly' ? 2 : interval,
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
          ruleData.days_of_week = selectedDays.length > 0 ? selectedDays : [new Date().getDay()];
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

      if (hasSpecificTime) {
        (ruleData as any).start_time = startTime + ":00";
        (ruleData as any).end_time = endTime + ":00";
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
          description: description.trim(),
          link: links.filter(l => l.trim()).join(' '),
          user_id: user.id,
          due_date: format(firstValidDate, 'yyyy-MM-dd'),
          recurrence_id: newRule.id,
          importance: false,
          urgency: false,
          priority: 'medium',
          status: 'pending',
          source_type: 'text',
          creation_source: 'secondary',
          estimated_minutes: estimatedMinutes,
          start_time: hasSpecificTime ? startTime + ":00" : null,
          end_time: hasSpecificTime ? endTime + ":00" : null,
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
      case 'biweekly':
        const bDayNames = selectedDays.map(d => WEEKDAY_LABELS.find(w => w.value === d)?.full || '').join(', ');
        return `Cada 2 semanas: ${bDayNames || 'Hoy'}`;
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
        className="fixed inset-0 z-[9998] bg-[#01260E]/40 backdrop-blur-xl"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="relative w-full max-w-[360px] max-h-[90vh] overflow-y-auto pointer-events-auto shadow-[0_20px_60px_-10px_hsla(140,95%,8%,0.15)] bg-background border border-border rounded-[32px] overflow-hidden">
          {/* Header */}
          <div className="p-4 flex items-center justify-between border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Repeat className="w-4 h-4 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Adonai Recurrencia</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Configurar Tarea</span>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 rounded-xl hover:bg-black/5 transition-all active:scale-90 text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Phase dots */}
          <div className="flex justify-center gap-2 py-6">
            {Array.from({ length: totalPhases }, (_, i) => i + 1).map(i => (
              <div key={i} className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                i === phase ? "w-8 bg-primary" : i < phase ? "w-4 bg-primary/30" : "w-2 bg-border"
              )} />
            ))}
          </div>

          {/* Content area */}
          <div className="px-6 pb-6 min-h-[280px]">
            <AnimatePresence mode="wait">
              {/* ── PHASE 1: Task name ── */}
              {phase === 1 && (
                <motion.div 
                  key="p1" 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.95 }} 
                  className="space-y-6"
                >
                  <div className="space-y-5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">¿Qué tarea quieres repetir?</label>
                      <input
                        ref={inputRef}
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && canAdvance) handleNext(); }}
                        placeholder="Ej: Hacer ejercicio diario..."
                        className="w-full font-black bg-surface border border-outline-variant rounded-[20px] px-6 py-5 focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/30 text-xl shadow-sm transition-all"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 ml-2">Descripción (opcional)</label>
                      <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Detalles adicionales..."
                        className="w-full text-sm font-medium bg-surface-container/30 border border-outline-variant/10 rounded-[24px] p-5 focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-on-surface-variant/20 min-h-[100px] resize-none transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 ml-2">Links o Referencias</label>
                      <div className="flex flex-col gap-3">
                        {links.map((l, i) => (
                          <div key={i} className="relative group flex items-center gap-2">
                            <div className="relative flex-1">
                              <Paperclip className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/30 group-focus-within:text-primary/50 transition-colors" />
                              <input
                                type="text"
                                value={l}
                                onChange={e => {
                                  const newLinks = [...links];
                                  newLinks[i] = e.target.value;
                                  setLinks(newLinks);
                                }}
                                placeholder="https://..."
                                className="w-full text-sm bg-surface-container/30 border border-outline-variant/10 rounded-[24px] pl-12 pr-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-on-surface-variant/20"
                              />
                            </div>
                            {i === links.length - 1 ? (
                              <button
                                type="button"
                                onClick={() => setLinks([...links, ''])}
                                className="w-[52px] h-[52px] flex-shrink-0 flex items-center justify-center rounded-[24px] bg-surface-container/30 border border-outline-variant/10 text-on-surface-variant/50 hover:bg-surface-container hover:text-primary transition-all hover:border-primary/30 active:scale-90"
                              >
                                <span className="text-xl font-bold leading-none">+</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  const newLinks = [...links];
                                  newLinks.splice(i, 1);
                                  setLinks(newLinks);
                                }}
                                className="w-[52px] h-[52px] flex-shrink-0 flex items-center justify-center rounded-[24px] bg-surface-container/30 border border-outline-variant/10 text-on-surface-variant/50 hover:bg-red-500/10 hover:text-red-400 transition-all hover:border-red-500/30 active:scale-90"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}


              {/* ── PHASE 2: Frequency selection ── */}
              {phase === 2 && (
                <motion.div 
                  key="p2" 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.95 }} 
                  className="space-y-6"
                >
                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">Frecuencia</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">¿Cada cuánto se repite?</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {QUICK_PRESETS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setFrequency(p.id)}
                        className={cn(
                          "p-4 rounded-[24px] border transition-all text-left group relative overflow-hidden",
                          frequency === p.id 
                            ? "bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/20 scale-[1.02]" 
                            : "bg-surface border-border hover:border-primary/30 hover:bg-primary/5"
                        )}
                      >
                        <div className="text-2xl mb-3">{p.emoji}</div>
                        <div className={cn(
                          "text-[10px] font-black uppercase tracking-tight",
                          frequency === p.id ? "text-primary-foreground" : "text-foreground"
                        )}>
                          {p.label}
                        </div>
                        <div className={cn(
                          "text-[9px] font-bold mt-0.5 opacity-60 uppercase tracking-wider",
                          frequency === p.id ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>{p.sub}</div>
                        {frequency === p.id && (
                          <motion.div 
                            layoutId="active-freq"
                            className="absolute inset-0 bg-primary/20 pointer-events-none"
                            initial={false}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── PHASE 3: Details ── */}
              {phase === 3 && (
                <motion.div 
                  key="p3" 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.95 }} 
                  className="space-y-6"
                >
                  {/* Weekly/Biweekly: pick days */}
                  {(frequency === 'weekly' || frequency === 'biweekly' || (frequency === 'custom' && customFreq === 'weekly')) && (
                    <div className="space-y-4">
                      <div className="text-center space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">Días de la Semana</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Selecciona los días</p>
                      </div>
                      <div className="flex justify-between gap-2 p-2 bg-surface-container/30 border border-border/50 rounded-[28px]">
                        {WEEKDAY_LABELS.map(d => (
                          <button
                            key={d.value}
                            onClick={() => toggleDay(d.value)}
                            className={cn(
                              "w-10 h-10 rounded-full text-[10px] font-black transition-all flex items-center justify-center",
                              selectedDays.includes(d.value)
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110"
                                : "text-muted-foreground hover:bg-black/5"
                            )}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Monthly: pick day of month */}
                  {(frequency === 'monthly' || (frequency === 'custom' && customFreq === 'monthly')) && (
                    <div className="space-y-4">
                      <div className="text-center space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">Día del Mes</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">¿Cuándo ocurre?</p>
                      </div>
                      <div className="grid grid-cols-7 gap-2 p-3 bg-surface-container/30 border border-border/50 rounded-[28px]">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <button
                            key={day}
                            onClick={() => setMonthDay(day)}
                            className={cn(
                              "h-9 rounded-xl text-[10px] font-black transition-all flex items-center justify-center",
                              monthDay === day
                                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-110"
                                : "text-muted-foreground hover:bg-black/5"
                            )}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom: interval + sub-freq */}
                  {frequency === 'custom' && (
                    <div className="space-y-5">
                      <div className="text-center space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">Personalizado</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Configura el intervalo</p>
                      </div>
                      <div className="flex gap-2 p-1 bg-surface-container/30 border border-border/50 rounded-[24px]">
                        {(['daily', 'weekly', 'monthly'] as const).map(f => (
                          <button
                            key={f}
                            onClick={() => setCustomFreq(f)}
                            className={cn(
                              "flex-1 py-3 rounded-[20px] text-[9px] font-black uppercase tracking-widest transition-all",
                              customFreq === f
                                ? "bg-background text-primary shadow-sm"
                                : "text-muted-foreground hover:bg-black/5"
                            )}
                          >
                            {f === 'daily' ? 'Días' : f === 'weekly' ? 'Semanas' : 'Meses'}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center justify-center gap-6 p-6 bg-surface-container/30 border border-border/50 rounded-[28px]">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Cada</span>
                        <div className="flex items-center gap-4">
                           <button onClick={() => setInterval(Math.max(1, interval - 1))} className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-black/5 active:scale-90 transition-all">-</button>
                           <span className="text-3xl font-black text-primary min-w-[3rem] text-center">{interval}</span>
                           <button onClick={() => setInterval(Math.min(99, interval + 1))} className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-black/5 active:scale-90 transition-all">+</button>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                          {customFreq === 'daily' ? (interval === 1 ? 'día' : 'días')
                            : customFreq === 'weekly' ? (interval === 1 ? 'semana' : 'semanas')
                            : (interval === 1 ? 'mes' : 'meses')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Summary preview (Refined) */}
                  <div className="bg-primary/5 border border-primary/10 p-5 rounded-[28px] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[18px] bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-1">Confirmación Visual</p>
                      <p className="text-sm font-black text-foreground leading-tight">"{title || 'Sin título'}"</p>
                      <p className="text-[10px] font-bold text-primary/70 mt-1 uppercase tracking-wider">
                        {getSummaryText()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── PHASE 4: Time & Duration ── */}
              {((phase === 3 && !needsDetail) || (phase === 4)) && (
                <motion.div 
                  key="p4" 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.95 }} 
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <div className="text-center space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">Duración</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">¿Cuánto tiempo toma?</p>
                    </div>
                    
                    {!isCustomDuration ? (
                      <div className="grid grid-cols-4 gap-2">
                        {[1, 5, 10, 15, 20, 25, 30, 45, 60].map(m => (
                          <button
                            key={m}
                            onClick={() => setEstimatedMinutes(m)}
                            className={cn(
                              "py-4 rounded-[20px] text-[10px] font-black transition-all border",
                              estimatedMinutes === m
                                ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                                : "bg-surface border-border text-foreground hover:border-primary/50"
                            )}
                          >
                            {m >= 60 ? `${m/60}h` : `${m}m`}
                          </button>
                        ))}
                        <button
                          onClick={() => setIsCustomDuration(true)}
                          className="py-4 rounded-[20px] text-[10px] font-black border bg-surface border-border text-foreground hover:border-primary/50"
                        >
                          +1h
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-6 p-6 bg-surface-container/30 border border-border/50 rounded-[28px]">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Horas</span>
                        <div className="flex items-center gap-4">
                           <button onClick={() => {
                             const val = Math.max(1, customHours - 1);
                             setCustomHours(val);
                             setEstimatedMinutes(val * 60);
                           }} className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-black/5 active:scale-90 transition-all">-</button>
                           <span className="text-3xl font-black text-primary min-w-[3rem] text-center">{customHours}</span>
                           <button onClick={() => {
                             const val = Math.min(24, customHours + 1);
                             setCustomHours(val);
                             setEstimatedMinutes(val * 60);
                           }} className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-black/5 active:scale-90 transition-all">+</button>
                        </div>
                        <button 
                          onClick={() => setIsCustomDuration(false)}
                          className="p-2 rounded-xl hover:bg-black/5 transition-all"
                        >
                          <ArrowLeft className="w-4 h-4 text-primary" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-border/50">
                    <button
                      onClick={() => setHasSpecificTime(!hasSpecificTime)}
                      className={cn(
                        "w-full p-5 rounded-[28px] border transition-all flex items-center justify-between group",
                        hasSpecificTime 
                          ? "bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/20" 
                          : "bg-surface border-border hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-[18px] flex items-center justify-center transition-all",
                          hasSpecificTime ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                        )}>
                          <Clock className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                          <p className={cn(
                            "text-xs font-black uppercase tracking-tight",
                            hasSpecificTime ? "text-white" : "text-foreground"
                          )}>Sincronizar Calendario</p>
                          <p className={cn(
                            "text-[10px] font-bold uppercase tracking-widest opacity-60",
                            hasSpecificTime ? "text-white/80" : "text-muted-foreground"
                          )}>Hora específica</p>
                        </div>
                      </div>
                      <div className={cn(
                        "w-12 h-7 rounded-full p-1 transition-all flex items-center",
                        hasSpecificTime ? "bg-white/30" : "bg-muted"
                      )}>
                        <motion.div 
                          animate={{ x: hasSpecificTime ? 20 : 0 }}
                          className={cn(
                            "w-5 h-5 rounded-full shadow-sm",
                            hasSpecificTime ? "bg-white" : "bg-white"
                          )} 
                        />
                      </div>
                    </button>

                    {hasSpecificTime && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 grid grid-cols-2 gap-4"
                      >
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Inicia</label>
                          <input
                            type="time"
                            value={startTime}
                            onChange={e => setStartTime(e.target.value)}
                            className="w-full bg-surface border border-outline-variant rounded-[20px] px-5 py-4 text-sm font-black text-foreground focus:ring-2 focus:ring-primary/30 outline-none shadow-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Termina</label>
                          <input
                            type="time"
                            value={endTime}
                            onChange={e => setEndTime(e.target.value)}
                            className="w-full bg-surface border border-outline-variant rounded-[20px] px-5 py-4 text-sm font-black text-foreground focus:ring-2 focus:ring-primary/30 outline-none shadow-sm"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom action bar */}
          <div className="p-6 pt-2 flex gap-4">
            {phase > 1 && (
              <button
                onClick={() => setPhase(p => p - 1)}
                className="w-16 h-16 rounded-[24px] border border-border bg-surface text-foreground hover:bg-black/5 transition-all active:scale-95 flex items-center justify-center"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canAdvance || saving}
              className={cn(
                "flex-1 h-16 rounded-[24px] font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3",
                canAdvance 
                  ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95" 
                  : "bg-surface text-muted-foreground/30 border border-border"
              )}
            >
              {saving ? (
                <div className="flex gap-2 items-center">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-current"
                      animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              ) : phase === totalPhases ? (
                <>
                  <Sparkles className="w-5 h-5" />
                  Finalizar
                </>
              ) : (
                <>
                  Siguiente
                  <ArrowRight className="w-5 h-5" />
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
