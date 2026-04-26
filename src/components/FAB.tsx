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
      className="fixed bottom-[84px] lg:bottom-10 right-6 lg:right-10 z-50 w-16 h-16 rounded-full bg-primary text-black flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] active:shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-shadow"
      animate={wakePulse ? { scale: [1, 1.15, 1] } : undefined}
      transition={{ duration: 0.45 }}
      whileTap={{ scale: 0.94 }}
      whileHover={{ y: -2, scale: 1.05 }}
    >
      <Plus className="w-8 h-8" strokeWidth={3} />
    </motion.button>
  );
};

export default FAB;
