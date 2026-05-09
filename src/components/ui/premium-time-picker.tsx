import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PremiumTimePickerProps {
  value: string; // HH:mm format
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

const PremiumTimePicker: React.FC<PremiumTimePickerProps> = ({ value, onChange, label, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState(parseInt(value.split(':')[0]) || 0);
  const [minutes, setMinutes] = useState(parseInt(value.split(':')[1]) || 0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const [h, m] = value.split(':').map(Number);
    setHours(h || 0);
    setMinutes(m || 0);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateTime = (newH: number, newM: number) => {
    const h = Math.min(23, Math.max(0, newH));
    const m = Math.min(59, Math.max(0, newM));
    setHours(h);
    setMinutes(m);
    onChange(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  };

  const incrementHours = () => updateTime(hours + 1, minutes);
  const decrementHours = () => updateTime(hours - 1, minutes);
  const incrementMinutes = () => updateTime(hours, minutes + 5);
  const decrementMinutes = () => updateTime(hours, minutes - 5);

  return (
    <div className={cn("relative space-y-1", className)} ref={containerRef}>
      {label && (
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
          {label}
        </label>
      )}
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between bg-surface border border-outline-variant rounded-[16px] px-4 py-3 cursor-pointer hover:border-primary/50 transition-all",
          isOpen && "ring-2 ring-primary/20 border-primary"
        )}
      >
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-primary/40" />
          <span className="text-sm font-black text-primary">
            {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
          </span>
        </div>
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground/30 transition-transform duration-300", isOpen && "rotate-180")} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="absolute left-0 right-0 top-full mt-2 z-[100] bg-surface-container-highest border border-outline-variant rounded-[24px] shadow-2xl p-4 overflow-hidden"
          >
            <div className="flex items-center justify-center gap-6">
              {/* Hours */}
              <div className="flex flex-col items-center gap-1">
                <button onClick={incrementHours} className="p-2 hover:bg-primary/10 rounded-full transition-colors"><ChevronUp className="w-4 h-4" /></button>
                <span className="text-2xl font-black">{hours.toString().padStart(2, '0')}</span>
                <button onClick={decrementHours} className="p-2 hover:bg-primary/10 rounded-full transition-colors"><ChevronDown className="w-4 h-4" /></button>
              </div>
              
              <span className="text-2xl font-black opacity-20">:</span>
              
              {/* Minutes */}
              <div className="flex flex-col items-center gap-1">
                <button onClick={incrementMinutes} className="p-2 hover:bg-primary/10 rounded-full transition-colors"><ChevronUp className="w-4 h-4" /></button>
                <span className="text-2xl font-black">{minutes.toString().padStart(2, '0')}</span>
                <button onClick={decrementMinutes} className="p-2 hover:bg-primary/10 rounded-full transition-colors"><ChevronDown className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-outline-variant/10 flex justify-center">
              <button 
                onClick={() => setIsOpen(false)}
                className="w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary/20 transition-all"
              >
                Listo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PremiumTimePicker;
