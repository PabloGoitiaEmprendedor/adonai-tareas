import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X, Square, Sparkles } from 'lucide-react';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { parseVoiceTranscript } from '@/hooks/useVoiceParser';
import { useTasks } from '@/hooks/useTasks';
import { useTaskClassifier } from '@/hooks/useTaskClassifier';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { dispatchVoiceCaptureClosed, dispatchVoiceCaptureOpened } from '@/lib/voiceEvents';

interface TaskCaptureModalProps {
  open: boolean;
  onClose: () => void;
  goalId?: string | null;
  folderId?: string | null;
}


export interface TaskCaptureModalHandle {
  openInVoiceMode: () => boolean;
}

const TaskCaptureModal = forwardRef<TaskCaptureModalHandle, TaskCaptureModalProps>(({ open, onClose, goalId, folderId }, ref) => {
  const { user } = useAuth();
  const { isRecording, transcript, confidence, voiceFallback, isSupported, startRecording, stopRecording, resetTranscript } = useVoiceCapture();
  const { createTask } = useTasks();
  const { classifyTask } = useTaskClassifier();

  const [phase, setPhase] = useState<'input' | 'date' | 'saving'>('input');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [sourceType, setSourceType] = useState<'voice' | 'text'>('text');
  const [showTextInput, setShowTextInput] = useState(true);
  const [classificationSource, setClassificationSource] = useState('');
  const [fallbackEstimatedMinutes, setFallbackEstimatedMinutes] = useState<number | null>(null);
  const requestedVoiceOpenRef = useRef(false);
  const mountedRef = useRef(false);

  useImperativeHandle(ref, () => ({
    openInVoiceMode: () => {
      requestedVoiceOpenRef.current = true;
      setPhase('input');
      setTitle('');
      setDueDate(format(new Date(), 'yyyy-MM-dd'));
      setClassificationSource('');
      setFallbackEstimatedMinutes(null);
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
    },
  }), [resetTranscript, startRecording]);

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

    setPhase('input');
    setDueDate(format(new Date(), 'yyyy-MM-dd'));
    setClassificationSource('');
    setFallbackEstimatedMinutes(null);

    if (requestedVoiceOpenRef.current) {
      requestedVoiceOpenRef.current = false;
      return;
    }

    setTitle('');
    resetTranscript();
    setShowTextInput(true);
    setSourceType('text');
  }, [open, resetTranscript]);

  useEffect(() => {
    if (transcript && !isRecording && sourceType === 'voice') {
      setTitle(transcript);
    }
  }, [transcript, isRecording, sourceType]);

  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    onClose();
  };

  const handleTitleDone = async () => {
    const rawTitle = title.trim();
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
  };

  const handleDateDone = async () => {
    await runClassificationAndSave(title, dueDate, classificationSource || title, classificationSource || title);
  };

  const runClassificationAndSave = async (taskTitle: string, date: string, classificationInput: string, originalTranscript: string) => {
    setPhase('saving');

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

        due_date: date || format(new Date(), 'yyyy-MM-dd'),
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
      handleClose();
    } catch {
      toast.error('Error al crear tarea');
      setPhase('input');
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
                <button onClick={handleClose} className="absolute top-4 right-4 text-on-surface-variant"><X className="w-5 h-5" /></button>

                <AnimatePresence mode="wait">
                  {phase === 'input' && (
                    <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col items-center gap-6">
                      {isRecording && (
                        <div className="flex items-center justify-center gap-1.5 h-16 w-full">
                          {waveformBars.map((h, i) => (
                            <motion.div key={i} className="w-1 rounded-full primary-gradient" animate={{ height: [h * 2, h * 4, h * 2] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.05 }} />
                          ))}
                        </div>
                      )}
                      <div className="w-full text-center min-h-[60px]">
                        {isRecording || transcript ? (
                          <p className="text-2xl font-semibold text-foreground leading-relaxed tracking-tight">
                            {transcript || title}
                            {isRecording && <span className="text-primary inline-block w-0.5 h-6 ml-1 align-middle animate-pulse-soft">|</span>}
                          </p>
                        ) : showTextInput ? (
                          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
                            placeholder="¿Qué necesitas hacer?"
                            className="w-full text-xl text-center bg-transparent text-foreground placeholder:text-on-surface-variant/40 focus:outline-none border-none"
                            onKeyDown={(e) => e.key === 'Enter' && handleTitleDone()} />
                        ) : null}
                      </div>
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
                          <button onClick={() => { stopRecording(); setTimeout(handleTitleDone, 500); }} className="w-16 h-16 rounded-full primary-gradient flex items-center justify-center shadow-lg shadow-primary/20">
                            <Square className="w-6 h-6 text-primary-foreground" fill="currentColor" />
                          </button>
                        ) : (
                          <>
                            {isSupported && !voiceFallback && (
                              <button onClick={() => { setSourceType('voice'); setShowTextInput(false); startRecording(); }} className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center">
                                <Mic className="w-6 h-6 text-foreground" />
                              </button>
                            )}
                            {(title || showTextInput) && (
                              <button onClick={handleTitleDone} className="px-6 py-3 rounded-full primary-gradient text-primary-foreground font-bold text-sm">Crear</button>
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

                  {phase === 'saving' && (
                    <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center space-y-4">
                      <div className="w-12 h-12 mx-auto relative">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full" />
                        <Sparkles className="w-5 h-5 text-primary absolute inset-0 m-auto" />
                      </div>
                      <p className="text-foreground font-medium">Analizando y creando tarea...</p>
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
