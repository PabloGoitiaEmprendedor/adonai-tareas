import { useStreaks } from '@/hooks/useStreaks';
import { useGamification, xpProgressInLevel } from '@/hooks/useGamification';
import { motion } from 'framer-motion';
import {
  Sparkles, Rocket, Zap, Crown, Flame, Star, Target, Trophy, Award, Medal, ShieldCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from '@/components/ui/card';

const ICONS: Record<string, any> = {
  sparkles: Sparkles, rocket: Rocket, zap: Zap, crown: Crown,
  flame: Flame, star: Star, target: Target, trophy: Trophy,
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30 pb-32 overflow-x-hidden">
      <div className="max-w-[430px] lg:max-w-6xl mx-auto px-6 pt-12 space-y-12">
        
        {/* Header Section */}
        <header className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-1 bg-primary rounded-full" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/60">
                  Sistema de Honor
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight font-headline leading-tight">
                Tus <span className="opacity-20">Logros.</span>
              </h1>
            </div>

            <div className="bg-surface-container px-6 py-4 rounded-[24px] border border-outline-variant/30 self-start md:self-end">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 mb-1">Insignias Activas</p>
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-primary" />
                <span className="text-2xl font-black tabular-nums leading-none">
                  {unlocked.length}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Level Card - Large */}
          <Card className="md:col-span-2 bg-surface-container border-none p-8 rounded-[32px] flex flex-col justify-between gap-8 relative overflow-hidden group">
            <div className="relative z-10 space-y-1">
              <div className="flex items-center gap-2 text-primary">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-[10px] uppercase font-black tracking-[0.2em]">Nivel de Maestría</span>
              </div>
              <p className="text-5xl md:text-6xl font-black tabular-nums tracking-tighter leading-none group-hover:scale-105 transition-transform duration-500">{level}</p>
            </div>
            
            <div className="relative z-10 space-y-3">
              <div className="flex justify-between items-end">
                <p className="text-[11px] font-black text-on-surface-variant/40 uppercase tracking-widest tabular-nums">
                  <span className="text-foreground">{current}</span> / {needed} XP
                </p>
                <p className="text-[11px] font-black text-primary">{Math.round(percent)}%</p>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 1.5, ease: "circOut" }}
                  className="h-full bg-primary rounded-full" 
                />
              </div>
            </div>

            {/* Background Decor */}
            <Crown className="absolute -top-6 -right-6 w-48 h-48 text-primary/5 -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
          </Card>

          {/* Streak Card */}
          <Card className="bg-orange-500/5 border border-orange-500/10 p-8 rounded-[32px] flex flex-col justify-between gap-4 group">
            <div className="flex items-center gap-2 text-orange-500">
              <Flame className="w-5 h-5 fill-current animate-pulse" />
              <span className="text-[10px] uppercase font-black tracking-[0.2em]">Racha Activa</span>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-black tabular-nums tracking-tight leading-none">{streak}</p>
              <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] mt-3">Récord: {streakMax}</p>
            </div>
          </Card>

          {/* Tasks Total Card */}
          <Card className="bg-surface-container/50 border border-outline-variant/30 p-8 rounded-[32px] flex flex-col justify-between gap-4 group">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-[10px] uppercase font-black tracking-[0.2em]">Productividad</span>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-black tabular-nums tracking-tight leading-none">{tasksTotal}</p>
              <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] mt-3">Completadas hoy</p>
            </div>
          </Card>

          {/* Elite Insight Card */}
          <Card className="md:col-span-4 bg-foreground text-background p-8 rounded-[32px] flex items-center justify-between group overflow-hidden relative">
            <div className="flex items-center gap-8 relative z-10">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shrink-0 shadow-2xl group-hover:rotate-6 transition-transform">
                <Zap className="w-8 h-8 fill-current" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black font-headline tracking-tight leading-none">Élite del Enfoque</h3>
                <p className="text-sm text-background/60 leading-relaxed font-medium">Estás en el top 5% de usuarios más consistentes. <span className="text-primary font-black">¡Sigue así!</span></p>
              </div>
            </div>
            <div className="hidden md:block">
              <Rocket className="w-24 h-24 text-primary/10 absolute -right-4 -bottom-4 -rotate-12 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-700" />
            </div>
          </Card>

        </div>

        {/* Achievements Section */}
        <div className="space-y-20 pt-12">
          {Object.entries(byCategory).map(([cat, list]: [string, any]) => (
            <motion.section 
              key={cat}
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="space-y-10"
            >
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <h2 className="text-[11px] uppercase font-black tracking-[0.4em] text-on-surface-variant/40">
                  {CATEGORY_LABELS[cat] || cat}
                </h2>
                <div className="h-px flex-1 bg-outline-variant/30" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {list.map((ach: any) => {
                  const Icon = ICONS[ach.icon] || Trophy;
                  const isUnlocked = unlockedCodes.has(ach.code);
                  const unlockedAt = unlockedById.get(ach.code);
                  
                  return (
                    <motion.div
                      key={ach.id}
                      variants={itemVariants}
                      className={`group relative p-8 rounded-[32px] border transition-all duration-500 ${
                        isUnlocked
                          ? 'bg-surface-container border-primary/20 shadow-xl shadow-primary/5'
                          : 'bg-surface/30 border-outline-variant/30 grayscale opacity-40 hover:grayscale-0 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                          isUnlocked ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-surface-container-highest text-on-surface-variant/30'
                        }`}>
                          <Icon className="w-7 h-7" />
                        </div>
                        {isUnlocked && (
                           <div className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1.5 rounded-full uppercase tracking-widest">
                            +{ach.xp_reward} XP
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className={`text-lg font-black leading-tight tracking-tight font-headline ${isUnlocked ? 'text-foreground' : 'text-on-surface-variant'}`}>
                          {ach.name}
                        </p>
                        <p className="text-sm text-on-surface-variant/60 font-medium leading-relaxed">
                          {ach.description}
                        </p>
                      </div>

                      {isUnlocked && unlockedAt && (
                        <div className="mt-8 pt-6 border-t border-outline-variant/30 flex items-center justify-between">
                          <p className="text-[10px] font-black text-on-surface-variant/30 uppercase tracking-[0.2em]">
                            DESBLOQUEADO
                          </p>
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                            {format(new Date(unlockedAt), "d MMM yyyy", { locale: es })}
                          </p>
                        </div>
                      )}

                      {!isUnlocked && (
                         <div className="absolute inset-0 bg-surface/50 backdrop-blur-[1px] rounded-[32px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 bg-surface px-4 py-2 rounded-full border border-outline-variant/30 shadow-xl">Bloqueado</span>
                         </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AchievementsPage;
