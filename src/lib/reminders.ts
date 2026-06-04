export type ReminderMinutes = 0 | 5 | 10 | 15 | 30 | 60 | 1440 | 10080;

export type ReminderKind = 'task' | 'event';

export type ReminderSettings = {
  enabled: boolean;
  minutes_before: ReminderMinutes;
};

export const REMINDER_OPTIONS: { value: ReminderMinutes; label: string }[] = [
  { value: 0, label: 'En el momento' },
  { value: 5, label: '5 min antes' },
  { value: 10, label: '10 min antes' },
  { value: 15, label: '15 min antes' },
  { value: 30, label: '30 min antes' },
  { value: 60, label: '1 hora antes' },
  { value: 1440, label: '1 día antes' },
  { value: 10080, label: '1 semana antes' },
];

const allowedReminderMinutes = new Set<number>(REMINDER_OPTIONS.map((option) => option.value));

export const normalizeReminderMinutes = (value: unknown): ReminderMinutes => {
  const numeric = typeof value === 'number' ? value : Number(value);
  return allowedReminderMinutes.has(numeric) ? numeric as ReminderMinutes : 15;
};

export const getReminderLabel = (minutes: unknown) => {
  const normalized = normalizeReminderMinutes(minutes);
  return REMINDER_OPTIONS.find((option) => option.value === normalized)?.label || '15 min antes';
};

export const getReminderSettings = (metadata: unknown, kind?: ReminderKind): ReminderSettings | null => {
  if (!metadata || typeof metadata !== 'object') return null;
  const source = metadata as Record<string, unknown>;
  const reminder = source.reminder
    || (kind === 'event' ? source.event_reminder : null)
    || (kind === 'task' ? source.task_reminder : null)
    || source.event_reminder
    || source.task_reminder;

  if (!reminder || typeof reminder !== 'object') return null;
  const reminderRecord = reminder as Record<string, unknown>;
  if (!reminderRecord.enabled) return null;

  return {
    enabled: true,
    minutes_before: normalizeReminderMinutes(reminderRecord.minutes_before),
  };
};

export const buildReminderMetadata = (
  existingMetadata: unknown,
  kind: ReminderKind,
  enabled: boolean,
  minutesBefore: unknown
) => {
  const metadata: Record<string, unknown> = existingMetadata && typeof existingMetadata === 'object'
    ? { ...(existingMetadata as Record<string, unknown>) }
    : {};
  const reminder = {
    enabled,
    minutes_before: normalizeReminderMinutes(minutesBefore),
    kind,
  };

  metadata.reminder = reminder;
  if (kind === 'event') metadata.event_reminder = reminder;
  if (kind === 'task') metadata.task_reminder = reminder;

  return metadata;
};
