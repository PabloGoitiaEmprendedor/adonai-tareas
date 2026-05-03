import { motion } from 'framer-motion';
import { Trophy, Flame } from 'lucide-react';
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
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-surface-container-highest border border-black/5 dark:border-white/10 hover:border-primary/30 transition-all shadow-md hover:shadow-lg">
        {/* Level + XP bar */}
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-surface-container/50 px-3 py-1.5 rounded-full border border-outline-variant/10">
                <span className="text-[10px] font-black tracking-[0.2em] uppercase text-primary">Nivel {level}</span>
              </div>
              {streak > 0 && (
                <div className="flex items-center gap-1 bg-orange-500/10 px-1.5 py-0.5 rounded-lg border border-orange-500/20">
                  <Flame className="w-3 h-3 text-orange-500 fill-orange-500/20" />
                  <span className="text-[10px] font-black text-orange-500">{streak}</span>
                </div>
              )}
            </div>
            <span className="text-[10px] font-bold tabular-nums text-foreground/80">
              {current}/{needed} XP
            </span>
          </div>
          <div className="h-2.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden border border-black/5 dark:border-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full primary-gradient rounded-full shadow-[0_0_8px_rgba(var(--primary-rgb,101,163,13),0.5)]"
            />
          </div>
        </div>

        {/* Trophies count */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
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
