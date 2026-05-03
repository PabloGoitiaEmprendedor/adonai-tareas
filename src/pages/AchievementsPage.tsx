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
    <div className="min-h-screen bg-background selection:bg-primary/30 pb-32">
      <div className="max-w-5xl mx-auto px-6 pt-12 space-y-12">
        
        {/* Header Section */}
        <header className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-primary font-bold tracking-[0.2em] text-[10px] uppercase"
          >
            <Medal className="w-3 h-3" />
            <span>Sistema de Honor</span>
          </motion.div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl sm:text-7xl font-black tracking-tight leading-[0.85]"
            >
              Logros <br />
              <span className="text-on-surface-variant/20 italic">Adonai.</span>
            </motion.h1>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-primary/10 border border-primary/20 px-6 py-3 rounded-2xl backdrop-blur-md"
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Tu Progreso</p>
              <p className="text-2xl font-black tabular-nums leading-none">
                {unlocked.length} <span className="text-sm font-bold text-on-surface-variant/40">Insignias</span>
              </p>
            </motion.div>
          </div>
        </header>

        {/* Stats Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Level Card - Large */}
          <Card className="md:col-span-2 bg-primary/5 border-primary/20 p-8 flex flex-col justify-between gap-8 relative overflow-hidden group">
            <div className="relative z-10 space-y-1">
              <div className="flex items-center gap-2 text-primary">
                <Star className="w-5 h-5 fill-current" />
                <span className="text-[10px] uppercase font-black tracking-widest">Nivel de Maestría</span>
              </div>
              <p className="text-7xl font-black tabular-nums tracking-tighter leading-none group-hover:scale-105 transition-transform duration-500">{level}</p>
            </div>
            
            <div className="relative z-10 space-y-3">
              <div className="flex justify-between items-end">
                <p className="text-xs font-bold text-on-surface-variant/60 tabular-nums">
                  <span className="text-foreground">{current}</span> / {needed} XP
                </p>
                <p className="text-xs font-black text-primary">{Math.round(percent)}%</p>
              </div>
              <div className="h-4 bg-black/10 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 1.5, ease: "circOut" }}
                  className="h-full bg-primary rounded-full shadow-[0_0_20px_rgba(33,217,4,0.3)]" 
                />
              </div>
            </div>

            {/* Background Decor */}
            <Crown className="absolute -top-6 -right-6 w-48 h-48 text-primary/5 -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
          </Card>

          {/* Streak Card */}
          <Card className="bg-orange-500/5 border-orange-500/20 p-6 flex flex-col justify-between gap-4 group">
            <div className="flex items-center gap-2 text-orange-500">
              <Flame className="w-5 h-5 fill-current animate-pulse" />
              <span className="text-[10px] uppercase font-black tracking-widest">Racha</span>
            </div>
            <div>
              <p className="text-5xl font-black tabular-nums tracking-tight leading-none group-hover:translate-x-1 transition-transform">{streak}</p>
              <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mt-2">Record: {streakMax} Días</p>
            </div>
          </Card>

          {/* Tasks Total Card */}
          <Card className="bg-surface-container-low border-white/5 p-6 flex flex-col justify-between gap-4 group">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-[10px] uppercase font-black tracking-widest">Tareas</span>
            </div>
            <div>
              <p className="text-5xl font-black tabular-nums tracking-tight leading-none group-hover:translate-x-1 transition-transform">{tasksTotal}</p>
              <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mt-2">Completadas hoy</p>
            </div>
          </Card>

          {/* Elite Insight Card */}
          <Card className="md:col-span-4 bg-foreground text-background p-8 flex items-center justify-between group overflow-hidden relative">
            <div className="flex items-center gap-8 relative z-10">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shrink-0 shadow-2xl group-hover:rotate-6 transition-transform">
                <Zap className="w-8 h-8 fill-current" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black leading-none tracking-tight">Elite del Enfoque</h3>
                <p className="text-sm text-background/60 leading-relaxed font-medium">Estás en el top 5% de usuarios más consistentes. <span className="text-primary">¡Mantén el ritmo!</span></p>
              </div>
            </div>
            <div className="hidden md:block">
              <Rocket className="w-24 h-24 text-primary/10 absolute -right-4 -bottom-4 -rotate-12 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-700" />
            </div>
          </Card>

        </div>

        {/* Achievements Section */}
        <div className="space-y-16 pt-8">
          {Object.entries(byCategory).map(([cat, list]: [string, any]) => (
            <motion.section 
              key={cat}
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div className="flex items-center gap-4">
                <h2 className="text-[11px] uppercase font-black tracking-[0.4em] text-on-surface-variant/40">
                  {CATEGORY_LABELS[cat] || cat}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-border/40 to-transparent" />
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
                          ? 'bg-surface-container-low border-primary/20 shadow-xl shadow-black/5'
                          : 'bg-surface-container-low/30 border-border/10 grayscale opacity-40 hover:grayscale-0 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-6">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-500 shadow-2xl ${
                          isUnlocked ? 'bg-primary text-primary-foreground rotate-0 scale-110 shadow-primary/20' : 'bg-surface-container-highest text-on-surface-variant/30 -rotate-3 scale-100 shadow-none'
                        }`}>
                          <Icon className="w-8 h-8" />
                        </div>
                        {isUnlocked && (
                           <div className="text-[10px] font-black bg-primary text-primary-foreground px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-primary/20">
                            +{ach.xp_reward} XP
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <p className={`text-2xl font-black leading-tight tracking-tight ${isUnlocked ? 'text-foreground' : 'text-on-surface-variant'}`}>
                          {ach.name}
                        </p>
                        <p className="text-sm text-on-surface-variant/60 font-medium leading-relaxed">
                          {ach.description}
                        </p>
                      </div>

                      {isUnlocked && unlockedAt && (
                        <div className="mt-6 pt-6 border-t border-border/40 flex items-center justify-between">
                          <p className="text-[10px] font-black text-on-surface-variant/30 uppercase tracking-[0.2em]">
                            ADQUIRIDO
                          </p>
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                            {format(new Date(unlockedAt), "d MMM yyyy", { locale: es })}
                          </p>
                        </div>
                      )}

                      {!isUnlocked && (
                         <div className="absolute inset-0 bg-surface-container-low/10 backdrop-blur-[1px] rounded-[32px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 bg-background/80 px-4 py-2 rounded-full border border-border/10 shadow-xl">Bloqueado</span>
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
