export const getTaskQuadrantRank = (task: any) => {
  if (task?.urgency && task?.importance) return 0;
  if (task?.urgency) return 1;
  if (task?.importance) return 2;
  return 3;
};

const getTaskDate = (task: any) => {
  const rawDate = task?.due_date || task?.date || task?.startTime || null;
  if (!rawDate) return null;
  const date = rawDate instanceof Date ? rawDate : new Date(rawDate);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const isPendingPastTask = (task: any) => {
  if (task?.status === 'done') return false;
  const date = getTaskDate(task);
  if (!date) return false;

  const taskDay = new Date(date);
  taskDay.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return taskDay < today;
};

export const getTaskManualOrderGroupKey = (task: any) => {
  return `${getTaskQuadrantRank(task)}:${isPendingPastTask(task) ? 'past' : 'current'}`;
};

export const compareTasksWithinQuadrants = (a: any, b: any) => {
  const rankDiff = getTaskQuadrantRank(a) - getTaskQuadrantRank(b);
  if (rankDiff !== 0) return rankDiff;

  const doneA = a?.status === 'done';
  const doneB = b?.status === 'done';
  if (doneA !== doneB) return doneA ? -1 : 1;

  if (doneA && doneB) {
    const completedA = a?.completed_at ? new Date(a.completed_at).getTime() : Number.MAX_SAFE_INTEGER;
    const completedB = b?.completed_at ? new Date(b.completed_at).getTime() : Number.MAX_SAFE_INTEGER;
    if (completedA !== completedB) return completedA - completedB;
  }

  const pastDiff = Number(isPendingPastTask(a)) - Number(isPendingPastTask(b));
  if (pastDiff !== 0) return pastDiff;

  return (a?.sort_order ?? 0) - (b?.sort_order ?? 0);
};
