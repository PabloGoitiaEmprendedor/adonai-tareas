import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { WAKE_WORD_TRIGGERED_EVENT } from '@/lib/voiceEvents';

interface FABProps {
  onClick: () => void;
}

const FAB = ({ onClick }: FABProps) => {
  const [wakePulse, setWakePulse] = useState(false);

  useEffect(() => {
    const handleWake = () => {
      setWakePulse(true);
      window.setTimeout(() => setWakePulse(false), 700);
    };

    window.addEventListener(WAKE_WORD_TRIGGERED_EVENT, handleWake);
    return () => window.removeEventListener(WAKE_WORD_TRIGGERED_EVENT, handleWake);
  }, []);

  return (
    <motion.button
      onClick={onClick}
      id="global-add-task-button"
      aria-label="Añadir tarea"
      className="fixed bottom-[84px] lg:bottom-8 right-5 lg:right-8 z-50 h-14 pl-4 pr-5 rounded-2xl bg-foreground text-background flex items-center gap-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.18)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.22)] active:shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition-shadow"
      animate={wakePulse ? { scale: [1, 1.06, 1] } : undefined}
      transition={{ duration: 0.45 }}
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -1 }}
    >
      <Plus className="w-5 h-5" strokeWidth={2.75} />
      <span className="text-sm font-bold tracking-tight">Nueva tarea</span>
    </motion.button>
  );
};

export default FAB;
