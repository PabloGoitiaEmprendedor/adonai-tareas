import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, Clock, Coffee, Target, ArrowRight, Save, X, Calendar, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTimeBlocks } from '@/hooks/useTimeBlocks';
import { format } from 'date-fns';

interface AISchedulerModalProps {
  open: boolean;
  onClose: () => void;
  selectedDate: Date;
}

const PHRASES = [
  "Priorizando tareas...",
  "Ordenando tareas...",
  "Capturando tareas de tu voz...",
  "Preparando tu calendario...",
  "Agregando tareas de la foto de tu agenda...",
  "Organizando tu día...",
  "Agregando tarea..."
];

type Step = 'intro' | 'schedule' | 'breaks' | 'focus' | 'generating';

export const AISchedulerModal = ({ open, onClose, selectedDate }: AISchedulerModalProps) => {
  const [step, setStep] = useState<Step>('intro');
  const [currentPhraseIdx, setCurrentPhraseIdx] = useState(0);
  const [answers, setAnswers] = useState({
    startWork: '09:00',
    endWork: '18:00',
    breakFrequency: '90', // min
    focusType: 'balanced', // deep, shallow, balanced
    numBlocks: '4'
  });

  useEffect(() => {
    let interval: any;
    if (step === 'generating') {
      interval = setInterval(() => {
        setCurrentPhraseIdx((prev) => (prev + 1) % PHRASES.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [step]);

  const { createBlock } = useTimeBlocks(format(selectedDate, 'yyyy-MM-dd'));

  const handleGenerate = async () => {
    setStep('generating');
    
    // Simulate AI thinking and generating blocks
    // In a real app, we'd send these parameters to an Edge Function
    setTimeout(async () => {
      try {
        const startH = parseInt(answers.startWork.split(':')[0]);
        const endH = parseInt(answers.endWork.split(':')[0]);
        const totalH = endH - startH;
        const blockDuration = Math.floor(totalH / parseInt(answers.numBlocks));

        const blockTitles = {
          deep: ['Enfoque Profundo', 'Desarrollo Estratégico', 'Resolución Compleja'],
          shallow: ['Gestión de Emails', 'Reuniones de Seguimiento', 'Tareas Administrativas'],
          balanced: ['Bloque de Enfoque', 'Tareas Pendientes', 'Revisión y Planificación']
        };

        const titles = blockTitles[answers.focusType as keyof typeof blockTitles] || blockTitles.balanced;

        for (let i = 0; i < parseInt(answers.numBlocks); i++) {
          const h = startH + i * blockDuration;
          const startStr = `${h.toString().padStart(2, '0')}:00`;
          const endStr = `${(h + blockDuration).toString().padStart(2, '0')}:00`;
          
          if (h + blockDuration <= endH) {
            await createBlock.mutateAsync({
              title: titles[i % titles.length],
              start_time: startStr,
              end_time: endStr,
              block_date: format(selectedDate, 'yyyy-MM-dd'),
              color: i % 2 === 0 ? '#6366f1' : '#ec4899',
            });
          }
        }
        
        toast.success("Horario inteligente generado con éxito", {
          icon: '✨',
          description: "Tu día ha sido optimizado por Adonai AI"
        });
        onClose();
        setStep('intro');
        setCurrentPhraseIdx(0);
      } catch (error) {
        toast.error("Error al generar bloques");
        setStep('intro');
        setCurrentPhraseIdx(0);
      }
    }, 8000); // Wait longer to show the beautiful animation sequence
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-[440px] bg-surface-container-low border border-outline-variant/20 rounded-[32px] overflow-hidden shadow-2xl"
      >
        <div className="p-8">
          <AnimatePresence mode="wait">
            {step === 'intro' && (
              <motion.div 
                key="intro"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 mx-auto">
                  <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-black tracking-tight">Agenda Inteligente</h2>
                  <p className="text-on-surface-variant text-sm leading-relaxed px-4">
                    Deja que Adonai AI diseñe tu estructura de trabajo óptima basándose en tus objetivos y nivel de energía.
                  </p>
                </div>
                <Button 
                  onClick={() => setStep('schedule')} 
                  className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-lg gap-3 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Comenzar Optimización <ArrowRight className="w-5 h-5" />
                </Button>
              </motion.div>
            )}

            {step === 'schedule' && (
              <motion.div 
                key="schedule"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Horario Disponible</h3>
                    <p className="text-xs text-on-surface-variant">¿Cuándo empieza y termina tu día?</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest opacity-40 px-1">INICIO</label>
                    <input 
                      type="time" 
                      value={answers.startWork}
                      onChange={(e) => setAnswers({...answers, startWork: e.target.value})}
                      className="w-full h-12 bg-surface-container rounded-xl px-4 font-bold border-none focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest opacity-40 px-1">FIN</label>
                    <input 
                      type="time" 
                      value={answers.endWork}
                      onChange={(e) => setAnswers({...answers, endWork: e.target.value})}
                      className="w-full h-12 bg-surface-container rounded-xl px-4 font-bold border-none focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                </div>

                <Button onClick={() => setStep('focus')} className="w-full h-12 rounded-xl">Continuar</Button>
              </motion.div>
            )}

            {step === 'focus' && (
              <motion.div 
                key="focus"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                    <Brain className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Estilo de Enfoque</h3>
                    <p className="text-xs text-on-surface-variant">¿Qué tipo de trabajo domina hoy?</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { id: 'deep', label: 'Deep Work (Sesiones largas)', icon: Zap },
                    { id: 'balanced', label: 'Equilibrado (Mixto)', icon: Target },
                    { id: 'shallow', label: 'Gestión (Rápido/Admin)', icon: Coffee }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setAnswers({...answers, focusType: f.id})}
                      className={`w-full p-4 rounded-2xl border transition-all flex items-center gap-4 text-left ${
                        answers.focusType === f.id 
                          ? 'border-primary bg-primary/5 shadow-sm' 
                          : 'border-outline-variant/10 hover:bg-surface-container'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${answers.focusType === f.id ? 'bg-primary text-white' : 'bg-surface-container-high'}`}>
                        <f.icon className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-sm tracking-tight">{f.label}</span>
                    </button>
                  ))}
                </div>

                <Button onClick={handleGenerate} className="w-full h-14 rounded-2xl bg-primary shadow-lg shadow-primary/20 gap-2">
                  <Sparkles className="w-4 h-4" /> Generar Mi Día Brillante
                </Button>
              </motion.div>
            )}

            {step === 'generating' && (
              <motion.div 
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 flex flex-col items-center gap-12"
              >
                {/* AI Orb Animation */}
                <div className="relative flex items-center justify-center">
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute w-40 h-40 bg-primary/20 rounded-full blur-3xl"
                  />
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, 90, 180, 270, 360],
                    }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-primary via-blue-400 to-emerald-400 shadow-[0_0_40px_rgba(var(--primary),0.5)] flex items-center justify-center"
                  >
                    <div className="absolute inset-1 bg-black/10 rounded-full backdrop-blur-sm" />
                    <Sparkles className="w-10 h-10 text-white relative z-10" />
                  </motion.div>
                </div>

                <div className="text-center space-y-4 max-w-xs mx-auto">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={currentPhraseIdx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-lg font-bold tracking-tight bg-gradient-to-b from-foreground to-foreground/50 bg-clip-text text-transparent"
                    >
                      {PHRASES[currentPhraseIdx]}
                    </motion.p>
                  </AnimatePresence>
                  <p className="text-[10px] uppercase font-black tracking-[0.2em] text-on-surface-variant animate-pulse">
                    Adonai Artificial Intelligence
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {step !== 'generating' && (
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-surface-container-high transition-colors"
          >
            <X className="w-5 h-5 text-on-surface-variant/40" />
          </button>
        )}
      </motion.div>
    </div>
  );
};
