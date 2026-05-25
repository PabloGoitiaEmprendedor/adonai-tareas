import { useState, useEffect } from 'react';
import { usePriorityColors, PriorityColors } from '@/hooks/usePriorityColors';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

const AVAILABLE_COLORS = [
  { name: 'Azul', value: '#5B7CFA' },
  { name: 'Verde', value: '#6FCF97' },
  { name: 'Ámbar', value: '#F4B860' },
  { name: 'Rojo', value: '#EB5757' },
  { name: 'Gris', value: '#6B7280' },
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
    toast.success('Colores actualizados');
  };

  const priorities = [
    { key: 'p1' as keyof PriorityColors, label: 'Urgente e Importante', desc: 'Hacer ahora' },
    { key: 'p2' as keyof PriorityColors, label: 'Urgente', desc: 'Delegar o hacer pronto' },
    { key: 'p3' as keyof PriorityColors, label: 'Importante', desc: 'Planificar' },
    { key: 'p4' as keyof PriorityColors, label: 'Secundario', desc: 'Eliminar o aplazar' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      <div className="max-w-xl mx-auto px-6 pt-8 space-y-8">
        <div>
          <h1 className="text-xl font-black tracking-tight">Colores de Prioridad</h1>
          <p className="text-sm text-on-surface-variant/50 mt-1">Personaliza el color de cada cuadrante</p>
        </div>

        <div className="space-y-3">
          {priorities.map(({ key, label, desc }) => (
            <div key={key} className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground">{label}</h3>
                  <p className="text-xs text-on-surface-variant/40">{desc}</p>
                </div>
                <div
                  className="w-6 h-6 rounded-full border border-outline-variant/20"
                  style={{ backgroundColor: localColors[key] === 'transparent' ? 'transparent' : localColors[key] }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => handleColorChange(key, color.value)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 ${localColors[key] === color.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' : ''}`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  >
                    {localColors[key] === color.value && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                  </button>
                ))}
                <input
                  type="color"
                  value={localColors[key] === 'transparent' ? '#ffffff' : localColors[key]}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="w-8 h-8 rounded-full cursor-pointer border-0 p-0 bg-transparent"
                  title="Color personalizado"
                />
                {key === 'p4' && (
                  <button
                    onClick={() => handleColorChange(key, 'transparent')}
                    className={`px-3 h-8 rounded-full border text-xs font-medium transition-all ${localColors[key] === 'transparent' ? 'border-primary/30 text-primary bg-primary/5' : 'border-outline-variant/20 text-on-surface-variant/40 hover:text-foreground'}`}
                  >
                    Ninguno
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={handleSave} className="h-10 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
