
CREATE TABLE IF NOT EXISTS public.time_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  color text,
  start_time time NOT NULL,
  end_time time NOT NULL,
  block_date date NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT time_blocks_pkey PRIMARY KEY (id)
);

ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own time blocks" ON public.time_blocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own time blocks" ON public.time_blocks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own time blocks" ON public.time_blocks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own time blocks" ON public.time_blocks FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS time_block_id uuid REFERENCES public.time_blocks(id) ON DELETE SET NULL;
