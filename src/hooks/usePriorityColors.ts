import { useState, useEffect } from 'react';

export type PriorityColors = {
  p1: string; // Urgent & Important
  p2: string; // Urgent & Not Important
  p3: string; // Not Urgent & Important
  p4: string; // Not Urgent & Not Important
};

const DEFAULT_COLORS: PriorityColors = {
  p1: '#EF4444', // Red
  p2: '#F59E0B', // Orange
  p3: '#3B82F6', // Blue
  p4: '#9CA3AF', // Gray
};

export const usePriorityColors = () => {
  const [colors, setColors] = useState<PriorityColors>(() => {
    const saved = localStorage.getItem('adonai_priority_colors');
    return saved ? JSON.parse(saved) : DEFAULT_COLORS;
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
