import { useStreaks } from '@/hooks/useStreaks';
import { useGamification, xpProgressInLevel } from '@/hooks/useGamification';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Rocket, Zap, Crown, Flame, Star, Calendar, Target, Trophy, Award, Medal, ShieldCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';

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
    milestone: 'HITOS',
    streak: 'CONSTANCIA',
    level: 'NIVELES',
    feature: 'EXPLORACIÓN',
    general: 'GENERAL',
  };

  return (
    <div className="min-h-screen bg-[#F2F2F2] text-[#0D0D0D]">
      <div className="max-w-4xl mx-auto px-6 pt-16 pb-32 space-y-16">
        
        <header className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-[0.4em] text-[#8C8C8C]">ESTADÍSTICAS</p>
          <div className="flex items-center justify-between">
            <h1 className="text-5xl font-black tracking-tighter">Logros</h1>
            <div className="bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <Trophy className="w-3 h-3" />
              {unlocked.length} INSIGNIAS
            </div>
          </div>
        </header>

        {/* Stats Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[40px] border border-black/5 shadow-sm space-y-8">
            <div className="flex items-center gap-2 opacity-40">
              <Star className="w-4 h-4" />
              <span className="text-[10px] uppercase font-black tracking-widest">Nivel Actual</span>
            </div>
            <p className="text-7xl font-black tabular-nums tracking-tighter leading-none">{level}</p>
            <div className="space-y-3">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-40">
                <span>{current} / {needed} XP</span>
                <span>{Math.round(percent)}%</span>
              </div>
              <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} className="h-full bg-black" />
              </div>
            </div>
          </div>

          <div className="bg-black text-white p-8 rounded-[40px] shadow-2xl space-y-8">
            <div className="flex items-center gap-2 opacity-40">
              <Flame className="w-4 h-4" />
              <span className="text-[10px] uppercase font-black tracking-widest">Racha Activa</span>
            </div>
            <p className="text-7xl font-black tabular-nums tracking-tighter leading-none">{streak}</p>
            <p className="text-[10px] font-black opacity-30 uppercase tracking-widest">RECORD PERSONAL: {streakMax}</p>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-black/5 shadow-sm space-y-8">
            <div className="flex items-center gap-2 opacity-40">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] uppercase font-black tracking-widest">Tareas Totales</span>
            </div>
            <p className="text-7xl font-black tabular-nums tracking-tighter leading-none">{tasksTotal}</p>
            <p className="text-[10px] font-black opacity-30 uppercase tracking-widest">COMPLETADAS</p>
          </div>
        </div>

        {/* Achievements Section */}
        <div className="space-y-20">
          {Object.entries(byCategory).map(([cat, list]: [string, any]) => (
            <section key={cat} className="space-y-8">
              <div className="flex items-center gap-6">
                <h2 className="text-[11px] uppercase font-black tracking-[0.4em] text-[#8C8C8C]">
                  {CATEGORY_LABELS[cat] || cat}
                  <span className="ml-3 text-[9px] opacity-40">
                    {list.filter((a: any) => unlockedCodes.has(a.code)).length} / {list.length}
                  </span>
                </h2>
                <div className="h-[1px] flex-1 bg-black/5" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {list.map((ach: any) => {
                  const Icon = ICONS[ach.icon] || Trophy;
                  const isUnlocked = unlockedCodes.has(ach.code);
                  const unlockedAt = unlockedById.get(ach.code);
                  
                  return (
                    <div key={ach.id} className={cn("group p-8 rounded-[32px] border transition-all duration-500", isUnlocked ? 'bg-white border-black/5 shadow-sm' : 'bg-black/5 border-transparent opacity-20 grayscale')}>
                      <div className="flex items-center gap-6">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all", isUnlocked ? 'bg-black text-white' : 'bg-black/5 text-black/10')}>
                          <Icon className="w-7 h-7" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xl font-black tracking-tighter truncate">{ach.name}</h4>
                          <p className="text-xs text-[#8C8C8C] font-black uppercase tracking-widest mt-1">+{ach.xp_reward} XP</p>
                        </div>
                      </div>

                      <div className="mt-8 pt-8 border-t border-black/5">
                        <p className="text-xs text-[#8C8C8C] font-medium leading-relaxed">{ach.description}</p>
                        {isUnlocked && unlockedAt && (
                          <div className="mt-4 flex items-center justify-between">
                            <span className="text-[9px] font-black text-[#BFBFBF] uppercase tracking-[0.2em]">DESBLOQUEADO</span>
                            <span className="text-[9px] font-black text-black uppercase tracking-widest">{format(new Date(unlockedAt), "d MMM yyyy", { locale: es })}</span>
                          </div>
                        )}
                      </div>
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
