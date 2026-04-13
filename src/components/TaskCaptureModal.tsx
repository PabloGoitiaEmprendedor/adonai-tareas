import { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X, Square, Sparkles, Camera, Type } from 'lucide-react';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { parseVoiceTranscript } from '@/hooks/useVoiceParser';
import { useTasks } from '@/hooks/useTasks';
import { useTaskClassifier } from '@/hooks/useTaskClassifier';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { dispatchVoiceCaptureClosed, dispatchVoiceCaptureOpened } from '@/lib/voiceEvents';
import { AISphere } from './AISphere';

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
  const { classifyTask } = useTaskClassifier();

  const [phase, setPhase] = useState<'select' | 'input' | 'date' | 'saving' | 'image_date'>('select');
  const [title, setTitle] = useState('');
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

    // If triggered by a voice-specific UI action
    if (requestedVoiceOpenRef.current) {
      requestedVoiceOpenRef.current = false;
      return;
    }

    // Default to the selection screen
    setPhase('select');
    setTitle('');
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

    await runClassificationAndSave(parsedTitle, parsedDate, sourceForClassification || parsedTitle, rawTitle);
  }, [title, dueDate, sourceType]);

  useEffect(() => {
    if (transcript && !isRecording && sourceType === 'voice' && !voiceProcessedRef.current) {
      voiceProcessedRef.current = true;
      setTitle(transcript);
      setPhase('saving');
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
        await runClassificationAndSave(task.raw_text, date, task.raw_text, task.raw_text, true);
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
    await runClassificationAndSave(title, dueDate, classificationSource || title, classificationSource || title);
  };

  const runClassificationAndSave = async (taskTitle: string, date: string, classificationInput: string, originalTranscript: string, isImageLoop = false) => {
    if (isCurrentlySavingRef.current && !isImageLoop) return;
    if (!isImageLoop) {
      isCurrentlySavingRef.current = true;
      setPhase('saving');
      setSavingMessage('Analizando y creando tarea...');
    }

    const defaults = {
      refined_title: taskTitle,
      description: '',
      importance: false,
      urgency: false,
      priority: 'medium' as const,
      estimated_minutes: fallbackEstimatedMinutes || 30,
      context_id: null,
      goal_id: null,
      folder_id: null,
      recurrence_id: null,
      created_new_folder: null,
      due_date: null as string | null,
    };

    const classificationPromise = classifyTask(classificationInput, date);

    try {
      const result = await Promise.race([
        classificationPromise,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 7000)),
      ]);

      const cls = result || defaults;
      const finalTitle = cls.refined_title || taskTitle;
      const finalDescription = cls.description || '';
      const finalDate = (cls as any).due_date || date || format(new Date(), 'yyyy-MM-dd');

      const task = await createTask.mutateAsync({
        title: finalTitle,
        description: finalDescription || undefined,
        priority: cls.priority,
        urgency: cls.urgency,
        importance: cls.importance,
        source_type: sourceType,
        context_id: cls.context_id,
        goal_id: goalId || null,
        folder_id: folderId || cls.folder_id || null,
        recurrence_id: cls.recurrence_id || null,
        estimated_minutes: cls.estimated_minutes || defaults.estimated_minutes,
        due_date: finalDate,
        time_block_id: timeBlockId || null,
      });

      if (cls.created_new_folder) {
        toast.info(`📁 Carpeta "${cls.created_new_folder}" creada`);
      }

      if (sourceType === 'voice' && user) {
        await supabase.from('voice_inputs').insert({
          user_id: user.id,
          transcript: originalTranscript,
          parsed_task_id: task.id,
          confidence,
        });
      }

      toast.success('Tarea creada');
      if (!isImageLoop) handleClose();
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

  if (!open) return null;

  const waveformBars = [4, 8, 12, 14, 10, 16, 12, 14, 6, 10, 14, 8, 4];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-[60]" onClick={handleClose} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-[70] px-4 pb-8"
          >
            <div className="mx-auto max-w-[430px] glass-sheet rounded-2xl overflow-hidden shadow-2xl">
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
                        <div className="w-full text-center min-h-[60px]">
                          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
                            placeholder="¿Qué necesitas hacer?"
                            className="w-full text-xl text-center bg-transparent text-foreground placeholder:text-on-surface-variant/40 focus:outline-none border-none"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleTitleDone(); }} />
                        </div>
                      )}
                      <p className="text-[11px] text-on-surface-variant/60 text-center">
                        💡 Di lo que necesitas. La IA lo analiza y crea la tarea con un nombre claro.
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
                              <button onClick={() => handleTitleDone()} className="px-6 py-3 rounded-full primary-gradient text-primary-foreground font-bold text-sm">Crear</button>
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
                <input type="file" ref={fileInputRef} hidden accept="image/*" capture="environment" onChange={(e) => {
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
