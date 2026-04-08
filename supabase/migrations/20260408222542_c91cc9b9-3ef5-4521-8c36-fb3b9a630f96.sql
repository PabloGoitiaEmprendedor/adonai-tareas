
ALTER TABLE public.user_context ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.user_context ADD COLUMN IF NOT EXISTS age_range text;
ALTER TABLE public.user_context ADD COLUMN IF NOT EXISTS family_status text;
ALTER TABLE public.user_context ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.user_context ADD COLUMN IF NOT EXISTS hobbies text;
ALTER TABLE public.user_context ADD COLUMN IF NOT EXISTS stress_level text;
ALTER TABLE public.user_context ADD COLUMN IF NOT EXISTS biggest_challenge text;
ALTER TABLE public.user_context ADD COLUMN IF NOT EXISTS daily_routine_summary text;
