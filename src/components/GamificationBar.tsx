import { motion } from 'framer-motion';
import { Flame, Star, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStreaks } from '@/hooks/useStreaks';
import { useGamification, xpProgressInLevel } from '@/hooks/useGamification';

export const GamificationBar = () => {
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
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-highest border-2 border-outline-variant/40 hover:border-primary/50 transition-all shadow-sm">
        {/* Streak */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-orange-500/35 border border-orange-500/30">
          <motion.div
            animate={{ scale: streak > 0 ? [1, 1.15, 1] : 1 }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Flame className="w-4 h-4 text-orange-500" />
          </motion.div>
          <span className="text-[13px] font-black tabular-nums text-orange-600 dark:text-orange-400">
            {streak}
          </span>
        </div>

        {/* Level + XP bar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-primary fill-primary/50" />
              <span className="text-[11px] font-black uppercase tracking-wider text-foreground">
                Nivel {level}
              </span>
            </div>
            <span className="text-[10px] font-bold tabular-nums text-on-surface-variant/80">
              {current}/{needed} XP
            </span>
          </div>
          <div className="h-2.5 bg-surface-container-highest rounded-full overflow-hidden border border-outline-variant/20">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full primary-gradient rounded-full shadow-[0_0_8px_rgba(var(--primary-rgb,101,163,13),0.5)]"
            />
          </div>
        </div>

        {/* Trophies count */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-primary/25 border border-primary/20 group-hover:bg-primary/35 transition-colors">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-[13px] font-black tabular-nums text-primary">
            {unlocked.length}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default GamificationBar;
