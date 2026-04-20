ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_status_check
CHECK (status = ANY (ARRAY['pending'::text, 'done'::text, 'skipped'::text, 'delegated'::text, 'deleted'::text]));