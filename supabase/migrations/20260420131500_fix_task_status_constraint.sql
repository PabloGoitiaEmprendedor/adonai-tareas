
-- Fix task status check constraint to include 'deleted' for trash functionality
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('pending', 'done', 'skipped', 'delegated', 'deleted'));
