-- Add start_time and end_time to tasks and recurrence_rules
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_time TIME;

ALTER TABLE recurrence_rules ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE recurrence_rules ADD COLUMN IF NOT EXISTS end_time TIME;
