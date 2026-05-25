import { useStreaks } from '@/hooks/useStreaks';
import { useGamification, xpProgressInLevel } from '@/hooks/useGamification';
import { motion } from 'framer-motion';
import {
  Sparkles, Rocket, Zap, Crown, Flame, Star, Target, Trophy, Award, Medal, ShieldCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ICONS: Record<string, any> = {
  sparkles: Sparkles, rocket: Rocket, zap: Zap, crown: Crown,
  flame: Flame, star: Star, target: Target, trophy: Trophy,
};

const CATEGORY_LABELS: Record<string, string> = {
  milestone: 'Hitos', streak: 'Constancia', level: 'Niveles', feature: 'Exploración', general: 'General',
};

const AchievementsPage = () => {
  const { metrics } = useStreaks();
  const { achievements, unlocked, unlockedCodes } = useGamification();

  const xp = metrics?.xp_total || 0;
  const streak = metrics?.streak_current || 0;
  const tasksTotal = metrics?.tasks_completed_total || 0;
  const { current, needed, level, percent } = xpProgressInLevel(xp);

  const unlockedById = new Map(unlocked.map((u: any) => [u.achievements?.code, u.unlocked_at]));

  const byCategory = achievements.reduce((acc: any, a: any) => {
    (acc[a.category] = acc[a.category] || []).push(a);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-4xl mx-auto px-5 pt-8 space-y-10">
        <div>
          <h1 className="text-xl font-black tracking-tight">Logros</h1>
          <p className="text-sm text-on-surface-variant/50 mt-1">Sistema de Honor · {unlocked.length} insignias</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-2">Nivel</p>
            <p className="text-3xl font-black">{level}</p>
            <div className="mt-3 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-[10px] text-on-surface-variant/30 mt-1">{current}/{needed} XP</p>
          </div>
          <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-2">Racha</p>
            <p className="text-3xl font-black text-orange-500">{streak}</p>
            <p className="text-[10px] text-on-surface-variant/30 mt-1">días consecutivos</p>
          </div>
          <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-2">Tareas</p>
            <p className="text-3xl font-black">{tasksTotal}</p>
            <p className="text-[10px] text-on-surface-variant/30 mt-1">completadas</p>
          </div>
          <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-2">XP Total</p>
            <p className="text-3xl font-black">{xp.toLocaleString()}</p>
            <p className="text-[10px] text-on-surface-variant/30 mt-1">puntos de experiencia</p>
          </div>
        </div>

        <div className="space-y-10">
          {Object.entries(byCategory).map(([cat, list]: [string, any]) => (
            <section key={cat}>
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant/40 mb-4">{CATEGORY_LABELS[cat] || cat}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map((ach: any) => {
                  const Icon = ICONS[ach.icon] || Trophy;
                  const isUnlocked = unlockedCodes.has(ach.code);
                  const unlockedAt = unlockedById.get(ach.code);

                  return (
                    <div
                      key={ach.id}
                      className={`rounded-2xl border p-5 transition-all ${isUnlocked ? 'bg-surface-container-low border-outline-variant/10' : 'bg-surface-container-low/40 border-outline-variant/5 opacity-50'}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isUnlocked ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant/30'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        {isUnlocked && (
                          <span className="text-[10px] font-black text-primary/60 tabular-nums">+{ach.xp_reward} XP</span>
                        )}
                      </div>
                      <h3 className={`text-sm font-bold ${isUnlocked ? 'text-foreground' : 'text-on-surface-variant/60'}`}>{ach.name}</h3>
                      <p className="text-xs text-on-surface-variant/40 mt-1 leading-relaxed">{ach.description}</p>
                      {isUnlocked && unlockedAt && (
                        <p className="text-[10px] text-primary/40 mt-3 font-medium">
                          {format(new Date(unlockedAt), "d MMM yyyy", { locale: es })}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AchievementsPage;
