import { useState, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeProvider';
import { useNavigate } from 'react-router-dom';
import { 
    LogOut, 
    Moon, 
    ChevronDown, 
    Sparkles,
    Zap,
    Clock,
    BellRing,
    Play,
    Settings,
    ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SettingsPage = () => {
  const { user: currentUser } = useAuth();
  const { profile, updateProfile } = useProfile(currentUser?.id);
  const { setTheme: setAppTheme } = useTheme();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [editingField, setEditingField] = useState<string | null>(null);
  const [autoStart, setAutoStart] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('adonai_notifications_enabled') !== 'false');
  const [streakEnabled, setStreakEnabled] = useState(() => localStorage.getItem('adonai_notif_streak') !== 'false');
  const [healthEnabled, setHealthEnabled] = useState(() => localStorage.getItem('adonai_notif_health') !== 'false');

  useEffect(() => {
    const fetchAutoStart = async () => {
      if ((window as any).electronAPI?.getAutoStart) {
        const isEnabled = await (window as any).electronAPI.getAutoStart();
        setAutoStart(isEnabled);
      }
    };
    fetchAutoStart();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      localStorage.removeItem('adonai_onboarding_done');
      navigate('/auth');
    } catch {
      toast.error('Error al cerrar sesión');
    }
  };

  const themeOptions = [
    { value: 'dark', label: 'Oscuro' },
    { value: 'light', label: 'Claro' },
    { value: 'system', label: 'Sistema' },
  ];

  const themeLabels: Record<string, string> = { dark: 'Oscuro', light: 'Claro', system: 'Sistema' };

  const OptionSelector = ({ field, options, currentValue, onSelect }: {
    field: string; options: { value: string; label: string }[]; currentValue: string; onSelect: (v: string) => void;
  }) => (
    <AnimatePresence>
      {editingField === field && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
          <div className="px-4 pb-3 flex gap-2">
            {options.map((opt) => (
              <button key={opt.value} onClick={() => { onSelect(opt.value); setEditingField(null); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${currentValue === opt.value ? 'bg-primary text-primary-foreground' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[430px] lg:max-w-[800px] mx-auto px-5 pt-6 pb-24 space-y-8">
        
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <h1 className="page-title">Ajustes</h1>
          </div>
        </div>

        {/* Desktop Settings - Hide on mobile via CSS */}
        <div className="hidden md:block">
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-gradient-to-br from-primary/20 to-surface-container-low border border-primary/20 rounded-[32px] p-1 shadow-2xl shadow-primary/5">
                <div className="bg-surface-container-low rounded-[31px] overflow-hidden">
                    <div className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-[22px] bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Zap className="w-7 h-7 text-primary" />
                            </div>
                            <div>
                                <span className="block font-black text-[15px] text-foreground uppercase tracking-tight">Mini Ventana Automática</span>
                                <p className="text-[11px] text-on-surface-variant/60 font-medium max-w-[200px]">Se abre al iniciar tu ordenador para que nunca olvides capturar tus ideas.</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                            <button 
                                onClick={() => {
                                    const next = !autoStart;
                                    setAutoStart(next);
                                    if ((window as any).electronAPI?.setAutoStart) {
                                        (window as any).electronAPI.setAutoStart(next);
                                    }
                                    toast.success(next ? 'Inicio automático activado' : 'Inicio automático desactivado', {
                                        icon: <Zap className="w-4 h-4 text-primary" />
                                    });
                                }}
                                className={cn(
                                    "w-16 h-8 rounded-full relative transition-all duration-500 border-2",
                                    autoStart 
                                        ? "bg-primary border-primary shadow-[0_0_20px_-5px_rgba(163,230,53,0.5)]" 
                                        : "bg-surface-container-highest border-outline-variant/30"
                                )}
                            >
                                <div className={cn(
                                    "absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-all duration-500 shadow-lg flex items-center justify-center",
                                    autoStart ? "translate-x-8" : "translate-x-0"
                                )}>
                                    {autoStart && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                </div>
                                <span className={cn(
                                    "absolute top-1/2 -translate-y-1/2 text-[8px] font-black tracking-widest transition-opacity duration-300",
                                    autoStart ? "left-2.5 text-black/40" : "right-2.5 text-on-surface-variant/40"
                                )}>
                                    {autoStart ? 'ON' : 'OFF'}
                                </span>
                            </button>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-primary/5 border-t border-primary/10">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-primary" />
                            <p className="text-[10px] text-primary font-black uppercase tracking-[0.1em]">
                                RECOMENDADO: MANTENER ACTIVADO PARA MÁXIMA PRODUCTIVIDAD
                            </p>
                        </div>
                    </div>
                </div>
            </div>
          </motion.section>
        </div>

        {/* Appearance Section */}
        <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em]">Configuración</h3>
                {currentUser?.email === 'pablogoitiaemprendedor@gmail.com' && (
                <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('restart-adonai-tour'))}
                    className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-all"
                >
                    <Play className="w-3 h-3" />
                    Probar Tutorial
                </button>
                )}
            </div>
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-[32px] overflow-hidden">
                {/* Theme */}
                <div>
                <button onClick={() => setEditingField(editingField === 'theme' ? null : 'theme')} className="w-full flex items-center justify-between p-6 hover:bg-surface-container-high transition-colors">
                    <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[20px] bg-surface-container-highest flex items-center justify-center"><Moon className="w-6 h-6 text-foreground" /></div>
                    <span className="font-bold text-foreground">Apariencia</span>
                    </div>
                    <div className="flex items-center gap-2">
                    <span className="text-sm text-primary font-black uppercase tracking-widest">{themeLabels[profile?.theme || 'dark']}</span>
                    <ChevronDown className={`w-5 h-5 text-on-surface-variant transition-transform ${editingField === 'theme' ? 'rotate-180' : ''}`} />
                    </div>
                </button>
                <OptionSelector field="theme" options={themeOptions} currentValue={profile?.theme || 'dark'}
                    onSelect={(v) => { setAppTheme(v as 'dark' | 'light' | 'system'); updateProfile.mutate({ theme: v }); }} />
                </div>

                <button onClick={handleLogout}
                    className="w-full p-6 text-tertiary font-black text-sm uppercase tracking-[0.2em] flex items-center gap-4 hover:bg-tertiary-container/10 transition-all border-t border-outline-variant/10">
                    <div className="w-12 h-12 rounded-[20px] bg-tertiary-container/20 flex items-center justify-center"><LogOut className="w-6 h-6" /></div>
                    Cerrar sesión
                </button>
            </div>
        </section>

        {/* Notification Settings */}
        <section className="space-y-4">
            <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] px-2">Notificaciones Inteligentes</h3>
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-[32px] overflow-hidden divide-y divide-outline-variant/5">
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[20px] bg-surface-container-highest flex items-center justify-center">
                            <BellRing className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <span className="block font-bold text-foreground">Notificaciones</span>
                            <span className="text-[11px] text-on-surface-variant/60 font-medium">Avisos externos del sistema y navegador</span>
                        </div>
                    </div>
                    <button 
                        onClick={async () => {
                            const next = !notificationsEnabled;
                            if (next && 'Notification' in window && Notification.permission === 'default') {
                                await Notification.requestPermission();
                            }
                            localStorage.setItem('adonai_notifications_enabled', String(next));
                            setNotificationsEnabled(next);
                            toast.success(next ? 'Notificaciones activadas' : 'Notificaciones desactivadas');
                        }}
                        className={`w-12 h-6 rounded-full relative transition-colors ${notificationsEnabled ? 'bg-primary' : 'bg-surface-container-highest'}`}
                    >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${notificationsEnabled ? 'translate-x-6' : ''}`} />
                    </button>
                </div>
                
                {/* Bedtime / Tomorrow Plan */}
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[20px] bg-surface-container-highest flex items-center justify-center">
                            <Clock className="w-6 h-6 text-foreground" />
                        </div>
                        <div>
                            <span className="block font-bold text-foreground">Plan de Mañana</span>
                            <span className="text-[11px] text-on-surface-variant/60 font-medium">Recordatorio para organizar el día</span>
                        </div>
                    </div>
                    <input 
                        type="time" 
                        defaultValue={localStorage.getItem('adonai_notif_bedtime') || '20:00'}
                        onChange={(e) => localStorage.setItem('adonai_notif_bedtime', e.target.value)}
                        className="bg-surface-container-highest px-4 py-2 rounded-xl text-sm font-black text-primary border-none focus:ring-1 focus:ring-primary outline-none"
                    />
                </div>

                {/* Streak Protection */}
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[20px] bg-surface-container-highest flex items-center justify-center">
                            <Zap className="w-6 h-6 text-orange-500" />
                        </div>
                        <div>
                            <span className="block font-bold text-foreground">Protección de Racha</span>
                            <span className="text-[11px] text-on-surface-variant/60 font-medium">Avisar si tu racha peligra a las 6pm</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            const next = !streakEnabled;
                            localStorage.setItem('adonai_notif_streak', String(next));
                            setStreakEnabled(next);
                            toast.success(next ? 'Protección activada' : 'Protección desactivada');
                        }}
                        className={`w-12 h-6 rounded-full relative transition-colors ${streakEnabled ? 'bg-primary' : 'bg-surface-container-highest'}`}
                    >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${streakEnabled ? 'translate-x-6' : ''}`} />
                    </button>
                </div>

                {/* Health Reminders */}
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[20px] bg-surface-container-highest flex items-center justify-center">
                            <BellRing className="w-6 h-6 text-secondary" />
                        </div>
                        <div>
                            <span className="block font-bold text-foreground">Recordatorios de Salud</span>
                            <span className="text-[11px] text-on-surface-variant/60 font-medium">Sugerencias para beber agua o descansar</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            const next = !healthEnabled;
                            localStorage.setItem('adonai_notif_health', String(next));
                            setHealthEnabled(next);
                            toast.success(next ? 'Recordatorios activados' : 'Recordatorios desactivados');
                        }}
                        className={`w-12 h-6 rounded-full relative transition-colors ${healthEnabled ? 'bg-secondary' : 'bg-surface-container-highest'}`}
                    >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${healthEnabled ? 'translate-x-6' : ''}`} />
                    </button>
                </div>

            </div>
        </section>

        {/* Legal links */}
        <div className="flex justify-center gap-3 pt-2 pb-4">
          <a href="/privacy" className="text-[10px] text-on-surface-variant/40 hover:text-on-surface-variant/60 transition-colors">Privacidad</a>
          <span className="text-[10px] text-on-surface-variant/20">·</span>
          <a href="/terms" className="text-[10px] text-on-surface-variant/40 hover:text-on-surface-variant/60 transition-colors">Términos</a>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
