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

  const { createBlock } = useTimeBlocks(format(selectedDate, 'yyyy-MM-dd'));

  useEffect(() => {
    if (open) {
      setTitle('');
      setStartTime('09:00');
      setEndTime('10:00');
      setColor(PRESET_COLORS[0]);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startTime || !endTime) return;

    createBlock.mutate({
      title: title.trim(),
      start_time: startTime,
      end_time: endTime,
      block_date: format(selectedDate, 'yyyy-MM-dd'),
      color
    }, {
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
