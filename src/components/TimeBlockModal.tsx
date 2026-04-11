import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTimeBlocks } from '@/hooks/useTimeBlocks';
import { format } from 'date-fns';

interface TimeBlockModalProps {
  open: boolean;
  onClose: () => void;
  selectedDate: Date;
}

const PRESET_COLORS = [
  '#2196F3', // Blue
  '#4CAF50', // Green
  '#9C27B0', // Purple
  '#FF9800', // Orange
  '#F44336', // Red
  '#607D8B', // Blue Grey
];

export const TimeBlockModal: React.FC<TimeBlockModalProps> = ({ open, onClose, selectedDate }) => {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);

  const { createBlock } = useTimeBlocks(format(selectedDate, 'yyyy-MM-dd'));

  useEffect(() => {
    if (open) {
      setTitle('');
      setStartTime('09:00');
      setEndTime('10:00');
      setColor(PRESET_COLORS[0]);
      setIsRecurring(false);
      setDaysOfWeek([]);
    }
  }, [open]);

  const toggleDay = (day: number) => {
    setDaysOfWeek(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S']; // 0 is Sunday in JS getDay()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startTime || !endTime) return;

    createBlock.mutate({
      title: title.trim(),
      start_time: startTime,
      end_time: endTime,
      block_date: isRecurring ? null : format(selectedDate, 'yyyy-MM-dd'),
      color,
      is_recurring: isRecurring,
      days_of_week: daysOfWeek
    } as any, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md max-w-[90%] rounded-[32px] p-6 glass-sheet shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Crear Bloque de Tiempo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-semibold text-on-surface-variant">Nombre del bloque</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Trabajo Profundo"
              className="h-12 rounded-xl bg-surface-container border-outline-variant/50 focus-visible:ring-primary focus-visible:border-primary px-4"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime" className="text-sm font-semibold text-on-surface-variant">Hora de Inicio</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-12 rounded-xl bg-surface-container border-outline-variant/50 px-4"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime" className="text-sm font-semibold text-on-surface-variant">Hora Fin</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-12 rounded-xl bg-surface-container border-outline-variant/50 px-4"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label className="text-sm font-semibold text-on-surface-variant">Color</Label>
            <div className="flex gap-3 mt-1">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-outline-variant/30">
            <div className="flex items-center justify-between">
              <Label htmlFor="recurring" className="text-sm font-bold text-foreground">Repetir bloque</Label>
              <input 
                id="recurring"
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-5 h-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary"
              />
            </div>

            {isRecurring && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Días de la semana</p>
                <div className="flex justify-between">
                  {[1, 2, 3, 4, 5, 6, 0].map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`w-9 h-9 rounded-full text-xs font-bold transition-all border ${
                        daysOfWeek.includes(day)
                          ? 'bg-primary border-primary text-primary-foreground shadow-md'
                          : 'bg-surface-container border-outline-variant/50 text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {dayNames[day]}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-on-surface-variant/70 italic text-center">Si no marcas ningún día, se repetirá a diario.</p>
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            disabled={!title.trim() || createBlock.isPending}
            className="w-full h-12 mt-6 rounded-xl font-bold primary-gradient shadow-md"
          >
            {createBlock.isPending ? 'Guardando...' : 'Guardar Bloque'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
