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

  const [phase, setPhase] = useState<'input' | 'planning' | 'saving' | 'image_date'>('input');
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
    setTitle('');
    setDescription('');
    setLink('');
    resetTranscript();

    if (requestedVoiceOpenRef.current) {
      requestedVoiceOpenRef.current = false;
      setPhase('input');
      setSourceType('voice');
      return;
    }

    if (initialMode === 'voice') {
      setPhase('input');
      setSourceType('voice');
      beginVoiceCapture();
      return;
    }

    // Default to input text mode
    setPhase('input');
    setSourceType('text');
    setShowTextInput(true);
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
        setPhase('input');
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

  const handleFinalSave = async () => {
    if (!title.trim()) { toast.error('Escribe una tarea'); return; }
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
    surface: 'rgba(0, 0, 0, 0.03)',
    border: 'rgba(0, 0, 0, 0.05)',
    text: '#0D0D0D',
    muted: '#8C8C8C',
    accent: '#262626',
    primary: '#0D0D0D',
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]" onClick={handleClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="relative mx-auto w-full max-w-[400px] max-h-[90vh] overflow-y-auto pointer-events-auto shadow-2xl"
                 style={{
                   background: C.bg, borderRadius: 32,
                   border: `1px solid ${C.border}`,
                 }}>
              <button
                onClick={handleClose}
                className="absolute top-6 right-6 z-10 w-8 h-8 rounded-full bg-black/5 flex items-center justify-center transition-colors hover:bg-black/10"
                style={{ color: C.muted }}
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-8 flex flex-col gap-8">
                <AnimatePresence mode="wait">
                  {phase === 'input' && (
                    <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col gap-8">
                      {(isRecording || isProcessing) && (
                        <div className="w-full flex flex-col items-center gap-6 py-4">
                          <div className="flex items-center justify-center gap-1.5 h-16 w-full">
                            {isProcessing ? (
                              <div className="flex gap-2 items-center">
                                {[0, 1, 2].map((i) => (
                                  <motion.div
                                    key={i}
                                    className="w-2 h-2 rounded-full bg-foreground"
                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                                  />
                                ))}
                              </div>
                            ) : (
                              waveformBars.map((h, i) => (
                                <motion.div key={i} className="w-1 rounded-full bg-foreground" animate={{ height: [h * 2, h * 4, h * 2] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.05 }} />
                              ))
                            )}
                          </div>
                          <p className="text-sm font-black text-center px-4 leading-tight">
                            {isProcessing ? "Procesando..." : transcript || "Escuchando..."}
                          </p>
                        </div>
                      )}
                      
                      {!isRecording && !isProcessing && (
                        <div className="w-full space-y-6">
                          <div className="space-y-1">
                             <input 
                              autoFocus 
                              value={title} 
                              onChange={(e) => setTitle(e.target.value)}
                              placeholder="¿Qué quieres lograr?"
                              className="w-full text-2xl font-black bg-transparent border-none p-0 focus:ring-0 placeholder:text-black/10"
                            />
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] font-black uppercase tracking-widest text-black/30">Fecha</p>
                              <div className="flex gap-1">
                                <button 
                                  onClick={() => setDueDate(format(new Date(), 'yyyy-MM-dd'))}
                                  className={cn("px-3 py-1 rounded-lg text-[10px] font-black transition-all", dueDate === format(new Date(), 'yyyy-MM-dd') ? "bg-black text-white" : "bg-black/5 text-black/40 hover:bg-black/10")}
                                >
                                  Hoy
                                </button>
                                <button 
                                  onClick={() => setDueDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'))}
                                  className={cn("px-3 py-1 rounded-lg text-[10px] font-black transition-all", dueDate === format(addDays(new Date(), 1), 'yyyy-MM-dd') ? "bg-black text-white" : "bg-black/5 text-black/40 hover:bg-black/10")}
                                >
                                  Mañana
                                </button>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className="p-1 rounded-lg bg-black/5 text-black/40 hover:bg-black/10">
                                      <CalendarIcon className="w-4 h-4" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0 border-none shadow-2xl" align="start">
                                    <CalendarDatePicker 
                                      date={dueDate} 
                                      onSelect={(d) => setDueDate(d)} 
                                      label=""
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>

                            {goals.filter(g => g.active).length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-black/30">Meta</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {goals.filter(g => g.active).map(goal => (
                                    <button
                                      key={goal.id}
                                      onClick={() => setSelectedGoalId(selectedGoalId === goal.id ? null : goal.id)}
                                      className={cn(
                                        "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border",
                                        selectedGoalId === goal.id 
                                          ? "bg-black text-white border-black" 
                                          : "bg-black/5 text-black/40 border-transparent hover:bg-black/10"
                                      )}
                                    >
                                      {goal.title}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="space-y-2">
                              <p className="text-[10px] font-black uppercase tracking-widest text-black/30">Prioridad</p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setReviewImportance(!reviewImportance)}
                                  className={cn(
                                    "flex-1 h-10 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all border",
                                      reviewImportance ? "bg-black text-white border-black" : "bg-black/5 text-black/40 border-transparent"
                                  )}
                                >
                                  Importante
                                </button>
                                <button
                                  onClick={() => setReviewUrgency(!reviewUrgency)}
                                  className={cn(
                                    "flex-1 h-10 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all border",
                                    reviewUrgency ? "bg-black text-white border-black" : "bg-black/5 text-black/40 border-transparent"
                                  )}
                                >
                                  Urgente
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSourceType(sourceType === 'voice' ? 'text' : 'voice');
                                if (sourceType === 'text') beginVoiceCapture();
                              }}
                              className="w-14 h-14 rounded-2xl bg-black/5 flex items-center justify-center text-black/30 hover:bg-black/10 transition-all"
                            >
                              {sourceType === 'voice' ? <Type className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                            </button>
                            <button
                              onClick={handleFinalSave}
                              disabled={!title.trim()}
                              className="flex-1 h-14 bg-black text-white rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all disabled:opacity-20"
                            >
                              CREAR TAREA
                            </button>
                          </div>
                        </div>
                      )}

                      {isRecording && (
                        <button onClick={() => stopRecording()} className="w-16 h-16 rounded-full bg-foreground mx-auto flex items-center justify-center shadow-xl active:scale-90 transition-transform">
                           <Square className="w-6 h-6 text-background fill-background" />
                        </button>
                      )}
                    </motion.div>
                  )}

                  {phase === 'saving' && (
                    <motion.div key="saving" className="flex flex-col items-center justify-center py-12 w-full min-h-[300px] gap-8">
                      <AISphere />
                      <div className="text-center space-y-2">
                        <h3 className="text-xl font-black">{savingMessage}</h3>
                        <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-20 animate-pulse">Neural Sync</p>
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
