import { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X, Square, Type, Check, Edit2, ChevronRight, Calendar as CalendarIcon, Link as LinkIcon, Target } from 'lucide-react';
import { AutoTextarea } from '@/components/ui/auto-textarea';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { parseVoiceTranscript } from '@/hooks/useVoiceParser';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { dispatchVoiceCaptureClosed, dispatchVoiceCaptureOpened } from '@/lib/voiceEvents';
import { AISphere } from './AISphere';
import { useGoals } from '@/hooks/useGoals';
import { CalendarDatePicker } from './ui/calendar-date-picker';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

interface TaskCaptureModalProps {
  open: boolean;
  onClose: () => void;
  goalId?: string | null;
  folderId?: string | null;
  timeBlockId?: string | null;
  initialMode?: 'text' | 'voice' | 'recurrence' | null;
  creationSource?: 'fab' | 'secondary' | 'mini_plus' | 'mini_voice';
}

export interface TaskCaptureModalHandle {
  openInVoiceMode: () => Promise<boolean>;
}

const TaskCaptureModal = forwardRef<TaskCaptureModalHandle, TaskCaptureModalProps>(({ open, onClose, goalId, folderId, timeBlockId, initialMode, creationSource }, ref) => {
  const { user } = useAuth();
  const { isRecording, isProcessing, transcript, confidence, voiceFallback, isSupported, startRecording, stopRecording, resetTranscript } = useVoiceCapture();
  const { createTask } = useTasks();
  const { goals } = useGoals();

  const [phase, setPhase] = useState<'select' | 'input' | 'planning' | 'saving' | 'image_date'>('select');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [reviewImportance, setReviewImportance] = useState(false);
  const [reviewUrgency, setReviewUrgency] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [sourceType, setSourceType] = useState<'voice' | 'text' | 'image'>('text');
  const [showTextInput, setShowTextInput] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleEditValue, setTitleEditValue] = useState('');
  const [classificationSource, setClassificationSource] = useState('');
  const [fallbackEstimatedMinutes, setFallbackEstimatedMinutes] = useState<number | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<{ raw_text: string; has_date: boolean; detected_date: string | null; assigned_date?: string }[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [savingMessage, setSavingMessage] = useState('Creando tarea...');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestedVoiceOpenRef = useRef(false);
  const mountedRef = useRef(false);
  const voiceProcessedRef = useRef(false);
  const isCurrentlySavingRef = useRef(false);

  const beginVoiceCapture = useCallback(async () => {
    voiceProcessedRef.current = false;
    setSourceType('voice');
    setShowTextInput(false);
    const started = await startRecording();
    if (!started) {
      resetTranscript();
      setSourceType('text');
      setShowTextInput(true);
    }
    return started;
  }, [resetTranscript, startRecording]);

  useImperativeHandle(ref, () => ({
    openInVoiceMode: async () => {
      requestedVoiceOpenRef.current = true;
      setPhase('input');
      setTitle('');
      setDueDate(format(new Date(), 'yyyy-MM-dd'));
      setClassificationSource('');
      setFallbackEstimatedMinutes(null);
      return beginVoiceCapture();
    },
  }), [beginVoiceCapture]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    if (open) {
      dispatchVoiceCaptureOpened();
      return;
    }

    dispatchVoiceCaptureClosed();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    setDueDate(format(new Date(), 'yyyy-MM-dd'));
    setClassificationSource('');
    setFallbackEstimatedMinutes(null);
    setSelectedGoalId(null);
    setReviewImportance(false);
    setReviewUrgency(false);
    setEditingTitle(false);

    if (requestedVoiceOpenRef.current) {
      requestedVoiceOpenRef.current = false;
      return;
    }

    if (initialMode === 'voice') {
      setPhase('input');
      setTitle('');
      setDescription('');
      setLink('');
      resetTranscript();
      beginVoiceCapture();
      return;
    }
    if (initialMode === 'text') {
      setPhase('input');
      setTitle('');
      setDescription('');
      setLink('');
      resetTranscript();
      setShowTextInput(true);
      setSourceType('text');
      return;
    }

    setPhase('select');
    setTitle('');
    setDescription('');
    setLink('');
    resetTranscript();
    setShowTextInput(true);
    setSourceType('text');
  }, [open, initialMode]);

  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    onClose();
  };

  const saveTaskQuick = async (opts: {
    title: string;
    description?: string;
    link?: string;
    dueDate: string;
    goalId: string | null;
    importance: boolean;
    urgency: boolean;
    isImageLoop?: boolean;
  }) => {
    const { title: taskTitle, description: taskDesc, link: taskLink, dueDate: date, goalId: chosenGoalId, importance, urgency, isImageLoop } = opts;

    if (isCurrentlySavingRef.current && !isImageLoop) return;
    if (!isImageLoop) {
      isCurrentlySavingRef.current = true;
      setPhase('saving');
      setSavingMessage('Creando tarea...');
    }

    const priority = importance && urgency ? 'high' : importance || urgency ? 'medium' : 'low';
    const finalDate = date || format(new Date(), 'yyyy-MM-dd');

    try {
      const task = await createTask.mutateAsync({
        title: taskTitle,
        priority,
        urgency,
        importance,
        source_type: sourceType,
        description: taskDesc || null,
        link: taskLink || null,
        context_id: null,
        goal_id: chosenGoalId || goalId || null,
        folder_id: folderId || null,
        recurrence_id: null,
        estimated_minutes: fallbackEstimatedMinutes || 30,
        due_date: finalDate,
        time_block_id: timeBlockId || null,
        creation_source: creationSource,
      });

      if (sourceType === 'voice' && user) {
        await supabase.from('voice_inputs').insert({
          user_id: user.id,
          transcript: classificationSource || taskTitle,
          parsed_task_id: task.id,
          confidence,
        });
      }

      if (!isImageLoop) {
        handleClose();
      }
      return task;
    } catch (err) {
      if (!isImageLoop) {
        toast.error('Error al crear tarea');
        setPhase('planning');
      }
      throw err;
    } finally {
      if (!isImageLoop) {
        isCurrentlySavingRef.current = false;
      }
    }
  };

  const handleTitleDone = useCallback(async (overrideTitle?: string) => {
    const rawTitle = (overrideTitle || title).trim();
    if (!rawTitle) { toast.error('Escribe o dicta una tarea'); return; }

    let parsedTitle = rawTitle;
    let parsedDate = dueDate;
    const sourceForClassification = rawTitle;

    if (sourceType === 'voice') {
      const parsed = parseVoiceTranscript(rawTitle);
      parsedTitle = parsed.title;
      if (parsed.dueDate) parsedDate = parsed.dueDate;
      setFallbackEstimatedMinutes(parsed.estimatedMinutes);
    }

    setTitle(parsedTitle);
    setDueDate(parsedDate);
    setClassificationSource(sourceForClassification);

    setPhase('planning');
  }, [title, dueDate, sourceType]);

  useEffect(() => {
    if (transcript && !isRecording && sourceType === 'voice' && !voiceProcessedRef.current) {
      voiceProcessedRef.current = true;
      setTitle(transcript);
      handleTitleDone(transcript);
    }
    
    if (transcript && !isRecording && sourceType === 'image' && phase === 'image_date' && !voiceProcessedRef.current) {
      voiceProcessedRef.current = true;
      const parsed = parseVoiceTranscript(transcript);
      handleImageDateAssignment(parsed.dueDate || format(new Date(), 'yyyy-MM-dd'));
      resetTranscript();
    }
  }, [transcript, isRecording, sourceType, handleTitleDone, phase, resetTranscript]);

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const max = 1200;

          if (width > height) {
            if (width > max) { height *= max / width; width = max; }
          } else {
            if (height > max) { width *= max / height; height = max; }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL(file.type));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageSelected = async (file: File) => {
    setSourceType('image');
    setPhase('saving');
    setSavingMessage('Leyendo tu agenda...');
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    try {
      const resizedBase64 = await resizeImage(file);
      const systemPrompt = `Eres Adonai, un asistente de productividad experto. Hoy es ${todayStr}. Tu trabajo es extraer tareas de la imagen proporcionada.`;
      const mimeType = file.type;

      const { data, error } = await supabase.functions.invoke('extract-tasks-from-image', {
        body: { imageBase64: resizedBase64.split(',')[1], mimeType, systemPrompt }
      });

      if (error || !data?.tasks) {
        toast.error('No se detectaron tareas');
        setPhase('input');
        return;
      }

      const tasks = data.tasks;
      const tasksWithoutDate = tasks.filter((t: any) => !t.has_date);

      if (tasksWithoutDate.length === 0) {
        await processAndSaveImageTasks(tasks);
      } else {
        setExtractedTasks(tasks);
        const firstIndex = tasks.findIndex((t: any) => !t.has_date);
        setCurrentTaskIndex(firstIndex);
        setPhase('image_date');
      }
    } catch (err) {
      toast.error('Error al procesar la imagen');
      setPhase('input');
    }
  };

  const handleImageDateAssignment = (date: string) => {
    const updatedTasks = [...extractedTasks];
    updatedTasks[currentTaskIndex].assigned_date = date;
    setExtractedTasks(updatedTasks);

    const nextIndex = updatedTasks.findIndex((t, idx) => idx > currentTaskIndex && !t.has_date);
    if (nextIndex !== -1) {
      setCurrentTaskIndex(nextIndex);
    } else {
      processAndSaveImageTasks(updatedTasks);
    }
  };

  const processAndSaveImageTasks = async (tasks: any[]) => {
    setPhase('saving');
    let createdCount = 0;
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const date = task.assigned_date || task.detected_date || format(new Date(), 'yyyy-MM-dd');
      
      try {
        await saveTaskQuick({
          title: task.raw_text,
          dueDate: date,
          goalId: null,
          importance: false,
          urgency: false,
          isImageLoop: true,
        });
        createdCount++;
      } catch (e) {
        console.error(e);
      }
    }
    toast.success(`${createdCount} tareas creadas 📸`);
    handleClose();
  };

  const handlePlanningDone = async () => {
    await saveTaskQuick({
      title: title.trim(),
      description: description.trim(),
      link: link.trim(),
      dueDate,
      goalId: selectedGoalId,
      importance: reviewImportance,
      urgency: reviewUrgency,
    });
  };

  if (!open) return null;

  const waveformBars = [4, 8, 12, 14, 10, 16, 12, 14, 6, 10, 14, 8, 4];

  const C = {
    bg: '#F2F2F2',
    surface: 'rgba(1, 38, 14, 0.05)',
    border: 'rgba(1, 38, 14, 0.1)',
    text: '#01260E',
    muted: 'rgba(1, 38, 14, 0.5)',
    accent: '#21D904',
    accentBg: 'rgba(33, 217, 4, 0.1)',
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" onClick={handleClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="relative mx-auto w-full max-w-[360px] max-h-[90vh] overflow-y-auto pointer-events-auto shadow-2xl"
                 style={{
                   background: C.bg, borderRadius: 24,
                   border: `1px solid ${C.border}`,
                 }}>
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-on-surface/5 flex items-center justify-center transition-colors hover:bg-on-surface/10"
                style={{ color: C.muted }}
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-6 pt-8 flex flex-col gap-6">
                <AnimatePresence mode="wait">
                  {phase === 'select' && (
                    <motion.div 
                      key="select" 
                      initial={{ opacity: 0, scale: 0.95 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      exit={{ opacity: 0, scale: 0.95 }} 
                      className="w-full flex flex-col items-center gap-8"
                    >
                      <div className="text-center space-y-2">
                        <h2 className="text-2xl font-black tracking-tight" style={{ color: C.text }}>Añadir Tarea</h2>
                        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: C.muted }}>¿Cómo prefieres empezar?</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 w-full">
                        <button
                          onClick={() => { setPhase('input'); setShowTextInput(true); setSourceType('text'); }}
                          className="group flex flex-col items-center gap-4 p-5 rounded-[28px] transition-all hover:bg-on-surface/5 active:scale-[0.96] border border-outline-variant"
                          style={{ background: C.surface }}
                        >
                          <div className="w-16 h-16 rounded-[22px] flex items-center justify-center bg-on-surface/5">
                            <Type className="w-7 h-7 text-foreground" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: C.muted }}>Escribir</span>
                        </button>

                        <button
                          onClick={() => { setPhase('input'); beginVoiceCapture(); }}
                          className="group flex flex-col items-center gap-4 p-5 rounded-[28px] transition-all active:scale-[0.96] border border-primary/20"
                          style={{ background: C.accentBg }}
                        >
                          <div className="w-16 h-16 rounded-[22px] flex items-center justify-center bg-primary/20">
                            <Mic className="w-7 h-7 text-primary" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary">Por Voz</span>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {phase === 'input' && (
                    <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col gap-6">
                      {(isRecording || isProcessing) && (
                        <div className="w-full flex flex-col items-center gap-6 py-8">
                          <div className="flex items-center justify-center gap-1.5 h-20 w-full">
                            {isProcessing ? (
                              <div className="flex gap-2 items-center">
                                {[0, 1, 2].map((i) => (
                                  <motion.div
                                    key={i}
                                    className="w-3 h-3 rounded-full bg-primary"
                                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                                  />
                                ))}
                              </div>
                            ) : (
                              waveformBars.map((h, i) => (
                                <motion.div key={i} className="w-1.5 rounded-full bg-primary" animate={{ height: [h * 2.5, h * 5, h * 2.5] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.05 }} />
                              ))
                            )}
                          </div>
                          <div className="w-full text-center px-4">
                            <p className="text-lg font-bold leading-tight" style={{ color: C.text }}>
                              {isProcessing ? "Analizando tu voz..." : transcript || "Escuchando..."}
                              {!isProcessing && isRecording && <span className="inline-block w-1 h-5 ml-1 animate-pulse bg-primary" />}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {!isRecording && !isProcessing && (
                        <div className="w-full space-y-5">
                          <div className="space-y-1">
                             <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tarea</label>
                             <input 
                              autoFocus 
                              value={title} 
                              onChange={(e) => setTitle(e.target.value)}
                              placeholder="¿Qué necesitas hacer?"
                              className="w-full text-xl font-black bg-surface border border-outline-variant rounded-[20px] px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/30"
                              onKeyDown={(e) => { 
                                if (e.key === 'Enter') handleTitleDone();
                              }} 
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Descripción (opcional)</label>
                            <AutoTextarea
                              value={description} 
                              onChange={(e) => setDescription(e.target.value)}
                              placeholder="Detalles adicionales..."
                              className="w-full text-sm bg-surface border border-outline-variant rounded-[20px] p-5 focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px] placeholder:text-muted-foreground/30"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Link (opcional)</label>
                            <div className="relative">
                              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <input
                                type="url"
                                value={link} 
                                onChange={(e) => setLink(e.target.value)}
                                placeholder="https://..."
                                className="w-full text-sm bg-surface border border-outline-variant rounded-[20px] pl-11 pr-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/30"
                              />
                            </div>
                          </div>

                          <button
                            onClick={() => handleTitleDone()}
                            disabled={!title.trim()}
                            className="w-full h-16 bg-primary text-primary-foreground rounded-[24px] font-black text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            Continuar
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      )}

                      {isRecording && (
                        <button onClick={() => stopRecording()} className="w-20 h-20 rounded-full bg-primary mx-auto flex items-center justify-center shadow-2xl shadow-primary/30 active:scale-90 transition-transform">
                           <Square className="w-8 h-8 text-primary-foreground fill-primary-foreground" />
                        </button>
                      )}
                    </motion.div>
                  )}

                  {phase === 'planning' && (
                    <motion.div key="planning" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full flex flex-col gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-surface border border-outline-variant rounded-2xl">
                          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <Check className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">Confirmar Tarea</p>
                            <p className="text-sm font-bold truncate">{title}</p>
                          </div>
                          <button onClick={() => setPhase('input')} className="ml-auto p-2 hover:bg-on-surface/10 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </div>

                        <CalendarDatePicker 
                          date={dueDate} 
                          onSelect={(d) => setDueDate(d)} 
                          label="Programación"
                        />

                        {goals.filter(g => g.active).length > 0 && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Meta Asociada</label>
                            <div className="flex flex-wrap gap-2">
                              {goals.filter(g => g.active).map(goal => (
                                <button
                                  key={goal.id}
                                  onClick={() => setSelectedGoalId(selectedGoalId === goal.id ? null : goal.id)}
                                  className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center gap-2",
                                    selectedGoalId === goal.id 
                                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                                      : "bg-surface text-muted-foreground border-outline-variant hover:bg-on-surface/5"
                                  )}
                                >
                                  <Target className="w-3 h-3" />
                                  {goal.title}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Prioridad (Matriz)</label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => setReviewImportance(!reviewImportance)}
                              className={cn(
                                "flex flex-col items-center justify-center gap-1 h-16 rounded-[22px] font-black uppercase tracking-widest text-[9px] transition-all border",
                                  reviewImportance 
                                    ? "bg-amber-500/20 text-amber-600 border-amber-500/50 shadow-lg shadow-amber-500/10" 
                                    : "bg-surface text-muted-foreground border-outline-variant hover:bg-on-surface/5"
                              )}
                            >
                              Importante
                            </button>
                            <button
                              onClick={() => setReviewUrgency(!reviewUrgency)}
                              className={cn(
                                "flex flex-col items-center justify-center gap-1 h-16 rounded-[22px] font-black uppercase tracking-widest text-[9px] transition-all border",
                                reviewUrgency 
                                  ? "bg-red-500/20 text-red-600 border-red-500/50 shadow-lg shadow-red-500/10" 
                                  : "bg-surface text-muted-foreground border-outline-variant hover:bg-on-surface/5"
                              )}
                            >
                              Urgente
                            </button>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handlePlanningDone}
                        disabled={!title.trim()}
                        className="w-full h-16 bg-primary text-primary-foreground rounded-[24px] font-black text-sm shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 mt-4"
                      >
                        <Check className="w-6 h-6" strokeWidth={3} />
                        GUARDAR TAREA
                      </button>
                    </motion.div>
                  )}

                  {phase === 'saving' && (
                    <motion.div key="saving" className="flex flex-col items-center justify-center py-12 w-full min-h-[350px] gap-8">
                      <div className="relative flex items-center justify-center w-full h-48">
                        <AISphere />
                      </div>
                      <div className="text-center space-y-4">
                        <h3 className="text-2xl font-black text-foreground tracking-tighter">{savingMessage}</h3>
                        <div className="flex flex-col items-center gap-1">
                          <div className="h-0.5 w-10 bg-primary rounded-full animate-pulse" />
                          <p className="text-[8px] font-black uppercase tracking-[0.5em] text-muted-foreground">Neural Sync...</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

TaskCaptureModal.displayName = 'TaskCaptureModal';

export default TaskCaptureModal;
