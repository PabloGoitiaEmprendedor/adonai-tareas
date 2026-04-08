import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';
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
      className="fixed bottom-20 right-5 z-50 w-14 h-14 rounded-full primary-gradient flex items-center justify-center shadow-lg shadow-primary/20"
      animate={wakePulse ? { scale: [1, 1.18, 1] } : { scale: [1, 1.05, 1] }}
      transition={{ duration: wakePulse ? 0.45 : 2, repeat: wakePulse ? 0 : Infinity, ease: 'easeInOut' }}
      whileTap={{ scale: 0.9 }}
    >
      <Mic className="w-6 h-6 text-primary-foreground" />
    </motion.button>
  );
};

export default FAB;
