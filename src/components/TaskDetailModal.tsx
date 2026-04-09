import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Play, Clock, Calendar, Flag, Tag, FolderOpen, Trash2, Repeat, Plus } from 'lucide-react';


import { useTasks } from '@/hooks/useTasks';
import { useContexts } from '@/hooks/useContexts';
import { useFolders } from '@/hooks/useFolders';
import { useRecurrenceRules } from '@/hooks/useRecurrenceRules';
import { toast } from 'sonner';
import FullscreenTimer from './FullscreenTimer';
import { format } from 'date-fns';


interface TaskDetailModalProps {
  task: any;
  open: boolean;
  onClose: () => void;
}

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const TaskDetailModal = ({ task, open, onClose }: TaskDetailModalProps) => {
  const { updateTask } = useTasks();
  const { contexts } = useContexts();
  const { folders } = useFolders();
  const { createRule, deleteRule } = useRecurrenceRules();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(0);
  const [importance, setImportance] = useState(false);
  const [urgency, setUrgency] = useState(false);
  const [contextId, setContextId] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
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

  useEffect(() => {
    if (task && open) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setDueDate(task.due_date || '');
      setEstimatedMinutes(task.estimated_minutes || 25);
      setImportance(task.importance || false);
      setUrgency(task.urgency || false);
      setContextId(task.context_id || null);
      setFolderId(task.folder_id || null);
      setStatus(task.status || 'pending');
      setRecurrenceFreq('none');
      setSelectedWeekDays([]);
      setSelectedMonthDay(null);
      setSelectedYearMonth(null);
      setSelectedYearDay(null);
      setShowRecurrence(false);
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
        try { await deleteRule.mutateAsync(task.recurrence_id); } catch {}
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
      try { await deleteRule.mutateAsync(task.recurrence_id); } catch {}
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
      status,
      recurrence_id: recurrenceId,
      ...(status === 'done' ? { completed_at: new Date().toISOString() } : {}),
    });
    toast.success('Tarea actualizada');
    onClose();
  };

  const navigate = useNavigate();

  const handleDelete = () => {
    if (window.confirm('¿Mover a la papelera?')) {
      updateTask.mutate({ id: task.id, status: 'deleted' });
      toast.success('Tarea movida a la papelera');
      onClose();
      navigate('/trash');
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

  return (
    <>
      <AnimatePresence>
        {open && !timerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-[60]" onClick={onClose} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-[70] px-4 pb-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="mx-auto max-w-[430px] glass-sheet rounded-2xl overflow-hidden shadow-2xl">
                <div className="flex justify-center pt-4 pb-2">
                  <div className="w-12 h-1.5 bg-on-surface-variant/20 rounded-full" />
                </div>
                <div className="p-6 space-y-5">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-foreground">Editar tarea</h2>
                    <div className="flex items-center gap-3">
                      <button onClick={handleDelete} className="text-on-surface-variant hover:text-error transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <button onClick={onClose} className="text-on-surface-variant"><X className="w-5 h-5" /></button>
                    </div>
                  </div>

                  {status === 'pending' && (
                    <button onClick={() => setTimerOpen(true)}
                      className="w-full py-3 rounded-xl primary-gradient text-primary-foreground font-bold text-sm flex items-center justify-center gap-2">
                      <Play className="w-4 h-4" /> Empezar tarea
                    </button>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nombre</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-surface-container-high rounded-lg p-3 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Descripción</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full bg-surface-container-high rounded-lg p-3 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1"><Calendar className="w-3 h-3" /> Fecha</label>
                      <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-surface-container-high rounded-lg p-3 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> Minutos</label>
                      <input type="number" min={1} max={480} value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(Number(e.target.value))} className="w-full bg-surface-container-high rounded-lg p-3 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                  </div>

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

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1"><Tag className="w-3 h-3" /> Contexto</label>
                    <div className="flex flex-wrap gap-2">
                      {contexts.map((ctx) => (
                        <button key={ctx.id} onClick={() => setContextId(ctx.id === contextId ? null : ctx.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${contextId === ctx.id ? 'bg-primary/20 text-primary ring-1 ring-primary/30' : 'bg-surface-container-high text-on-surface-variant'}`}>
                          {ctx.name}
                        </button>
                      ))}
                    </div>
                  </div>

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

                  {/* Recurrence Section */}
                  <div className="space-y-2">
                    <button onClick={() => setShowRecurrence(!showRecurrence)}
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
                                <button key={f.id} onClick={() => {
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
                                      className={`w-9 h-9 rounded-full text-[11px] font-bold transition-all ${
                                        selectedWeekDays.includes(value)
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
                                      className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                                        selectedMonthDay === day
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
                                        className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                          selectedYearMonth === i
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
                                        className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                                          selectedYearDay === day
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

                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Subtareas</label>
                    <div className="space-y-2">
                      {subtasks.map((st, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 bg-surface-container-high rounded-lg">
                          <div className="w-4 h-4 rounded border border-outline-variant" />
                          <span className="text-sm text-foreground">{st.title}</span>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)}
                          placeholder="Añadir subtarea..."
                          className="flex-1 bg-surface-container-high rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary border-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newSubtaskTitle.trim()) {
                              setSubtasks([...subtasks, { title: newSubtaskTitle.trim() }]);
                              setNewSubtaskTitle('');
                            }
                          }} />
                        <button onClick={() => {
                          if (newSubtaskTitle.trim()) {
                            setSubtasks([...subtasks, { title: newSubtaskTitle.trim() }]);
                            setNewSubtaskTitle('');
                          }
                        }} className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Plus className="w-5 h-5 text-primary" strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  </div>

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
