import { useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useStreaks } from '@/hooks/useStreaks';
import { useTasks } from '@/hooks/useTasks';
import { useNavigate } from 'react-router-dom';
import { Flame, CalendarDays, CheckCircle2, LogOut, Mic, Bell, Moon, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import { toast } from 'sonner';

const ProfilePage = () => {
  const { profile, updateProfile } = useProfile();
  const { settings, updateSettings } = useSettings();
  const { signOut } = useAuth();
  const { metrics } = useStreaks();
  const { tasks } = useTasks();
  const navigate = useNavigate();
  const [showProgress, setShowProgress] = useState(false);

  const completedTotal = tasks.filter((t) => t.status === 'done').length;

  const handleLogout = async () => {
    try {
      await signOut();
      localStorage.removeItem('adonai_onboarding_done');
      navigate('/auth');
    } catch {
      toast.error('Error al cerrar sesión');
    }
  };

  const inputLabels: Record<string, string> = { voice: 'Voz', text: 'Texto', both: 'Ambos' };
  const styleLabels: Record<string, string> = { simple: 'Simple', intermediate: 'Intermedio', guided: 'Guiado' };

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
            <SettingRow icon={<Moon className="w-5 h-5" />} label="Tema" value="Oscuro" />
            <SettingRow icon={<Mic className="w-5 h-5" />} label="Modo de Entrada" value={inputLabels[profile?.preferred_input || 'both']} />
            <SettingRow icon={<Settings className="w-5 h-5" />} label="Estilo" value={styleLabels[profile?.organization_style || 'simple']} />
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center">
                  <Bell className="w-5 h-5 text-foreground" />
                </div>
                <span className="font-semibold text-foreground text-sm">Notificaciones</span>
              </div>
              <button
                onClick={() => updateSettings.mutate({ notifications_enabled: !settings?.notifications_enabled })}
                className={`w-10 h-6 rounded-full transition-colors flex items-center ${
                  settings?.notifications_enabled ? 'bg-primary justify-end' : 'bg-surface-container-highest justify-start'
                }`}
              >
                <div className="w-4.5 h-4.5 bg-foreground rounded-full mx-0.5 w-[18px] h-[18px]" />
              </button>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center">
                  <Mic className="w-5 h-5 text-foreground" />
                </div>
                <span className="font-semibold text-foreground text-sm">Voz</span>
              </div>
              <button
                onClick={() => updateSettings.mutate({ voice_enabled: !settings?.voice_enabled })}
                className={`w-10 h-6 rounded-full transition-colors flex items-center ${
                  settings?.voice_enabled ? 'bg-primary justify-end' : 'bg-surface-container-highest justify-start'
                }`}
              >
                <div className="w-[18px] h-[18px] bg-foreground rounded-full mx-0.5" />
              </button>
            </div>
          </div>
        </section>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-4 rounded-lg bg-tertiary-container/10 text-tertiary font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-tertiary-container/20 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

const SettingRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center justify-between p-4 hover:bg-surface-container-high transition-colors">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center text-foreground">
        {icon}
      </div>
      <span className="font-semibold text-foreground text-sm">{label}</span>
    </div>
    <span className="text-sm text-primary font-medium">{value}</span>
  </div>
);

export default ProfilePage;
