import { useState, useEffect } from 'react';

export type PriorityColors = {
  p1: string; // Urgent & Important
  p2: string; // Urgent & Not Important
  p3: string; // Not Urgent & Important
  p4: string; // Not Urgent & Not Important
};

const DEFAULT_COLORS: PriorityColors = {
  p1: '#ff4b4b', // Urgent & Important (Red)
  p2: '#ffb34b', // Urgent & Not Important (Orange)
  p3: '#4b79ff', // Not Urgent & Important (Blue)
  p4: '#a3a3a3', // Not Urgent & Not Important (Gray)
};

export const usePriorityColors = () => {
  const [colors, setColors] = useState<PriorityColors>(() => {
    const saved = localStorage.getItem('adonai_priority_colors');
    if (!saved) return DEFAULT_COLORS;
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing priority colors:', e);
      return DEFAULT_COLORS;
    }
  });

  const updateColors = (newColors: Partial<PriorityColors>) => {
    const updated = { ...colors, ...newColors };
    setColors(updated);
    localStorage.setItem('adonai_priority_colors', JSON.stringify(updated));
  };

  return { colors, updateColors };
};

export const getPriorityKey = (urgency: boolean | null, importance: boolean | null): keyof PriorityColors => {
  if (urgency && importance) return 'p1';
  if (urgency && !importance) return 'p2';
  if (!urgency && importance) return 'p3';
  return 'p4';
};
