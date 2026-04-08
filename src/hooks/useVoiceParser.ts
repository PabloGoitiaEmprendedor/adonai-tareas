import { format, addDays, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, nextSunday } from 'date-fns';

interface ParsedVoiceData {
  title: string;
  dueDate: string | null;
  importance: boolean | null;
  urgency: boolean | null;
  estimatedMinutes: number | null;
  recurrence: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    days_of_week?: number[];
    day_of_month?: number;
  } | null;
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
  let recurrence: ParsedVoiceData['recurrence'] = null;
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

  // Parse recurrence
  if (/\btodos los días\b/i.test(lower) || /\bcada día\b/i.test(lower) || /\bdiariamente\b/i.test(lower)) {
    recurrence = { frequency: 'daily', interval: 1 };
  } else if (/\bde lunes a viernes\b/i.test(lower)) {
    recurrence = { frequency: 'weekly', interval: 1, days_of_week: [1, 2, 3, 4, 5] };
  } else {
    const weeklyMatch = lower.match(/\bcada (\d+) semanas?\b/);
    if (weeklyMatch) {
      recurrence = { frequency: 'weekly', interval: parseInt(weeklyMatch[1]) };
    }
    const monthlyMatch = lower.match(/\bcada (\d+) meses?\b/) || lower.match(/\bcada mes\b/);
    if (monthlyMatch) {
      recurrence = { frequency: 'monthly', interval: monthlyMatch[1] ? parseInt(monthlyMatch[1]) : 1 };
      const dayMatch = lower.match(/\bel (?:día )?(\d{1,2})\b/);
      if (dayMatch) recurrence.day_of_month = parseInt(dayMatch[1]);
    }
    const yearlyMatch = lower.match(/\bcada (\d+) años?\b/) || lower.match(/\bcada año\b/);
    if (yearlyMatch) {
      recurrence = { frequency: 'yearly', interval: yearlyMatch[1] ? parseInt(yearlyMatch[1]) : 1 };
    }
    // "todos los lunes", "cada lunes y miércoles"
    const dayNameToNum: Record<string, number> = { domingo: 0, lunes: 1, martes: 2, miércoles: 3, miercoles: 3, jueves: 4, viernes: 5, sábado: 6, sabado: 6 };
    const everyDayMatch = lower.match(/\b(?:todos los|cada) ((?:(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)(?:\s*(?:y|,)\s*)?)+)\b/i);
    if (everyDayMatch && !recurrence) {
      const dayStr = everyDayMatch[1];
      const daysFound: number[] = [];
      for (const [name, num] of Object.entries(dayNameToNum)) {
        if (dayStr.includes(name)) daysFound.push(num);
      }
      if (daysFound.length > 0) {
        recurrence = { frequency: 'weekly', interval: 1, days_of_week: daysFound.sort() };
      }
    }
  }

  // Clean recurrence text from title
  title = title
    .replace(/\b(?:todos los días|cada día|diariamente)\b/gi, '')
    .replace(/\bde lunes a viernes\b/gi, '')
    .replace(/\bcada \d+ (?:semanas?|meses?|años?|días?)\b/gi, '')
    .replace(/\bcada (?:semana|mes|año)\b/gi, '')
    .replace(/\btodos los (?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)(?:\s*(?:y|,)\s*(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo))*/gi, '')
    .replace(/\bcada (?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)(?:\s*(?:y|,)\s*(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo))*/gi, '');

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

  return { title: title || transcript.trim(), dueDate, importance, urgency, estimatedMinutes, recurrence };
};
