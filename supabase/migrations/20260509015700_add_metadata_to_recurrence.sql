-- Add title, description, link and estimated_minutes to recurrence_rules
ALTER TABLE recurrence_rules ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE recurrence_rules ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE recurrence_rules ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE recurrence_rules ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;
