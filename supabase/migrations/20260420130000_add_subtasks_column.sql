-- Add subtasks JSONB column to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS subtasks jsonb DEFAULT '[]'::jsonb;
