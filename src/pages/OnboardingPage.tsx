import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfile } from '@/hooks/useProfile';
import { useGoals } from '@/hooks/useGoals';
import { useUserContext } from '@/hooks/useUserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowRight, 
  Check, 
  Brain, 
  User, 
  Briefcase, 
  Layout, 
  Mic, 
  Keyboard, 
  Zap, 
  Heart,
  Target,
  Clock,
  MapPin,
  Smile,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

type StepType = 'welcome' | 'context_work' | 'ready';

const steps: StepType[] = ['welcome', 'context_work', 'ready'];

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updateProfile } = useProfile();
  const { createGoal } = useGoals();
  const { updateContext } = useUserContext();
  const { isSupported, startRecording, stopRecording, isRecording, transcript } = useVoiceCapture();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  // Welcome Step State
  const [name, setName] = useState('');
  const [goalText, setGoalText] = useState('');
  const [showWelcomeError, setShowWelcomeError] = useState(false);

  // Context Basic State
  const [gender, setGender] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [familyStatus, setFamilyStatus] = useState('');
  const [location, setLocation] = useState('');
  const [energyPatterns, setEnergyPatterns] = useState('');
  const [stressLevel, setStressLevel] = useState('');

  // Context Work State
  const [occupation, setOccupation] = useState('');
  const [industry, setIndustry] = useState('');
  const [workHours, setWorkHours] = useState('9:00-17:00');
  const [hobbies, setHobbies] = useState('');
  const [personalGoals, setPersonalGoals] = useState('');
  const [biggestChallenge, setBiggestChallenge] = useState('');
  const [importedContext, setImportedContext] = useState('');

  // Style & Input State
  const [workStyle, setWorkStyle] = useState('simple');
  const [preferredInput, setPreferredInput] = useState('both');

  const currentStep = steps[currentStepIndex];

  const next = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const back = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleWelcomeNext = () => {
    if (!name.trim() || !goalText.trim()) {
      setShowWelcomeError(true);
      return;
    }
    setShowWelcomeError(false);
    next();
  };

  const handleFinish = async () => {
    if (!user) return;
    setIsFinishing(true);

    try {
      // 1. Create Goal with fallback (Bug 2 Fix)
      const finalGoalText = goalText.trim() || "Mi gran meta";
      try {
        await createGoal.mutateAsync({ title: finalGoalText, horizon: 'annual' });
      } catch (err) {
        toast.error("No se pudo crear tu meta. Verifica tu conexión.");
        throw err;
      }

      // 2. Update Profile (Bug 4 Fix - part 1)
      try {
        await updateProfile.mutateAsync({
          name,
          onboarding_completed: true,
          preferred_input: preferredInput,
          organization_style: workStyle,
        });
      } catch (err) {
        toast.error("No se pudo guardar tu perfil. Verifica tu conexión.");
        throw err;
      }

      // 3. Upsert Context (Bug 3 Fix)
      try {
        await supabase.from('user_context').upsert({
          user_id: user.id,
          occupation,
          industry,
          work_hours: workHours,
          personal_goals: personalGoals,
          work_style: workStyle,
          energy_patterns: energyPatterns,
          imported_context: importedContext,
          gender,
          age_range: ageRange,
          family_status: familyStatus,
          location,
          hobbies,
          stress_level: stressLevel,
          biggest_challenge: biggestChallenge,
          life_areas: ['Trabajo', 'Personal', 'Salud', 'Aprendizaje'],
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      } catch (err) {
        console.error("Context upsert error:", err);
        // Non-blocking as requested (UX Improvement 3)
      }

      // 4. Usage Event
      await supabase.from('usage_events').insert({
        user_id: user.id,
        event_type: 'onboarding_completed',
      });

      // 5. Success (Bug 4 Fix - part 2)
      localStorage.setItem('adonai_onboarding_done', 'true');
      navigate('/');
    } catch (e) {
      console.error(e);
      // Main catch for blocking errors
    } finally {
      setIsFinishing(false);
    }
  };

  const OptionalLabel = () => <span className="text-[10px] text-on-surface-variant/40 ml-1">(opcional)</span>;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-6 pb-32 pt-12 selection:bg-primary/30 relative">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-[500px]">
        {/* Progress Bar */}
        <div className="flex justify-center gap-1.5 mb-12">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all duration-500 ease-out ${
              i === currentStepIndex ? 'w-10 bg-primary' : i < currentStepIndex ? 'w-4 bg-primary/40' : 'w-4 bg-surface-container-high'
            }`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {/* STEP: WELCOME */}
            {currentStep === 'welcome' && (
              <div className="space-y-8">
                <div className="space-y-3">
                  <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Hola, soy Adonai.</h1>
                  <p className="text-on-surface-variant text-lg">Tu asistente personal de productividad. Vamos a configurar tu espacio.</p>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                      <User className="w-4 h-4" /> ¿Cómo te llamas?
                    </label>
                    <input 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre"
                      className="w-full bg-surface-container-low rounded-2xl px-6 h-16 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-lg font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                      <Target className="w-4 h-4" /> ¿Tu meta principal?
                    </label>
                    <textarea 
                      value={goalText}
                      onChange={(e) => setGoalText(e.target.value)}
                      placeholder="Ej: Lanzar mi negocio, Estar en forma..."
                      className="w-full bg-surface-container-low rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-lg font-medium min-h-[100px] resize-none"
                    />
                  </div>

                  {showWelcomeError && (
                    <p className="text-xs text-center text-error animate-fade-in flex items-center justify-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Por favor completa tu nombre y tu meta principal para continuar
                    </p>
                  )}
                </div>

                <button 
                  onClick={handleWelcomeNext}
                  className="w-full h-16 primary-gradient text-primary-foreground rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-xl hover:opacity-95 active:scale-[0.98] transition-all"
                >
                  Empezar ahora <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* STEP: CONTEXT WORK */}
            {currentStep === 'context_work' && (
              <div className="space-y-8">
                <div className="space-y-2">
                  <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Tu vida profesional</h2>
                  <p className="text-on-surface-variant">Saber a qué te dedicas me ayuda a estructurar tus bloques de tiempo.</p>
                </div>

                <div className="space-y-6">
                  {/* Occupation - REQUIRED */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-primary" /> ¿A qué te dedicas? <span className="text-[10px] text-primary ml-1">(requerido)</span>
                    </label>
                    <input 
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      placeholder="Ej: Ingeniero, Estudiante, Freelancer"
                      className="w-full bg-surface-container-low rounded-xl px-4 h-12 outline-none focus:ring-2 focus:ring-primary/20 text-base border border-transparent focus:border-primary/30"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={back} className="px-6 h-16 bg-surface-container-low text-on-surface-variant rounded-2xl font-bold flex items-center justify-center">
                    Atrás
                  </button>
                  <button 
                    onClick={next} 
                    disabled={!occupation.trim()} 
                    className="flex-1 h-16 bg-primary text-primary-foreground rounded-2xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-30 transition-all shadow-lg shadow-primary/20"
                  >
                    Siguiente <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

                  </button>
                </div>
              </div>
            )}

            {/* STEP: READY */}
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
                  <p className="text-on-surface-variant text-xl">Tu asistente personal está configurado para llevarte al siguiente nivel de productividad.</p>
                </div>

                <div className="bg-surface-container-low rounded-3xl p-6 text-left space-y-4 border border-surface-container-highest">
                  <p className="text-sm font-bold uppercase tracking-widest text-primary">Resumen de tu espacio</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-on-surface-variant font-medium">Meta</p>
                      <p className="font-bold truncate">{goalText}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-on-surface-variant font-medium">Ocupación</p>
                      <p className="font-bold truncate">{occupation}</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleFinish}
                  disabled={isFinishing}
                  className="w-full h-20 primary-gradient text-primary-foreground rounded-3xl font-extrabold text-xl flex items-center justify-center gap-3 shadow-xl shadow-primary/30 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isFinishing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      Empezar <ArrowRight className="w-6 h-6" />
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OnboardingPage;
