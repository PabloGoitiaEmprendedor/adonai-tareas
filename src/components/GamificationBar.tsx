import { motion } from 'framer-motion';
import { Trophy, Flame, Zap, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStreaks } from '@/hooks/useStreaks';
import { useGamification, xpProgressInLevel } from '@/hooks/useGamification';

export const GamificationBar = ({ completedCount, totalCount }: { completedCount?: number, totalCount?: number }) => {
  const { metrics } = useStreaks();
  const { unlocked } = useGamification();

  const streak = metrics?.streak_current || 0;
  const xp = metrics?.xp_total || 0;
  const { current, needed, level, percent } = xpProgressInLevel(xp);

  return (
    <Link
      to="/achievements"
      className="block group"
      aria-label="Ver logros y progreso"
    >
      <div className="relative overflow-hidden flex items-center gap-4 p-4 rounded-[28px] bg-white dark:bg-surface-container-highest border border-black/5 dark:border-white/10 hover:border-primary/40 transition-all shadow-xl hover:shadow-2xl">
        {/* Subtle background glow based on level */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[40px] -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
        
        {/* Level Hexagon-ish Circle */}
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-primary rotate-3 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:rotate-6 transition-transform duration-500">
            <div className="-rotate-3 group-hover:-rotate-6 transition-transform duration-500 flex flex-col items-center">
              <span className="text-[10px] font-black text-primary-foreground/60 uppercase tracking-tighter leading-none mb-0.5">LVL</span>
              <span className="text-xl font-black text-primary-foreground leading-none">{level}</span>
            </div>
          </div>
          {streak > 0 && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 flex items-center gap-1 bg-orange-500 px-2 py-0.5 rounded-full border-2 border-white dark:border-surface-container-highest shadow-md"
            >
              <Flame className="w-3 h-3 text-white fill-white" />
              <span className="text-[10px] font-black text-white">{streak}</span>
            </motion.div>
          )}
        </div>

        {/* Progress Info */}
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-black text-foreground tracking-tight group-hover:text-primary transition-colors">
                Próximo Nivel
              </span>
              <div className="flex items-center gap-1 opacity-40">
                <Star className="w-3 h-3 fill-current" />
                <span className="text-[10px] font-bold">{unlocked.length} Logros</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/10">
              <Zap className="w-3 h-3 text-primary fill-primary/20" />
              <span className="text-[11px] font-black tabular-nums text-primary">
                {current} <span className="opacity-40">/ {needed}</span>
              </span>
            </div>
          </div>

          <div className="h-3 bg-black/[0.03] dark:bg-black/20 rounded-full overflow-hidden border border-black/[0.05] dark:border-white/5 relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 1, ease: 'circOut' }}
              className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),0.3)] relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" style={{ width: '200%' }} />
            </motion.div>
          </div>
        </div>

        {/* Trophy Indicator */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-surface-container-high/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors border border-outline-variant/10">
          <Trophy className="w-5 h-5 text-on-surface-variant/40 group-hover:text-primary group-hover:scale-110 transition-all" />
        </div>
      </div>
    </Link>
  );
};

export default GamificationBar;
