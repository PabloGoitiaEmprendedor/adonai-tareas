import { useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeProvider';
import { useStreaks } from '@/hooks/useStreaks';
import { useTasks } from '@/hooks/useTasks';
import { useWeeklySummary } from '@/hooks/useWeeklySummary';
import { useNavigate, useParams } from 'react-router-dom';
import { 
    Flame, 
    CalendarDays, 
    CheckCircle2, 
    LogOut, 
    Moon, 
    ChevronDown, 
    ChevronLeft,
    Sparkles,
    Zap,
    Brain,
    Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const ProfilePage = () => {
  const { userId: paramUserId } = useParams();
  const { user: currentUser } = useAuth();
  const targetUserId = paramUserId || currentUser?.id;
  const isOwnProfile = !paramUserId || paramUserId === currentUser?.id;

  const { profile, updateProfile } = useProfile(targetUserId);
  const { setTheme: setAppTheme } = useTheme();
  const { signOut } = useAuth();
  const { metrics } = useStreaks(targetUserId);
  const { tasks } = useTasks(targetUserId);
  const { data: weeklyMetrics } = useWeeklySummary(targetUserId);
  const navigate = useNavigate();

  const completedTotal = tasks.filter((t) => t.status === 'done').length;
  const [editingField, setEditingField] = useState<string | null>(null);

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
        {/* Header with back button if not own */}
        {!isOwnProfile && (
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-on-surface-variant hover:text-foreground transition-colors mb-2">
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm font-bold">Volver</span>
            </button>
        )}

        {/* Profile hero */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-[24px] bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5">
            <span className="text-3xl font-black text-primary">{(profile?.name || 'U')[0].toUpperCase()}</span>
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-foreground">
              {(profile?.name && profile.name.trim()) || 'Usuario'}
            </h2>
            <p className="text-on-surface-variant text-sm font-medium">@{profile?.name?.toLowerCase().replace(/\s+/g, '') || 'usuario'}</p>
          </div>
        </motion.section>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-3">
          <div className="bg-surface-container-low border border-outline-variant/10 p-5 rounded-[28px] text-center shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-3">
                <Flame className="w-6 h-6 text-orange-500" />
            </div>
            <div className="text-3xl font-black">{metrics?.streak_current || 0}</div>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">Días</p>
          </div>
          <div className="bg-surface-container-low border border-outline-variant/10 p-5 rounded-[28px] text-center shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <div className="text-3xl font-black">{completedTotal}</div>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">Éxitos</p>
          </div>
          <div className="bg-surface-container-low border border-outline-variant/10 p-5 rounded-[28px] text-center shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-secondary" />
            </div>
            <div className="text-3xl font-black">{metrics?.streak_max || 0}</div>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">Record</p>
          </div>
        </section>

        {/* Weekly Report Section */}
        <section className="space-y-4">
            <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] px-2">Último Reporte Semanal</h3>
            {weeklyMetrics ? (
                <div className="bg-surface-container-highest/20 border border-outline-variant/20 rounded-[40px] p-8 space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Zap className="w-32 h-32 text-primary" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-on-surface-variant leading-relaxed max-w-[80%]">
                            Esta semana {isOwnProfile ? 'ahorraste' : (profile?.name || 'este usuario') + ' ahorró'} <span className="font-black text-primary">{weeklyMetrics.timeSavedMinutes} minutos</span> de gestión innecesaria.
                        </p>
                        <div className="text-2xl font-black text-foreground">{weeklyMetrics.efficiencyScore}% <span className="text-[10px] block text-on-surface-variant uppercase">Ejecución</span></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><Brain className="w-4 h-4 text-primary" /></div>
                            <span className="text-xs font-bold">{weeklyMetrics.energySavedPercent}% Energía</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-secondary/10 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-secondary" /></div>
                            <span className="text-xs font-bold">{weeklyMetrics.capturedTasks} Tareas</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-surface-container-low border border-dashed border-outline-variant/30 rounded-[32px] p-8 text-center">
                    <p className="text-sm text-on-surface-variant/40">Aún no hay reportes disponibles.</p>
                </div>
            )}
        </section>

        {/* Settings - Only for own profile */}
        {isOwnProfile && (
            <section className="space-y-4">
                <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] px-2">Ajustes</h3>
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
        )}

        {/* Legal links - subtle */}
        <div className="flex justify-center gap-3 pt-2 pb-4">
          <a href="/privacy" className="text-[10px] text-on-surface-variant/40 hover:text-on-surface-variant/60 transition-colors">Privacidad</a>
          <span className="text-[10px] text-on-surface-variant/20">·</span>
          <a href="/terms" className="text-[10px] text-on-surface-variant/40 hover:text-on-surface-variant/60 transition-colors">Términos</a>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
