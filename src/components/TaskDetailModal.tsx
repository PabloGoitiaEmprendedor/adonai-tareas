import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Trash2, Repeat, Link as LinkIcon, ChevronDown, Bell, BellOff } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { useTasks } from '@/hooks/useTasks';
import { isCapacitor, requestLocalNotificationPermission } from '@/lib/mobileNotifications';
import { useRecurrenceRules } from '@/hooks/useRecurrenceRules';
import { notify } from '@/components/ui/adonai-notifier';
import FullscreenTimer from './FullscreenTimer';
import { AutoTextarea } from '@/components/ui/auto-textarea';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { DurationPicker } from '@/components/ui/duration-picker';
import { REMINDER_OPTIONS, buildReminderMetadata, getReminderSettings } from '@/lib/reminders';
import type { RecurrenceFrequency, TaskLike } from '@/lib/taskTypes';

const REMINDER_CYCLE_VALUES: number[] = REMINDER_OPTIONS.map((option) => option.value);
const REMINDER_LABEL_BY_VALUE = new Map<number, string>(REMINDER_OPTIONS.map((option) => [option.value, option.label]));

const getReminderDisplayLabel = (enabled: boolean, minutes?: number) => {
  if (!enabled) return 'Sin recordatorio';
  return REMINDER_LABEL_BY_VALUE.get(minutes ?? 15) ?? '15 min antes';
};

const getNextReminderState = (enabled: boolean, minutes?: number) => {
  if (!enabled) return { reminderEnabled: true, reminderMinutesBefore: REMINDER_CYCLE_VALUES[0] };
  const currentIndex = REMINDER_CYCLE_VALUES.indexOf(minutes ?? 15);
  if (currentIndex === -1 || currentIndex === REMINDER_CYCLE_VALUES.length - 1) {
    return { reminderEnabled: false, reminderMinutesBefore: REMINDER_CYCLE_VALUES[0] };
  }
  return {
    reminderEnabled: true,
    reminderMinutesBefore: REMINDER_CYCLE_VALUES[currentIndex + 1],
  };
};

interface TaskDetailModalProps {
  task: TaskLike | null;
  open: boolean;
  onClose: () => void;
  variant?: 'modal' | 'side';
}

