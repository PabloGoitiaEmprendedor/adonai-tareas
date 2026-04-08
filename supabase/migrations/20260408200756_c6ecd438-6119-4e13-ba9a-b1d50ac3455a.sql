
-- Create user_context table for AI learning
CREATE TABLE public.user_context (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  occupation TEXT,
  industry TEXT,
  work_hours TEXT DEFAULT '9:00-17:00',
  personal_goals TEXT,
  work_style TEXT,
  energy_patterns TEXT,
  recurring_commitments TEXT,
  imported_context TEXT,
  ai_learned_patterns JSONB DEFAULT '[]'::jsonb,
  priorities_summary TEXT,
  life_areas JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own context" ON public.user_context FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own context" ON public.user_context FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own context" ON public.user_context FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create user_context on new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email) VALUES (NEW.id, NEW.email);
  INSERT INTO public.settings (user_id) VALUES (NEW.id);
  INSERT INTO public.experiment_metrics (user_id) VALUES (NEW.id);
  INSERT INTO public.user_context (user_id) VALUES (NEW.id);
  INSERT INTO public.contexts (user_id, name, color) VALUES
    (NEW.id, 'Trabajo', '#4BE277'),
    (NEW.id, 'Personal', '#4AE176'),
    (NEW.id, 'Salud', '#FF8B7C'),
    (NEW.id, 'Aprendizaje', '#C7C6C6');
  RETURN NEW;
END;
$$;
