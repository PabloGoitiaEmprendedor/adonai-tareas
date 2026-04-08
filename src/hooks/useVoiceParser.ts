import { format, addDays, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, nextSunday } from 'date-fns';

interface ParsedVoiceData {
  title: string;
  dueDate: string | null;
  importance: boolean | null;
  urgency: boolean | null;
  estimatedMinutes: number | null;
}

const dayMap: Record<string, (d: Date) => Date> = {
  lunes: nextMonday,
  martes: nextTuesday,
  miércoles: nextWednesday,
  miercoles: nextWednesday,
  jueves: nextThursday,
  viernes: nextFriday,
  sábado: nextSaturday,
  sabado: nextSaturday,
  domingo: nextSunday,
};

export const parseVoiceTranscript = (transcript: string): ParsedVoiceData => {
  const lower = transcript.toLowerCase().trim();
  const now = new Date();
  let dueDate: string | null = null;
  let importance: boolean | null = null;
  let urgency: boolean | null = null;
  let estimatedMinutes: number | null = null;
  let title = transcript.trim();

  // Parse date
  if (/\b(hoy|para hoy)\b/.test(lower)) {
    dueDate = format(now, 'yyyy-MM-dd');
  } else if (/\b(mañana|para mañana)\b/.test(lower)) {
    dueDate = format(addDays(now, 1), 'yyyy-MM-dd');
  } else if (/\bpasado mañana\b/.test(lower)) {
    dueDate = format(addDays(now, 2), 'yyyy-MM-dd');
  } else {
    for (const [dayName, nextFn] of Object.entries(dayMap)) {
      const regex = new RegExp(`\\b(para el |el )?${dayName}\\b`);
      if (regex.test(lower)) {
        dueDate = format(nextFn(now), 'yyyy-MM-dd');
        break;
      }
    }
  }

  // Parse date from "el X de month"
  if (!dueDate) {
    const monthMap: Record<string, number> = {
      enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
      julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
    };
    const dateMatch = lower.match(/(?:para )?el (\d{1,2}) de (\w+)/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const monthName = dateMatch[2];
      if (monthMap[monthName] !== undefined) {
        const year = monthMap[monthName] < now.getMonth() ? now.getFullYear() + 1 : now.getFullYear();
        const d = new Date(year, monthMap[monthName], day);
        dueDate = format(d, 'yyyy-MM-dd');
      }
    }
  }

  // Parse importance
  if (/\b(es importante|importante|muy importante)\b/.test(lower)) {
    importance = true;
  } else if (/\b(no es importante|no importante|poco importante)\b/.test(lower)) {
    importance = false;
  }

  // Parse urgency
  if (/\b(es urgente|urgente|muy urgente)\b/.test(lower)) {
    urgency = true;
  } else if (/\b(no es urgente|no urgente|poco urgente|sin urgencia)\b/.test(lower)) {
    urgency = false;
  }

  // Parse estimated time
  const timeMatch = lower.match(/(\d+)\s*minutos?/);
  if (timeMatch) {
    estimatedMinutes = parseInt(timeMatch[1]);
  }
  const hourMatch = lower.match(/(\d+)\s*horas?/);
  if (hourMatch) {
    estimatedMinutes = parseInt(hourMatch[1]) * 60;
  }

  // Clean title - preserve the actual action instead of leaving a raw transcript
  title = title
    .replace(/^\s*(?:oye|ey|eh+|hola|mira|adonai|por favor|porfa)\b[\s,:-]*/i, '')
    .replace(/\b(?:para hoy|para mañana|hoy|mañana|pasado mañana)\b/gi, '')
    .replace(/\b(para el |el )?(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\b/gi, '')
    .replace(/\b(?:para )?el \d{1,2} de \w+\b/gi, '')
    .replace(/\b(es |muy |no |no es |poco )?(importante|urgente)\b/gi, '')
    .replace(/\b(sin urgencia)\b/gi, '')
    .replace(/\b\d+\s*(minutos?|horas?)\b/gi, '')
    .replace(/^\s*(?:quiero|necesito|tengo que|debo)\s+/i, '')
    .replace(/^\s*(?:agendar|agrega(?:r)?|anota(?:r)?|programa(?:r)?|pon(?:er)?)\s+(?:una|un)?\s*(?:tarea|evento|recordatorio)\s*(?:para\s+)?/i, '')
    .replace(/^\s*(?:que|lo que necesito(?: hacer)? es)\s+/i, '')
    .replace(/^\s*(?:quiero|necesito|tengo que|debo)\s+/i, '')
    .replace(/\s+/g, ' ')
    .replace(/^[,.\s]+|[,.\s]+$/g, '')
    .trim();
  
  // Capitalize first letter
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  return { title: title || transcript.trim(), dueDate, importance, urgency, estimatedMinutes };
};
