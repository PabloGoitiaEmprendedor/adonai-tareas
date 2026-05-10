-- Add recurrence columns to time_blocks and make block_date nullable
ALTER TABLE public.time_blocks 
ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS days_of_week integer[] DEFAULT '{}';

ALTER TABLE public.time_blocks ALTER COLUMN block_date DROP NOT NULL;
