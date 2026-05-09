import * as React from "react"
import { Clock, ChevronDown } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export function DurationPicker({
  value,
  onChange,
  className
}: {
  value: number;
  onChange: (val: number) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [customValue, setCustomValue] = React.useState(value.toString());
  const [isCustom, setIsCustom] = React.useState(false);

  // Sync custom input with actual value if changed externally
  React.useEffect(() => {
    setCustomValue(value.toString());
  }, [value]);

  const presets = [1, 5, 10, 15, 20, 25, 30, 45, 60, 90, 120];

  const displayValue = React.useMemo(() => {
    if (value < 60) return `${value} min`;
    const h = Math.floor(value / 60);
    const m = value % 60;
    if (m === 0) return `${h} h`;
    return `${h}h ${m}m`;
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all flex items-center justify-between text-left",
            className
          )}
        >
          <div className="flex items-center gap-2 relative">
            {displayValue}
          </div>
          <ChevronDown className="w-4 h-4 opacity-50 flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3 rounded-[24px] border border-white/10 bg-[#2F3437] shadow-2xl z-[100000]" align="start">
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {presets.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => {
                onChange(p);
                setIsCustom(false);
                setOpen(false);
              }}
              className={cn(
                "py-2.5 rounded-xl text-xs font-black transition-all",
                value === p && !isCustom
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"
              )}
            >
              {p < 60 ? `${p}m` : p === 60 ? '1h' : p === 90 ? '1.5h' : '2h'}
            </button>
          ))}
        </div>
        <div className="pt-3 border-t border-white/10">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-2 mb-1.5 block">
            Personalizar (minutos)
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="number"
              min={1}
              value={customValue}
              onChange={(e) => {
                setCustomValue(e.target.value);
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val > 0) {
                  onChange(val);
                  setIsCustom(true);
                }
              }}
              placeholder="Ej: 15"
              className="w-full text-sm font-bold bg-black/20 border border-white/10 rounded-[16px] pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder:text-white/20"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
