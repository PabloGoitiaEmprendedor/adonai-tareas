import { useRef, useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface ScrollableTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

function to12h(hh: number) {
  if (hh === 0) return 12;
  if (hh > 12) return hh - 12;
  return hh;
}

function isPM(hh: number) {
  return hh >= 12;
}

function to24h(display: number, pm: boolean) {
  if (pm) return display === 12 ? 12 : display + 12;
  return display === 12 ? 0 : display;
}

const pad = (n: number) => String(n).padStart(2, '0');

const ScrollableTimePicker = ({ value, onChange, label, className }: ScrollableTimePickerProps) => {
  const [hh, setHh] = useState(() => parseInt(value.split(':')[0]) || 0);
  const [mm, setMm] = useState(() => parseInt(value.split(':')[1]) || 0);
  const hhRef = useRef<HTMLInputElement>(null);
  const mmRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const [h, m] = value.split(':').map(Number);
    setHh(h || 0);
    setMm(m || 0);
  }, [value]);

  const emit = useCallback((h: number, m: number) => {
    onChange(`${pad(Math.min(23, Math.max(0, h)))}:${pad(Math.min(59, Math.max(0, Math.round(m / 5) * 5)))}`);
  }, [onChange]);

  const handleHhChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
    const display = raw === '' ? 12 : Math.max(1, Math.min(12, parseInt(raw)));
    setHh(to24h(display, isPM(hh)));
  };

  const handleMmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
    const m = raw === '' ? 0 : Math.min(59, parseInt(raw));
    setMm(m);
  };

  useEffect(() => {
    emit(hh, mm);
  }, [hh, mm]);

  const cycleHh = (dir: 1 | -1) => {
    const display = to12h(hh);
    const next = display + dir;
    const wrapped = next < 1 ? 12 : next > 12 ? 1 : next;
    setHh(to24h(wrapped, isPM(hh)));
  };

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/30">{label}</p>
      )}
      <div className="flex items-center gap-1.5 bg-surface-container/40 border border-outline-variant/20 rounded-[10px] px-4 py-2.5">
        {/* Hours */}
        <div className="flex flex-col items-center">
          <button onClick={() => cycleHh(1)} className="p-0.5 text-on-surface-variant/30 hover:text-primary transition-colors">
            <ChevronUp className="w-3 h-3" />
          </button>
          <div className="flex items-baseline">
            <input
              ref={hhRef}
              value={to12h(hh)}
              onChange={handleHhChange}
              className="w-8 bg-transparent text-center text-lg font-black text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              onFocus={(e) => e.target.select()}
            />
          </div>
          <button onClick={() => cycleHh(-1)} className="p-0.5 text-on-surface-variant/30 hover:text-primary transition-colors">
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        <span className="text-lg font-black text-foreground/40 mt-4">:</span>

        {/* Minutes (5-min steps) */}
        <div className="flex flex-col items-center">
          <button onClick={() => emit(hh, mm + 5)} className="p-0.5 text-on-surface-variant/30 hover:text-primary transition-colors">
            <ChevronUp className="w-3 h-3" />
          </button>
          <div className="flex items-baseline">
            <input
              ref={mmRef}
              value={pad(mm)}
              onChange={handleMmChange}
              className="w-8 bg-transparent text-center text-lg font-black text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              onFocus={(e) => e.target.select()}
            />
          </div>
          <button onClick={() => emit(hh, mm - 5)} className="p-0.5 text-on-surface-variant/30 hover:text-primary transition-colors">
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* AM/PM toggle */}
        <button
          onClick={() => setHh(hh => (hh + 12) % 24)}
          className="ml-1 mt-4 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          {isPM(hh) ? 'PM' : 'AM'}
        </button>
      </div>
    </div>
  );
};

export default ScrollableTimePicker;
