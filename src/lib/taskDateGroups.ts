import { format, parseISO, isValid, addDays, isSameDay, startOfDay, startOfWeek, endOfWeek } from 'date-fns';
import type { TaskLike } from '@/lib/taskTypes';

export type TaskDateGroup = {
  key: string;
  label: string;
  date: Date | null;
  tasks: TaskLike[];
};

export type TaskWeekGroup = {
  key: string;
  label: string;
  startDate: Date;
  endDate: Date;
  days: TaskDateGroup[];
  tasks: TaskLike[];
};

export type TaskDateSections = {
  general: TaskLike[];
  futureGroups: TaskDateGroup[];
  futureWeekGroups: TaskWeekGroup[];
};

const toTaskDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = parseISO(value);
  if (!isValid(parsed)) return null;
  return startOfDay(parsed);
};

const groupKeyForDate = (date: Date) => format(date, 'yyyy-MM-dd');

export const getTaskDateLabel = (date: Date, today = new Date()) => {
  const todayStart = startOfDay(today);
  const day = startOfDay(date);
  const diffDays = Math.round((day.getTime() - todayStart.getTime()) / 86400000);

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Mañana';
  if (diffDays >= 2 && diffDays <= 6) return `En ${diffDays} días`;

  return format(date, 'd MMM');
};

export const getTaskWeekLabel = (startDate: Date, today = new Date()) => {
  const todayWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekStart = startOfWeek(startDate, { weekStartsOn: 1 });
  const diffWeeks = Math.round((weekStart.getTime() - todayWeekStart.getTime()) / (7 * 86400000));

  if (diffWeeks === 0) return 'Esta semana';
  if (diffWeeks === 1) return 'Próxima semana';

  return `${format(startDate, 'd MMM')} - ${format(endOfWeek(startDate, { weekStartsOn: 1 }), 'd MMM')}`;
};

export const buildTaskDateSections = (
  tasks: TaskLike[],
  today = new Date(),
): TaskDateSections => {
  const todayStart = startOfDay(today);
  const current: TaskLike[] = [];
  const futureMap = new Map<string, TaskDateGroup>();

  tasks.forEach((task) => {
    const taskDate = toTaskDate(task.due_date);
    if (!taskDate || taskDate <= todayStart) {
      current.push(task);
      return;
    }

    const key = groupKeyForDate(taskDate);
    const existing = futureMap.get(key);
    if (existing) {
      existing.tasks.push(task);
      return;
    }

    futureMap.set(key, {
      key,
      label: getTaskDateLabel(taskDate, today),
      date: taskDate,
      tasks: [task],
    });
  });

  const futureGroups = Array.from(futureMap.values())
    .sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity));

  const weekMap = new Map<string, TaskWeekGroup>();
  futureGroups.forEach((dayGroup) => {
    if (!dayGroup.date) return;
    const weekStart = startOfWeek(dayGroup.date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(dayGroup.date, { weekStartsOn: 1 });
    const weekKey = groupKeyForDate(weekStart);
    const existingWeek = weekMap.get(weekKey);
    if (existingWeek) {
      existingWeek.days.push(dayGroup);
      existingWeek.tasks.push(...dayGroup.tasks);
      return;
    }

    weekMap.set(weekKey, {
      key: weekKey,
      label: getTaskWeekLabel(weekStart, today),
      startDate: weekStart,
      endDate: weekEnd,
      days: [dayGroup],
      tasks: [...dayGroup.tasks],
    });
  });

  const futureWeekGroups = Array.from(weekMap.values())
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .map((week) => ({
      ...week,
      days: week.days.sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity)),
    }));

  return { general: current, futureGroups, futureWeekGroups };
};

export const formatTaskDateHeader = (date?: Date | null) => {
  if (!date) return '';
  return format(date, 'd MMM');
};

export const isTaskInCurrentDay = (task: TaskLike, today = new Date()) => {
  const taskDate = toTaskDate(task.due_date);
  if (!taskDate) return false;
  return isSameDay(taskDate, today);
};

export const getFutureTaskGroupLabel = (date?: Date | null, today = new Date()) => {
  if (!date) return 'Siguientes días';
  return getTaskDateLabel(date, today);
};
