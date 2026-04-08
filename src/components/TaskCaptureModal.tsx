import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Square } from 'lucide-react';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { useTasks } from '@/hooks/useTasks';
import { useContexts } from '@/hooks/useContexts';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TaskCaptureModalProps {
  open: boolean;
  onClose: () => void;
}

type CapturePhase = 'input' | 'q1' | 'q2' | 'q3' | 'saving';

const TaskCaptureModal = ({ open, onClose }: TaskCaptureModalProps) => {
  const { profile } = useProfile();
  const { user } = useAuth();
  const { isRecording, transcript, confidence, voiceFallback, isSupported, startRecording, stopRecording, resetTranscript } = useVoiceCapture();
  const { createTask } = useTasks();
  const { contexts } = useContexts();

  const [phase, setPhase] = useState<CapturePhase>('input');
  const [title, setTitle] = useState('');
  const [isImportant, setIsImportant] = useState<boolean | null>(null);
  const [isUrgent, setIsUrgent] = useState<boolean | null>(null);
  const [contextId, setContextId] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<'voice' | 'text'>('text');
  const [showTextInput, setShowTextInput] = useState(false);

  const preferVoice = profile?.preferred_input === 'voice' || profile?.preferred_input === 'both';

  useEffect(() => {
    if (open) {
      setPhase('input');
      setTitle('');
      setIsImportant(null);
      setIsUrgent(null);
      setContextId(null);
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

  const handleTitleDone = () => {
    if (!title.trim()) {
      toast.error('Escribe o dicta una tarea');
      return;
    }
    setPhase('q1');
  };

  const handleQ1 = (answer: boolean | null) => {
    setIsImportant(answer);
    setPhase('q2');
  };

  const handleQ2 = (answer: boolean | null) => {
    setIsUrgent(answer);
    setPhase('q3');
  };

  const handleQ3 = async (ctxId: string | null) => {
    setContextId(ctxId);
    setPhase('saving');

    const importance = isImportant ?? false;
    const urgency = isUrgent ?? false;
    let priority: 'high' | 'medium' | 'low' = 'medium';
    if (importance && urgency) priority = 'high';
    else if (importance) priority = 'high';
    else if (urgency) priority = 'medium';
    else if (!importance && !urgency && isImportant !== null) priority = 'low';

    try {
      const task = await createTask.mutateAsync({
        title: title.trim(),
        priority,
        urgency,
        importance,
        source_type: sourceType,
        context_id: ctxId,
      });

      // Save voice input if voice
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

  if (!open) return null;

  const waveformBars = [4, 8, 12, 14, 10, 16, 12, 14, 6, 10, 14, 8, 4];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-[70] px-4 pb-8"
          >
            <div className="mx-auto max-w-[430px] glass-sheet rounded-2xl overflow-hidden shadow-2xl">
              {/* Handle */}
              <div className="flex justify-center pt-4 pb-2">
                <div className="w-12 h-1.5 bg-on-surface-variant/20 rounded-full" />
              </div>

              <div className="p-6 flex flex-col items-center gap-6">
                <button onClick={onClose} className="absolute top-4 right-4 text-on-surface-variant">
                  <X className="w-5 h-5" />
                </button>

                <AnimatePresence mode="wait">
                  {phase === 'input' && (
                    <motion.div
                      key="input"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-full flex flex-col items-center gap-6"
                    >
                      {isRecording && (
                        <div className="flex items-center justify-center gap-1.5 h-16 w-full">
                          {waveformBars.map((h, i) => (
                            <motion.div
                              key={i}
                              className="w-1 rounded-full primary-gradient"
                              animate={{ height: [h * 2, h * 4, h * 2] }}
                              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.05 }}
                            />
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
                          <input
                            autoFocus
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="¿Qué necesitas hacer?"
                            className="w-full text-xl text-center bg-transparent text-foreground placeholder:text-on-surface-variant/40 focus:outline-none border-none"
                            onKeyDown={(e) => e.key === 'Enter' && handleTitleDone()}
                          />
                        ) : null}
                      </div>

                      <div className="flex gap-3">
                        {!showTextInput && (
                          <button
                            onClick={() => setShowTextInput(true)}
                            className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface-variant text-sm"
                          >
                            Escribir
                          </button>
                        )}
                      </div>

                      <div className="flex gap-4 items-center">
                        {isRecording ? (
                          <button
                            onClick={() => { stopRecording(); setTimeout(handleTitleDone, 500); }}
                            className="w-16 h-16 rounded-full primary-gradient flex items-center justify-center shadow-lg shadow-primary/20"
                          >
                            <Square className="w-6 h-6 text-primary-foreground" fill="currentColor" />
                          </button>
                        ) : (
                          <>
                            {isSupported && !voiceFallback && (
                              <button
                                onClick={() => { setSourceType('voice'); startRecording(); }}
                                className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center"
                              >
                                <Mic className="w-6 h-6 text-foreground" />
                              </button>
                            )}
                            {(title || showTextInput) && (
                              <button
                                onClick={handleTitleDone}
                                className="px-6 py-3 rounded-full primary-gradient text-primary-foreground font-bold text-sm"
                              >
                                Continuar
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {phase === 'q1' && (
                    <motion.div
                      key="q1"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      className="w-full space-y-6"
                    >
                      <div className="text-center">
                        <span className="text-xs uppercase tracking-[0.2em] font-bold text-on-surface-variant">Priorización</span>
                        <h2 className="text-lg font-medium text-foreground mt-1">¿Es importante para tu meta?</h2>
                      </div>
                      <div className="flex gap-3">
                        {[
                          { label: 'Sí', val: true },
                          { label: 'No', val: false },
                          { label: 'No sé', val: null },
                        ].map((opt) => (
                          <button
                            key={opt.label}
                            onClick={() => handleQ1(opt.val)}
                            className="flex-1 py-4 px-4 rounded-lg bg-surface-container-high text-foreground font-semibold hover:bg-surface-container-highest transition-all active:scale-95"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {phase === 'q2' && (
                    <motion.div
                      key="q2"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      className="w-full space-y-6"
                    >
                      <div className="text-center">
                        <span className="text-xs uppercase tracking-[0.2em] font-bold text-on-surface-variant">Priorización</span>
                        <h2 className="text-lg font-medium text-foreground mt-1">¿Es urgente para hoy?</h2>
                      </div>
                      <div className="flex gap-3">
                        {[
                          { label: 'Sí', val: true },
                          { label: 'No', val: false },
                          { label: 'Después', val: null },
                        ].map((opt) => (
                          <button
                            key={opt.label}
                            onClick={() => handleQ2(opt.val)}
                            className="flex-1 py-4 px-4 rounded-lg bg-surface-container-high text-foreground font-semibold hover:bg-surface-container-highest transition-all active:scale-95"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {phase === 'q3' && (
                    <motion.div
                      key="q3"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      className="w-full space-y-6"
                    >
                      <div className="text-center">
                        <span className="text-xs uppercase tracking-[0.2em] font-bold text-on-surface-variant">Contexto</span>
                        <h2 className="text-lg font-medium text-foreground mt-1">¿A qué se conecta?</h2>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {contexts.map((ctx) => (
                          <button
                            key={ctx.id}
                            onClick={() => handleQ3(ctx.id)}
                            className="px-4 py-2 rounded-full bg-surface-container-high text-foreground text-sm font-medium hover:bg-surface-container-highest transition-all"
                          >
                            {ctx.name}
                          </button>
                        ))}
                        <button
                          onClick={() => handleQ3(null)}
                          className="px-4 py-2 rounded-full bg-surface-container-low text-on-surface-variant text-sm font-medium hover:bg-surface-container transition-all"
                        >
                          Sin contexto
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {phase === 'saving' && (
                    <motion.div
                      key="saving"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-8 text-center"
                    >
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
