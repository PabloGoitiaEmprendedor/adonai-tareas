import { motion, AnimatePresence } from 'framer-motion';
import { Mic } from 'lucide-react';

interface WakeWordOverlayProps {
  visible: boolean;
}

const WakeWordOverlay = ({ visible }: WakeWordOverlayProps) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none"
        >
          {/* Ripple rings */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.5, opacity: 0.6 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{
                duration: 1.5,
                delay: i * 0.3,
                ease: 'easeOut',
              }}
              className="absolute w-32 h-32 rounded-full border-2 border-primary/40"
            />
          ))}

          {/* Center glow */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className="relative"
          >
            <div className="w-20 h-20 rounded-full primary-gradient flex items-center justify-center shadow-[0_0_60px_rgba(75,226,119,0.4)]">
              <Mic className="w-8 h-8 text-primary-foreground" />
            </div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm font-bold text-primary"
            >
              ¡Te escucho!
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WakeWordOverlay;
