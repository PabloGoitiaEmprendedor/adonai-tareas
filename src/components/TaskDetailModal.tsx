import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Clock, Calendar, Flag, FolderOpen, Trash2, Repeat, Target, Link as LinkIcon, ChevronDown, Check } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { useTasks } from '@/hooks/useTasks';
import { useFolders } from '@/hooks/useFolders';
import { useRecurrenceRules } from '@/hooks/useRecurrenceRules';
import { useGoals } from '@/hooks/useGoals';
import { notify } from '@/components/ui/adonai-notifier';
import FullscreenTimer from './FullscreenTimer';
import SubtasksSection from './SubtasksSection';
import { AutoTextarea } from '@/components/ui/auto-textarea';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { DurationPicker } from '@/components/ui/duration-picker';
import { REMINDER_OPTIONS, buildReminderMetadata, getReminderSettings } from '@/lib/reminders';

interface TaskDetailModalProps {
  task: any;
  open: boolean;
  onClose: () => void;
}

const TaskDetailModal = ({ task, open, onClose }: TaskDetailModalProps) => {
  const { updateTask, deleteTask, createTask } = useTasks();
  const { folders } = useFolders();
  const { goals } = useGoals();
  const { createRule, deleteRule } = useRecurrenceRules();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [links, setLinks] = useState<string[]>(['']);
  const [dueDate, setDueDate] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(0);
  const [importance, setImportance] = useState(false);
  const [urgency, setUrgency] = useState(false);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [status, setStatus] = useState('pending');
  const [timerOpen, setTimerOpen] = useState(false);
  const [showRecurrence, setShowRecurrence] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'none'>('none');
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([]);
  const [selectedMonthDay, setSelectedMonthDay] = useState<number | null>(null);
  const [selectedYearMonth, setSelectedYearMonth] = useState<number | null>(null);
  const [selectedYearDay, setSelectedYearDay] = useState<number | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<number>(15);
  const [hasChanges, setHasChanges] = useState(false);

  const originalData = useRef<any>(null);

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
      setFolderId(task.folder_id || null);
      setGoalId(task.goal_id || null);
      setStatus(task.status || 'pending');
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
      originalData.current = {
        title: task.title || '', description: task.description || '', link: task.link || '',
        dueDate: task.due_date || '', estimatedMinutes: task.estimated_minutes || 25,
        importance: task.importance || false, urgency: task.urgency || false,
        folderId: task.folder_id || null, goalId: task.goal_id || null,
      };
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
        try { await deleteRule.mutateAsync(task.recurrence_id); } catch { }
      }

      const ruleData: any = {
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
      try { await deleteRule.mutateAsync(task.recurrence_id); } catch { }
      recurrenceId = null;
    }

    const taskData = {
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate || null,
      estimated_minutes: estimatedMinutes || null,
      importance, urgency, priority,
      folder_id: folderId, goal_id: goalId, status,
      recurrence_id: recurrenceId,
      link: links.filter(l => l.trim() !== '').join(' ') || null,
      metadata: buildReminderMetadata(task.metadata, 'task', reminderEnabled, reminderMinutesBefore),
      ...(status === 'done' ? { completed_at: new Date().toISOString() } : {}),
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-[60]" onClick={handleSaveAndClose} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 22, stiffness: 260 }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="relative mx-auto w-full max-w-[400px] max-h-[90vh] overflow-y-auto pointer-events-auto rounded-[32px] no-scrollbar shadow-[0_20px_60px_-10px_hsla(140,95%,8%,0.15)] bg-background border border-border">
                
                <div className="flex flex-col p-6 gap-6">
                  {/* Top bar / Header Actions */}
                  <div className="flex items-center justify-between">
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
                        <Play className="w-4 h-4 fill-current" />
                      </button>
                      <button onClick={handleDelete}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button onClick={handleSave}
                      className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${hasChanges ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground bg-surface-container/30 border border-outline-variant/10'}`}>
                      {hasChanges ? 'Guardar Cambios' : 'Sin cambios'}
                    </button>
                  </div>

                  <div className="space-y-5">
                    {/* Title Section */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tarea</label>
                      <input
                        value={title}
                        onChange={(e) => { setTitle(e.target.value); markChanged(); }}
                        className="w-full text-xl font-black bg-surface border border-outline-variant rounded-[20px] px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/30 transition-all"
                        placeholder="¿Qué necesitas hacer?"
                      />
                    </div>

                    {/* Date + Time row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <CalendarDatePicker 
                          date={dueDate} 
                          onSelect={(d) => { setDueDate(d); markChanged(); }} 
                          label="FECHA"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Minutos</label>
                        <div className="relative group">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/30 group-focus-within:text-primary/50 transition-colors" />
                        <DurationPicker 
                          value={estimatedMinutes} 
                          onChange={(val) => { setEstimatedMinutes(val); markChanged(); }}
                          className="bg-surface-container/30 border border-outline-variant/10 rounded-[20px] pl-11 pr-4 py-3"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Recordatorio</label>
                      <div className="rounded-[22px] border border-outline-variant/10 bg-surface-container/30 p-3 space-y-3">
                        <button
                          type="button"
                          onClick={() => { setReminderEnabled((value) => !value); markChanged(); }}
                          className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all border ${reminderEnabled ? 'bg-primary/10 text-primary border-primary/20' : 'bg-surface/40 text-muted-foreground border-outline-variant/10'}`}
                        >
                          <span>Activar alerta</span>
                          <span>{reminderEnabled ? 'ON' : 'OFF'}</span>
                        </button>
                        {reminderEnabled && (
                          <div className="grid grid-cols-2 gap-2">
                            {REMINDER_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => { setReminderMinutesBefore(option.value); markChanged(); }}
                                className={`h-10 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${reminderMinutesBefore === option.value ? 'bg-primary/15 text-primary border-primary/30' : 'bg-surface/40 text-muted-foreground border-outline-variant/10 hover:text-foreground'}`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
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
                      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 ml-2">Links o Referencias</label>
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

                    {/* Folder Selection */}
                    {folders.length > 0 && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">Carpeta</label>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => { setFolderId(null); markChanged(); }}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${!folderId ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' : 'bg-surface-container/30 text-muted-foreground border-outline-variant/10 hover:bg-surface-container/50'}`}>
                            General
                          </button>
                          {folders.map((folder) => (
                            <button key={folder.id} onClick={() => { setFolderId(folder.id === folderId ? null : folder.id); markChanged(); }}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${folderId === folder.id ? 'border-transparent shadow-lg text-black' : 'bg-surface-container/30 text-muted-foreground border-outline-variant/10 hover:bg-surface-container/50'}`}
                              style={folderId === folder.id ? { backgroundColor: (folder.color || '#5B7CFA'), shadowColor: (folder.color || '#5B7CFA') + '40' } : {}}>
                              {folder.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Goal Selection */}
                    {goals.filter(g => g.active).length > 0 && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">Meta Asociada</label>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => { setGoalId(null); markChanged(); }}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${!goalId ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' : 'bg-surface-container/30 text-muted-foreground border-outline-variant/10 hover:bg-surface-container/50'}`}>
                            Sin meta
                          </button>
                          {goals.filter(g => g.active).map((goal) => (
                            <button key={goal.id} onClick={() => { setGoalId(goal.id === goalId ? null : goal.id); markChanged(); }}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center gap-2 ${goalId === goal.id ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' : 'bg-surface-container/30 text-muted-foreground border-outline-variant/10 hover:bg-surface-container/50'}`}>
                              <Target className="w-3 h-3" />
                              {goal.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recurrence Selection */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">Repetición</label>
                      <button onClick={() => setShowRecurrence(!showRecurrence)}
                        className={`w-full p-4 rounded-[20px] text-[11px] font-black uppercase tracking-wider flex items-center justify-between transition-all border ${recurrenceFreq !== 'none' ? 'text-primary border-primary/20 bg-primary/10' : 'text-muted-foreground border-outline-variant/10 bg-surface-container/30 hover:bg-surface-container/50'}`}>
                        <span className="flex items-center gap-3"><Repeat className="w-4 h-4" /> {recurrenceLabel}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showRecurrence ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {showRecurrence && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="pt-2 space-y-4">
                              <div className="grid grid-cols-5 gap-1 p-1 rounded-2xl bg-surface-container/30 border border-outline-variant/10">
                                {[{ id: 'none', label: 'No' }, { id: 'daily', label: 'Día' }, { id: 'weekly', label: 'Sem' }, { id: 'monthly', label: 'Mes' }, { id: 'yearly', label: 'Año' }].map((f) => (
                                  <button key={f.id} onClick={() => { setRecurrenceFreq(f.id as any); markChanged(); if (f.id === 'monthly' && !selectedMonthDay) setSelectedMonthDay(new Date().getDate()); }}
                                    className={`py-2 rounded-xl text-[10px] font-black uppercase transition-all ${recurrenceFreq === f.id ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                    {f.label}
                                  </button>
                                ))}
                              </div>
                              {recurrenceFreq === 'weekly' && (
                                <div className="flex justify-between gap-1">
                                  {weekDayLabels.map(({ label, value }) => (
                                    <button key={value} onClick={() => toggleWeekDay(value)}
                                      className={`w-10 h-10 rounded-full text-[11px] font-black transition-all border ${selectedWeekDays.includes(value) ? 'bg-primary text-primary-foreground border-transparent shadow-lg shadow-primary/20' : 'text-muted-foreground border-outline-variant/10 bg-surface-container/30 hover:bg-surface-container/50'}`}>
                                      {label}
                                    </button>
                                  ))}
                                </div>
                              )}
                              {recurrenceFreq === 'monthly' && (
                                <div className="grid grid-cols-7 gap-1.5">
                                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                    <button key={day} onClick={() => { setSelectedMonthDay(day); markChanged(); }}
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

                    {/* Subtasks */}
                    <SubtasksSection parentTaskId={task.id} />

                    {/* Status Selection */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2">Estado</label>
                      <div className="flex gap-2 p-1.5 rounded-[22px] bg-surface-container/30 border border-outline-variant/10">
                        {['pending', 'done', 'skipped'].map((s) => (
                          <button key={s} onClick={() => { setStatus(s); markChanged(); }}
                            className={`flex-1 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${status === s ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'}`}>
                            {s === 'pending' ? 'Pendiente' : s === 'done' ? 'Hecha' : 'Pospuesta'}
                          </button>
                        ))}
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
