import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfile } from '@/hooks/useProfile';
import { useGoals } from '@/hooks/useGoals';
import { useAuth } from '@/contexts/AuthContext';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { supabase } from '@/integrations/supabase/client';
import { Mic, MicOff, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';

const steps = ['welcome', 'style', 'input', 'ready'] as const;

const OnboardingPage = () => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [goalText, setGoalText] = useState('');
  const [orgStyle, setOrgStyle] = useState('simple');
  const [inputPref, setInputPref] = useState('both');
  const { updateProfile } = useProfile();
  const { createGoal } = useGoals();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isSupported, startRecording, stopRecording, isRecording, transcript } = useVoiceCapture();

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const handleFinish = async () => {
    try {
      const goal = await createGoal.mutateAsync({ title: goalText, horizon: 'annual' });
      await updateProfile.mutateAsync({
        name,
        onboarding_completed: true,
        preferred_input: inputPref,
        organization_style: orgStyle,
        main_goal_id: goal.id,
      });
      if (user) {
        await supabase.from('usage_events').insert({
          user_id: user.id,
          event_type: 'onboarding_completed',
        });
      }
      localStorage.setItem('adonai_onboarding_done', 'true');
      navigate('/');
    } catch (err) {
      toast.error('Error al guardar. Intenta de nuevo.');
    }
  };

  const testMic = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const orgOptions = [
    { value: 'simple', label: 'Simple', desc: 'Solo veo lo esencial' },
    { value: 'intermediate', label: 'Intermedio', desc: 'Quiero un poco más de contexto' },
    { value: 'guided', label: 'Guiado', desc: 'Necesito ayuda para priorizar' },
  ];

  const inputOptions = [
    { value: 'voice', label: 'Solo voz' },
    { value: 'text', label: 'Solo texto' },
    { value: 'both', label: 'Ambos (recomendado)' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 selection:bg-primary/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-[430px]">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-10">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-primary' : i < step ? 'w-4 bg-primary/40' : 'w-4 bg-surface-container-high'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-8"
            >
              <div className="text-center space-y-3">
                <h1 className="text-4xl font-extrabold tracking-tighter text-foreground">Hola, soy Adonai.</h1>
                <p className="text-on-surface-variant text-lg">Estoy aquí para ayudarte a transformar tus ideas en realidades tangibles.</p>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-xs uppercase tracking-[0.2em] font-bold text-on-surface-variant ml-1">¿Cómo te llamas?</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full h-14 px-5 bg-surface-container-lowest rounded-lg text-foreground placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all border-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs uppercase tracking-[0.2em] font-bold text-on-surface-variant ml-1">¿Cuál es tu gran meta ahora mismo?</label>
                  <textarea
                    value={goalText}
                    onChange={(e) => setGoalText(e.target.value)}
                    placeholder="Ej: Lanzar mi negocio"
                    rows={2}
                    className="w-full px-5 py-4 bg-surface-container-lowest rounded-lg text-foreground placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all resize-none border-none"
                  />
                </div>
              </div>
              <button
                onClick={next}
                disabled={!name || !goalText}
                className="primary-gradient w-full h-14 rounded-lg text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40"
              >
                Continuar
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="style"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-8"
            >
              <div className="text-center space-y-3">
                <h2 className="text-3xl font-extrabold tracking-tighter text-foreground">¿Cómo prefieres organizarte?</h2>
              </div>
              <div className="space-y-3">
                {orgOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setOrgStyle(opt.value)}
                    className={`w-full p-5 rounded-lg text-left transition-all ${
                      orgStyle === opt.value
                        ? 'bg-surface-container-high ring-1 ring-primary/30'
                        : 'bg-surface-container-low hover:bg-surface-container'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{opt.label}</p>
                        <p className="text-sm text-on-surface-variant mt-1">{opt.desc}</p>
                      </div>
                      {orgStyle === opt.value && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={next}
                className="primary-gradient w-full h-14 rounded-lg text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Continuar
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-8"
            >
              <div className="text-center space-y-3">
                <h2 className="text-3xl font-extrabold tracking-tighter text-foreground">¿Cómo prefieres capturar tareas?</h2>
              </div>
              <div className="space-y-3">
                {inputOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setInputPref(opt.value)}
                    className={`w-full p-5 rounded-lg text-left transition-all ${
                      inputPref === opt.value
                        ? 'bg-surface-container-high ring-1 ring-primary/30'
                        : 'bg-surface-container-low hover:bg-surface-container'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground">{opt.label}</p>
                      {inputPref === opt.value && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Mic test */}
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={testMic}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                    isRecording ? 'primary-gradient animate-pulse-soft' : 'bg-surface-container-high'
                  }`}
                >
                  {isSupported ? (
                    <Mic className={`w-7 h-7 ${isRecording ? 'text-primary-foreground' : 'text-foreground'}`} />
                  ) : (
                    <MicOff className="w-7 h-7 text-on-surface-variant" />
                  )}
                </button>
                <p className="text-xs text-on-surface-variant">
                  {isRecording ? transcript || 'Escuchando...' : isSupported ? 'Prueba tu micrófono' : 'Micrófono no disponible'}
                </p>
              </div>

              <button
                onClick={next}
                className="primary-gradient w-full h-14 rounded-lg text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Continuar
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8 text-center"
            >
              <div className="w-20 h-20 rounded-full primary-gradient mx-auto flex items-center justify-center">
                <Check className="w-10 h-10 text-primary-foreground" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-extrabold tracking-tighter text-foreground">Todo listo, {name}.</h2>
                <p className="text-on-surface-variant text-lg">Tu espacio de productividad está listo.</p>
              </div>
              <button
                onClick={handleFinish}
                disabled={createGoal.isPending || updateProfile.isPending}
                className="primary-gradient w-full h-14 rounded-lg text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                Empezar
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OnboardingPage;
