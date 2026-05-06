import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SelectionBubblePage() {
  const [text, setText] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Listen for text from the main process
    const handleCapture = (_event, data) => {
      setText(data.text);
      setVisible(true);
      
      // Auto-hide after 5 seconds if not clicked
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    };

    window.electron?.on('capture-selection', handleCapture);
  }, []);

  const handleClick = () => {
    window.electron?.send('open-quick-task', { text });
    setVisible(false);
  };

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden bg-transparent select-none">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 10 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClick}
            className="flex items-center gap-2 bg-[#1a1c1e] border border-primary/30 rounded-full px-4 py-2 shadow-2xl cursor-pointer group"
          >
            <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
              <svg className="w-4 h-4 text-primary-foreground fill-current" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest text-white whitespace-nowrap">
              Crear Tarea
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
