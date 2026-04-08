import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';

interface FABProps {
  onClick: () => void;
}

const FAB = ({ onClick }: FABProps) => {
  return (
    <motion.button
      onClick={onClick}
      className="fixed bottom-20 right-5 z-50 w-14 h-14 rounded-full primary-gradient flex items-center justify-center shadow-lg shadow-primary/20"
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      whileTap={{ scale: 0.9 }}
    >
      <Mic className="w-6 h-6 text-primary-foreground" />
    </motion.button>
  );
};

export default FAB;
