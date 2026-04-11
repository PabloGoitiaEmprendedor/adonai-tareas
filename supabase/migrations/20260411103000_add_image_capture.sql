ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_source_type_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_source_type_check CHECK (source_type IN ('voice', 'text', 'image'));

CREATE TABLE public.image_captures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tasks_extracted INT DEFAULT 0,
  tasks_created INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.image_captures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own image captures" ON public.image_captures FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own image captures" ON public.image_captures FOR SELECT USING (auth.uid() = user_id);
