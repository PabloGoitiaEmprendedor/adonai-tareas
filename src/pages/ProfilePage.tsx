import { useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useStreaks } from '@/hooks/useStreaks';
import { useTasks } from '@/hooks/useTasks';
import { useNavigate } from 'react-router-dom';
import { Flame, CalendarDays, CheckCircle2, LogOut, Mic, Bell, Moon, Settings, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import { toast } from 'sonner';

const ProfilePage = () => {
  const { profile, updateProfile } = useProfile();
  const { settings, updateSettings } = useSettings();
  const { signOut } = useAuth();
  const { metrics } = useStreaks();
  const { tasks } = useTasks();
  const navigate = useNavigate();

  const completedTotal = tasks.filter((t) => t.status === 'done').length;

  // Editing states
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

  const inputOptions = [
    { value: 'voice', label: 'Voz' },
    { value: 'text', label: 'Texto' },
    { value: 'both', label: 'Ambos' },
  ];

  const styleOptions = [
    { value: 'simple', label: 'Simple' },
    { value: 'intermediate', label: 'Intermedio' },
    { value: 'guided', label: 'Guiado' },
  ];

  const themeOptions = [
    { value: 'dark', label: 'Oscuro' },
    { value: 'light', label: 'Claro' },
  ];

  const inputLabels: Record<string, string> = { voice: 'Voz', text: 'Texto', both: 'Ambos' };
  const styleLabels: Record<string, string> = { simple: 'Simple', intermediate: 'Intermedio', guided: 'Guiado' };
  const themeLabels: Record<string, string> = { dark: 'Oscuro', light: 'Claro' };

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
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-[430px] mx-auto px-5 pt-6 space-y-6">
        {/* Profile hero */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-surface-container-high flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">{(profile?.name || 'U')[0].toUpperCase()}</span>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">{profile?.name || 'Usuario'}</h2>
            <p className="text-on-surface-variant text-sm">{profile?.email}</p>
          </div>
        </motion.section>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-2">
          <div className="bg-surface-container-low p-4 rounded-lg text-center">
            <Flame className="w-6 h-6 text-primary mx-auto mb-1" />
            <div className="text-2xl font-extrabold">{metrics?.streak_current || 0}</div>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Racha</p>
          </div>
          <div className="bg-surface-container-low p-4 rounded-lg text-center">
            <CalendarDays className="w-6 h-6 text-primary mx-auto mb-1" />
            <div className="text-2xl font-extrabold">{metrics?.streak_max || 0}</div>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Máx racha</p>
          </div>
          <div className="bg-surface-container-low p-4 rounded-lg text-center">
            <CheckCircle2 className="w-6 h-6 text-primary mx-auto mb-1" />
            <div className="text-2xl font-extrabold">{completedTotal}</div>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Hechas</p>
          </div>
        </section>

        {metrics?.streak_current === 0 && (
          <div className="bg-surface-container-low p-4 rounded-lg text-center">
            <p className="text-on-surface-variant text-sm">Empieza hoy. El primer paso es el más importante.</p>
          </div>
        )}

        {/* Settings */}
        <section className="space-y-1">
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-[0.2em] px-1 mb-2">Configuración</h3>
          <div className="bg-surface-container-low rounded-lg overflow-hidden divide-y divide-outline-variant/10">
            {/* Theme */}
            <div>
              <button onClick={() => setEditingField(editingField === 'theme' ? null : 'theme')} className="w-full flex items-center justify-between p-4 hover:bg-surface-container-high transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center"><Moon className="w-5 h-5 text-foreground" /></div>
                  <span className="font-semibold text-foreground text-sm">Tema</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-primary font-medium">{themeLabels[profile?.theme || 'dark']}</span>
                  <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform ${editingField === 'theme' ? 'rotate-180' : ''}`} />
                </div>
              </button>
              <OptionSelector field="theme" options={themeOptions} currentValue={profile?.theme || 'dark'}
                onSelect={(v) => updateProfile.mutate({ theme: v })} />
            </div>

            {/* Input mode */}
            <div>
              <button onClick={() => setEditingField(editingField === 'input' ? null : 'input')} className="w-full flex items-center justify-between p-4 hover:bg-surface-container-high transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center"><Mic className="w-5 h-5 text-foreground" /></div>
                  <span className="font-semibold text-foreground text-sm">Modo de Entrada</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-primary font-medium">{inputLabels[profile?.preferred_input || 'both']}</span>
                  <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform ${editingField === 'input' ? 'rotate-180' : ''}`} />
                </div>
              </button>
              <OptionSelector field="input" options={inputOptions} currentValue={profile?.preferred_input || 'both'}
                onSelect={(v) => updateProfile.mutate({ preferred_input: v })} />
            </div>

            {/* Style */}
            <div>
              <button onClick={() => setEditingField(editingField === 'style' ? null : 'style')} className="w-full flex items-center justify-between p-4 hover:bg-surface-container-high transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center"><Settings className="w-5 h-5 text-foreground" /></div>
                  <span className="font-semibold text-foreground text-sm">Estilo</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-primary font-medium">{styleLabels[profile?.organization_style || 'simple']}</span>
                  <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform ${editingField === 'style' ? 'rotate-180' : ''}`} />
                </div>
              </button>
              <OptionSelector field="style" options={styleOptions} currentValue={profile?.organization_style || 'simple'}
                onSelect={(v) => updateProfile.mutate({ organization_style: v })} />
            </div>

            {/* Notifications toggle */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center"><Bell className="w-5 h-5 text-foreground" /></div>
                <span className="font-semibold text-foreground text-sm">Notificaciones</span>
              </div>
              <button onClick={() => updateSettings.mutate({ notifications_enabled: !settings?.notifications_enabled })}
                className={`w-10 h-6 rounded-full transition-colors flex items-center ${settings?.notifications_enabled ? 'bg-primary justify-end' : 'bg-surface-container-highest justify-start'}`}>
                <div className="w-[18px] h-[18px] bg-foreground rounded-full mx-0.5" />
              </button>
            </div>

            {/* Voice toggle */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center"><Mic className="w-5 h-5 text-foreground" /></div>
                <span className="font-semibold text-foreground text-sm">Voz</span>
              </div>
              <button onClick={() => updateSettings.mutate({ voice_enabled: !settings?.voice_enabled })}
                className={`w-10 h-6 rounded-full transition-colors flex items-center ${settings?.voice_enabled ? 'bg-primary justify-end' : 'bg-surface-container-highest justify-start'}`}>
                <div className="w-[18px] h-[18px] bg-foreground rounded-full mx-0.5" />
              </button>
            </div>
          </div>
        </section>

        {/* Logout */}
        <button onClick={handleLogout}
          className="w-full py-4 rounded-lg bg-tertiary-container/10 text-tertiary font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-tertiary-container/20 transition-all">
          <LogOut className="w-4 h-4" /> Cerrar sesión
        </button>
      </div>
      <BottomNav />
    </div>
  );
};

export default ProfilePage;
