import { useStreaks } from '@/hooks/useStreaks';
import { useGamification, xpProgressInLevel } from '@/hooks/useGamification';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Rocket, Zap, Crown, Flame, Star, Calendar, Target, Trophy, Award, Medal, ShieldCheck,
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
        <header className="space-y-2 border-b border-border/40 pb-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-primary font-bold tracking-[0.2em] text-[10px] uppercase"
          >
            <Medal className="w-3 h-3" />
            <span>Sistema de Honor</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-black tracking-tight leading-[0.9]"
          >
            Tu Legado <span className="text-on-surface-variant/40">Visualizado.</span>
          </motion.h1>
        </header>

        {/* Stats Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Level Card - Large */}
          <motion.div 
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="md:col-span-2 bg-surface-container-high border border-border/60 p-8 rounded-[2.5rem] flex flex-col justify-between gap-8 relative overflow-hidden"
          >
            <div className="relative z-10 space-y-1">
              <div className="flex items-center gap-2 text-primary">
                <Star className="w-5 h-5 fill-current" />
                <span className="text-[10px] uppercase font-black tracking-widest">Nivel de Maestría</span>
              </div>
              <p className="text-6xl font-black tabular-nums tracking-tighter leading-none">{level}</p>
            </div>
            
            <div className="relative z-10 space-y-3">
              <div className="flex justify-between items-end">
                <p className="text-xs font-bold text-on-surface-variant/60 tabular-nums">
                  <span className="text-foreground">{current}</span> / {needed} XP
                </p>
                <p className="text-xs font-black text-primary">{Math.round(percent)}%</p>
              </div>
              <div className="h-3 bg-surface-container-highest rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full primary-gradient rounded-full" 
                />
              </div>
            </div>

            {/* Background Decor */}
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Crown className="w-32 h-32 rotate-12" />
            </div>
          </motion.div>

          {/* Streak Card */}
          <motion.div 
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="bg-orange-500/15 border border-orange-500/20 p-6 rounded-[2.5rem] flex flex-col justify-between gap-4"
          >
            <div className="flex items-center gap-2 text-orange-600">
              <Flame className="w-4 h-4 fill-current" />
              <span className="text-[10px] uppercase font-black tracking-widest">Racha</span>
            </div>
            <p className="text-4xl font-black tabular-nums tracking-tight leading-none">{streak}</p>
            <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Record: {streakMax} Días</p>
          </motion.div>

          {/* Achievements Count Card */}
          <motion.div 
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="bg-surface-container-low border border-border/40 p-6 rounded-[2.5rem] flex flex-col justify-between gap-4"
          >
            <div className="flex items-center gap-2 text-primary">
              <Trophy className="w-4 h-4" />
              <span className="text-[10px] uppercase font-black tracking-widest">Trofeos</span>
            </div>
            <p className="text-4xl font-black tabular-nums tracking-tight leading-none">
              {unlocked.length}
              <span className="text-lg text-on-surface-variant/30 ml-1">/{achievements.length}</span>
            </p>
            <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Insignias totales</p>
          </motion.div>

          {/* Tasks Total Card */}
          <motion.div 
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="md:col-span-2 bg-surface-container-low border border-border/40 p-6 rounded-[2.5rem] flex items-center justify-between"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-on-surface-variant/60">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[10px] uppercase font-black tracking-widest">Operaciones</span>
              </div>
              <p className="text-4xl font-black tabular-nums tracking-tight leading-none">{tasksTotal}</p>
              <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Tareas completadas</p>
            </div>
            <div className="w-16 h-16 bg-surface-container-highest rounded-3xl flex items-center justify-center">
              <Zap className="w-8 h-8 text-primary" />
            </div>
          </motion.div>

          {/* Goal Insight Card (Placeholder or derived stat) */}
          <motion.div 
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="md:col-span-2 bg-primary/10 border border-primary/20 p-6 rounded-[2.5rem] flex items-center gap-6"
          >
             <div className="w-16 h-16 bg-primary text-primary-foreground rounded-3xl flex items-center justify-center shrink-0">
              <Award className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black leading-tight">Elite del Enfoque</h3>
              <p className="text-xs text-on-surface-variant/70 leading-relaxed font-medium">Estás en el top 5% de usuarios más consistentes esta semana. ¡Sigue así!</p>
            </div>
          </motion.div>

        </div>

        {/* Achievements Section */}
        <div className="space-y-12">
          {Object.entries(byCategory).map(([cat, list]: [string, any]) => (
            <motion.section 
              key={cat}
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border/40" />
                <h2 className="text-[10px] uppercase font-black tracking-[0.3em] text-on-surface-variant/40">
                  {CATEGORY_LABELS[cat] || cat}
                </h2>
                <div className="h-px flex-1 bg-border/40" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((ach: any) => {
                  const Icon = ICONS[ach.icon] || Trophy;
                  const isUnlocked = unlockedCodes.has(ach.code);
                  const unlockedAt = unlockedById.get(ach.code);
                  
                  return (
                    <motion.div
                      key={ach.id}
                      variants={itemVariants}
                      className={`group relative p-6 rounded-[2.5rem] border transition-all ${
                        isUnlocked
                          ? 'bg-surface-container-low border-primary/20 shadow-xl shadow-black/5'
                          : 'bg-surface-container-low/30 border-border/20 grayscale opacity-40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
                          isUnlocked ? 'bg-primary text-primary-foreground rotate-0' : 'bg-surface-container-highest text-on-surface-variant/30 -rotate-3'
                        }`}>
                          <Icon className="w-7 h-7" />
                        </div>
                        {isUnlocked && (
                           <div className="text-[10px] font-black tabular-nums bg-primary/10 text-primary px-3 py-1.5 rounded-full uppercase tracking-widest">
                            +{ach.xp_reward} XP
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className={`text-lg font-black leading-tight ${isUnlocked ? 'text-foreground' : 'text-on-surface-variant'}`}>
                          {ach.name}
                        </p>
                        <p className="text-xs text-on-surface-variant/60 font-medium leading-relaxed">
                          {ach.description}
                        </p>
                      </div>

                      {isUnlocked && unlockedAt && (
                        <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between">
                          <p className="text-[9px] font-black text-on-surface-variant/30 uppercase tracking-[0.2em]">
                            Conseguido
                          </p>
                          <p className="text-[9px] font-black text-primary uppercase tracking-widest">
                            {format(new Date(unlockedAt), "d MMM yyyy", { locale: es })}
                          </p>
                        </div>
                      )}

                      {!isUnlocked && (
                         <div className="absolute inset-0 bg-surface-container-low/10 backdrop-blur-[2px] rounded-[2.5rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Bloqueado</span>
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
