import { useStreaks } from '@/hooks/useStreaks';
import { useGamification, xpProgressInLevel } from '@/hooks/useGamification';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Rocket, Zap, Crown, Flame, Star, Target, Trophy, Award, Medal, ShieldCheck,
  ChevronRight,
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
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30 pb-32 overflow-x-hidden">
      <div className="mx-auto max-w-6xl px-4 pt-8 space-y-9 sm:px-6 sm:pt-12 sm:space-y-16">
        
        {/* Premium Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-5 md:gap-8">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-1 w-8 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.35)] sm:w-12" />
              <span className="text-[10px] font-black uppercase tracking-[0.24em] text-primary sm:text-[11px] sm:tracking-[0.4em]">
                Sistema de Honor
              </span>
            </div>
            <h1 className="text-[46px] font-black leading-[0.92] tracking-tight text-foreground sm:text-6xl sm:leading-none lg:text-7xl">
              Tus <span className="opacity-10">Logros.</span>
            </h1>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative group cursor-default"
          >
            <div className="absolute inset-0 bg-primary/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative flex items-center gap-4 rounded-[24px] border border-outline-variant/20 bg-surface-container/45 px-5 py-4 backdrop-blur-md sm:rounded-[28px] sm:px-8 sm:py-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 sm:h-12 sm:w-12">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">Insignias</p>
                <p className="text-3xl font-black tabular-nums leading-none">{unlocked.length}</p>
              </div>
            </div>
          </motion.div>
        </header>

        {/* Bento Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-12">
          
          {/* Main Level Card */}
          <Card className="group relative flex flex-col justify-between gap-8 overflow-hidden rounded-[28px] border-outline-variant/20 bg-surface-container/30 p-5 backdrop-blur-sm transition-all duration-700 hover:border-primary/30 sm:rounded-[40px] sm:p-10 sm:gap-12 md:col-span-8">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/3" />
            
            <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center md:gap-8">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-[10px] uppercase font-black tracking-[0.3em]">Rango de Maestría</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-[72px] font-black tabular-nums tracking-[-0.08em] leading-none text-foreground transition-transform duration-700 group-hover:scale-105 sm:text-8xl">
                    {level}
                  </p>
                  <span className="text-xl font-black text-on-surface-variant/20 uppercase tracking-widest">Nvl</span>
                </div>
              </div>

              <div className="flex flex-row items-end justify-between gap-2 md:flex-col md:justify-start">
                <p className="text-[12px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] tabular-nums">
                  XP ACUMULADA
                </p>
                <p className="text-3xl font-black tabular-nums text-foreground sm:text-4xl">{xp.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="relative z-10 space-y-4">
              <div className="flex justify-between items-end">
                <p className="text-[12px] font-black text-on-surface-variant/60 uppercase tracking-widest tabular-nums">
                  Próximo Nivel en <span className="text-primary">{needed - current} XP</span>
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black tabular-nums">{Math.round(percent)}%</span>
                </div>
              </div>
              <div className="h-4 bg-background/50 rounded-full overflow-hidden p-1 border border-outline-variant/10">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 1.5, ease: "circOut" }}
                  className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full relative overflow-hidden" 
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" style={{ width: '200%' }} />
                </motion.div>
              </div>
            </div>
          </Card>

          {/* Racha Card */}
          <Card className="group relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-[28px] border-orange-500/10 bg-orange-500/5 p-5 transition-all duration-700 hover:border-orange-500/30 sm:rounded-[40px] sm:p-10 md:col-span-4">
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-orange-500/10 blur-[60px] rounded-full" />
            
            <div className="flex items-center gap-3 text-orange-500 relative z-10">
              <Flame className="w-6 h-6 fill-current animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.4)]" />
              <span className="text-[11px] uppercase font-black tracking-[0.3em]">Racha Actual</span>
            </div>
            
            <div className="relative z-10 space-y-4">
              <p className="text-[64px] font-black tabular-nums tracking-tighter leading-none transition-transform duration-700 group-hover:scale-110 sm:text-7xl">
                {streak}
              </p>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-orange-500/40 uppercase tracking-widest">DÍAS CONSECUTIVOS</span>
                <div className="h-1 w-full bg-orange-500/10 rounded-full mt-2">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((streak/30)*100, 100)}%` }}
                    className="h-full bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Total Tasks Card */}
          <Card className="group relative flex min-h-[190px] flex-col justify-between overflow-hidden rounded-[28px] border-outline-variant/10 bg-surface-container/20 p-5 transition-all duration-700 hover:border-primary/20 sm:rounded-[40px] sm:p-10 md:col-span-4">
            <div className="flex items-center gap-3 text-primary relative z-10">
              <ShieldCheck className="w-6 h-6" />
              <span className="text-[11px] uppercase font-black tracking-[0.3em]">Compromiso</span>
            </div>
            
            <div className="relative z-10">
              <p className="text-[56px] font-black tabular-nums tracking-tighter leading-none sm:text-6xl">{tasksTotal}</p>
              <p className="text-[10px] font-black text-on-surface-variant/30 uppercase tracking-[0.3em] mt-4">TAREAS CONQUISTADAS</p>
            </div>
          </Card>

          {/* Elite Insights Card */}
          <Card className="group overflow-hidden rounded-[28px] bg-foreground p-[1px] text-background sm:rounded-[40px] md:col-span-8">
            <div className="relative flex h-full w-full items-center justify-between overflow-hidden rounded-[27px] bg-foreground p-5 sm:rounded-[39px] sm:p-10">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-30" />
              
              <div className="relative z-10 flex items-center gap-4 sm:gap-8">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_20px_50px_hsl(var(--primary)/0.24)] transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 sm:h-20 sm:w-20 sm:rounded-3xl">
                  <Rocket className="h-7 w-7 fill-current sm:h-10 sm:w-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black font-headline tracking-tight leading-tight italic sm:text-3xl">
                    Élite del <span className="text-primary">Enfoque</span>
                  </h3>
                  <p className="max-w-md text-sm font-medium leading-relaxed text-background/55 sm:text-base">
                    Tu disciplina es superior a la mayoría. Mantén el ritmo para desbloquear insignias secretas.
                  </p>
                </div>
              </div>
              
              <div className="hidden lg:flex items-center gap-4 relative z-10">
                <div className="text-right">
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">STATUS</p>
                  <p className="text-xl font-black italic tracking-tight">ADONAI PRO</p>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-primary/30 flex items-center justify-center">
                  <ChevronRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Card>

        </div>

        {/* Achievements Sections */}
        <div className="space-y-14 pt-4 sm:space-y-24 sm:pt-12">
          {Object.entries(byCategory).map(([cat, list]: [string, any]) => (
            <motion.section 
              key={cat}
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="space-y-7 sm:space-y-12"
            >
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                <h2 className="text-[11px] uppercase font-black tracking-[0.28em] text-foreground/45 sm:text-[13px] sm:tracking-[0.5em]">
                  {CATEGORY_LABELS[cat] || cat}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-outline-variant/30 to-transparent" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
                {list.map((ach: any) => {
                  const Icon = ICONS[ach.icon] || Trophy;
                  const isUnlocked = unlockedCodes.has(ach.code);
                  const unlockedAt = unlockedById.get(ach.code);
                  
                  return (
                    <motion.div
                      key={ach.id}
                      variants={itemVariants}
                      whileHover={{ y: -8 }}
                      className={`group relative rounded-[28px] border p-5 transition-all duration-700 sm:rounded-[44px] sm:p-10 ${
                        isUnlocked
                          ? 'bg-surface-container border-primary/20 shadow-2xl shadow-primary/5 hover:border-primary/40'
                          : 'bg-surface/20 border-outline-variant/20 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 hover:bg-surface-container/50'
                      }`}
                    >
                      <div className="mb-6 flex items-start justify-between gap-4 sm:mb-8">
                        <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[18px] transition-all duration-700 sm:h-16 sm:w-16 sm:rounded-[22px] ${
                          isUnlocked 
                            ? 'bg-primary text-primary-foreground shadow-[0_15px_35px_rgba(var(--primary),0.3)] group-hover:scale-110 group-hover:rotate-3' 
                            : 'bg-surface-container-highest text-on-surface-variant/20'
                        }`}>
                          <Icon className="w-8 h-8" />
                        </div>
                        {isUnlocked && (
                           <motion.div 
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="rounded-2xl bg-primary/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary shadow-inner shadow-primary/5 sm:px-4 sm:text-[11px]"
                           >
                            +{ach.xp_reward} XP
                          </motion.div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <p className={`text-xl font-black leading-tight tracking-tight font-headline italic sm:text-2xl ${isUnlocked ? 'text-foreground' : 'text-on-surface-variant/60'}`}>
                          {ach.name}
                        </p>
                        <p className="text-sm font-medium leading-relaxed text-on-surface-variant/55 sm:text-base">
                          {ach.description}
                        </p>
                      </div>

                      <AnimatePresence>
                        {isUnlocked && unlockedAt && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-7 flex items-center justify-between border-t border-outline-variant/30 pt-5 sm:mt-10 sm:pt-8"
                          >
                            <div className="space-y-1">
                              <p className="text-[9px] font-black text-on-surface-variant/30 uppercase tracking-[0.3em]">
                                CONQUISTADO EL
                              </p>
                              <p className="text-[11px] font-black text-primary uppercase tracking-widest">
                                {format(new Date(unlockedAt), "d MMM yyyy", { locale: es })}
                              </p>
                            </div>
                            <Medal className="w-5 h-5 text-primary/30" />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {!isUnlocked && (
                         <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px] rounded-[44px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none">
                            <div className="bg-surface-container/80 backdrop-blur-xl px-6 py-3 rounded-full border border-outline-variant/30 shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Bloqueado</span>
                            </div>
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
