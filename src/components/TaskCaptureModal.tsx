import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X, Square, Sparkles } from 'lucide-react';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { parseVoiceTranscript } from '@/hooks/useVoiceParser';
import { useTasks } from '@/hooks/useTasks';
import { useTaskClassifier } from '@/hooks/useTaskClassifier';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TaskCaptureModalProps {
  open: boolean;
  onClose: () => void;
}

type CapturePhase = 'input' | 'date' | 'classifying' | 'review' | 'saving';

const TaskCaptureModal = ({ open, onClose }: TaskCaptureModalProps) => {
  const { profile } = useProfile();
  const { user } = useAuth();
  const { isRecording, transcript, confidence, voiceFallback, isSupported, startRecording, stopRecording, resetTranscript } = useVoiceCapture();
  const { createTask } = useTasks();
  const { classifyTask, isClassifying } = useTaskClassifier();

  const [phase, setPhase] = useState<CapturePhase>('input');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [classification, setClassification] = useState<any>(null);
  const [sourceType, setSourceType] = useState<'voice' | 'text'>('text');
  const [showTextInput, setShowTextInput] = useState(false);

  const preferVoice = profile?.preferred_input === 'voice' || profile?.preferred_input === 'both';

  useEffect(() => {
    if (open) {
      setPhase('input');
      setTitle('');
      setDueDate(format(new Date(), 'yyyy-MM-dd'));
      setClassification(null);
      resetTranscript();
      setShowTextInput(false);
      if (preferVoice && isSupported && !voiceFallback) {
        setSourceType('voice');
        setTimeout(() => startRecording(), 300);
      } else {
        setShowTextInput(true);
        setSourceType('text');
      }
    }
  }, [open]);

  useEffect(() => {
    if (transcript && !isRecording && sourceType === 'voice') {
      setTitle(transcript);
    }
  }, [transcript, isRecording, sourceType]);

  const handleTitleDone = async () => {
    const rawTitle = title.trim();
    if (!rawTitle) { toast.error('Escribe o dicta una tarea'); return; }

    let parsedTitle = rawTitle;
    let parsedDate = dueDate;

    // Parse voice for date extraction
    if (sourceType === 'voice') {
      const parsed = parseVoiceTranscript(rawTitle);
      parsedTitle = parsed.title;
      if (parsed.dueDate) parsedDate = parsed.dueDate;
    }

    setTitle(parsedTitle);
    setDueDate(parsedDate);

    // If no date was found in voice, ask for it
    if (sourceType === 'voice') {
      const parsed = parseVoiceTranscript(rawTitle);
      if (!parsed.dueDate) {
        setPhase('date');
        return;
      }
    }

    // Go straight to AI classification
    await runClassification(parsedTitle, parsedDate);
  };

  const handleDateDone = async () => {
    await runClassification(title, dueDate);
  };

  const runClassification = async (taskTitle: string, date: string) => {
    setPhase('classifying');
    const result = await classifyTask(taskTitle, date);

    if (result) {
      setClassification(result);
      setPhase('review');
    } else {
      // Fallback: save with defaults if AI fails
      await saveTask(taskTitle, date, {
        importance: false,
        urgency: false,
        priority: 'medium' as const,
        estimated_minutes: 30,
        context_id: null,
        goal_id: null,
        reasoning: '',
      });
    }
  };

  const saveTask = async (taskTitle: string, date: string, cls: any) => {
    setPhase('saving');
    try {
      const task = await createTask.mutateAsync({
        title: taskTitle,
        priority: cls.priority,
        urgency: cls.urgency,
        importance: cls.importance,
        source_type: sourceType,
        context_id: cls.context_id,
        goal_id: cls.goal_id,
        due_date: date || format(new Date(), 'yyyy-MM-dd'),
      });

      if (sourceType === 'voice' && user) {
        await supabase.from('voice_inputs').insert({
          user_id: user.id,
          transcript: title,
          parsed_task_id: task.id,
          confidence,
        });
      }

      toast.success('Tarea creada');
      onClose();
    } catch {
      toast.error('Error al crear tarea');
      setPhase('input');
    }
  };

  const handleConfirmClassification = () => {
    saveTask(title, dueDate, classification);
  };

  if (!open) return null;

  const waveformBars = [4, 8, 12, 14, 10, 16, 12, 14, 6, 10, 14, 8, 4];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-[60]" onClick={onClose} />
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
                <button onClick={onClose} className="absolute top-4 right-4 text-on-surface-variant"><X className="w-5 h-5" /></button>

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
                        💡 Solo di la tarea y la fecha. La IA se encarga del resto.
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
                              <button onClick={() => { setSourceType('voice'); startRecording(); }} className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center">
                                <Mic className="w-6 h-6 text-foreground" />
                              </button>
                            )}
                            {(title || showTextInput) && (
                              <button onClick={handleTitleDone} className="px-6 py-3 rounded-full primary-gradient text-primary-foreground font-bold text-sm">Continuar</button>
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

                  {phase === 'classifying' && (
                    <motion.div key="classifying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center space-y-4">
                      <div className="w-12 h-12 mx-auto relative">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full"
                        />
                        <Sparkles className="w-5 h-5 text-primary absolute inset-0 m-auto" />
                      </div>
                      <p className="text-foreground font-medium">Analizando tu tarea...</p>
                      <p className="text-on-surface-variant text-xs">La IA está clasificando según tu contexto</p>
                    </motion.div>
                  )}

                  {phase === 'review' && classification && (
                    <motion.div key="review" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full space-y-5">
                      <div className="text-center">
                        <Sparkles className="w-5 h-5 text-primary mx-auto mb-2" />
                        <h2 className="text-lg font-bold text-foreground">"{title}"</h2>
                        <p className="text-xs text-on-surface-variant mt-1">{dueDate}</p>
                      </div>

                      <div className="bg-surface-container-low rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-on-surface-variant">Prioridad</span>
                          <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                            classification.priority === 'high' ? 'bg-error/10 text-error' :
                            classification.priority === 'medium' ? 'bg-tertiary/10 text-tertiary' :
                            'bg-surface-container-high text-on-surface-variant'
                          }`}>
                            {classification.priority === 'high' ? 'Alta' : classification.priority === 'medium' ? 'Media' : 'Baja'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-on-surface-variant">Importante</span>
                          <span className="text-sm font-medium text-foreground">{classification.importance ? 'Sí' : 'No'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-on-surface-variant">Urgente</span>
                          <span className="text-sm font-medium text-foreground">{classification.urgency ? 'Sí' : 'No'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-on-surface-variant">Tiempo estimado</span>
                          <span className="text-sm font-medium text-foreground">{classification.estimated_minutes} min</span>
                        </div>
                      </div>

                      {classification.reasoning && (
                        <p className="text-xs text-on-surface-variant/80 text-center italic">
                          "{classification.reasoning}"
                        </p>
                      )}

                      <div className="flex gap-3">
                        <button onClick={() => setPhase('input')}
                          className="flex-1 py-3 rounded-lg bg-surface-container-high text-foreground font-semibold text-sm">
                          Ajustar
                        </button>
                        <button onClick={handleConfirmClassification}
                          className="flex-1 py-3 rounded-lg primary-gradient text-primary-foreground font-bold text-sm">
                          Confirmar ✓
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {phase === 'saving' && (
                    <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-on-surface-variant mt-4">Guardando...</p>
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
};

export default TaskCaptureModal;
