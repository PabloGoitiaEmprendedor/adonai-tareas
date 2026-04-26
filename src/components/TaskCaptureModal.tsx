import { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X, Square, Camera, Type, Check } from 'lucide-react';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { parseVoiceTranscript } from '@/hooks/useVoiceParser';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { dispatchVoiceCaptureClosed, dispatchVoiceCaptureOpened } from '@/lib/voiceEvents';
import { AISphere } from './AISphere';
import { useGoals } from '@/hooks/useGoals';

interface TaskCaptureModalProps {
  open: boolean;
  onClose: () => void;
  goalId?: string | null;
  folderId?: string | null;
  timeBlockId?: string | null;
}


export interface TaskCaptureModalHandle {
  openInVoiceMode: () => boolean;
}

const TaskCaptureModal = forwardRef<TaskCaptureModalHandle, TaskCaptureModalProps>(({ open, onClose, goalId, folderId, timeBlockId }, ref) => {
  const { user } = useAuth();
  const { isRecording, transcript, confidence, voiceFallback, isSupported, startRecording, stopRecording, resetTranscript } = useVoiceCapture();
  const { createTask } = useTasks();
  const { goals } = useGoals();

  const [phase, setPhase] = useState<'select' | 'input' | 'date' | 'review' | 'saving' | 'image_date'>('select');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [reviewImportance, setReviewImportance] = useState(false);
  const [reviewUrgency, setReviewUrgency] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [sourceType, setSourceType] = useState<'voice' | 'text' | 'image'>('text');
  const [showTextInput, setShowTextInput] = useState(true);
  const [classificationSource, setClassificationSource] = useState('');
  const [fallbackEstimatedMinutes, setFallbackEstimatedMinutes] = useState<number | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<{ raw_text: string; has_date: boolean; detected_date: string | null; assigned_date?: string }[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [savingMessage, setSavingMessage] = useState('Analizando y creando tarea...');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestedVoiceOpenRef = useRef(false);
  const mountedRef = useRef(false);
  const voiceProcessedRef = useRef(false);
  const isCurrentlySavingRef = useRef(false);

  const beginVoiceCapture = useCallback(() => {
    voiceProcessedRef.current = false;
    const started = startRecording();
    if (started) {
      setSourceType('voice');
      setShowTextInput(false);
    } else {
      resetTranscript();
      setSourceType('text');
      setShowTextInput(true);
    }
    return started;
  }, [resetTranscript, startRecording]);

  useImperativeHandle(ref, () => ({
    openInVoiceMode: () => {
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

    // If triggered by a voice-specific UI action
    if (requestedVoiceOpenRef.current) {
      requestedVoiceOpenRef.current = false;
      return;
    }

    // Default to the selection screen
    setPhase('select');
    setTitle('');
    setDescription('');
    resetTranscript();
    setShowTextInput(true);
    setSourceType('text');
  }, [open, resetTranscript]);

  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    onClose();
  };

  const handleTitleDone = useCallback(async (overrideTitle?: string) => {
    const rawTitle = (overrideTitle || title).trim();
    if (!rawTitle) { toast.error('Escribe o dicta una tarea'); return; }

    let parsedTitle = rawTitle;
    let parsedDescription = description;
    let parsedDate = dueDate;
    let parsedEstimatedMinutes: number | null = null;
    const sourceForClassification = rawTitle;

    if (sourceType === 'voice') {
      const parsed = parseVoiceTranscript(rawTitle);
      parsedTitle = parsed.title;
      if (parsed.dueDate) parsedDate = parsed.dueDate;
      parsedEstimatedMinutes = parsed.estimatedMinutes;
    }

    setTitle(parsedTitle);
    setDueDate(parsedDate);
    setClassificationSource(sourceForClassification);
    setFallbackEstimatedMinutes(parsedEstimatedMinutes);

    if (sourceType === 'voice') {
      const parsed = parseVoiceTranscript(rawTitle);
      if (!parsed.dueDate) {
        setPhase('date');
        return;
      }
    }

    // Skip AI — go directly to the quick review (goal + Eisenhower) screen
    setPhase('review');
  }, [title, dueDate, sourceType]);

  useEffect(() => {
    if (transcript && !isRecording && sourceType === 'voice' && !voiceProcessedRef.current) {
      voiceProcessedRef.current = true;
      setTitle(transcript);
      // Don't jump to "saving" — we no longer call the AI here.
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
      const systemPrompt = `Eres Adonai, un asistente de productividad experto. Hoy es ${todayStr}.

IMPORTANTE: Si el usuario dicta algo que parece contener varias tareas separadas, intenta consolidarlas en la tarea más importante o enfócate en la primera. Solo puedes devolver UNA tarea por cada llamada. No intentes meter una lista en el título.

Tu trabajo es:`;
      const mimeType = file.type;

      const { data, error } = await supabase.functions.invoke('extract-tasks-from-image', {
        body: { imageBase64: resizedBase64.split(',')[1], mimeType, systemPrompt }
      });

      if (error) {
        console.error("Functions invoke error:", error);
        toast.error(`Error de conexión: ${error.message || 'Desconocido'}`);
        setPhase('input');
        return;
      }

      if (data?.error) {
        console.error("Edge function returned error:", data.error, data.raw_content);
        if (data.error === "parse_error") {
          toast.error('La IA confundió el formato. Intenta con una letra más clara o menos texto.');
        } else {
          toast.error(`Error interno: ${data.error}`);
        }
        setPhase('input');
        return;
      }

      if (!data.tasks || data.tasks.length === 0) {
        toast.error('No se detectaron tareas escritas. Intenta con mejor luz o toma más cerca.');
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
      console.error("Image process error:", err);
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
      setSavingMessage(`Creando tarea ${i + 1} de ${tasks.length}...`);
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
        console.error("Error creating task from image:", e);
      }
    }

    if (user) {
      await (supabase as any).from('image_captures').insert({
        user_id: user.id,
        tasks_extracted: tasks.length,
        tasks_created: createdCount
      });
    }

    toast.success(`${createdCount} tareas creadas desde tu agenda 📸`);
    handleClose();
  };

  const handleDateDone = async () => {
    setPhase('review');
  };

  // Fast, no-AI save. Uses exactly what the user typed/picked.
  const saveTaskQuick = async (opts: {
    title: string;
    description?: string;
    dueDate: string;
    goalId: string | null;
    importance: boolean;
    urgency: boolean;
    isImageLoop?: boolean;
  }) => {
    const { title: taskTitle, description: taskDesc, dueDate: date, goalId: chosenGoalId, importance, urgency, isImageLoop } = opts;

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
        context_id: null,
        goal_id: chosenGoalId || goalId || null,
        folder_id: folderId || null,
        recurrence_id: null,
        estimated_minutes: fallbackEstimatedMinutes || 30,
        due_date: finalDate,
        time_block_id: timeBlockId || null,
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
        toast.success('Tarea creada');
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

  const handleReviewDone = async () => {
    await saveTaskQuick({
      title: title.trim(),
      description: description.trim(),
      dueDate,
      goalId: selectedGoalId,
      importance: reviewImportance,
      urgency: reviewUrgency,
    });
  };

  if (!open) return null;

  const waveformBars = [4, 8, 12, 14, 10, 16, 12, 14, 6, 10, 14, 8, 4];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-[60]" onClick={handleClose} />
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
              <div className="p-6 flex flex-col items-center gap-6">
                <button id="tutorial-close-capture" onClick={handleClose} className="absolute top-4 right-4 text-on-surface-variant"><X className="w-5 h-5" /></button>

                <AnimatePresence mode="wait">
                  {phase === 'select' && (
                    <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col items-center gap-6 pb-2">
                      <div className="text-center space-y-1">
                        <h2 className="text-xl font-bold text-foreground">Añadir Tarea</h2>
                        <p className="text-sm text-on-surface-variant">¿Cómo prefieres crearla?</p>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3 w-full">
                        <button id="tutorial-write-button" onClick={() => { setPhase('input'); setShowTextInput(true); setSourceType('text'); }} 
                          className="flex flex-col items-center justify-center gap-3 p-4 bg-surface-container-high rounded-2xl hover:bg-surface-container-highest transition-colors">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Type className="w-6 h-6 text-primary" />
                          </div>
                          <span className="text-xs font-bold text-foreground">Escribir</span>
                        </button>
                        
                        <button id="tutorial-voice-button" onClick={() => { setPhase('input'); beginVoiceCapture(); }}
                          className="flex flex-col items-center justify-center gap-3 p-4 bg-surface-container-high rounded-2xl hover:bg-surface-container-highest transition-colors">
                          <div className="w-12 h-12 rounded-full primary-gradient flex items-center justify-center shadow-lg shadow-primary/20">
                            <Mic className="w-6 h-6 text-primary-foreground" />
                          </div>
                          <span className="text-xs font-bold text-foreground">Voz</span>
                        </button>
                        
                        <button id="tutorial-photo-button" onClick={() => fileInputRef.current?.click()}
                          className="flex flex-col items-center justify-center gap-3 p-4 bg-surface-container-high rounded-2xl hover:bg-surface-container-highest transition-colors">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Camera className="w-6 h-6 text-primary" />
                          </div>
                          <span className="text-xs font-bold text-foreground">Foto</span>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {phase === 'input' && (
                    <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col items-center gap-6">
                      {isRecording && (
                        <div className="flex items-center justify-center gap-1.5 h-16 w-full">
                          {waveformBars.map((h, i) => (
                            <motion.div key={i} className="w-1 rounded-full primary-gradient" animate={{ height: [h * 2, h * 4, h * 2] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.05 }} />
                          ))}
                        </div>
                      )}
                      {isRecording && transcript && (
                        <p className="text-sm text-on-surface-variant/60 text-center animate-pulse max-w-[90%] truncate">
                          {transcript}
                        </p>
                      )}
                      {!isRecording && showTextInput && (
                        <div className="w-full space-y-4">
                          <div className="w-full text-center min-h-[40px]">
                            <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/40 mb-1">Título</label>
                            <input 
                              autoFocus 
                              value={title} 
                              onChange={(e) => setTitle(e.target.value)}
                              placeholder="¿Qué necesitas hacer?"
                              className="w-full text-xl text-center bg-transparent text-foreground placeholder:text-on-surface-variant/40 focus:outline-none border-none font-bold"
                              onKeyDown={(e) => { 
                                if (e.key === 'Enter') {
                                  // If no description, save immediately. If there is description, maybe move focus?
                                  // For now, let's follow user: if no description, save.
                                  if (!description.trim()) {
                                    handleTitleDone();
                                  }
                                } 
                              }} 
                            />
                          </div>

                          <div className="w-full text-center">
                            <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/40 mb-1">Descripción</label>
                            <textarea 
                              value={description} 
                              onChange={(e) => setDescription(e.target.value)}
                              placeholder="Añade detalles si lo necesitas..."
                              className="w-full text-sm text-center bg-surface-container-high/50 rounded-xl p-3 text-foreground placeholder:text-on-surface-variant/40 focus:outline-none border-none resize-none min-h-[80px]"
                            />
                          </div>

                          {goals.filter(g => g.active).length > 0 && (
                            <div className="w-full space-y-2">
                              <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/40 text-center">Meta</label>
                              <div className="flex flex-wrap justify-center gap-2">
                                {goals.filter(g => g.active).map((goal) => (
                                  <button 
                                    key={goal.id} 
                                    onClick={() => setSelectedGoalId(goal.id === selectedGoalId ? null : goal.id)}
                                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                                      selectedGoalId === goal.id 
                                        ? 'bg-primary text-primary-foreground shadow-lg' 
                                        : 'bg-surface-container-high text-on-surface-variant/60 hover:bg-surface-container-highest'
                                    }`}
                                  >
                                    {goal.title}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <p className="text-[11px] text-on-surface-variant/60 text-center">
                        Escribe o dicta tu tarea. El Enter en descripción no guarda la tarea.
                      </p>
                      <div className="flex gap-3">
                        {!showTextInput && (
                          <button onClick={() => setShowTextInput(true)} className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface-variant text-sm">Escribir</button>
                        )}
                      </div>
                      <div className="flex gap-4 items-center">
                        {isRecording ? (
                          <button onClick={() => stopRecording()} className="w-16 h-16 rounded-full primary-gradient flex items-center justify-center shadow-lg shadow-primary/20">
                            <Square className="w-6 h-6 text-primary-foreground" fill="currentColor" />
                          </button>
                        ) : (
                          <>
                            {isSupported && !voiceFallback && (
                              <button onClick={beginVoiceCapture} className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center">
                                <Mic className="w-6 h-6 text-foreground" />
                              </button>
                            )}
                            <button onClick={() => fileInputRef.current?.click()} className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center">
                              <Camera className="w-6 h-6 text-foreground" />
                            </button>
                            {(title || showTextInput) && (
                              <button onClick={() => handleTitleDone()} className="px-6 py-3 rounded-full primary-gradient text-primary-foreground font-bold text-sm">Guardar</button>
                            )}
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {phase === 'date' && (
                    <motion.div key="date" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="w-full space-y-6">
                      <div className="text-center">
                        <span className="text-xs uppercase tracking-[0.2em] font-bold text-on-surface-variant">Fecha</span>
                        <h2 className="text-lg font-medium text-foreground mt-1">¿Para qué día es esta tarea?</h2>
                      </div>
                      <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                        className="w-full bg-surface-container-high rounded-lg p-4 text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary" />
                      <div className="flex gap-2">
                        <button onClick={() => { setDueDate(format(new Date(), 'yyyy-MM-dd')); handleDateDone(); }}
                          className="flex-1 py-3 rounded-lg bg-primary/10 text-primary font-semibold text-sm">Hoy</button>
                        <button onClick={() => { setDueDate(format(new Date(Date.now() + 86400000), 'yyyy-MM-dd')); handleDateDone(); }}
                          className="flex-1 py-3 rounded-lg bg-surface-container-high text-foreground font-semibold text-sm">Mañana</button>
                        <button onClick={handleDateDone}
                          className="flex-1 py-3 rounded-lg bg-surface-container-high text-foreground font-semibold text-sm">Usar fecha</button>
                      </div>
                    </motion.div>
                  )}

                  {phase === 'review' && (
                    <motion.div key="review" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="w-full space-y-5">
                      <div className="text-center">
                        <h2 className="text-lg font-bold text-foreground mt-1 truncate px-2">"{title}"</h2>
                      </div>

                      {/* Importance + Urgency — clear, child-simple toggles */}
                      <div className="space-y-2">
                        <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant text-center">Prioridad</p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setReviewImportance(!reviewImportance)}
                            className={`p-3 rounded-2xl text-sm font-bold border-2 transition-all flex flex-col items-center gap-1 ${reviewImportance ? 'bg-primary/15 text-foreground border-primary' : 'bg-surface-container text-on-surface-variant border-outline-variant'}`}
                          >
                            {reviewImportance && <Check className="w-4 h-4 text-primary" />}
                            <span>Importante</span>
                          </button>
                          <button
                            onClick={() => setReviewUrgency(!reviewUrgency)}
                            className={`p-3 rounded-2xl text-sm font-bold border-2 transition-all flex flex-col items-center gap-1 ${reviewUrgency ? 'bg-orange-500/15 text-foreground border-orange-500' : 'bg-surface-container text-on-surface-variant border-outline-variant'}`}
                          >
                            {reviewUrgency && <Check className="w-4 h-4 text-orange-500" />}
                            <span>Urgente</span>
                          </button>
                        </div>
                      </div>

                      {/* Goal picker — optional */}
                      {goals.filter(g => g.active).length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant text-center">Meta</p>
                          <div className="flex flex-wrap gap-2 justify-center max-h-[120px] overflow-y-auto">
                            <button
                              onClick={() => setSelectedGoalId(null)}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${selectedGoalId === null ? 'bg-foreground text-background' : 'bg-surface-container text-on-surface-variant border border-outline-variant'}`}
                            >
                              Ninguna
                            </button>
                            {goals.filter(g => g.active).map(g => (
                              <button
                                key={g.id}
                                onClick={() => setSelectedGoalId(g.id)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${selectedGoalId === g.id ? 'bg-foreground text-background' : 'bg-surface-container text-on-surface-variant border border-outline-variant'}`}
                              >
                                {g.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={handleReviewDone}
                        className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-black text-sm shadow-md hover:opacity-90 transition active:scale-[0.98]"
                      >
                        Crear tarea
                      </button>
                    </motion.div>
                  )}

                  {phase === 'image_date' && extractedTasks[currentTaskIndex] && (
                    <motion.div key="image_date" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="w-full space-y-6">
                      <div className="text-center">
                        <span className="text-xs uppercase tracking-[0.2em] font-bold text-on-surface-variant">
                          Tarea {extractedTasks.filter((t, idx) => idx <= currentTaskIndex && !t.has_date).length} de {extractedTasks.filter(t => !t.has_date).length}
                        </span>
                        <h2 className="text-lg font-medium text-foreground mt-1">"{extractedTasks[currentTaskIndex].raw_text}"</h2>
                        <p className="text-sm text-on-surface-variant mt-1 text-pretty px-4 italic leading-tight">Extraída de tu agenda</p>
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="flex gap-2">
                          <button onClick={() => handleImageDateAssignment(format(new Date(), 'yyyy-MM-dd'))}
                            className="flex-1 py-3 rounded-lg bg-primary/10 text-primary font-semibold text-sm">Hoy</button>
                          <button onClick={() => handleImageDateAssignment(format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'))}
                            className="flex-1 py-3 rounded-lg bg-surface-container-high text-foreground font-semibold text-sm">Mañana</button>
                        </div>
                        
                        <div className="relative">
                          <input 
                            type="text"
                            placeholder="Escribe o di la fecha..."
                            className="w-full bg-surface-container-high rounded-lg p-4 text-foreground pr-12 focus:outline-none focus:ring-1 focus:ring-primary"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const target = e.target as HTMLInputElement;
                                const parsed = parseVoiceTranscript(target.value);
                                handleImageDateAssignment(parsed.dueDate || format(new Date(), 'yyyy-MM-dd'));
                              }
                            }}
                          />
                          <button 
                            onClick={() => {
                              if (isRecording) {
                                stopRecording();
                              } else {
                                beginVoiceCapture();
                              }
                            }}
                            className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full ${isRecording ? 'bg-primary text-white animate-pulse' : 'text-on-surface-variant'}`}
                          >
                            <Mic className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                    {phase === 'saving' && (
                      <motion.div 
                        key="saving" 
                        initial={{ opacity: 0, scale: 0.9 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        className="flex flex-col items-center justify-center py-12 w-full min-h-[350px] space-y-8"
                      >
                        <div className="relative flex items-center justify-center w-full h-48">
                          <div className="absolute inset-0 flex items-center justify-center scale-150">
                            <AISphere />
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-center space-y-4 pt-4 relative z-10">
                          <motion.p 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-2xl font-black text-foreground tracking-tighter text-center max-w-[280px] leading-[0.9]"
                          >
                            {savingMessage}
                          </motion.p>
                          <div className="flex flex-col items-center gap-2">
                             <div className="h-[2px] w-8 bg-primary rounded-full" />
                             <p className="text-[9px] text-on-surface-variant/40 font-bold uppercase tracking-[0.4em]">
                              Adonai Nano Processing
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                </AnimatePresence>
                
                {/* Global File Input */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  hidden 
                  accept="image/*" 
                  capture={/Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "environment" : undefined}
                  onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageSelected(file);
                }} />
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
