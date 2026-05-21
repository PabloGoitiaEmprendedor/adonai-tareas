import { useRef, useState, type ClipboardEvent, type Dispatch, type KeyboardEvent, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Clipboard, Clock, Download, Link2, Lock, Mail, Monitor, ShieldCheck, Smartphone, Sparkles, Trash2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { saveAnonymousUserId, getPreviousAnonymousUserId, migrateAnonymousData } from '@/lib/anonymousSession';
import { startGuidedDownload } from '@/lib/downloadGuide';

type StepType = 'name' | 'brain_dump' | 'recurring_tasks' | 'commitment' | 'security_register' | 'ready';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const [showWebChoiceModal, setShowWebChoiceModal] = useState(false);
  const [showEmailAuthModal, setShowEmailAuthModal] = useState(false);

  // Steps definition
  const steps: StepType[] = ['name', 'brain_dump', 'recurring_tasks', 'commitment', 'ready'];
  const currentStep = steps[currentStepIndex];

  type UrgentTask = { title: string; link: string; importance: boolean; urgency: boolean };
  const defaultUrgentTask = (): UrgentTask => ({ title: '', link: '', importance: false, urgency: false });

  // State
  const [name, setName] = useState('');
  const [urgentTasks, setUrgentTasks] = useState<UrgentTask[]>([defaultUrgentTask(), defaultUrgentTask(), defaultUrgentTask()]);
  type RecurringTaskItem = { title: string; time: string; duration: number };
  const defaultRecurringTask = (): RecurringTaskItem => ({ title: '', time: '08:00', duration: 30 });
  const [recurringTasks, setRecurringTasks] = useState<RecurringTaskItem[]>([defaultRecurringTask(), defaultRecurringTask()]);
  const [floatingActivated, setFloatingActivated] = useState(false);
  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
  const hasUrgentTask = urgentTasks.some(t => t.title.trim());
  const hasRecurringTask = recurringTasks.some(t => t.title.trim());
  const preferredDownloadPlatform = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform) ? 'mac' : 'win';

  const handleLinkPaste = <T extends { link: string }>(
    event: ClipboardEvent<HTMLInputElement>,
    setItems: Dispatch<SetStateAction<T[]>>,
    index: number
  ) => {
    const pasted = event.clipboardData.getData('text/plain') || event.clipboardData.getData('text') || '';
    if (!pasted.trim()) return;
    event.preventDefault();
    setItems((current) => {
      const next = [...current];
      next[index] = { ...next[index], link: pasted.trim() };
      return next;
    });
  };

  // Auth state
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [authSubStep, setAuthSubStep] = useState<'email' | 'code'>('email');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const ensureAnonymousUser = async (): Promise<string> => {
    if (user) return user.id;
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) {
      localStorage.setItem('adonai_had_session', 'true');
      localStorage.setItem('adonai_session_type', 'anonymous');
      saveAnonymousUserId(sessionData.session.user.id);
      return sessionData.session.user.id;
    }
    const oldUserId = getPreviousAnonymousUserId();
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw new Error(error.message);
    if (!data.session?.user?.id) throw new Error('No se pudo crear sesión anónima');
    localStorage.setItem('adonai_had_session', 'true');
    localStorage.setItem('adonai_session_type', 'anonymous');
    saveAnonymousUserId(data.session.user.id);
    const newUserId = data.session.user.id;
    // Esperar a que AuthContext sincronice la nueva sesión
    for (let i = 0; i < 30; i++) {
      const { data: check } = await supabase.auth.getSession();
      if (check.session?.user?.id === newUserId) break;
      await new Promise(r => setTimeout(r, 100));
    }
    // Migrate data from previous expired anonymous session if needed
    if (oldUserId && oldUserId !== newUserId) {
      console.log('[onboarding] Migrating data from previous anonymous session');
      migrateAnonymousData(oldUserId, newUserId).then((ok) => {
        if (ok) console.log('[onboarding] Data migration complete');
      });
    }
    return newUserId;
  };

  const next = async () => {
    if (currentStep === 'commitment' || (isMobile && currentStep === 'recurring_tasks')) {
      try {
        await ensureAnonymousUser();
      } catch (e: any) {
        console.error('[onboarding] next ensureAnonymousUser error:', e);
      }
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
      let prev = currentStepIndex - 1;
      if (isMobile && steps[prev] === 'commitment') prev--;
      setCurrentStepIndex(prev);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFinish = async () => {
    setShowWebChoiceModal(false);
    setShowEmailAuthModal(false);
    let userId: string;
    try {
      userId = await ensureAnonymousUser();
    } catch (e: any) {
      toast.error(`Error: ${e.message || 'No se pudo iniciar sesión anónima'}`);
      return;
    }
    setIsFinishing(true);

    console.log('[onboarding] handleFinish userId:', userId, 'auth user:', user?.id);

    try {
      // 1. Update Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ name, onboarding_completed: true })
        .eq('user_id', userId);
      if (profileError) throw profileError;

      // 2. Insert Urgent Tasks
      const today = new Date().toISOString().slice(0, 10);
      const urgentRows = urgentTasks
        .filter(t => t.title.trim())
        .map((task, i) => {
          const { importance, urgency } = task;
          const priority = importance && urgency ? 'high' : importance || urgency ? 'medium' : 'low';
          return {
            user_id: userId,
            title: task.title,
            link: task.link.trim() || null,
            importance,
            urgency,
            priority,
            due_date: today,
            source_type: 'text',
            status: 'pending',
            sort_order: i,
          };
        });

      if (urgentRows.length > 0) {
        const { error: urgentErr } = await supabase.from('tasks').insert(urgentRows);
        if (urgentErr) throw urgentErr;
      }

      // 3. Insert Recurring Tasks correctly (Rules + Templates)
      const recurringTasksValid = recurringTasks.filter(t => t.title.trim());
      for (const task of recurringTasksValid) {
        const days = [0, 1, 2, 3, 4, 5, 6];
        const [h, m] = task.time.split(':').map(Number);
        const endTotalMin = h * 60 + m + task.duration;
        const description = `[T:${task.time}-${String(Math.floor(endTotalMin / 60) % 24).padStart(2, '0')}:${String(endTotalMin % 60).padStart(2, '0')}]`;

        const { data: rule, error: ruleErr } = await supabase
          .from('recurrence_rules')
          .insert({
            user_id: userId,
            frequency: 'weekly',
            interval: 1,
            days_of_week: days,
            start_date: today,
          })
          .select()
          .single();
        
        if (ruleErr) throw ruleErr;

        const { error: taskErr } = await supabase.from('tasks').insert({
          user_id: userId,
          title: task.title,
          description,
          recurrence_id: rule.id,
          status: 'pending',
          source_type: 'text',
          estimated_minutes: task.duration,
        });
        if (taskErr) throw taskErr;
      }

      // 4. Log Usage
      const { error: usageErr } = await supabase.from('usage_events').insert({
        user_id: userId,
        event_type: 'onboarding_completed_relief',
      });
      if (usageErr) console.warn('[onboarding] Failed to log usage:', usageErr.message);

      // 5. Success
      localStorage.setItem('adonai_onboarding_done', 'true');
      navigate('/');
    } catch (e) {
      console.error('[onboarding] handleFinish error:', e);
      const msg = typeof e === 'object' && e !== null ? (e as any).message || JSON.stringify(e) : String(e);
      toast.error(`Error: ${msg}`);
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
        await handleFinish();
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

  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const digits = text.replace(/\D/g, '').slice(0, 6).split('');
      const newCode = ['', '', '', '', '', ''];
      digits.forEach((d, i) => { newCode[i] = d; });
      setOtpCode(newCode);
      if (digits.length === 6) {
        handleVerifyOtp(newCode.join(''));
      } else if (digits.length > 0) {
        otpInputRefs.current[digits.length]?.focus();
      }
    } catch {}
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

  const handleEnterContinue = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || isMobile) return;

    if (currentStep === 'name' && name.trim()) {
      event.preventDefault();
      next();
    }

    if (currentStep === 'brain_dump' && hasUrgentTask) {
      event.preventDefault();
      next();
    }

    if (currentStep === 'recurring_tasks') {
      event.preventDefault();
      next();
    }
  };

  const updateRecurringTask = (index: number, updates: Partial<RecurringTaskItem>) => {
    setRecurringTasks((current) => {
      const next = [...current];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const addDailyActivity = () => {
    setRecurringTasks((current) => [...current, defaultRecurringTask()]);
  };

  const quickDurations = [
    { label: '15m', value: 15 },
    { label: '30m', value: 30 },
    { label: '45m', value: 45 },
    { label: '1h', value: 60 },
  ];

  const removeUrgentTask = (index: number) => {
    if (index < 3) return;
    setUrgentTasks((current) => current.filter((_, i) => i !== index));
  };

  const urgentPreviewRows = urgentTasks
    .map((task, index) => ({ ...task, index }))
    .filter((task) => task.title.trim())
    .sort((a, b) => {
      const rankA = a.importance && a.urgency ? 0 : a.urgency ? 1 : a.importance ? 2 : 3;
      const rankB = b.importance && b.urgency ? 0 : b.urgency ? 1 : b.importance ? 2 : 3;
      if (rankA !== rankB) return rankA - rankB;
      return a.index - b.index;
    });

  const renderAccessChoiceModal = () => (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/55 px-4 py-4 backdrop-blur-md sm:items-center">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md overflow-hidden rounded-[28px] border border-outline-variant/15 bg-surface-container-low shadow-2xl"
      >
        <div className="relative overflow-hidden px-6 pb-6 pt-7 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(91,124,250,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(111,207,151,0.10),transparent_30%)]" />
          <div className="relative space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] border border-primary/20 bg-primary/10">
              <img src="/logo.png" alt="Adonai" className="h-9 w-9 rounded-[18px] object-contain" />
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-on-surface-variant/45">Tu acceso en la web</p>
              <h3 className="text-2xl font-black tracking-tight text-foreground">¿Quieres tener tus tareas siempre contigo?</h3>
              <p className="mx-auto max-w-sm text-sm leading-relaxed text-on-surface-variant/70">
                Inicia sesión y llévalas a cualquier equipo. O entra como invitado — tus tareas se quedan en este navegador.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-3 px-4 pb-4">
          <button
            type="button"
            onClick={() => {
              setShowWebChoiceModal(false);
              setAuthSubStep('email');
              setShowEmailAuthModal(true);
            }}
            className="w-full rounded-[22px] border border-primary/20 bg-primary/10 px-4 py-4 text-left transition-colors hover:bg-primary/15"
          >
            <span className="block text-sm font-black text-primary">Iniciar sesión <span className="text-[9px] font-black uppercase tracking-widest text-primary/60 ml-2">Recomendado</span></span>
            <span className="mt-1 block text-xs font-semibold text-on-surface-variant/65">Tus tareas en cualquier equipo.</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setShowWebChoiceModal(false);
              void handleFinish();
            }}
            className="w-full rounded-[22px] border border-outline-variant/20 bg-surface-container-high px-4 py-4 text-left transition-colors hover:bg-surface-container-highest"
          >
            <span className="block text-sm font-black text-foreground">Entrar como invitado</span>
            <span className="mt-1 block text-xs font-semibold text-on-surface-variant/60">Empieza sin correo y decide después.</span>
          </button>
          <button
            type="button"
            onClick={() => setShowWebChoiceModal(false)}
            className="mx-auto block px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-on-surface-variant/35 hover:text-on-surface-variant/70 transition-colors"
          >
            Volver
          </button>
        </div>
      </motion.div>
    </div>
  );

  const renderEmailAuthModal = () => (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 px-4 py-4 backdrop-blur-md sm:items-center">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md overflow-hidden rounded-[28px] border border-outline-variant/15 bg-surface-container-low shadow-2xl"
      >
        <div className="relative px-6 pb-6 pt-7 text-center">
          <div className="space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] border border-primary/20 bg-primary/10">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-on-surface-variant/45">Protege tus tareas</p>
              <h3 className="text-2xl font-black tracking-tight text-foreground">Inicia sesión con tu correo</h3>
              <p className="mx-auto max-w-sm text-sm leading-relaxed text-on-surface-variant/70">
                Así guardas tu progreso aunque cambies de equipo. Si quieres, puedes cerrar esto y entrar como invitado.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-4 px-4 pb-4">
          {authSubStep === 'email' ? (
            <div className="space-y-4">
              <input
                autoFocus
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                placeholder="tu@email.com"
                className="w-full rounded-[24px] border-2 border-outline-variant/30 bg-surface-container-lowest px-5 h-16 outline-none transition-all text-base font-bold placeholder:text-on-surface-variant/50 focus:border-primary/70"
              />
              <button
                onClick={handleSendOtp}
                disabled={isAuthenticating || !email.includes('@')}
                className="w-full h-16 primary-gradient text-primary-foreground rounded-[24px] font-black text-base flex items-center justify-center gap-3 shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAuthenticating ? 'Enviando…' : 'Proteger mis tareas'} <Mail className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-sm font-bold text-on-surface-variant/80">Ingresa el código enviado a <br /><span className="text-primary">{email}</span></p>
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
                <button
                  onClick={handlePasteCode}
                  className="w-12 h-16 flex items-center justify-center rounded-2xl border-2 border-dashed border-outline-variant/30 text-on-surface-variant/50 hover:text-primary hover:border-primary/40 transition-all"
                  title="Pegar código"
                >
                  <Clipboard className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={() => setAuthSubStep('email')}
                className="w-full text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70 hover:text-primary transition-colors"
              >
                Cambiar email
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setShowEmailAuthModal(false);
              setAuthSubStep('email');
            }}
            className="mx-auto block px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-on-surface-variant/35 hover:text-on-surface-variant/70 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-6 pb-32 pt-12 selection:bg-primary/30 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,10,18,0.92)_0%,rgba(11,16,28,0.98)_100%)]"
        />
        <motion.div
          aria-hidden="true"
          animate={{ opacity: [0.58, 0.72, 0.58], scale: [1, 1.02, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(91,124,250,0.13),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(111,207,151,0.09),transparent_32%),radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.05),transparent_24%)]"
        />
        <motion.div
          aria-hidden="true"
          animate={{ x: ['-6%', '6%', '-6%'] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-x-0 top-[-8%] h-[55%] bg-[linear-gradient(120deg,transparent_0%,rgba(91,124,250,0.10)_35%,rgba(255,255,255,0.04)_55%,transparent_100%)] blur-3xl"
        />
        <motion.div
          aria-hidden="true"
          animate={{ x: ['6%', '-6%', '6%'] }}
          transition={{ duration: 36, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-x-0 bottom-[-14%] h-[42%] bg-[linear-gradient(90deg,transparent_0%,rgba(111,207,151,0.08)_35%,rgba(91,124,250,0.06)_65%,transparent_100%)] blur-3xl"
        />
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:52px_52px] [mask-image:linear-gradient(180deg,transparent_0%,black_18%,black_82%,transparent_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-[500px] flex-1 flex flex-col">
        {/* Progress */}
        <div className="mb-14 space-y-4">
          <p className="text-center text-[10px] font-black uppercase tracking-[0.24em] text-on-surface-variant/50">
            Paso {currentStepIndex + 1} de {steps.length}
          </p>
          <div className="flex justify-center gap-1.5">
            {steps.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-700 ease-out ${
                i === currentStepIndex ? 'w-12 bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]' : i < currentStepIndex ? 'w-4 bg-primary/40' : 'w-4 bg-surface-container-high'
              }`} />
            ))}
          </div>
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
              <div className="space-y-12 text-center">
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-[24px] bg-primary/10 flex items-center justify-center mb-6 mx-auto">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <h1 className="page-title leading-tight text-foreground">
                    Hola. <br />
                    <span className="text-foreground/70">¿Cómo te llamas?</span>
                  </h1>
                  <p className="text-on-surface-variant/70 text-base font-semibold leading-relaxed max-w-lg mx-auto">
                    En dos minutos sacas lo pendiente de tu cabeza y entras con tu primer dia armado.
                  </p>
                </div>
                
                <div className="space-y-6">
                  <input 
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleEnterContinue}
                    placeholder="Tu nombre aquí…"
                    className="w-full bg-surface-container-lowest border-2 border-outline-variant/40 focus:border-primary/70 rounded-[28px] px-8 h-20 outline-none transition-all text-2xl font-black placeholder:text-foreground/55"
                  />
                  
                  <button 
                    onClick={next}
                    disabled={!name.trim()}
                    className={`w-full h-20 rounded-[28px] font-black text-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
                      name.trim()
                        ? 'primary-gradient text-primary-foreground shadow-2xl shadow-primary/30 hover:scale-[1.02]'
                        : 'bg-surface-container-high text-on-surface-variant/80 shadow-none cursor-not-allowed'
                    }`}
                  >
                    Continuar <ArrowRight className="w-6 h-6" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP: BRAIN DUMP */}
            {currentStep === 'brain_dump' && (
              <div className="space-y-8 text-center">
                <div className="space-y-5">
                  <div className="w-16 h-16 rounded-[24px] bg-white/6 border border-white/10 flex items-center justify-center mx-auto shadow-[0_12px_30px_rgba(0,0,0,0.14)]">
                    <ShieldCheck className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-black tracking-tight leading-tight max-w-md mx-auto">
                    Bienvenido, {name}.
                  </h2>
                  <p className="text-primary text-xl font-black leading-tight max-w-lg mx-auto">
                    Vacia tu cabeza sin presion.
                  </p>
                  <p className="text-on-surface-variant text-lg leading-relaxed max-w-xl mx-auto">
                    Anota 3 pendientes y toca el boton correspondiente para priorizarlo.
                  </p>
                </div>

                <div className="space-y-5 text-left">
                  {urgentTasks.map((task, i) => (
                    <div key={i} className="relative bg-surface-container-lowest border-2 border-outline-variant/30 focus-within:border-primary/50 rounded-[24px] p-1 transition-all">
                      {i >= 3 && (
                        <button
                          type="button"
                          onClick={() => removeUrgentTask(i)}
                          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/20 bg-surface-container-high/70 text-on-surface-variant/50 transition-colors hover:text-foreground hover:bg-surface-container-high"
                          aria-label={`Eliminar tarea ${i + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <div className="flex items-center gap-3 px-4">
                        <span className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-xs font-black text-on-surface-variant/70 flex-shrink-0">
                          {i + 1}
                        </span>
                        <input
                          value={task.title}
                          onChange={(e) => {
                            const newTasks = [...urgentTasks];
                            newTasks[i] = { ...newTasks[i], title: e.target.value };
                            setUrgentTasks(newTasks);
                          }}
                          onKeyDown={handleEnterContinue}
                          placeholder={`Tarea ${i + 1}...`}
                          className="flex-1 bg-transparent h-14 outline-none font-bold text-lg text-foreground placeholder:text-on-surface-variant/50"
                        />
                      </div>

                      <div className="flex items-center gap-2 px-4 pb-3 pt-1">
                        <Link2 className="h-4 w-4 text-on-surface-variant/55" />
                        <input
                          value={task.link}
                          onChange={(e) => {
                            const newTasks = [...urgentTasks];
                            newTasks[i] = { ...newTasks[i], link: e.target.value };
                            setUrgentTasks(newTasks);
                          }}
                          onPaste={(e) => handleLinkPaste(e, setUrgentTasks, i)}
                          autoComplete="off"
                          spellCheck={false}
                          onKeyDown={handleEnterContinue}
                          placeholder="Link (opcional)"
                          className="flex-1 bg-transparent h-8 outline-none text-sm text-on-surface-variant/80 placeholder:text-on-surface-variant/50"
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
                            <span className="text-[8px] lowercase tracking-normal font-semibold opacity-75">Toca si es importante</span>
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
                            <span className="text-[8px] lowercase tracking-normal font-semibold opacity-75">Toca si es urgente</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setUrgentTasks((current) => [...current, defaultUrgentTask()])}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-black text-on-surface-variant/50 transition-colors hover:text-on-surface-variant/80"
                  >
                    <span className="text-base leading-none">+</span>
                    Agregar otro pendiente
                  </button>
                </div>

                {urgentPreviewRows.length > 0 && (
                  <div className="bg-surface-container-lowest border-2 border-outline-variant/30 rounded-[24px] p-5 space-y-3 text-left">
                    <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant/60">Preview de prioridad</h3>
                    <div className="space-y-1.5">
                      {urgentPreviewRows.map((task, i) => {
                        const isHigh = task.importance && task.urgency;
                        const isMedium = task.importance || task.urgency;
                        const label = isHigh ? 'Alta' : isMedium ? 'Media' : 'Baja';
                        const color = isHigh ? 'text-[#ff4b4b]' : isMedium ? 'text-[#ffb34b]' : 'text-on-surface-variant/70';
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
                    <p className="text-[9px] text-on-surface-variant/60 text-center italic">Asi de facil. Prioriza sin pensar.</p>
                  </div>
                )}

                <button
                  onClick={next}
                  disabled={!hasUrgentTask}
                  className="w-full h-20 primary-gradient text-primary-foreground rounded-[28px] font-black text-xl flex items-center justify-center gap-3 shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Soltar carga
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="mx-auto block px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-on-surface-variant/35 hover:text-on-surface-variant/70 transition-colors"
                >
                  Saltar
                </button>
              </div>
            )}
            {/* STEP: RECURRING TASKS */}
            {currentStep === 'recurring_tasks' && (
              <div className="space-y-8 text-center">
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-[24px] bg-primary/10 flex items-center justify-center mx-auto">
                    <Clock className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-black tracking-tight leading-tight">
                    Actividades diarias
                  </h2>
                  <p className="text-on-surface-variant text-lg leading-relaxed max-w-xl mx-auto">
                    {`¿Qué actividades haces cada día?`}
                    <span className="text-on-surface-variant/70 block mt-1">(Ej: Revisar correo, Leer, Planificar)</span>
                  </p>
                  <div className="rounded-[22px] border border-primary/20 bg-primary/10 p-4 text-sm font-bold leading-relaxed text-primary max-w-xl mx-auto">
                    Todo lo que agregues aqui se pone en tu calendario diario con nombre, hora y duracion.
                  </div>
                </div>

                <div className="space-y-4 text-left">
                  {recurringTasks.map((task, i) => (
                    <div key={i} className="bg-surface-container-lowest border-2 border-outline-variant/30 focus-within:border-primary/50 rounded-[24px] p-4 space-y-5 transition-all">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-xs font-black text-on-surface-variant/70 flex-shrink-0">
                          {i + 1}
                        </span>
                        <input
                          value={task.title}
                          onKeyDown={handleEnterContinue}
                          onChange={(e) => updateRecurringTask(i, { title: e.target.value })}
                          placeholder={`Actividad diaria ${i + 1}...`}
                          className="flex-1 bg-transparent h-12 outline-none font-bold text-lg text-foreground placeholder:text-on-surface-variant/50"
                        />
                      </div>
                      <p className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant/45">
                        Nombre del evento que verás en tu calendario
                      </p>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Hora</p>
                          <input
                            type="time"
                            onKeyDown={handleEnterContinue}
                            value={task.time}
                            onChange={(e) => updateRecurringTask(i, { time: e.target.value })}
                            className="h-11 rounded-2xl border border-outline-variant/20 bg-surface-container px-4 text-sm font-black text-foreground outline-none focus:border-primary/50"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Duracion</p>
                          <div className="grid grid-cols-4 gap-2">
                          {quickDurations.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => updateRecurringTask(i, { duration: option.value })}
                              className={`h-11 rounded-2xl border px-3 text-[11px] font-black transition-all ${
                                task.duration === option.value
                                  ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                  : 'border-outline-variant/20 bg-surface-container text-on-surface-variant hover:border-primary/40 hover:text-foreground'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addDailyActivity}
                  className="w-full h-14 rounded-[22px] border border-dashed border-primary/35 bg-primary/5 text-primary font-black text-sm hover:bg-primary/10 transition-colors"
                >
                  + Agregar otra actividad diaria
                </button>

                <div className="space-y-3">
                  <button
                    onClick={isMobile ? handleFinish : next}
                    disabled={isFinishing}
                    className="w-full h-20 primary-gradient text-primary-foreground rounded-[28px] font-black text-xl flex items-center justify-center gap-3 shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isFinishing ? (
                      <div className="w-6 h-6 border-3 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      <>Soltar carga</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={isMobile ? handleFinish : next}
                    className="mx-auto block px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-on-surface-variant/35 hover:text-on-surface-variant/70 transition-colors"
                  >
                    Saltar
                  </button>
                </div>
              </div>
            )}
            {/* STEP: COMMITMENT */}
            {currentStep === 'commitment' && (
              <div className="space-y-10 text-center">
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-[24px] bg-primary/10 flex items-center justify-center mx-auto">
                    <Lock className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-4xl font-black tracking-tight leading-tight">
                    Todo listo, {name.split(' ')[0]}.
                  </h2>
                  <p className="text-2xl font-medium text-on-surface-variant leading-relaxed max-w-2xl mx-auto">
                    Tu flujo ya esta armado. En la web puedes explorar y seguir capturando ideas. En la app de escritorio se activa la mini ventana.
                  </p>
                </div>

                <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-[28px] border border-outline-variant/15 bg-surface-container-low shadow-2xl shadow-black/20">
                  <video
                    src="/videos/principal.mp4"
                    className="h-[220px] w-full object-cover sm:h-[260px]"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                </div>

                <div className="space-y-4">
                  {isElectron ? (
                    <button 
                      onClick={activateFloatingWindow}
                      className={`w-full h-20 rounded-[28px] font-black text-xl flex items-center justify-center gap-3 transition-all ${
                        floatingActivated 
                          ? 'bg-primary/10 text-primary border-2 border-primary/40' 
                          : 'bg-foreground text-background hover:scale-[1.02]'
                      }`}
                    >
                      <Monitor className="w-6 h-6" />
                      {floatingActivated ? 'Ventana activada' : 'Activar mini ventana'}
                    </button>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button 
                        onClick={() => startGuidedDownload(preferredDownloadPlatform === 'mac' ? 'mac' : 'win')}
                        className="w-full h-20 rounded-[28px] font-black text-xl flex items-center justify-center gap-3 transition-all bg-foreground text-background hover:scale-[1.02]"
                      >
                        <Monitor className="w-6 h-6" />
                        Descargar {preferredDownloadPlatform === 'mac' ? 'Mac' : 'Windows'}
                      </button>
                      <button 
                        onClick={() => startGuidedDownload(preferredDownloadPlatform === 'mac' ? 'win' : 'mac')}
                        className="w-full h-20 rounded-[28px] font-black text-xl flex items-center justify-center gap-3 transition-all bg-surface-container-high text-foreground border border-outline-variant/20 hover:bg-surface-container-highest hover:scale-[1.02]"
                      >
                        <Monitor className="w-6 h-6" />
                        Descargar {preferredDownloadPlatform === 'mac' ? 'Windows' : 'Mac'}
                      </button>
                    </div>
                  )}

                  <button 
                    onClick={() => setShowWebChoiceModal(true)}
                    className="w-full h-16 rounded-[24px] border border-outline-variant/15 bg-surface-container-low/70 text-on-surface-variant/70 font-black uppercase tracking-widest text-[10px] hover:text-primary transition-colors"
                  >
                    Seguir en la web
                  </button>
                  <button
                    type="button"
                    onClick={handleFinish}
                    className="mx-auto block px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-on-surface-variant/35 hover:text-on-surface-variant/70 transition-colors"
                  >
                    Saltar
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
                        className="w-full bg-surface-container-lowest border-2 border-outline-variant/40 focus:border-primary/70 rounded-[24px] px-8 h-20 outline-none transition-all text-xl font-bold placeholder:text-on-surface-variant/50"
                      />
                      <button 
                        onClick={handleSendOtp}
                        disabled={isAuthenticating || !email.includes('@')}
                        className="w-full h-20 primary-gradient text-primary-foreground rounded-[28px] font-black text-xl flex items-center justify-center gap-3 shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAuthenticating ? 'Enviando…' : 'Proteger mis tareas'} <Mail className="w-6 h-6" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                        <p className="text-center text-sm font-bold text-on-surface-variant/80">Ingresa el código enviado a <br/><span className="text-primary">{email}</span></p>
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
                            className="w-full text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70 hover:text-primary transition-colors"
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
              <div className="space-y-10 text-center py-6">
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-[24px] bg-primary/10 flex items-center justify-center mx-auto">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-4xl font-black tracking-tight leading-tight">
                    Elige cómo usarlo, {name.split(' ')[0]}.
                  </h2>
                  <p className="text-lg font-medium text-on-surface-variant leading-relaxed max-w-xl mx-auto">
                    {isMobile
                      ? "Agrega Adonai a tu pantalla de inicio para acceder siempre con 1 toque."
                      : "Descarga la app de escritorio y desbloquea la mini ventana. O empieza ya en la web — puedes descargarla después cuando quieras."}
                  </p>
                </div>

                <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-[28px] border border-outline-variant/15 bg-surface-container-low shadow-2xl shadow-black/20">
                  <video
                    src="/videos/principal.mp4"
                    className="h-[200px] w-full object-cover sm:h-[240px]"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                </div>

                <div className="space-y-3 max-w-md mx-auto">
                  {isElectron ? (
                    <button 
                      onClick={activateFloatingWindow}
                      className={`w-full h-20 rounded-[28px] font-black text-xl flex items-center justify-center gap-3 transition-all ${
                        floatingActivated 
                          ? 'bg-primary/10 text-primary border-2 border-primary/40' 
                          : 'bg-foreground text-background hover:scale-[1.02]'
                      }`}
                    >
                      <Monitor className="w-6 h-6" />
                      {floatingActivated ? 'Ventana activada' : 'Activar mini ventana'}
                    </button>
                  ) : isMobile ? (
                    <button
                      onClick={handleFinish}
                      className="w-full h-20 rounded-[28px] font-black text-xl flex items-center justify-center gap-3 transition-all bg-foreground text-background hover:scale-[1.02]"
                    >
                      <Smartphone className="w-6 h-6" />
                      Ir a la app
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <button
                        onClick={() => startGuidedDownload(preferredDownloadPlatform === 'mac' ? 'mac' : 'win')}
                        className="w-full h-20 rounded-[28px] font-black text-xl flex items-center justify-center gap-3 transition-all bg-foreground text-background hover:scale-[1.02]"
                      >
                        <Download className="w-6 h-6" />
                        Descargar para {preferredDownloadPlatform === 'mac' ? 'Mac' : 'Windows'}
                      </button>
                      <p className="text-xs font-semibold text-on-surface-variant/50 leading-relaxed">
                        La mini ventana está disponible <span className="text-primary">solo en la app de escritorio</span>. Tendrás Adonai siempre visible mientras trabajas.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => setShowWebChoiceModal(true)}
                    className="w-full h-14 rounded-[24px] border border-outline-variant/15 bg-surface-container-low/50 text-on-surface-variant/60 font-bold text-sm hover:text-primary hover:border-primary/30 transition-colors"
                  >
                    Seguir en la web
                  </button>

                  <button
                    type="button"
                    onClick={handleFinish}
                    className="mx-auto block px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-on-surface-variant/35 hover:text-on-surface-variant/70 transition-colors"
                  >
                    Saltar
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      {showWebChoiceModal && renderAccessChoiceModal()}
      {showEmailAuthModal && renderEmailAuthModal()}
    </div>
  );
};

export default OnboardingPage;


