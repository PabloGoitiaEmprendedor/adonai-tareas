import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePriorityColors, PriorityColors } from '@/hooks/usePriorityColors';
import { Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const AVAILABLE_COLORS = [
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Gray', value: '#9CA3AF' },
];

export default function PrioritySettingsPage() {
  const { colors, updateColors } = usePriorityColors();
  const [localColors, setLocalColors] = useState<PriorityColors>(colors);
  
  useEffect(() => {
    setLocalColors(colors);
  }, [colors]);

  const handleColorChange = (key: keyof PriorityColors, value: string) => {
    setLocalColors(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateColors(localColors);
    toast.success('Colores actualizados correctamente');
  };

  const renderColorOptions = (priorityKey: keyof PriorityColors, label: string, description: string) => (
    <div className="bg-surface border border-outline-variant rounded-[24px] p-6 space-y-4">
      <div>
        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
          {label}
        </h3>
        <p className="text-sm text-on-surface-variant/70">{description}</p>
      </div>
      
      <div className="flex flex-wrap gap-3">
        {AVAILABLE_COLORS.map(color => (
          <button
            key={color.value}
            onClick={() => handleColorChange(priorityKey, color.value)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 relative`}
            style={{ backgroundColor: color.value }}
          >
            {localColors[priorityKey] === color.value && (
              <Check className="w-5 h-5 text-white drop-shadow-md" />
            )}
          </button>
        ))}
        {/* Custom Color Picker */}
        <div className="relative">
          <input
            type="color"
            value={localColors[priorityKey] === 'transparent' ? '#ffffff' : localColors[priorityKey]}
            onChange={(e) => handleColorChange(priorityKey, e.target.value)}
            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
          />
          <div 
            className="w-10 h-10 rounded-full border-2 border-dashed border-outline-variant flex items-center justify-center overflow-hidden"
            style={localColors[priorityKey] !== 'transparent' && !AVAILABLE_COLORS.some(c => c.value === localColors[priorityKey]) ? { backgroundColor: localColors[priorityKey] } : {}}
          >
            {localColors[priorityKey] !== 'transparent' && !AVAILABLE_COLORS.some(c => c.value === localColors[priorityKey]) ? (
               <Check className="w-5 h-5 text-white mix-blend-difference drop-shadow-md" />
            ) : (
              <span className="text-xl leading-none text-on-surface-variant">+</span>
            )}
          </div>
        </div>
        
        {/* Transparent option for p4 mostly */}
        {priorityKey === 'p4' && (
           <button
             onClick={() => handleColorChange(priorityKey, 'transparent')}
             className={`px-3 h-10 rounded-full border flex items-center justify-center text-sm font-medium transition-transform hover:scale-105 ${localColors[priorityKey] === 'transparent' ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant text-on-surface-variant'}`}
           >
             Ninguno
           </button>
        )}
      </div>

      {/* Preview */}
      <div className="mt-4 pt-4 border-t border-outline-variant/30 flex items-center gap-3">
        <span className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">Vista previa:</span>
        <div 
          className="px-4 py-2 rounded-[16px] text-sm font-semibold border border-outline-variant/10 shadow-sm"
          style={{ backgroundColor: localColors[priorityKey] === 'transparent' ? 'transparent' : `${localColors[priorityKey]}4D` }}
        >
          Tarea de Ejemplo
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      <div className="max-w-2xl mx-auto px-6 pt-8 space-y-8">
        
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[18px] bg-primary/10 flex items-center justify-center">
            <Palette className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Colores de Prioridad</h1>
            <p className="text-sm text-on-surface-variant">Personaliza cómo se ven tus tareas según su cuadrante</p>
          </div>
        </div>

        <div className="space-y-6">
          {renderColorOptions('p1', 'Importante & Urgente', 'Tareas que debes hacer tú mismo de inmediato.')}
          {renderColorOptions('p2', 'Urgente pero NO Importante', 'Tareas que deben hacerse pronto, idealmente delegadas.')}
          {renderColorOptions('p3', 'Importante pero NO Urgente', 'Tareas a planificar para hacer después.')}
          {renderColorOptions('p4', 'Ni Importante Ni Urgente', 'Tareas que podrían eliminarse o dejarse para cuando haya tiempo libre.')}
        </div>

        <div className="pt-6 flex justify-end">
           <Button onClick={handleSave} className="rounded-xl px-8 h-12 font-bold shadow-lg shadow-primary/20">
             Guardar Cambios
           </Button>
        </div>

      </div>
    </div>
  );
}
