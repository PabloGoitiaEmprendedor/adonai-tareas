import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Clock, Calendar, Flag, FolderOpen, Trash2, Repeat, Target, Link as LinkIcon, ChevronDown, Check } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { useTasks } from '@/hooks/useTasks';
import { useFolders } from '@/hooks/useFolders';
import { useRecurrenceRules } from '@/hooks/useRecurrenceRules';
import { useGoals } from '@/hooks/useGoals';
import { toast } from 'sonner';
import FullscreenTimer from './FullscreenTimer';
import SubtasksSection from './SubtasksSection';
import { AutoTextarea } from '@/components/ui/auto-textarea';


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
  const [link, setLink] = useState('');
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
  const [hasChanges, setHasChanges] = useState(false);

  const originalData = useRef<any>(null);

  useEffect(() => {
    if (task && open) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setLink(task.link || '');
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
      } catch {
        toast.error('Error al crear la recurrencia');
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
      link: link.trim() || null,
      ...(status === 'done' ? { completed_at: new Date().toISOString() } : {}),
    };

    if (task.isNew) {
      createTask.mutate({ ...taskData, source_type: 'text', creation_source: 'secondary' }, {
        onSuccess: () => { toast.success('Tarea creada'); onClose(); },
        onError: () => toast.error('Error al crear tarea')
      });
      return;
    }

    updateTask.mutate({ id: task.id, ...taskData });
    toast.success('Tarea actualizada');
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('¿Mover a la papelera?')) {
      deleteTask.mutate(task.id, {
        onSuccess: () => { toast.success('Tarea movida a la papelera'); onClose(); },
        onError: () => toast.error('No se pudo mover la tarea a la papelera'),
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
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'spring', damping: 25, stiffness: 240 }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="mx-auto w-full max-w-[400px] max-h-[85vh] overflow-y-auto pointer-events-auto rounded-3xl"
                style={{ background: '#18181B', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
                
                {/* Top bar */}
                <div className="flex items-center justify-between px-5 pt-4 pb-3">
                  <div className="flex items-center gap-3">
                    <button onClick={handleSaveAndClose}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 bg-white/5 hover:bg-white/10"
                      title="Cerrar">
                      <X className="w-4 h-4 text-white/40" />
                    </button>
                    <div className="w-[1px] h-4 bg-white/10 mx-1" />
                    <button onClick={() => setTimerOpen(true)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                      style={{ background: 'rgba(163,230,53,0.15)' }}
                      title="Iniciar timer">
                      <Play className="w-3.5 h-3.5" style={{ color: '#A3E635' }} />
                    </button>
                    <button onClick={handleDelete}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                      style={{ color: 'rgba(255,255,255,0.3)' }}
                      title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button onClick={handleSave}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${hasChanges ? 'bg-[#A3E635] text-black' : 'bg-white/5 text-white/20'}`}>
                    {hasChanges ? <><Check className="w-3 h-3" /> Guardar</> : 'Sin cambios'}
                  </button>
                </div>

                <div className="px-5 pb-5 space-y-4">
                  {/* Title */}
                  <input
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); markChanged(); }}
                    className="w-full bg-transparent text-lg font-bold focus:outline-none border-b border-white/10 focus:border-[#A3E635]/50 transition-colors pb-2"
                    style={{ color: '#F4F4F5' }}
                    placeholder="Nombre de la tarea"
                  />

                  {/* Date + Time row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 ml-1 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />FECHA
                      </label>
                      <input 
                        type="date" 
                        value={dueDate} 
                        onChange={(e) => { setDueDate(e.target.value); markChanged(); }}
                        className="w-full text-sm bg-surface-container/30 border border-outline-variant/10 rounded-[20px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 ml-1 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />MIN
                      </label>
                      <input 
                        type="number" 
                        min={1} 
                        max={480} 
                        value={estimatedMinutes} 
                        onChange={(e) => { setEstimatedMinutes(Number(e.target.value)); markChanged(); }}
                        className="w-full text-sm bg-surface-container/30 border border-outline-variant/10 rounded-[20px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1"
                      />
                    </div>
                  </div>

                  {/* Priority */}
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { setImportance(!importance); markChanged(); }}
                      className={`p-2 rounded-[20px] text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${importance ? 'border-primary text-primary bg-primary/10' : 'border-transparent text-on-surface-variant/60 bg-surface-container'}`}>
                      <Flag className="w-3.5 h-3.5" /> Importante
                    </button>
                    <button onClick={() => { setUrgency(!urgency); markChanged(); }}
                      className={`p-2 rounded-[20px] text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${urgency ? 'border-[#f97316] text-[#f97316] bg-[#f97316]/10' : 'border-transparent text-on-surface-variant/60 bg-surface-container'}`}>
                      <Clock className="w-3.5 h-3.5" /> Urgente
                    </button>
                  </div>

                  {/* Link */}
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 ml-1">
                      <LinkIcon className="w-3 h-3 inline mr-1" />Link o Referencia
                    </label>
                    <div className="relative mt-1">
                      <input 
                        type="url" 
                        value={link} 
                        onChange={(e) => { setLink(e.target.value); markChanged(); }} 
                        placeholder="https://..."
                        className="w-full text-sm bg-surface-container/30 border border-outline-variant/10 rounded-[24px] px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-on-surface-variant/20"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 ml-1">Descripción</label>
                    <AutoTextarea 
                      value={description} 
                      onChange={(e) => { setDescription(e.target.value); markChanged(); }}
                      placeholder="Detalles opcionales..."
                      className="w-full text-sm bg-surface-container/30 border border-outline-variant/10 rounded-[24px] p-5 focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[100px] placeholder:text-on-surface-variant/20 mt-1"
                    />
                  </div>

                  {/* Folder */}
                  {folders.length > 0 && (
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 ml-1 flex items-center">
                        <FolderOpen className="w-3 h-3 mr-1" />CARPETA
                      </label>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <button onClick={() => { setFolderId(null); markChanged(); }}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${!folderId ? 'border-primary text-primary bg-primary/10' : 'border-transparent text-on-surface-variant/60 bg-surface-container'}`}>
                          Sin carpeta
                        </button>
                        {folders.map((folder) => (
                          <button key={folder.id} onClick={() => { setFolderId(folder.id === folderId ? null : folder.id); markChanged(); }}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${folderId === folder.id ? 'border-transparent' : 'border-transparent text-on-surface-variant/60 bg-surface-container'}`}
                            style={folderId === folder.id ? { backgroundColor: (folder.color || '#4BE277') + '30', color: folder.color || '#4BE277' } : {}}>
                            {folder.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Goal */}
                  {goals.filter(g => g.active).length > 0 && (
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 ml-1 flex items-center">
                        <Target className="w-3 h-3 mr-1" />META
                      </label>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <button onClick={() => { setGoalId(null); markChanged(); }}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${!goalId ? 'border-primary text-primary bg-primary/10' : 'border-transparent text-on-surface-variant/60 bg-surface-container'}`}>
                          Sin meta
                        </button>
                        {goals.filter(g => g.active).map((goal) => (
                          <button key={goal.id} onClick={() => { setGoalId(goal.id === goalId ? null : goal.id); markChanged(); }}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${goalId === goal.id ? 'border-transparent bg-primary/20 text-primary' : 'border-transparent text-on-surface-variant/60 bg-surface-container'}`}>
                            {goal.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recurrence */}
                  <div>
                    <button onClick={() => setShowRecurrence(!showRecurrence)}
                      className={`w-full p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${recurrenceFreq !== 'none' ? 'text-primary' : 'text-on-surface-variant/60'}`}
                      style={{ background: 'var(--surface-container)' }}>
                      <span className="flex items-center gap-1.5"><Repeat className="w-3.5 h-3.5" /> {recurrenceLabel}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showRecurrence ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {showRecurrence && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="pt-2 space-y-3">
                            <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-surface-container">
                              {[{ id: 'none', label: 'No' }, { id: 'daily', label: 'Día' }, { id: 'weekly', label: 'Sem' }, { id: 'monthly', label: 'Mes' }, { id: 'yearly', label: 'Año' }].map((f) => (
                                <button key={f.id} onClick={() => { setRecurrenceFreq(f.id as any); markChanged(); if (f.id === 'monthly' && !selectedMonthDay) setSelectedMonthDay(new Date().getDate()); }}
                                  className={`py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${recurrenceFreq === f.id ? 'bg-primary text-primary-foreground' : 'text-on-surface-variant/60 hover:text-foreground'}`}>
                                  {f.label}
                                </button>
                              ))}
                            </div>
                            {recurrenceFreq === 'weekly' && (
                              <div className="flex justify-between gap-1">
                                {weekDayLabels.map(({ label, value }) => (
                                  <button key={value} onClick={() => toggleWeekDay(value)}
                                    className={`w-8 h-8 rounded-full text-[11px] font-bold transition-all ${selectedWeekDays.includes(value) ? 'bg-primary text-primary-foreground' : 'text-on-surface-variant/60 bg-surface-container'}`}>
                                    {label}
                                  </button>
                                ))}
                              </div>
                            )}
                            {recurrenceFreq === 'monthly' && (
                              <div className="grid grid-cols-7 gap-1">
                                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                  <button key={day} onClick={() => { setSelectedMonthDay(day); markChanged(); }}
                                    className={`py-1 rounded text-[10px] font-bold transition-all ${selectedMonthDay === day ? 'bg-primary text-primary-foreground' : 'text-on-surface-variant/60 bg-surface-container'}`}>
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

                  {/* Status */}
                  <div className="flex gap-1.5">
                    {['pending', 'done', 'skipped'].map((s) => (
                      <button key={s} onClick={() => { setStatus(s); markChanged(); }}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${status === s ? 'bg-[#A3E635] text-black' : 'text-white/40'}`}
                        style={{ background: status === s ? undefined : 'rgba(255,255,255,0.04)' }}>
                        {s === 'pending' ? 'Pendiente' : s === 'done' ? 'Hecha' : 'Pospuesta'}
                      </button>
                    ))}
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