const TaskDetailModal = ({ task, open, onClose, variant = 'modal' }: TaskDetailModalProps) => {
  const { updateTask, deleteTask, createTask } = useTasks();
  const { createRule, deleteRule } = useRecurrenceRules();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [links, setLinks] = useState<string[]>(['']);
  const [dueDate, setDueDate] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(0);
  const [importance, setImportance] = useState(false);
  const [urgency, setUrgency] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [showRecurrence, setShowRecurrence] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceFrequency>('none');
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([]);
  const [selectedMonthDay, setSelectedMonthDay] = useState<number | null>(null);
  const [selectedYearMonth, setSelectedYearMonth] = useState<number | null>(null);
  const [selectedYearDay, setSelectedYearDay] = useState<number | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<number>(15);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (task && open) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      const initialLinks = task.link ? task.link.split(/\s+/).filter(Boolean) : [];
      setLinks(initialLinks.length > 0 ? initialLinks : ['']);
      setDueDate(task.due_date || '');
      setEstimatedMinutes(task.estimated_minutes || 25);
      setImportance(task.importance || false);
      setUrgency(task.urgency || false);
      setRecurrenceFreq('none');
      setSelectedWeekDays([]);
      setSelectedMonthDay(null);
      setSelectedYearMonth(null);
      setSelectedYearDay(null);
      const reminder = getReminderSettings(task.metadata, 'task');
      setReminderEnabled(!!reminder);
      setReminderMinutesBefore(reminder?.minutes_before ?? 15);
      setShowRecurrence(false);
      setHasChanges(false);
    }
  }, [task, open]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('adonai:detail-state-change', { detail: { active: open } }))
  }, [open])

  const markChanged = () => setHasChanges(true);

  const toggleWeekDay = (day: number) => {
    setSelectedWeekDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
    markChanged();
  };

  const handleSave = async () => {
    let priority: string = 'medium';
    if (importance && urgency) priority = 'high';
    else if (importance) priority = 'high';
    else if (urgency) priority = 'medium';
    else priority = 'low';

    let recurrenceId: string | null = task.recurrence_id || null;

    if (recurrenceFreq !== 'none') {
      if (task.recurrence_id) {
        try {
          await deleteRule.mutateAsync(task.recurrence_id);
        } catch (error) {
          console.debug('[TaskDetailModal] deleteRule before recreate failed:', error);
        }
      }

      const ruleData: {
        frequency: Exclude<RecurrenceFrequency, 'none'>;
        interval: number;
        start_date: string;
        end_date: null;
        days_of_week: number[];
        day_of_month: number | null;
        month_of_year: number | null;
      } = {
        frequency: recurrenceFreq, interval: 1,
        start_date: dueDate || format(new Date(), 'yyyy-MM-dd'), end_date: null,
        days_of_week: recurrenceFreq === 'weekly' ? selectedWeekDays : [],
        day_of_month: recurrenceFreq === 'monthly' ? selectedMonthDay : null,
        month_of_year: recurrenceFreq === 'yearly' ? selectedYearMonth : null,
      };

      if (recurrenceFreq === 'yearly' && selectedYearDay) ruleData.day_of_month = selectedYearDay;

      try {
        const newRule = await createRule.mutateAsync(ruleData);
        recurrenceId = newRule.id;
      } catch (err) {
        console.error('[TaskDetailModal] Error creating recurrence rule:', err);
        notify('Error al crear la recurrencia', 'error');
        return;
      }
    } else if (task.recurrence_id) {
      try {
        await deleteRule.mutateAsync(task.recurrence_id);
      } catch (error) {
        console.debug('[TaskDetailModal] deleteRule on clear recurrence failed:', error);
      }
      recurrenceId = null;
    }

    const taskData = {
      title: title.trim() ? title.replace(/\r\n/g, '\n') : task.title || '',
      description: description.trim() || null,
      due_date: dueDate || null,
      estimated_minutes: estimatedMinutes || null,
      importance, urgency, priority,
      recurrence_id: recurrenceId,
      link: links.filter(l => l.trim() !== '').join(' ') || null,
      metadata: buildReminderMetadata(task.metadata, 'task', reminderEnabled, reminderMinutesBefore),
    };

    if (task.isNew) {
      createTask.mutate({ ...taskData, source_type: 'text', creation_source: 'secondary' }, {
        onSuccess: () => { notify('Tarea creada', 'success'); onClose(); },
        onError: () => notify('Error al crear tarea', 'error')
      });
      return;
    }

    updateTask.mutate({ id: task.id, ...taskData });
    notify('Tarea actualizada', 'success');
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('¿Mover a la papelera?')) {
      deleteTask.mutate(task.id, {
        onSuccess: () => { notify('Tarea movida a la papelera', 'info'); onClose(); },
        onError: () => notify('No se pudo mover la tarea a la papelera', 'error'),
      });
    }
  };

  const handleSaveAndClose = () => {
    if (hasChanges) {
      handleSave();
    } else {
      onClose();
    }
  };

  if (!open || !task) return null;
  const isSide = variant === 'side';

  const weekDayLabels = [
    { label: 'L', value: 1 }, { label: 'M', value: 2 }, { label: 'X', value: 3 },
    { label: 'J', value: 4 }, { label: 'V', value: 5 }, { label: 'S', value: 6 }, { label: 'D', value: 0 },
  ];

  const recurrenceLabel = recurrenceFreq === 'none' ? 'Sin repetición' :
    recurrenceFreq === 'daily' ? 'Diario' :
    recurrenceFreq === 'weekly' ? `Semanal (${selectedWeekDays.length > 0 ? selectedWeekDays.map(d => weekDayLabels.find(l => l.value === d)?.label).join(', ') : 'todos'})` :
    recurrenceFreq === 'monthly' ? `Mensual (día ${selectedMonthDay || '—'})` :
    `Anual`;

  return (
    <>
      <AnimatePresence>
        {open && !timerOpen && (
          <>
            {!isSide && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[60]" onClick={handleSaveAndClose} />
            )}
            <motion.div
              initial={isSide ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
              animate={isSide ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={isSide ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
              transition={isSide ? { duration: 0.06, ease: 'linear' } : { type: 'spring', damping: 22, stiffness: 260 }}
              className={isSide ? "relative z-10 flex h-full w-full items-stretch pointer-events-none" : "fixed inset-0 z-[70] flex items-stretch justify-center p-0 sm:items-center sm:p-4 pointer-events-none"}
            >
              <div className={isSide ? "relative h-full w-full overflow-y-auto pointer-events-auto rounded-none border-l border-border bg-background no-scrollbar shadow-[-18px_0_44px_-26px_rgba(15,23,42,0.55)]" : "relative mx-auto h-[100dvh] w-full max-w-none max-h-[100dvh] overflow-y-auto pointer-events-auto rounded-none border-0 bg-background no-scrollbar shadow-[0_20px_60px_-10px_hsla(140,95%,8%,0.15)] sm:h-auto sm:max-w-[440px] sm:max-h-[90vh] sm:rounded-[32px] sm:border sm:border-border"}>
                
                <div className="flex flex-col gap-5 p-4 pb-6 sm:gap-6 sm:p-6">
                  {/* Top bar / Header Actions */}
                  <div className="sticky top-0 z-10 -mx-4 -mt-4 flex items-center justify-between border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur-xl sm:static sm:m-0 sm:border-b-0 sm:bg-transparent sm:p-0">
                    <div className="flex items-center gap-3">
                      <button onClick={handleSaveAndClose}
                        className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-90 text-muted-foreground"
                        title="Cerrar">
                        <X className="w-4 h-4" />
                      </button>
                      <div className="w-px h-4 bg-border" />
                      <button onClick={() => setTimerOpen(true)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-primary/10 text-primary"
                        title="Iniciar timer">
                        <Clock className="w-4 h-4" />
                      </button>
                      <button onClick={handleDelete}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button onClick={handleSave}
                      className={`min-w-[108px] px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all sm:px-5 ${hasChanges ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground bg-surface-container/30 border border-outline-variant/10'}`}>
                      {hasChanges ? 'Guardar Cambios' : 'Sin cambios'}
                    </button>
                  </div>

                  <div className="space-y-5">
                    {/* Title Section */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nombre de la tarea</label>
                      <AutoTextarea
                        value={title}
                        onChange={(e) => { setTitle(e.target.value); markChanged(); }}
                        className="w-full whitespace-pre-wrap break-words text-xl font-black leading-tight bg-surface border border-outline-variant rounded-[20px] px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/30 transition-all"
                        placeholder="¿Qué necesitas hacer?"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 ml-2">Descripción</label>
                      <AutoTextarea
                        value={description}
                        onChange={(e) => { setDescription(e.target.value); markChanged(); }}
                        placeholder="Detalles adicionales..."
                        className="w-full text-sm bg-surface-container/30 border border-outline-variant/10 rounded-[24px] p-5 focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[100px] placeholder:text-on-surface-variant/20 transition-all"
                      />
                    </div>

                    {/* Date + Time row */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_124px_128px] sm:items-end">
                      <div>
                        <CalendarDatePicker 
                          date={dueDate} 
                          onSelect={(d) => { setDueDate(d); markChanged(); }} 
                          label="FECHA"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Duración</label>
                        <div className="relative group">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/30 group-focus-within:text-primary/50 transition-colors" />
                          <DurationPicker
                            value={estimatedMinutes}
                            onChange={(val) => { setEstimatedMinutes(val); markChanged(); }}
                            className="h-[48px] bg-surface-container/30 border border-outline-variant/10 rounded-[20px] pl-11 pr-4 py-3 whitespace-nowrap"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const nextReminder = getNextReminderState(reminderEnabled, reminderMinutesBefore);
                          setReminderEnabled(nextReminder.reminderEnabled);
                          setReminderMinutesBefore(nextReminder.reminderMinutesBefore);
                          markChanged();
                          if (nextReminder.reminderEnabled && isCapacitor()) requestLocalNotificationPermission();
                        }}
                        className={`h-[48px] w-full rounded-[20px] px-3 flex items-center justify-center gap-2 border transition-all text-[10px] font-black whitespace-nowrap self-end ${reminderEnabled ? 'bg-primary/15 text-primary border-primary/25 shadow-sm' : 'bg-surface-container/30 text-muted-foreground border-outline-variant/15 hover:border-primary/30 hover:text-primary'}`}
                      >
                        {reminderEnabled ? <Bell className="w-3 h-3 shrink-0" /> : <BellOff className="w-3 h-3 shrink-0" />}
                        <span>{getReminderDisplayLabel(reminderEnabled, reminderMinutesBefore)}</span>
                      </button>
                    </div>

                    {/* Priority (Matrix Style) */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Prioridad</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => { setImportance(!importance); markChanged(); }}
                          className={`flex flex-col items-center justify-center gap-1 rounded-[22px] font-black uppercase tracking-widest text-[9px] transition-all border h-14 ${importance ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 shadow-lg shadow-amber-500/5' : 'bg-surface-container/30 text-muted-foreground border-outline-variant/10 hover:bg-surface-container/50'}`}>
                          IMPORTANTE
                        </button>
                        <button onClick={() => { setUrgency(!urgency); markChanged(); }}
                          className={`flex flex-col items-center justify-center gap-1 rounded-[22px] font-black uppercase tracking-widest text-[9px] transition-all border h-14 ${urgency ? 'bg-red-500/10 text-red-500 border-red-500/30 shadow-lg shadow-red-500/5' : 'bg-surface-container/30 text-muted-foreground border-outline-variant/10 hover:bg-surface-container/50'}`}>
                          URGENTE
                        </button>
                      </div>
                    </div>

                    {/* Links */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 ml-2">Links</label>
                      <div className="flex flex-col gap-2">
                        {links.map((l, i) => (
                          <div key={i} className="relative group flex items-center gap-2">
                            <div className="relative flex-1">
                              <LinkIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/30 group-focus-within:text-primary/50 transition-colors" />
                              <input 
                                type="text"
                                value={l} 
                                onChange={(e) => {
                                  const newLinks = [...links];
                                  newLinks[i] = e.target.value;
                                  setLinks(newLinks);
                                  markChanged();
                                }} 
                                placeholder="https://..."
                                className="w-full text-sm bg-surface-container/30 border border-outline-variant/10 rounded-[24px] pl-12 pr-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-on-surface-variant/20"
                              />
                            </div>
                            {i === links.length - 1 && (
                              <button
                                type="button"
                                onClick={() => setLinks([...links, ''])}
                                className="w-[52px] h-[52px] flex-shrink-0 flex items-center justify-center rounded-[24px] bg-surface-container/30 border border-outline-variant/10 text-on-surface-variant/50 hover:bg-surface-container hover:text-primary transition-all hover:border-primary/30"
                              >
                                <span className="text-xl leading-none">+</span>
                              </button>
                            )}
                            {links.length > 1 && i !== links.length - 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newLinks = [...links];
                                  newLinks.splice(i, 1);
                                  setLinks(newLinks);
                                  markChanged();
                                }}
                                className="w-[52px] h-[52px] flex-shrink-0 flex items-center justify-center rounded-[24px] bg-surface-container/30 border border-outline-variant/10 text-on-surface-variant/50 hover:bg-red-500/10 hover:text-red-400 transition-all hover:border-red-500/30"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>


                    {/* Recurrence Selection */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">Repetición</label>
                      <div className="rounded-[22px] border border-outline-variant/15 bg-surface-container/25 p-3 space-y-3">
                        <button
                          type="button"
                          onClick={() => setShowRecurrence(!showRecurrence)}
                          className="w-full rounded-2xl bg-primary/10 border border-primary/15 px-4 py-3 text-[12px] font-bold text-foreground leading-relaxed flex items-center justify-between gap-3"
                        >
                          <span className="flex items-center gap-3"><Repeat className="w-4 h-4" /> {recurrenceLabel}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showRecurrence ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {showRecurrence && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="pt-1 space-y-3">
                                <div className="grid grid-cols-5 gap-1.5">
                                  {[{ id: 'none', label: 'No' }, { id: 'daily', label: 'Día' }, { id: 'weekly', label: 'Sem' }, { id: 'monthly', label: 'Mes' }, { id: 'yearly', label: 'Año' }].map((f) => (
                                    <button
                                      key={f.id}
                                      type="button"
                                      onClick={() => {
                                        setRecurrenceFreq(f.id as RecurrenceFrequency);
                                        markChanged();
                                        if (f.id === 'monthly' && !selectedMonthDay) setSelectedMonthDay(new Date().getDate());
                                      }}
                                      className={`h-9 rounded-xl text-[10px] font-black transition-all border ${recurrenceFreq === f.id ? 'bg-primary/15 text-primary border-primary/30' : 'bg-surface/50 text-muted-foreground border-outline-variant/15 hover:text-primary'}`}
                                    >
                                      {f.label}
                                    </button>
                                  ))}
                                </div>
                                {recurrenceFreq === 'weekly' && (
                                  <div className="grid grid-cols-7 gap-1.5">
                                    {weekDayLabels.map(({ label, value }) => (
                                      <button key={value} type="button" onClick={() => toggleWeekDay(value)}
                                        className={`h-10 rounded-full text-xs font-black transition-all border ${selectedWeekDays.includes(value) ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' : 'bg-surface/60 text-muted-foreground border-outline-variant/20 hover:border-primary/30 hover:text-primary'}`}>
                                        {label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {recurrenceFreq === 'monthly' && (
                                  <div className="grid grid-cols-7 gap-1.5">
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                      <button key={day} type="button" onClick={() => { setSelectedMonthDay(day); markChanged(); }}
                                        className={`aspect-square rounded-lg text-[10px] font-black transition-all border ${selectedMonthDay === day ? 'bg-primary text-primary-foreground border-transparent shadow-md shadow-primary/20' : 'text-muted-foreground border-outline-variant/10 bg-surface-container/30 hover:bg-surface-container/50'}`}>
                                        {day}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <FullscreenTimer task={task} open={timerOpen} onClose={() => { setTimerOpen(false); onClose(); }} />
    </>
  );
};

export default TaskDetailModal;
