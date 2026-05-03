"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus, Type, Mic, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { WAKE_WORD_TRIGGERED_EVENT } from '@/lib/voiceEvents';

type FloatingActionMenuProps = {
  options: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  }[];
  className?: string;
};

const FloatingActionMenu = ({ options, className }: FloatingActionMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [wakePulse, setWakePulse] = useState(false);

  useEffect(() => {
    const handleWake = () => {
      setWakePulse(true);
      window.setTimeout(() => setWakePulse(false), 700);
    };

    window.addEventListener(WAKE_WORD_TRIGGERED_EVENT, handleWake);
    return () => window.removeEventListener(WAKE_WORD_TRIGGERED_EVENT, handleWake);
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Backdrop for premium feel and focus */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[45]"
          />
        )}
      </AnimatePresence>

      <div className={cn("fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3", className)}>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(10px)" }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 30,
              }}
              className="flex flex-col items-end gap-3 mb-4"
            >
              {options.map((option, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{
                    delay: index * 0.03,
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                  }}
                >
                  <Button
                    onClick={() => {
                      option.onClick();
                      setIsOpen(false);
                    }}
                    className="group relative flex items-center gap-3 bg-card/80 hover:bg-primary backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-white/10 rounded-2xl px-6 py-6 h-14 transition-all duration-300 overflow-hidden"
                  >
                    <span className="text-foreground group-hover:text-primary-foreground font-bold text-sm">
                      {option.label}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-primary/10 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                      {React.cloneElement(option.icon as React.ReactElement, { 
                        className: "w-4 h-4 text-primary group-hover:text-primary-foreground" 
                      })}
                    </div>
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={toggleMenu}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={wakePulse ? { scale: [1, 1.15, 1] } : undefined}
          transition={wakePulse ? { duration: 0.45 } : { duration: 0.5 }}
          className={cn(
            "w-16 h-16 rounded-[22px] flex items-center justify-center shadow-[0_12px_40px_rgba(0,0,0,0.3)] transition-all duration-500 border border-white/10",
            isOpen ? "bg-foreground text-background rotate-90" : "bg-primary text-primary-foreground"
          )}
        >
          {isOpen ? (
            <X className="w-8 h-8" strokeWidth={2.5} />
          ) : (
            <Plus className="w-9 h-9" strokeWidth={2.5} />
          )}
        </motion.button>
      </div>
    </>
  );
};

export default FloatingActionMenu;
