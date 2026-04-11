-- Create time_blocks table
CREATE TABLE IF NOT EXISTS public.time_blocks (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  color text,
  start_time time NOT NULL,
  end_time time NOT NULL,
  block_date date NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT time_blocks_pkey PRIMARY KEY (id)
);

-- Add RLS policies for time_blocks
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own time blocks" ON public.time_blocks
  USING (auth.uid() = user_id);

-- Add time_block_id to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS time_block_id uuid REFERENCES public.time_blocks(id) ON DELETE SET NULL;
