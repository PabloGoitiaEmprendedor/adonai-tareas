import { motion, AnimatePresence } from 'framer-motion';

interface WakeWordOverlayProps {
  visible: boolean;
}

const edgeClass = 'absolute bg-primary/30 blur-2xl';

const WakeWordOverlay = ({ visible }: WakeWordOverlayProps) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[80] pointer-events-none overflow-hidden"
        >
          <motion.div
            initial={{ scaleX: 0.2, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ scaleX: 0.2, opacity: 0 }}
            className={`${edgeClass} inset-x-0 top-0 h-3 origin-center`}
          />
          <motion.div
            initial={{ scaleX: 0.2, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ scaleX: 0.2, opacity: 0 }}
            className={`${edgeClass} inset-x-0 bottom-0 h-3 origin-center`}
          />
          <motion.div
            initial={{ scaleY: 0.2, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            exit={{ scaleY: 0.2, opacity: 0 }}
            className={`${edgeClass} inset-y-0 left-0 w-3 origin-center`}
          />
          <motion.div
            initial={{ scaleY: 0.2, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            exit={{ scaleY: 0.2, opacity: 0 }}
            className={`${edgeClass} inset-y-0 right-0 w-3 origin-center`}
          />

          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="px-5 py-2.5 rounded-full bg-surface-container-high/80 backdrop-blur-md border border-primary/20"
            >
              <p className="text-sm font-bold text-primary tracking-wide">Hey Adonai</p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WakeWordOverlay;
