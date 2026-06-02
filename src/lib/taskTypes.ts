export type TaskLike = {
  id: string;
  title?: string;
  description?: string | null;
  link?: string | null;
  due_date?: string | null;
  estimated_minutes?: number | null;
  actual_duration_seconds?: number | null;
  importance?: boolean | null;
  urgency?: boolean | null;
  status?: string | null;
  folder_id?: string | null;
  goal_id?: string | null;
  recurrence_id?: string | null;
  sort_order?: number | null;
  metadata?: Record<string, unknown> | null;
  isNew?: boolean;
};

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none';
