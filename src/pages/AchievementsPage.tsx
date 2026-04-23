import { useStreaks } from '@/hooks/useStreaks';
import { useGamification, xpProgressInLevel } from '@/hooks/useGamification';
import { motion } from 'framer-motion';
import {
  Sparkles, Rocket, Zap, Crown, Flame, Star, Calendar, Target, Trophy,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ICONS: Record<string, any> = {
  sparkles: Sparkles, rocket: Rocket, zap: Zap, crown: Crown,
  flame: Flame, star: Star, calendar: Calendar, target: Target, trophy: Trophy,
};

const AchievementsPage = () => {
  const { metrics } = useStreaks();
  const { achievements, unlocked, unlockedCodes } = useGamification();

  const xp = metrics?.xp_total || 0;
  const streak = metrics?.streak_current || 0;
  const streakMax = metrics?.streak_max || 0;
  const tasksTotal = metrics?.tasks_completed_total || 0;
  const { current, needed, level, percent } = xpProgressInLevel(xp);

  const unlockedById = new Map(unlocked.map((u: any) => [u.achievements?.code, u.unlocked_at]));

  const byCategory = achievements.reduce((acc: any, a: any) => {
    (acc[a.category] = acc[a.category] || []).push(a);
    return acc;
  }, {});

  const CATEGORY_LABELS: Record<string, string> = {
    milestone: 'Hitos',
    streak: 'Constancia',
    level: 'Niveles',
    feature: 'Exploración',
    general: 'General',
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-[430px] lg:max-w-3xl mx-auto px-6 pt-6 space-y-6">
        <header>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Tu Progreso</h1>
          <p className="text-sm text-on-surface-variant mt-1">Cada paso cuenta.</p>
        </header>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-primary fill-primary/30" />
              <span className="text-[10px] uppercase font-black tracking-widest text-primary">Nivel</span>
            </div>
            <p className="text-3xl font-black tabular-nums">{level}</p>
            <div className="mt-2 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full primary-gradient rounded-full" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-[10px] mt-1 text-on-surface-variant/70 tabular-nums">{current}/{needed} XP</p>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/10">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-[10px] uppercase font-black tracking-widest text-orange-600 dark:text-orange-400">Racha</span>
            </div>
            <p className="text-3xl font-black tabular-nums">{streak}</p>
            <p className="text-[10px] mt-1 text-on-surface-variant/70">Récord: {streakMax} días</p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/10">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-[10px] uppercase font-black tracking-widest text-on-surface-variant">Logros</span>
            </div>
            <p className="text-3xl font-black tabular-nums">{unlocked.length}<span className="text-base text-on-surface-variant/40">/{achievements.length}</span></p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/10">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-[10px] uppercase font-black tracking-widest text-on-surface-variant">Tareas</span>
            </div>
            <p className="text-3xl font-black tabular-nums">{tasksTotal}</p>
          </div>
        </div>

        {/* Achievements by category */}
        {Object.entries(byCategory).map(([cat, list]: [string, any]) => (
          <section key={cat} className="space-y-2">
            <h2 className="text-[11px] uppercase font-black tracking-[0.2em] text-on-surface-variant/60 px-1">
              {CATEGORY_LABELS[cat] || cat}
            </h2>
            <div className="space-y-2">
              {list.map((ach: any) => {
                const Icon = ICONS[ach.icon] || Trophy;
                const isUnlocked = unlockedCodes.has(ach.code);
                const unlockedAt = unlockedById.get(ach.code);
                return (
                  <motion.div
                    key={ach.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                      isUnlocked
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-surface-container-low border-outline-variant/10 opacity-60'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isUnlocked ? 'bg-primary/15 text-primary' : 'bg-surface-container-high text-on-surface-variant/40'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{ach.name}</p>
                      <p className="text-xs text-on-surface-variant/70">{ach.description}</p>
                      {isUnlocked && unlockedAt && (
                        <p className="text-[10px] text-primary/70 mt-0.5">
                          Conseguido el {format(new Date(unlockedAt), "d 'de' MMM", { locale: es })}
                        </p>
                      )}
                    </div>
                    <div className={`text-[11px] font-black tabular-nums px-2 py-1 rounded-lg ${
                      isUnlocked ? 'bg-primary/15 text-primary' : 'bg-surface-container-high text-on-surface-variant/40'
                    }`}>
                      +{ach.xp_reward}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default AchievementsPage;
