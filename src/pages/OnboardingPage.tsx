import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfile } from '@/hooks/useProfile';
import { useGoals } from '@/hooks/useGoals';
import { useUserContext } from '@/hooks/useUserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { supabase } from '@/integrations/supabase/client';
import { Mic, MicOff, ArrowRight, Check, Brain, Plus, Trash2, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

type Step = 
  | 'voice-test'
  | 'name'
  | 'age'
  | 'profession'
  | 'location'
  | 'productivity'
  | 'stress'
  | 'challenge'
  | 'goals'
  | 'ready';

const steps: Step[] = [
  'voice-test',
  'name',
  'age',
  'profession',
  'location',
  'productivity',
  'stress',
  'challenge',
  'goals',
  'ready'
];

const OnboardingPage = () => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [profession, setProfession] = useState('');
  const [location, setLocation] = useState('');
  const [productivity, setProductivity] = useState('');
  const [stress, setStress] = useState('');
  const [challenge, setChallenge] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [currentGoal, setCurrentGoal] = useState('');

  const { updateProfile } = useProfile();
  const { createGoal } = useGoals();
  const { updateContext } = useUserContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isSupported, startRecording, stopRecording, isRecording, transcript } = useVoiceCapture();

  // Sync transcript with current input
  useEffect(() => {
    if (transcript) {
      const step = steps[currentStepIndex];
      switch (step) {
        case 'name': setName(transcript); break;
        case 'age': setAge(transcript); break;
        case 'profession': setProfession(transcript); break;
        case 'location': setLocation(transcript); break;
        case 'challenge': setChallenge(transcript); break;
        case 'goals': setCurrentGoal(transcript); break;
      }
    }
  }, [transcript, currentStepIndex]);

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      stopRecording();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
      stopRecording();
    }
  };

  const handleGoalAdd = () => {
    if (currentGoal.trim()) {
      setGoals([...goals, currentGoal.trim()]);
      setCurrentGoal('');
    }
  };

  const handleGoalDelete = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const handleFinish = async () => {
    try {
      // Create goals
      for (const goalTitle of goals) {
        await createGoal.mutateAsync({ title: goalTitle, horizon: 'annual' });
      }

      await updateProfile.mutateAsync({
        name,
        onboarding_completed: true,
        preferred_input: 'both',
        organization_style: 'simple',
      });

      await updateContext.mutateAsync({
        occupation: profession,
        location,
        energy_patterns: productivity,
        stress_level: stress,
        biggest_challenge: challenge,
        age_range: age,
        life_areas: ['Trabajo', 'Personal', 'Salud', 'Aprendizaje'],
      });

      if (user) {
        await supabase.from('usage_events').insert({
          user_id: user.id,
          event_type: 'onboarding_completed',
        });
      }
      localStorage.setItem('adonai_onboarding_done', 'true');
      localStorage.setItem('tutorial_pending', 'true');
      navigate('/');
    } catch (e) {
      console.error(e);
      toast.error('Error al guardar. Intenta de nuevo.');
    }
  };

  const currentStep = steps[currentStepIndex];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 selection:bg-primary/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-[500px]">
        {/* Progress Bar */}
        <div className="flex justify-center gap-1.5 mb-16">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all duration-500 ease-out ${
              i === currentStepIndex ? 'w-10 bg-primary' : i < currentStepIndex ? 'w-4 bg-primary/40' : 'w-4 bg-surface-container-high'
            }`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-10"
          >
            {/* Step: Voice Test */}
            {currentStep === 'voice-test' && (
              <div className="text-center space-y-8">
                <div className="space-y-4">
                  <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Hola, soy Adonai.</h1>
                  <p className="text-on-surface-variant text-xl">Antes de empezar, vamos a probar tu voz.</p>
                </div>
                
                <div className="flex flex-col items-center gap-6 py-6">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                      isRecording ? 'primary-gradient shadow-[0_0_30px_-5px_var(--primary)]' : 'bg-surface-container-highest shadow-xl'
                    }`}
                  >
                    {isRecording ? <Volume2 className="w-10 h-10 text-primary-foreground animate-pulse" /> : <Mic className="w-10 h-10 text-foreground" />}
                  </motion.button>
                  
                  <div className="h-6">
                    <p className="text-sm font-medium text-primary mt-2">
                      {isRecording ? (transcript || 'Escuchando...') : 'Toca para probar tu voz'}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={nextStep}
                  className="w-full h-16 bg-foreground text-background rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                >
                  Continuar <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Step: Name */}
            {currentStep === 'name' && (
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-[0.3em] font-bold text-primary">Identidad</label>
                  <h2 className="text-4xl font-extrabold tracking-tight text-foreground">¿Cómo te llamas?</h2>
                </div>
                
                <div className="relative group">
                  <input 
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Escribe tu nombre..."
                    className="w-full bg-transparent text-3xl font-medium border-b-2 border-surface-container-highest focus:border-primary outline-none py-4 transition-all"
                  />
                  <VoiceButton active={isRecording} onClick={isRecording ? stopRecording : startRecording} />
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={nextStep} disabled={!name} className="flex-1 h-16 bg-primary text-primary-foreground rounded-2xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-30 transition-all">
                    Siguiente <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step: Age */}
            {currentStep === 'age' && (
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-[0.3em] font-bold text-primary">Perfil</label>
                  <h2 className="text-4xl font-extrabold tracking-tight text-foreground">¿Qué edad tienes?</h2>
                </div>
                
                <div className="relative">
                  <input 
                    autoFocus
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Tu edad..."
                    className="w-full bg-transparent text-3xl font-medium border-b-2 border-surface-container-highest focus:border-primary outline-none py-4 transition-all"
                  />
                  <VoiceButton active={isRecording} onClick={isRecording ? stopRecording : startRecording} />
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={nextStep} className="flex-1 h-16 bg-primary text-primary-foreground rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all">
                    Siguiente <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step: Profession */}
            {currentStep === 'profession' && (
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-[0.3em] font-bold text-primary">Ocupación</label>
                  <h2 className="text-4xl font-extrabold tracking-tight text-foreground">¿A qué te dedicas?</h2>
                </div>
                
                <div className="relative">
                  <input 
                    autoFocus
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    placeholder="Ej: Desarrollador, Estudiante..."
                    className="w-full bg-transparent text-3xl font-medium border-b-2 border-surface-container-highest focus:border-primary outline-none py-4 transition-all"
                  />
                  <VoiceButton active={isRecording} onClick={isRecording ? stopRecording : startRecording} />
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={nextStep} className="flex-1 h-16 bg-primary text-primary-foreground rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all">
                    Siguiente <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step: Location */}
            {currentStep === 'location' && (
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-[0.3em] font-bold text-primary">Contexto</label>
                  <h2 className="text-4xl font-extrabold tracking-tight text-foreground">¿En qué país te encuentras?</h2>
                </div>
                
                <div className="relative">
                  <input 
                    autoFocus
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ej: Venezuela, España..."
                    className="w-full bg-transparent text-3xl font-medium border-b-2 border-surface-container-highest focus:border-primary outline-none py-4 transition-all"
                  />
                  <VoiceButton active={isRecording} onClick={isRecording ? stopRecording : startRecording} />
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={nextStep} className="flex-1 h-16 bg-primary text-primary-foreground rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all">
                    Siguiente <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step: Productivity */}
            {currentStep === 'productivity' && (
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-[0.3em] font-bold text-primary">Ritmo</label>
                  <h2 className="text-4xl font-extrabold tracking-tight text-foreground">¿Cuándo eres más productivo?</h2>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'morning', label: 'Mañanas', emoji: '🌅' },
                    { id: 'afternoon', label: 'Tardes', emoji: '☀️' },
                    { id: 'night', label: 'Noches', emoji: '🌙' },
                    { id: 'mixed', label: 'Variable', emoji: '🔄' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { setProductivity(opt.id); nextStep(); }}
                      className={`h-16 px-6 rounded-2xl text-left flex items-center justify-between transition-all ${
                        productivity === opt.id ? 'bg-primary text-primary-foreground' : 'bg-surface-container-low hover:bg-surface-container'
                      }`}
                    >
                      <span className="text-lg font-semibold">{opt.emoji} {opt.label}</span>
                      {productivity === opt.id && <Check className="w-5 h-5" />}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-surface-container-highest" />
                  <span className="text-xs font-bold text-on-surface-variant/40">O DICTA TU RESPUESTA</span>
                  <div className="h-px flex-1 bg-surface-container-highest" />
                </div>

                <div className="flex justify-center">
                  <VoiceButton active={isRecording} onClick={isRecording ? stopRecording : startRecording} floating={false} />
                </div>
              </div>
            )}

            {/* Step: Stress */}
            {currentStep === 'stress' && (
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-[0.3em] font-bold text-primary">Estado</label>
                  <h2 className="text-4xl font-extrabold tracking-tight text-foreground">¿Cuál es tu nivel de estrés?</h2>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'low', label: 'Bajo - Me siento en control', emoji: '😌' },
                    { id: 'medium', label: 'Medio - Tengo varias cosas', emoji: '😐' },
                    { id: 'high', label: 'Alto - Me siento abrumado', emoji: '😰' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { setStress(opt.id); nextStep(); }}
                      className={`h-20 px-6 rounded-2xl text-left flex items-center justify-between transition-all ${
                        stress === opt.id ? 'bg-primary text-primary-foreground' : 'bg-surface-container-low hover:bg-surface-container'
                      }`}
                    >
                      <span className="text-lg font-semibold">{opt.emoji} {opt.label}</span>
                      {stress === opt.id && <Check className="w-5 h-5" />}
                    </button>
                  ))}
                </div>
                
                <div className="flex justify-center">
                  <VoiceButton active={isRecording} onClick={isRecording ? stopRecording : startRecording} floating={false} />
                </div>
              </div>
            )}

            {/* Step: Challenge */}
            {currentStep === 'challenge' && (
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-[0.3em] font-bold text-primary">Enfoque</label>
                  <h2 className="text-4xl font-extrabold tracking-tight text-foreground">¿Tu mayor reto hoy?</h2>
                </div>
                
                <div className="relative">
                  <textarea 
                    autoFocus
                    rows={3}
                    value={challenge}
                    onChange={(e) => setChallenge(e.target.value)}
                    placeholder="Cuéntame qué es lo que más te preocupa hoy..."
                    className="w-full bg-transparent text-2xl font-medium border-b-2 border-surface-container-highest focus:border-primary outline-none py-4 transition-all resize-none"
                  />
                  <VoiceButton active={isRecording} onClick={isRecording ? stopRecording : startRecording} />
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={nextStep} className="flex-1 h-16 bg-primary text-primary-foreground rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all">
                    Siguiente <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step: Goals */}
            {currentStep === 'goals' && (
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-[0.3em] font-bold text-primary">Visión</label>
                  <h2 className="text-4xl font-extrabold tracking-tight text-foreground">¿Cuáles son tus metas?</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="relative">
                    <input 
                      value={currentGoal}
                      onChange={(e) => setCurrentGoal(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleGoalAdd()}
                      placeholder="Añade una meta..."
                      className="w-full bg-surface-container-low rounded-2xl px-6 h-16 outline-none pr-24 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <div className="absolute right-2 top-2 flex gap-1">
                      <VoiceButton active={isRecording} onClick={isRecording ? stopRecording : startRecording} floating={false} />
                      <button 
                        onClick={handleGoalAdd}
                        className="w-12 h-12 bg-foreground text-background rounded-xl flex items-center justify-center hover:opacity-90"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {goals.map((g, index) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }}
                        key={index} 
                        className="bg-surface-container-highest/50 p-4 rounded-xl flex items-center justify-between group"
                      >
                        <span className="font-medium">{g}</span>
                        <button onClick={() => handleGoalDelete(index)} className="text-on-surface-variant/40 hover:text-error transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={nextStep} disabled={goals.length === 0} className="flex-1 h-16 bg-primary text-primary-foreground rounded-2xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-30 transition-all">
                    Finalizar <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step: Ready */}
            {currentStep === 'ready' && (
              <div className="text-center space-y-10">
                <div className="relative mx-auto w-32 h-32">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 12, stiffness: 200 }}
                    className="w-full h-full rounded-full primary-gradient flex items-center justify-center shadow-2xl"
                  >
                    <Check className="w-16 h-16 text-primary-foreground" />
                  </motion.div>
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 rounded-full bg-primary/30 -z-10"
                  />
                </div>

                <div className="space-y-4">
                  <h2 className="text-4xl font-extrabold tracking-tight text-foreground">¡Todo listo, {name}!</h2>
                  <p className="text-on-surface-variant text-xl">Tu asistente personal está configurado. Dicta tus tareas y yo haré el resto.</p>
                </div>

                <button 
                  onClick={handleFinish}
                  className="w-full h-18 primary-gradient text-primary-foreground rounded-2xl font-extrabold text-xl flex items-center justify-center gap-3 shadow-xl hover:opacity-95 active:scale-[0.98] transition-all"
                >
                  Empezar ahora <Brain className="w-6 h-6" />
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Indicator */}
        <div className="fixed bottom-10 left-0 right-0 flex justify-center items-center gap-8 px-6 opacity-30">
          {currentStepIndex > 0 && currentStepIndex < steps.length - 1 && (
            <button onClick={prevStep} className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">Volver</button>
          )}
        </div>
      </div>
    </div>
  );
};

const VoiceButton = ({ active, onClick, floating = true }: { active: boolean, onClick: () => void, floating?: boolean }) => (
  <button 
    onClick={onClick}
    className={`${floating ? 'absolute right-0 top-1/2 -translate-y-1/2 w-14 h-14 bg-surface-container-high rounded-full flex items-center justify-center' : 'w-12 h-12 bg-surface-container-high rounded-xl flex items-center justify-center'} transition-all ${active ? 'shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] ring-2 ring-primary' : 'hover:scale-105'}`}
  >
    {active ? (
      <div className="relative flex items-center justify-center">
        <div className="absolute w-full h-full rounded-full bg-primary animate-ping opacity-20" />
        <Volume2 className="w-6 h-6 text-primary" />
      </div>
    ) : (
      <Mic className="w-6 h-6 text-on-surface-variant" />
    )}
  </button>
);

export default OnboardingPage;
