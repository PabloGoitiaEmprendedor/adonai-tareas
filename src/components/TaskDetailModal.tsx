import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Clock, Calendar, Flag, FolderOpen, Trash2, Repeat, Target, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { useTasks } from '@/hooks/useTasks';
import { useFolders } from '@/hooks/useFolders';
import { useRecurrenceRules } from '@/hooks/useRecurrenceRules';
import { useGoals } from '@/hooks/useGoals';
import { toast } from 'sonner';
import FullscreenTimer from './FullscreenTimer';
import SubtasksSection from './SubtasksSection';


interface TaskDetailModalProps {
  task: any;
  open: boolean;
  onClose: () => void;
}

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const TaskDetailModal = ({ task, open, onClose }: TaskDetailModalProps) => {
  const { updateTask, deleteTask } = useTasks();
  const { folders } = useFolders();
  const { goals } = useGoals();
  const { createRule, deleteRule } = useRecurrenceRules();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(0);
  const [importance, setImportance] = useState(false);
  const [urgency, setUrgency] = useState(false);
  const [contextId, setContextId] = useState<string | null>(null);
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
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showSubtasks, setShowSubtasks] = useState(false);

  useEffect(() => {
    if (task && open) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setLink(task.link || '');
      setDueDate(task.due_date || '');
      setEstimatedMinutes(task.estimated_minutes || 25);
      setImportance(task.importance || false);
      setUrgency(task.urgency || false);
      setContextId(task.context_id || null);
      setFolderId(task.folder_id || null);
      setGoalId(task.goal_id || null);
      setStatus(task.status || 'pending');
      setRecurrenceFreq('none');
      setSelectedWeekDays([]);
      setSelectedMonthDay(null);
      setSelectedYearMonth(null);
      setSelectedYearDay(null);
      setShowRecurrence(false);
      setSubtasks(task.subtasks || []);
      setShowSubtasks((task.subtasks?.length || 0) > 0);
    }
  }, [task, open]);

  const toggleWeekDay = (day: number) => {
    setSelectedWeekDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const handleSave = async () => {
    let priority: string = 'medium';
    if (importance && urgency) priority = 'high';
    else if (importance) priority = 'high';
    else if (urgency) priority = 'medium';
    else priority = 'low';

    let recurrenceId: string | null = task.recurrence_id || null;

    // Handle recurrence
    if (recurrenceFreq !== 'none') {
      // Delete old rule if exists
      if (task.recurrence_id) {
        try { await deleteRule.mutateAsync(task.recurrence_id); } catch { }
      }

      const ruleData: any = {
        frequency: recurrenceFreq,
        interval: 1,
        start_date: dueDate || format(new Date(), 'yyyy-MM-dd'),
        end_date: null,
        days_of_week: recurrenceFreq === 'weekly' ? selectedWeekDays : [],
        day_of_month: recurrenceFreq === 'monthly' ? selectedMonthDay : null,
        month_of_year: recurrenceFreq === 'yearly' ? selectedYearMonth : null,
      };

      if (recurrenceFreq === 'yearly' && selectedYearDay) {
        ruleData.day_of_month = selectedYearDay;
      }

      try {
        const newRule = await createRule.mutateAsync(ruleData);
        recurrenceId = newRule.id;
      } catch {
        toast.error('Error al crear la recurrencia');
      }
    } else if (task.recurrence_id) {
      // Remove recurrence
      try { await deleteRule.mutateAsync(task.recurrence_id); } catch { }
      recurrenceId = null;
    }

    updateTask.mutate({
      id: task.id,
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate || null,
      estimated_minutes: estimatedMinutes || null,
      importance,
      urgency,
      priority,
      context_id: contextId,
      folder_id: folderId,
      goal_id: goalId,
      status,
      recurrence_id: recurrenceId,
      link: link.trim() || null,
      ...(status === 'done' ? { completed_at: new Date().toISOString() } : {}),
    });
    toast.success('Tarea actualizada');
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('¿Mover a la papelera?')) {
      deleteTask.mutate(task.id, {
        onSuccess: () => {
          toast.success('Tarea movida a la papelera');
          onClose();
        },
        onError: () => {
          toast.error('No se pudo mover la tarea a la papelera');
        },
      });
    }
  };


  if (!open || !task) return null;

  const weekDayLabels = [
    { label: 'L', value: 1 },
    { label: 'M', value: 2 },
    { label: 'X', value: 3 },
    { label: 'J', value: 4 },
    { label: 'V', value: 5 },
    { label: 'S', value: 6 },
    { label: 'D', value: 0 },
  ];

  const recurrenceLabel = recurrenceFreq === 'none' ? 'Sin repetición' :
    recurrenceFreq === 'daily' ? 'Todos los días' :
      recurrenceFreq === 'weekly' ? `Cada semana${selectedWeekDays.length > 0 ? '' : ''}` :
        recurrenceFreq === 'monthly' ? `Cada mes${selectedMonthDay ? ` el día ${selectedMonthDay}` : ''}` :
          `Cada año`;

  // Priority pill
  const priorityLabel = (importance && urgency) ? '🔴 Alta' : importance ? '🟢 Importante' : urgency ? '🟡 Urgente' : 'Normal';
  const priorityClass = (importance && urgency)
    ? 'bg-error/20 text-error'
    : importance
      ? 'bg-primary/20 text-primary'
      : urgency
        ? 'bg-amber-500/20 text-amber-500'
        : 'bg-surface-container-high text-on-surface-variant';

  return (
    <>
      <AnimatePresence>
        {open && !timerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-[60]" onClick={onClose} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'spring', damping: 25, stiffness: 240 }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="mx-auto w-full max-w-[440px] max-h-[90vh] overflow-y-auto bg-card border border-outline-variant rounded-3xl shadow-2xl pointer-events-auto">
                <div className="flex justify-center pt-4 pb-2">
                  <div className="w-12 h-1.5 bg-on-surface-variant/20 rounded-full" />
                </div>
                <div className="p-6 space-y-4">

                  {/* 1. Header con pill de prioridad */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-base font-bold text-foreground">Editar tarea</h2>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${priorityClass}`}>
                        {priorityLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={handleDelete} className="text-on-surface-variant hover:text-error transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <button onClick={onClose} className="text-on-surface-variant"><X className="w-5 h-5" /></button>
                    </div>
                  </div>

                  {/* 2. Botón Empezar tarea */}
                  {status === 'pending' && (
                    <button onClick={() => setTimerOpen(true)}
                      className="w-full py-3 rounded-xl primary-gradient text-primary-foreground font-bold text-sm flex items-center justify-center gap-2">
                      <Play className="w-4 h-4" /> Empezar tarea
                    </button>
                  )}

                  {/* 3. Nombre — prominente, sin label */}
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-transparent rounded-lg py-2 text-foreground text-lg font-semibold focus:outline-none border-b border-outline-variant/30 focus:border-primary transition-colors"
                  />

                  {/* 4. Fecha + Minutos */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1"><Calendar className="w-3 h-3" /> Fecha</label>
                      <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-surface-container-high rounded-lg p-3 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                      {dueDate && (
                        <p className="text-[10px] text-on-surface-variant/60 pl-1">
                          {format(new Date(dueDate + 'T12:00'), 'EEEE d MMM', { locale: es })}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> Minutos</label>
                      <input type="number" min={1} max={480} value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(Number(e.target.value))} className="w-full bg-surface-container-high rounded-lg p-3 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                  </div>

                  {/* 5. Importante + Urgente */}
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setImportance(!importance)}
                      className={`p-3 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${importance ? 'bg-primary/20 text-primary ring-1 ring-primary/30' : 'bg-surface-container-high text-on-surface-variant'}`}>
                      <Flag className="w-4 h-4" /> {importance ? 'Importante' : 'No importante'}
                    </button>
                    <button onClick={() => setUrgency(!urgency)}
                      className={`p-3 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${urgency ? 'bg-error/20 text-error ring-1 ring-error/30' : 'bg-surface-container-high text-on-surface-variant'}`}>
                      <Clock className="w-4 h-4" /> {urgency ? 'Urgente' : 'No urgente'}
                    </button>
                  </div>

                  {/* 6. Descripción auto-ajustable */}
                  <textarea
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    onFocus={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    rows={1}
                    style={{ overflow: 'hidden', resize: 'none' }}
                    placeholder="Añade una descripción..."
                    className="w-full bg-surface-container-high rounded-lg p-3 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />

                  {/* Link / URL */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1"><LinkIcon className="w-3 h-3" /> Link</label>
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-surface-container-high rounded-lg p-3 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* 8. Carpeta */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Carpeta</label>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setFolderId(null)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${!folderId ? 'bg-primary/20 text-primary ring-1 ring-primary/30' : 'bg-surface-container-high text-on-surface-variant'}`}>
                        Sin carpeta
                      </button>
                      {folders.map((folder) => (
                        <button key={folder.id} onClick={() => setFolderId(folder.id === folderId ? null : folder.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${folderId === folder.id ? 'ring-1 ring-primary/30' : 'bg-surface-container-high text-on-surface-variant'}`}
                          style={folderId === folder.id ? { backgroundColor: (folder.color || '#4BE277') + '30', color: folder.color || '#4BE277' } : undefined}>
                          {folder.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 8.5 Meta (Goal) */}
                  {goals.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1"><Target className="w-3 h-3" /> Meta</label>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setGoalId(null)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${!goalId ? 'bg-primary/20 text-primary ring-1 ring-primary/30' : 'bg-surface-container-high text-on-surface-variant'}`}>
                          Sin meta
                        </button>
                        {goals.filter(g => g.status === 'in_progress').map((goal) => (
                          <button key={goal.id} onClick={() => setGoalId(goal.id === goalId ? null : goal.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${goalId === goal.id ? 'bg-primary/20 text-primary ring-1 ring-primary/30' : 'bg-surface-container-high text-on-surface-variant'}`}>
                            {goal.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 9. Repetición — colapsable */}
                  <div className="space-y-2">
                    <button id="tutorial-recurrence-toggle" onClick={() => setShowRecurrence(!showRecurrence)}
                      className={`w-full p-3 rounded-xl text-sm font-bold flex items-center justify-between transition-all ${recurrenceFreq !== 'none' ? 'bg-primary/20 text-primary ring-1 ring-primary/30' : 'bg-surface-container-high text-on-surface-variant'}`}>
                      <div className="flex items-center gap-2">
                        <Repeat className="w-4 h-4" />
                        <span>{recurrenceLabel}</span>
                      </div>
                      <span className={`text-xs transition-transform ${showRecurrence ? 'rotate-180' : ''}`}>▾</span>
                    </button>

                    <AnimatePresence>
                      {showRecurrence && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="space-y-4 pt-2">
                            {/* Frequency selector */}
                            <div className="grid grid-cols-5 gap-1.5 p-1 bg-surface-container-highest rounded-xl">
                              {[
                                { id: 'none', label: 'No' },
                                { id: 'daily', label: 'Día' },
                                { id: 'weekly', label: 'Sem' },
                                { id: 'monthly', label: 'Mes' },
                                { id: 'yearly', label: 'Año' }
                              ].map((f) => (
                                <button key={f.id} id={`tutorial-freq-${f.id}`} onClick={() => {
                                  setRecurrenceFreq(f.id as any);
                                  if (f.id === 'monthly' && !selectedMonthDay) {
                                    setSelectedMonthDay(new Date().getDate());
                                  }
                                  if (f.id === 'yearly') {
                                    if (!selectedYearMonth) setSelectedYearMonth(new Date().getMonth());
                                    if (!selectedYearDay) setSelectedYearDay(new Date().getDate());
                                  }
                                }}
                                  className={`py-2 rounded-lg text-[10px] font-black uppercase transition-all ${recurrenceFreq === f.id ? 'bg-primary text-primary-foreground shadow-lg' : 'text-on-surface-variant hover:bg-surface-container-low'}`}>
                                  {f.label}
                                </button>
                              ))}
                            </div>

                            {/* Weekly: Day selection */}
                            {recurrenceFreq === 'weekly' && (
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Repetir los:</p>
                                <div className="flex justify-between gap-1">
                                  {weekDayLabels.map(({ label, value }) => (
                                    <button key={value} onClick={() => toggleWeekDay(value)}
                                      className={`w-9 h-9 rounded-full text-[11px] font-bold transition-all ${selectedWeekDays.includes(value)
                                          ? 'bg-primary text-primary-foreground shadow-md'
                                          : 'bg-surface-container-high text-on-surface-variant hover:bg-primary/10'
                                        }`}>
                                      {label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Monthly: Day of month grid */}
                            {recurrenceFreq === 'monthly' && (
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Día del mes:</p>
                                <div className="grid grid-cols-7 gap-1">
                                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                    <button key={day} onClick={() => setSelectedMonthDay(day)}
                                      className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${selectedMonthDay === day
                                          ? 'bg-primary text-primary-foreground shadow-md'
                                          : 'bg-surface-container-high text-on-surface-variant hover:bg-primary/10'
                                        }`}>
                                      {day}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Yearly: Month + Day selection */}
                            {recurrenceFreq === 'yearly' && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Mes:</p>
                                  <div className="grid grid-cols-4 gap-1">
                                    {MONTH_NAMES.map((m, i) => (
                                      <button key={i} onClick={() => setSelectedYearMonth(i)}
                                        className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${selectedYearMonth === i
                                            ? 'bg-primary text-primary-foreground shadow-md'
                                            : 'bg-surface-container-high text-on-surface-variant hover:bg-primary/10'
                                          }`}>
                                        {m}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Día:</p>
                                  <div className="grid grid-cols-7 gap-1">
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                      <button key={day} onClick={() => setSelectedYearDay(day)}
                                        className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${selectedYearDay === day
                                            ? 'bg-primary text-primary-foreground shadow-md'
                                            : 'bg-surface-container-high text-on-surface-variant hover:bg-primary/10'
                                          }`}>
                                        {day}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 10. Subtareas — colapsadas por defecto, el usuario las abre explícitamente */}
                  <SubtasksSection parentTaskId={task.id} />

                  {/* 11. Estado */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Estado</label>
                    <div className="flex gap-2">
                      {['pending', 'done', 'skipped'].map((s) => (
                        <button key={s} onClick={() => setStatus(s)}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${status === s ? 'bg-primary text-primary-foreground' : 'bg-surface-container-high text-on-surface-variant'}`}>
                          {s === 'pending' ? 'Pendiente' : s === 'done' ? 'Hecha' : 'Pospuesta'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 12. Guardar */}
                  <button onClick={handleSave} className="w-full py-3.5 rounded-xl primary-gradient text-primary-foreground font-bold text-sm">
                    Guardar cambios
                  </button>
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
