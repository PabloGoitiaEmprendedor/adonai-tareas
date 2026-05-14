import { useRef, useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface ScrollableDurationPickerProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  className?: string;
}

const ScrollableDurationPicker = ({ value, onChange, label, className }: ScrollableDurationPickerProps) => {
  const h = Math.floor(value / 60);
  const m = value % 60;
  const [hours, setHours] = useState(h);
  const [minutes, setMinutes] = useState(m);
  const hhRef = useRef<HTMLInputElement>(null);
  const mmRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHours(Math.floor(value / 60));
    setMinutes(value % 60);
  }, [value]);

  const emit = useCallback((h: number, m: number) => {
    onChange(Math.min(1440, Math.max(0, h * 60 + Math.round(m / 5) * 5)));
  }, [onChange]);

  const handleHhChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
    const h = raw === '' ? 0 : Math.min(24, parseInt(raw));
    setHours(h);
    if (raw.length === 2 || parseInt(raw) > 1) mmRef.current?.focus();
  };

  const handleMmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
    const m = raw === '' ? 0 : Math.min(59, parseInt(raw));
    setMinutes(m);
  };

  useEffect(() => {
    emit(hours, minutes);
  }, [hours, minutes]);

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/30">{label}</p>
      )}
      <div className="flex items-center justify-center gap-1.5 bg-surface-container/40 border border-outline-variant/20 rounded-[10px] px-3 py-1.5">
        {/* Hours */}
        <div className="flex flex-col items-center">
          <button onClick={() => emit(hours + 1, minutes)} className="p-0.5 text-on-surface-variant/30 hover:text-primary transition-colors">
            <ChevronUp className="w-3 h-3" />
          </button>
          <div className="flex items-baseline gap-0.5">
            <input
              ref={hhRef}
              value={String(hours)}
              onChange={handleHhChange}
              className="w-8 bg-transparent text-center text-lg font-black text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              onFocus={(e) => e.target.select()}
            />
            <span className="text-[9px] font-black text-on-surface-variant/30">h</span>
          </div>
          <button onClick={() => emit(hours - 1, minutes)} className="p-0.5 text-on-surface-variant/30 hover:text-primary transition-colors">
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* Minutes */}
        <div className="flex flex-col items-center">
          <button onClick={() => emit(hours, minutes + 5)} className="p-0.5 text-on-surface-variant/30 hover:text-primary transition-colors">
            <ChevronUp className="w-3 h-3" />
          </button>
          <div className="flex items-baseline gap-0.5">
            <input
              ref={mmRef}
              value={String(minutes).padStart(2, '0')}
              onChange={handleMmChange}
              className="w-8 bg-transparent text-center text-lg font-black text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              onFocus={(e) => e.target.select()}
            />
            <span className="text-[9px] font-black text-on-surface-variant/30">min</span>
          </div>
          <button onClick={() => emit(hours, minutes - 5)} className="p-0.5 text-on-surface-variant/30 hover:text-primary transition-colors">
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScrollableDurationPicker;
