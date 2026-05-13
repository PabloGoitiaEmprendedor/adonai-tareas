import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowRight, 
  Check, 
  Brain, 
  User, 
  Clock,
  Sparkles,
  Monitor,
  Zap,
  Lock,
  Moon,
  ShieldCheck,
  Mail
} from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';

type StepType = 'name' | 'brain_dump' | 'recurring_tasks' | 'commitment' | 'security_register' | 'ready';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user, signInAnonymously } = useAuth();
  const { updateProfile } = useProfile();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  // Steps definition
  const steps: StepType[] = ['name', 'brain_dump', 'recurring_tasks', 'commitment', 'security_register', 'ready'];
  const currentStep = steps[currentStepIndex];

  type UrgentTask = { title: string; link: string; importance: boolean; urgency: boolean };
  const defaultUrgentTask = (): UrgentTask => ({ title: '', link: '', importance: false, urgency: false });

  // State
  const [name, setName] = useState('');
  const [urgentTasks, setUrgentTasks] = useState<UrgentTask[]>([defaultUrgentTask(), defaultUrgentTask(), defaultUrgentTask()]);
  type RecurringTaskItem = { title: string; link: string; days: number[]; time: string; duration: number };
  const defaultRecurringTask = (): RecurringTaskItem => ({ title: '', link: '', days: [], time: '09:00', duration: 30 });
  const [recurringTasks, setRecurringTasks] = useState<RecurringTaskItem[]>([defaultRecurringTask(), defaultRecurringTask(), defaultRecurringTask()]);
  const [floatingActivated, setFloatingActivated] = useState(false);
  
  // Auth state
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [authSubStep, setAuthSubStep] = useState<'email' | 'code'>('email');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const ensureAnonymousUser = async (): Promise<boolean> => {
    if (user) return true;
    try {
      await signInAnonymously();
      return true;
    } catch {
      return false;
    }
  };

  const next = async () => {
    if (currentStep === 'commitment') {
      await ensureAnonymousUser();
      setCurrentStepIndex(steps.indexOf('ready'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

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

  const handleFinish = async () => {
    const hasUser = await ensureAnonymousUser();
    if (!hasUser) {
      toast.error('No se pudo iniciar sesión anónima. Revisa tu conexión.');
      return;
    }
    setIsFinishing(true);

    try {
      // 1. Update Profile
      await updateProfile.mutateAsync({
        name,
        onboarding_completed: true,
      });

      // 2. Insert Urgent Tasks
      const today = new Date().toISOString().slice(0, 10);
      const urgentRows = urgentTasks
        .filter(t => t.title.trim())
        .map((task, i) => {
          const { importance, urgency } = task;
          const priority = importance && urgency ? 'high' : importance || urgency ? 'medium' : 'low';
          return {
            user_id: user.id,
            title: task.title,
            link: task.link.trim() || null,
            importance,
            urgency,
            priority,
            due_date: today,
            source_type: 'onboarding_braindump',
            status: 'pending',
            sort_order: i,
          };
        });

      if (urgentRows.length > 0) {
        await supabase.from('tasks').insert(urgentRows);
      }

      // 3. Insert Recurring Tasks correctly (Rules + Templates)
      const recurringTasksValid = recurringTasks.filter(t => t.title.trim());
      for (const task of recurringTasksValid) {
        const days = task.days.length > 0 ? task.days : [new Date().getDay()];
        const startTimeStr = task.time + ':00';
        const [h, m] = task.time.split(':').map(Number);
        const endTotalMin = h * 60 + m + task.duration;
        const endH = Math.floor(endTotalMin / 60) % 24;
        const endM = endTotalMin % 60;
        const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
        const description = `[T:${task.time}-${endTimeStr}]`;

        const { data: rule, error: ruleErr } = await supabase
          .from('recurrence_rules')
          .insert({
            user_id: user.id,
            title: task.title,
            link: task.link.trim() || null,
            frequency: 'weekly',
            interval: 1,
            days_of_week: days,
            start_time: startTimeStr,
            estimated_minutes: task.duration,
            start_date: today,
          })
          .select()
          .single();
        
        if (ruleErr) throw ruleErr;

        // Find next valid day
        let firstDate = new Date();
        for (let i = 0; i <= 7; i++) {
          const d = new Date();
          d.setDate(d.getDate() + i);
          if (days.includes(d.getDay())) {
            firstDate = d;
            break;
          }
        }

        const y = firstDate.getFullYear();
        const mo = String(firstDate.getMonth() + 1).padStart(2, '0');
        const da = String(firstDate.getDate()).padStart(2, '0');
        const nextDateStr = `${y}-${mo}-${da}`;

        const taskData: any = {
          user_id: user.id,
          title: task.title,
          link: task.link.trim() || null,
          description,
          recurrence_id: rule.id,
          status: 'pending',
          source_type: 'onboarding_recurring',
          creation_source: 'event',
          estimated_minutes: task.duration,
        };

        // Create the template task
        await supabase.from('tasks').insert(taskData);

        // Materialize the first instance on the next valid day
        await supabase.from('tasks').insert({
          ...taskData,
          due_date: nextDateStr,
        });
      }

      // 4. Log Usage
      await supabase.from('usage_events').insert({
        user_id: user.id,
        event_type: 'onboarding_completed_relief',
      });

      // 5. Success
      localStorage.setItem('adonai_onboarding_done', 'true');
      navigate('/');
    } catch (e) {
      console.error(e);
      toast.error("Hubo un problema al guardar tu configuración.");
    } finally {
      setIsFinishing(false);
    }
  };

  const handleSendOtp = async () => {
    if (!email.trim() || !email.includes('@')) {
        toast.error('Ingresa un email válido');
        return;
    }
    setIsAuthenticating(true);
    try {
        const { error } = await supabase.auth.signInWithOtp({
            email: email.trim().toLowerCase(),
            options: { shouldCreateUser: true },
        });
        if (error) throw error;
        setAuthSubStep('code');
        toast.success('Código de seguridad enviado');
    } catch (err: any) {
        toast.error(err.message || 'Error al enviar código');
    } finally {
        setIsAuthenticating(false);
    }
  };

  const handleVerifyOtp = async (tokenOverride?: string) => {
    const token = tokenOverride || otpCode.join('');
    if (token.length !== 6) return;
    
    setIsAuthenticating(true);
    try {
        const { error } = await supabase.auth.verifyOtp({
            email: email.trim().toLowerCase(),
            token,
            type: 'email',
        });
        if (error) throw error;
        toast.success('¡Acceso verificado!');
        next();
    } catch (err: any) {
        toast.error(err.message || 'Código incorrecto');
        setOtpCode(['', '', '', '', '', '']);
    } finally {
        setIsAuthenticating(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...otpCode];
    newCode[index] = value.slice(-1);
    setOtpCode(newCode);

    if (value && index < 5) {
        otpInputRefs.current[index + 1]?.focus();
    }

    const fullToken = newCode.join('');
    if (fullToken.length === 6 && !newCode.some(d => !d)) {
        handleVerifyOtp(fullToken);
    }
  };

  const activateFloatingWindow = () => {
    if (window.electronAPI?.toggleMiniWindow) {
      window.electronAPI.toggleMiniWindow();
      setFloatingActivated(true);
      toast.success('Pestaña flotante activada.');
    } else {
      setFloatingActivated(true);
      toast.info('Modo escritorio simulado.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-6 pb-32 pt-12 selection:bg-primary/30 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] bg-secondary/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 w-full max-w-[500px] flex-1 flex flex-col">
        {/* Progress */}
        <div className="flex justify-center gap-1.5 mb-16">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-700 ease-out ${
              i === currentStepIndex ? 'w-12 bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]' : i < currentStepIndex ? 'w-4 bg-primary/40' : 'w-4 bg-surface-container-high'
            }`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex-1"
          >
            {/* STEP: NAME */}
            {currentStep === 'name' && (
              <div className="space-y-12">
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-[24px] bg-primary/10 flex items-center justify-center mb-6">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <h1 className="text-4xl font-black tracking-tight leading-tight text-foreground">
                    Hola. <br />
                    <span className="text-on-surface-variant/40">¿Cómo te llamas?</span>
                  </h1>
                </div>
                
                <div className="space-y-6">
                  <input 
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre aquí..."
                    className="w-full bg-surface-container-lowest border-2 border-outline-variant/30 focus:border-primary/50 rounded-[28px] px-8 h-20 outline-none transition-all text-2xl font-black placeholder:text-on-surface-variant/20"
                  />
                  
                  <button 
                    onClick={next}
                    disabled={!name.trim()}
                    className="w-full h-20 primary-gradient text-primary-foreground rounded-[28px] font-black text-xl flex items-center justify-center gap-3 shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:scale-100 transition-all"
                  >
                    Continuar <ArrowRight className="w-6 h-6" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP: BRAIN DUMP */}
            {currentStep === 'brain_dump' && (
              <div className="space-y-10">
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-[24px] bg-primary/10 flex items-center justify-center">
                    <Brain className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-black tracking-tight leading-tight">
                    Bienvenido, {name}. <br />
                    <span className="text-primary">Este es el fin de la culpa.</span>
                  </h2>
                  <p className="text-on-surface-variant text-lg leading-relaxed">
                    No necesitas ser disciplinado ni tener mil apps. Solo dinos: 
                    <span className="font-bold text-foreground"> ¿Qué 3 cosas te están quitando el sueño hoy?</span>
                  </p>
                </div>

                <div className="space-y-5">
                  {urgentTasks.map((task, i) => (
                    <div key={i} className="bg-surface-container-lowest border-2 border-outline-variant/30 focus-within:border-primary/50 rounded-[24px] p-1 transition-all">
                      <div className="flex items-center gap-3 px-4">
                        <span className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-xs font-black text-on-surface-variant/40 flex-shrink-0">
                          {i + 1}
                        </span>
                        <input 
                          value={task.title}
                          onChange={(e) => {
                            const newTasks = [...urgentTasks];
                            newTasks[i] = { ...newTasks[i], title: e.target.value };
                            setUrgentTasks(newTasks);
                          }}
                          placeholder={`Tarea urgente ${i + 1}...`}
                          className="flex-1 bg-transparent h-14 outline-none font-bold text-lg text-foreground placeholder:text-on-surface-variant/20"
                        />
                      </div>

                      <div className="flex items-center gap-2 px-4 pb-3 pt-1">
                        <span className="text-on-surface-variant/30 text-sm">🔗</span>
                        <input 
                          value={task.link}
                          onChange={(e) => {
                            const newTasks = [...urgentTasks];
                            newTasks[i] = { ...newTasks[i], link: e.target.value };
                            setUrgentTasks(newTasks);
                          }}
                          placeholder="Link (opcional)"
                          className="flex-1 bg-transparent h-8 outline-none text-sm text-on-surface-variant/70 placeholder:text-on-surface-variant/20"
                        />
                      </div>

                      <div className="px-4 pb-4 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              const newTasks = [...urgentTasks];
                              newTasks[i] = { ...newTasks[i], importance: !task.importance };
                              setUrgentTasks(newTasks);
                            }}
                            className={`flex flex-col items-center justify-center gap-0.5 rounded-[22px] font-black uppercase tracking-widest text-[9px] transition-all border h-16 ${
                              task.importance
                                ? 'bg-amber-500/20 text-amber-600 border-amber-500/50 shadow-lg shadow-amber-500/10'
                                : 'bg-surface text-muted-foreground border-outline-variant hover:bg-on-surface/5'
                            }`}
                          >
                            IMPORTANTE
                            <span className="text-[7px] lowercase tracking-normal font-medium opacity-60">Toca si es importante</span>
                          </button>
                          <button
                            onClick={() => {
                              const newTasks = [...urgentTasks];
                              newTasks[i] = { ...newTasks[i], urgency: !task.urgency };
                              setUrgentTasks(newTasks);
                            }}
                            className={`flex flex-col items-center justify-center gap-0.5 rounded-[22px] font-black uppercase tracking-widest text-[9px] transition-all border h-16 ${
                              task.urgency
                                ? 'bg-red-500/20 text-red-600 border-red-500/50 shadow-lg shadow-red-500/10'
                                : 'bg-surface text-muted-foreground border-outline-variant hover:bg-on-surface/5'
                            }`}
                          >
                            URGENTE
                            <span className="text-[7px] lowercase tracking-normal font-medium opacity-60">Toca si es urgente</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Priority Preview */}
                {urgentTasks.some(t => t.title.trim()) && (
                  <div className="bg-surface-container-lowest border-2 border-outline-variant/30 rounded-[24px] p-5 space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant/30">Preview de prioridad</h3>
                    <div className="space-y-1.5">
                      {urgentTasks.filter(t => t.title.trim()).map((task, i) => {
                        const isHigh = task.importance && task.urgency;
                        const isMedium = task.importance || task.urgency;
                        const label = isHigh ? 'Alta' : isMedium ? 'Media' : 'Baja';
                        const color = isHigh ? 'text-[#ff4b4b]' : isMedium ? 'text-[#ffb34b]' : 'text-on-surface-variant/40';
                        const dotColor = isHigh ? 'bg-[#ff4b4b]' : isMedium ? 'bg-[#ffb34b]' : 'bg-on-surface-variant/20';
                        return (
                          <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-container/50">
                            <span className={`w-2 h-2 rounded-full ${dotColor} ring-2 ${isHigh ? 'ring-[#ff4b4b]/20' : isMedium ? 'ring-[#ffb34b]/20' : 'ring-on-surface-variant/10'}`} />
                            <span className="flex-1 font-bold text-sm text-foreground truncate">{task.title}</span>
                            <span className={`text-[10px] font-black uppercase tracking-wider ${color}`}>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[9px] text-on-surface-variant/20 text-center italic">Así de fácil. Prioriza sin pensar.</p>
                  </div>
                )}

                <button 
                  onClick={next}
                  disabled={urgentTasks.every(t => !t.title.trim())}
                  className="w-full h-20 primary-gradient text-primary-foreground rounded-[28px] font-black text-xl flex items-center justify-center gap-3 shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30"
                >
                  Soltar carga <Zap className="w-6 h-6" />
                </button>
              </div>
            )}

            {/* STEP: RECURRING TASKS */}
            {currentStep === 'recurring_tasks' && (
              <div className="space-y-10">
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-[24px] bg-primary/10 flex items-center justify-center">
                    <Clock className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-black tracking-tight leading-tight">
                    Tus Rutinas.
                  </h2>
                  <p className="text-on-surface-variant text-lg leading-relaxed">
                    ¿Qué tareas haces todas las semanas?
                    <span className="text-on-surface-variant/40 block mt-1">(Ej: Revisar correo, Leer, Planificar)</span>
                  </p>
                </div>

                <div className="space-y-5">
                  {recurringTasks.map((task, i) => (
                    <div key={i} className="bg-surface-container-lowest border-2 border-outline-variant/30 focus-within:border-primary/50 rounded-[24px] p-4 space-y-4 transition-all">
                      {/* Title */}
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-xs font-black text-on-surface-variant/40 flex-shrink-0">
                          {i + 1}
                        </span>
                        <input 
                          value={task.title}
                          onChange={(e) => {
                            const newTasks = [...recurringTasks];
                            newTasks[i] = { ...newTasks[i], title: e.target.value };
                            setRecurringTasks(newTasks);
                          }}
                          placeholder={`Tarea recurrente ${i + 1}...`}
                          className="flex-1 bg-transparent h-12 outline-none font-bold text-lg text-foreground placeholder:text-on-surface-variant/20"
                        />
                      </div>

                      {/* Link */}
                      <div className="flex items-center gap-2 pl-11">
                        <span className="text-on-surface-variant/30 text-sm">🔗</span>
                        <input 
                          value={task.link}
                          onChange={(e) => {
                            const newTasks = [...recurringTasks];
                            newTasks[i] = { ...newTasks[i], link: e.target.value };
                            setRecurringTasks(newTasks);
                          }}
                          placeholder="Link (opcional)"
                          className="flex-1 bg-transparent h-8 outline-none text-sm text-on-surface-variant/70 placeholder:text-on-surface-variant/20"
                        />
                      </div>

                      {/* Days */}
                      <div className="pl-11 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/30">Días</p>
                        <div className="flex gap-1.5">
                          {[{label:'L',v:1},{label:'M',v:2},{label:'X',v:3},{label:'J',v:4},{label:'V',v:5},{label:'S',v:6},{label:'D',v:0}].map(d => (
                            <button
                              key={d.v}
                              onClick={() => {
                                const newTasks = [...recurringTasks];
                                const days = newTasks[i].days;
                                newTasks[i] = { 
                                  ...newTasks[i], 
                                  days: days.includes(d.v) ? days.filter((x: number) => x !== d.v) : [...days, d.v].sort()
                                };
                                setRecurringTasks(newTasks);
                              }}
                              className={`w-9 h-9 rounded-full text-[10px] font-black transition-all ${
                                task.days.includes(d.v)
                                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110'
                                  : 'bg-surface-container text-on-surface-variant/40 hover:bg-surface-container-high'
                              }`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Time + Duration */}
                      <div className="pl-11 grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/30">Hora</p>
                          <input
                            type="time"
                            value={task.time}
                            onChange={(e) => {
                              const newTasks = [...recurringTasks];
                              newTasks[i] = { ...newTasks[i], time: e.target.value };
                              setRecurringTasks(newTasks);
                            }}
                            className="w-full bg-surface border border-outline-variant/30 rounded-[14px] px-4 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:border-primary/50 transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/30">Duración</p>
                          <div className="flex gap-1">
                            {[
                              { label: '15m', value: 15 },
                              { label: '30m', value: 30 },
                              { label: '1h', value: 60 },
                            ].map(p => (
                              <button
                                key={p.value}
                                onClick={() => {
                                  const newTasks = [...recurringTasks];
                                  newTasks[i] = { ...newTasks[i], duration: p.value };
                                  setRecurringTasks(newTasks);
                                }}
                                className={`flex-1 py-2.5 rounded-[14px] text-[10px] font-black transition-all border ${
                                  task.duration === p.value
                                    ? 'bg-primary/15 text-primary border-primary/30'
                                    : 'bg-surface text-on-surface-variant/40 border-outline-variant/30 hover:bg-surface-container'
                                }`}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Calendar hint */}
                <p className="text-center text-xs text-on-surface-variant/30 italic">
                  Estas tareas aparecerán automáticamente en tu calendario con la hora y duración que elegiste.
                </p>

                <div className="flex gap-4">
                  <button onClick={back} className="px-8 h-20 bg-surface-container-lowest border-2 border-outline-variant/30 text-on-surface-variant font-black rounded-[28px] hover:bg-surface-container-low transition-colors">
                    Atrás
                  </button>
                  <button 
                    onClick={next}
                    disabled={recurringTasks.every(t => !t.title.trim())}
                    className="flex-1 h-20 primary-gradient text-primary-foreground rounded-[28px] font-black text-xl flex items-center justify-center gap-3 shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30"
                  >
                    Fijar rutinas <Check className="w-6 h-6" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP: COMMITMENT */}
            {currentStep === 'commitment' && (
              <div className="space-y-12">
                <div className="space-y-6">
                  <div className="w-16 h-16 rounded-[24px] bg-primary/10 flex items-center justify-center">
                    <Lock className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-4xl font-black tracking-tight leading-tight">
                    Listo, {name.split(' ')[0]}.
                  </h2>
                  <p className="text-2xl font-medium text-on-surface-variant leading-relaxed">
                    Estas tareas se quedan aquí <span className="text-primary font-black">flotando contigo.</span> No tienes que abrir nada más.
                  </p>
                  <p className="text-lg text-on-surface-variant/60 bg-surface-container-low p-6 rounded-[24px] border border-outline-variant/20 italic">
                    "Ahora, cierra Notion, tu agenda, notas y todas esas pestañas. Enfócate. Siempre estaré aquí en tu ordenador."
                  </p>
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={activateFloatingWindow}
                    className={`w-full h-20 rounded-[28px] font-black text-xl flex items-center justify-center gap-3 transition-all ${
                      floatingActivated 
                        ? 'bg-primary/10 text-primary border-2 border-primary/40' 
                        : 'bg-foreground text-background hover:scale-[1.02]'
                    }`}
                  >
                    <Monitor className="w-6 h-6" />
                    {floatingActivated ? 'Ventana Activada' : 'Activar Ventana Flotante'}
                  </button>

                  <button 
                    onClick={next}
                    className="w-full h-16 text-on-surface-variant/40 font-black uppercase tracking-widest text-[10px] hover:text-primary transition-colors"
                  >
                    Continuar al resumen
                  </button>
                </div>
              </div>
            )}
            {/* STEP: SECURITY REGISTER */}
            {currentStep === 'security_register' && (
              <div className="space-y-10">
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-[24px] bg-primary/10 flex items-center justify-center">
                    <ShieldCheck className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-black tracking-tight leading-tight">
                    El Registro "Por Seguridad".
                  </h2>
                  <p className="text-on-surface-variant text-lg leading-relaxed">
                    Para que no pierdas tus tareas si cierras el ordenador o cambias de equipo, ¿dónde te enviamos tu acceso único?
                  </p>
                </div>

                <div className="space-y-6">
                  {authSubStep === 'email' ? (
                    <div className="space-y-6">
                      <input 
                        autoFocus
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                        placeholder="tu@email.com"
                        className="w-full bg-surface-container-lowest border-2 border-outline-variant/30 focus:border-primary/50 rounded-[24px] px-8 h-20 outline-none transition-all text-xl font-bold placeholder:text-on-surface-variant/20"
                      />
                      <button 
                        onClick={handleSendOtp}
                        disabled={isAuthenticating || !email.includes('@')}
                        className="w-full h-20 primary-gradient text-primary-foreground rounded-[28px] font-black text-xl flex items-center justify-center gap-3 shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30"
                      >
                        {isAuthenticating ? 'Enviando...' : 'Proteger mis tareas'} <Mail className="w-6 h-6" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                        <p className="text-center text-sm font-bold text-on-surface-variant/60">Ingresa el código enviado a <br/><span className="text-primary">{email}</span></p>
                        <div className="flex gap-2 justify-center">
                            {otpCode.map((digit, i) => (
                                <input
                                    key={i}
                                    ref={(el) => { otpInputRefs.current[i] = el; }}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleOtpChange(i, e.target.value)}
                                    className="w-12 h-16 text-center text-2xl font-black bg-surface-container-lowest border-2 border-outline-variant/30 rounded-2xl text-foreground focus:outline-none focus:border-primary transition-all"
                                />
                            ))}
                        </div>
                        <button 
                            onClick={() => setAuthSubStep('email')}
                            className="w-full text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 hover:text-primary transition-colors"
                        >
                            Cambiar email
                        </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP: READY */}
            {currentStep === 'ready' && (
              <div className="text-center space-y-12 py-8">
                <div className="relative mx-auto w-32 h-32">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 12, stiffness: 200 }}
                    className="w-full h-full rounded-full primary-gradient flex items-center justify-center shadow-[0_20px_50px_rgba(var(--primary-rgb),0.3)]"
                  >
                    <Sparkles className="w-14 h-14 text-primary-foreground" />
                  </motion.div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-4xl font-black tracking-tight text-foreground">Estás en control.</h2>
                  <p className="text-on-surface-variant text-xl px-4">Tu carga mental ahora vive en Adonai. Relájate y empieza con la primera tarea.</p>
                </div>

                <button 
                  onClick={handleFinish}
                  disabled={isFinishing}
                  className="w-full h-24 primary-gradient text-primary-foreground rounded-[32px] font-black text-2xl flex items-center justify-center gap-4 shadow-2xl shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isFinishing ? (
                    <div className="w-8 h-8 border-4 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>Entrar al flujo <Zap className="w-8 h-8" /></>
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
