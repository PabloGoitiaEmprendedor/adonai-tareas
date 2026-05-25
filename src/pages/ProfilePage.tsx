import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useStreaks } from '@/hooks/useStreaks';
import { useTasks } from '@/hooks/useTasks';
import { useWeeklySummary } from '@/hooks/useWeeklySummary';
import { useNavigate, useParams } from 'react-router-dom';
import { 
    Flame, 
    CheckCircle2, 
    ChevronLeft,
    Zap,
    Brain
} from 'lucide-react';
import { motion } from 'framer-motion';
import { addDays, differenceInCalendarDays, format } from 'date-fns';

const TRIAL_DAYS = 90;

const getTrialStatus = (createdAt?: string | null) => {
  if (!createdAt) return null;
  const end = addDays(new Date(createdAt), TRIAL_DAYS);
  const daysLeft = Math.max(0, differenceInCalendarDays(end, new Date()));
  return {
    daysLeft,
    endDateText: format(end, 'dd MMM yyyy'),
    expired: daysLeft <= 0,
  };
};

const ProfilePage = () => {
  const { userId: paramUserId } = useParams();
  const { user: currentUser } = useAuth();
  const targetUserId = paramUserId || currentUser?.id;
  const isOwnProfile = !paramUserId || paramUserId === currentUser?.id;

  const { profile } = useProfile(targetUserId);
  const { metrics } = useStreaks(targetUserId);
  const { tasks } = useTasks(targetUserId);
  const { data: weeklyMetrics } = useWeeklySummary(targetUserId);
  const navigate = useNavigate();

  const completedTotal = tasks.filter((t) => t.status === 'done').length;
  const trial = getTrialStatus(profile?.created_at);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[430px] lg:max-w-[800px] mx-auto px-5 pt-6 pb-24 space-y-8">
        {!isOwnProfile && (
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-on-surface-variant hover:text-foreground transition-colors mb-2">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-bold">Volver</span>
          </button>
        )}

        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/10">
            <span className="text-2xl font-black text-primary">{(profile?.name || 'U')[0].toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-foreground">
              {(profile?.name && profile.name.trim()) || 'Usuario'}
            </h1>
            <p className="text-sm text-on-surface-variant/60">@{profile?.name?.toLowerCase().replace(/\s+/g, '') || 'usuario'}</p>
          </div>
        </motion.section>

        <section className="grid grid-cols-3 gap-3">
          <div className="bg-surface-container-low border border-outline-variant/10 p-4 rounded-2xl text-center">
            <Flame className="w-5 h-5 text-orange-500 mx-auto mb-2" />
            <div className="text-2xl font-black">{metrics?.streak_current || 0}</div>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-0.5">Días</p>
          </div>
          <div className="bg-surface-container-low border border-outline-variant/10 p-4 rounded-2xl text-center">
            <CheckCircle2 className="w-5 h-5 text-primary mx-auto mb-2" />
            <div className="text-2xl font-black">{completedTotal}</div>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-0.5">Éxitos</p>
          </div>
          <div className="bg-surface-container-low border border-outline-variant/10 p-4 rounded-2xl text-center">
            <Flame className="w-5 h-5 text-secondary mx-auto mb-2 opacity-60" />
            <div className="text-2xl font-black">{metrics?.streak_max || 0}</div>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-0.5">Record</p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-black text-on-surface-variant/50 uppercase tracking-[0.2em] px-1">Último Reporte Semanal</h3>
          {weeklyMetrics ? (
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-on-surface-variant leading-relaxed max-w-[70%]">
                  Esta semana {isOwnProfile ? 'ahorraste' : (profile?.name || 'este usuario') + ' ahorró'} <span className="font-black text-primary">{weeklyMetrics.timeSavedMinutes} minutos</span> de gestión innecesaria.
                </p>
                <div className="text-right">
                  <span className="text-2xl font-black text-foreground">{weeklyMetrics.efficiencyScore}%</span>
                  <span className="block text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-wider">Ejecución</span>
                </div>
              </div>
              <div className="flex gap-4 text-sm font-bold">
                <span className="flex items-center gap-2"><Brain className="w-4 h-4 text-primary" />{weeklyMetrics.energySavedPercent}% Energía</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-secondary" />{weeklyMetrics.capturedTasks} Tareas</span>
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-low border border-dashed border-outline-variant/20 rounded-3xl p-8 text-center">
              <p className="text-sm text-on-surface-variant/30">Aún no hay reportes disponibles.</p>
            </div>
          )}
        </section>

        {isOwnProfile && trial && (
          <section className="rounded-3xl border border-primary/10 bg-primary/[0.03] p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Plan Beta</p>
            <h3 className="mt-1 text-xl font-black text-foreground">
              {trial.expired ? 'Tu beta finalizó.' : `Te quedan ${trial.daysLeft} días gratis.`}
            </h3>
            <p className="mt-1 text-sm font-medium text-on-surface-variant/50">
              Fin del beneficio beta: <span className="font-bold text-foreground">{trial.endDateText}</span>
            </p>
          </section>
        )}

        <div className="flex justify-center gap-3 pt-2 pb-4">
          <a href="/privacy" className="text-[10px] text-on-surface-variant/30 hover:text-on-surface-variant/60 transition-colors">Privacidad</a>
          <span className="text-[10px] text-on-surface-variant/20">·</span>
          <a href="/terms" className="text-[10px] text-on-surface-variant/30 hover:text-on-surface-variant/60 transition-colors">Términos</a>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
