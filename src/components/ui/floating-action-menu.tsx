"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";

type FloatingActionMenuProps = {
  options: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  }[];
  className?: string;
  contextLabel?: string;
};

const FloatingActionMenu = ({ options, className, contextLabel }: FloatingActionMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const handleClose = () => setIsOpen(false);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!document.body.classList.contains('tutorial-active')) {
                setIsOpen(false);
              }
            }}
            className={cn(
              "fixed inset-0 z-[9998]",
              document.body.classList.contains('tutorial-active')
                ? "bg-black/40"
                : "bg-black/60 backdrop-blur-sm"
            )}
          />
        )}
      </AnimatePresence>

      <div className={cn("fixed bottom-[92px] right-5 sm:bottom-8 sm:right-8 z-[9999] flex flex-col items-end gap-3", className)}>
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
                    id={index === 0 ? "fab-text-option" : undefined}
                    disabled={index === 1 && document.body.classList.contains('tutorial-active')}
                    onClick={() => {
                      option.onClick();
                      setIsOpen(false);
                    }}
                    className={cn(
                      "group relative flex items-center gap-3 bg-card/80 hover:bg-primary backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-white/10 rounded-xl sm:rounded-2xl px-4 sm:px-6 py-4 sm:py-6 h-12 sm:h-14 transition-all duration-300 overflow-hidden",
                      index === 1 && document.body.classList.contains('tutorial-active') && "opacity-30 cursor-not-allowed grayscale"
                    )}
                  >
                    <span className="text-foreground group-hover:text-primary-foreground font-bold text-xs sm:text-sm">
                      {option.label}
                    </span>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-primary/10 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                      {React.cloneElement(option.icon as React.ReactElement, { 
                        className: "w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary group-hover:text-primary-foreground" 
                      })}
                    </div>
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          id="global-add-task-button"
          onClick={toggleMenu}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.5 }}
          className={cn(
            "h-14 sm:h-16 rounded-[18px] sm:rounded-[22px] flex items-center justify-center gap-2 shadow-[0_12px_40px_rgba(0,0,0,0.3)] transition-all duration-500 border border-white/10",
            contextLabel && !isOpen ? "w-auto max-w-[220px] px-4 sm:max-w-[260px] sm:px-5" : "w-14 sm:w-16",
            isOpen ? "bg-foreground text-background rotate-90" : "bg-brand text-brand-foreground"
          )}
        >
          {isOpen ? (
            <X className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={2.5} />
          ) : (
            <>
              <Pencil className="w-6 h-6 sm:w-7 sm:h-7 shrink-0" strokeWidth={2.5} />
              {contextLabel && (
                <span className="max-w-[140px] truncate text-[10px] font-black uppercase tracking-[0.1em] sm:max-w-[180px] sm:text-xs sm:tracking-[0.12em]">
                  {contextLabel}
                </span>
              )}
            </>
          )}
        </motion.button>
      </div>
    </>
  );
};

export default FloatingActionMenu;
