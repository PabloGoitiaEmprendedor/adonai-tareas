import React from 'react';
import { usePriorityColors } from '@/hooks/usePriorityColors';
import { Button } from '@/components/ui/button';
import { Palette, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const PriorityColorSettings = () => {
  const { colors, updateColors } = usePriorityColors();
  const [isOpen, setIsOpen] = React.useState(false);

  const priorities = [
    { id: 'p1', label: 'Urgente e Importante', key: 'p1' as const },
    { id: 'p2', label: 'Urgente y No Importante', key: 'p2' as const },
    { id: 'p3', label: 'Importante y No Urgente', key: 'p3' as const },
    { id: 'p4', label: 'No Importante y No Urgente', key: 'p4' as const },
  ];

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 px-3 gap-2 rounded-full bg-surface-container/50 hover:bg-surface-container text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60"
      >
        <Palette className="w-3.5 h-3.5" />
        Colores de Prioridad
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-0 mb-4 w-64 bg-card p-4 rounded-[32px] border border-outline-variant shadow-2xl z-[60]"
          >
            <div className="flex justify-between items-center mb-4 px-1">
              <span className="text-xs font-black uppercase tracking-wider text-on-surface-variant">Personalizar</span>
              <button onClick={() => setIsOpen(false)} className="text-on-surface-variant/40 hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {priorities.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold text-on-surface-variant/80 flex-1 leading-tight">{p.label}</span>
                  <input
                    type="color"
                    value={colors[p.key]}
                    onChange={(e) => updateColors({ [p.key]: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                  />
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-3 border-t border-outline-variant/10 text-[9px] text-center text-on-surface-variant/40 font-medium">
              Los cambios se aplican al instante
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
