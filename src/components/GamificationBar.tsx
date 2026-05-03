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
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white border border-black/5 hover:border-black/10 transition-all">
        {/* Streak */}
        <div className="flex items-center gap-1 text-[12px] font-black tabular-nums text-on-surface-variant">
          <motion.div
            animate={{ scale: streak > 0 ? [1, 1.1, 1] : 1 }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Flame className="w-3.5 h-3.5 text-orange-500" />
          </motion.div>
          {streak}
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-black/5" />

        {/* Level + XP bar */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/60 whitespace-nowrap">
            <Star className="w-3 h-3 inline -mt-0.5 mr-0.5" />
            Nivel {level}
          </span>
          <div className="flex-1 h-1.5 bg-black/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full bg-black rounded-full"
            />
          </div>
          <span className="text-[9px] font-bold tabular-nums text-on-surface-variant/40 whitespace-nowrap">
            {current}/{needed} XP
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-black/5" />

        {/* Trophies count */}
        <div className="flex items-center gap-1 text-[12px] font-black tabular-nums text-on-surface-variant">
          <Trophy className="w-3.5 h-3.5" />
          {unlocked.length}
        </div>
      </div>
    </Link>
  );
};

export default GamificationBar;
