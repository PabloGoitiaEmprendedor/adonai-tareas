import { useState, useEffect } from 'react';

export type PriorityColors = {
  p1: string; // Urgent & Important
  p2: string; // Urgent & Not Important
  p3: string; // Not Urgent & Important
  p4: string; // Not Urgent & Not Important
};

export type CustomColor = {
  id: string;
  value: string;
};

const DEFAULT_COLORS: PriorityColors = {
  p1: '#EB5757', // Urgent & Important
  p2: '#F4B860', // Urgent & Not Important
  p3: '#5B7CFA', // Not Urgent & Important
  p4: '#E5E7EB', // Not Urgent & Not Important
};

const LEGACY_DEFAULT_COLORS: PriorityColors = {
  p1: '#ff4b4b',
  p2: '#ffb34b',
  p3: '#4b79ff',
  p4: '#a3a3a3',
};

const matchesLegacyDefaults = (colors: PriorityColors) =>
  (Object.keys(LEGACY_DEFAULT_COLORS) as Array<keyof PriorityColors>).every(
    (key) => colors[key]?.toLowerCase() === LEGACY_DEFAULT_COLORS[key].toLowerCase()
  );

export const usePriorityColors = () => {
  const [colors, setColors] = useState<PriorityColors>(() => {
    const saved = localStorage.getItem('adonai_priority_colors');
    if (!saved) return DEFAULT_COLORS;
    try {
      const parsed = JSON.parse(saved);
      if (matchesLegacyDefaults(parsed)) {
        localStorage.setItem('adonai_priority_colors', JSON.stringify(DEFAULT_COLORS));
        return DEFAULT_COLORS;
      }
      return parsed;
    } catch (e) {
      console.error('Error parsing priority colors:', e);
      return DEFAULT_COLORS;
    }
  });
  const [customColors, setCustomColors] = useState<CustomColor[]>(() => {
    const saved = localStorage.getItem('adonai_custom_colors');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error parsing custom colors:', e);
      return [];
    }
  });

  const updateColors = (newColors: Partial<PriorityColors>) => {
    const updated = { ...colors, ...newColors };
    setColors(updated);
    localStorage.setItem('adonai_priority_colors', JSON.stringify(updated));
  };

  const addCustomColor = (value: string) => {
    if (!/^#[0-9a-f]{6}$/i.test(value)) return;
    const normalized = value.toLowerCase();
    setCustomColors((current) => {
      if (current.some((color) => color.value.toLowerCase() === normalized)) return current;
      const updated = [...current, { id: `custom-${Date.now()}`, value: normalized }];
      localStorage.setItem('adonai_custom_colors', JSON.stringify(updated));
      return updated;
    });
  };

  const removeCustomColor = (id: string) => {
    setCustomColors((current) => {
      const updated = current.filter((color) => color.id !== id);
      localStorage.setItem('adonai_custom_colors', JSON.stringify(updated));
      return updated;
    });
  };

  return { colors, updateColors, customColors, addCustomColor, removeCustomColor };
};

export const getPriorityKey = (urgency: boolean | null, importance: boolean | null): keyof PriorityColors => {
  if (urgency && importance) return 'p1';
  if (urgency && !importance) return 'p2';
  if (!urgency && importance) return 'p3';
  return 'p4';
};
