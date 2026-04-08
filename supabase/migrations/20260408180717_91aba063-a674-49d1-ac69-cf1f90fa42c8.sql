
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT,
  email TEXT,
  timezone TEXT DEFAULT 'America/Caracas',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  onboarding_completed BOOLEAN DEFAULT false,
  preferred_input TEXT DEFAULT 'both' CHECK (preferred_input IN ('voice', 'text', 'both')),
  organization_style TEXT DEFAULT 'simple' CHECK (organization_style IN ('simple', 'intermediate', 'guided')),
  theme TEXT DEFAULT 'dark',
  accent_color TEXT DEFAULT '#22C55E',
  main_goal_id UUID
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Create goals table
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  horizon TEXT DEFAULT 'annual' CHECK (horizon IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own goals" ON public.goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON public.goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON public.goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON public.goals FOR DELETE USING (auth.uid() = user_id);

-- Add FK from profiles to goals
ALTER TABLE public.profiles ADD CONSTRAINT fk_main_goal FOREIGN KEY (main_goal_id) REFERENCES public.goals(id) ON DELETE SET NULL;

-- Create contexts table
CREATE TABLE public.contexts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contexts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own contexts" ON public.contexts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contexts" ON public.contexts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contexts" ON public.contexts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contexts" ON public.contexts FOR DELETE USING (auth.uid() = user_id);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'skipped', 'delegated')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  urgency BOOLEAN DEFAULT false,
  importance BOOLEAN DEFAULT false,
  due_date DATE,
  estimated_minutes INT,
  source_type TEXT CHECK (source_type IN ('voice', 'text')),
  context_id UUID REFERENCES public.contexts(id) ON DELETE SET NULL,
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tasks" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

-- Create daily_priorities table
CREATE TABLE public.daily_priorities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  task_ids UUID[] DEFAULT '{}',
  intention TEXT,
  mood_start TEXT,
  mood_end TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_priorities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own daily priorities" ON public.daily_priorities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily priorities" ON public.daily_priorities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily priorities" ON public.daily_priorities FOR UPDATE USING (auth.uid() = user_id);

-- Create weekly_reviews table
CREATE TABLE public.weekly_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  tasks_completed INT DEFAULT 0,
  tasks_skipped INT DEFAULT 0,
  top_goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  reflection TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own weekly reviews" ON public.weekly_reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weekly reviews" ON public.weekly_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own weekly reviews" ON public.weekly_reviews FOR UPDATE USING (auth.uid() = user_id);

-- Create voice_inputs table
CREATE TABLE public.voice_inputs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transcript TEXT,
  parsed_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  confidence FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_inputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own voice inputs" ON public.voice_inputs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own voice inputs" ON public.voice_inputs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create settings table
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  voice_enabled BOOLEAN DEFAULT true,
  notifications_enabled BOOLEAN DEFAULT true,
  reminder_style TEXT DEFAULT 'gentle' CHECK (reminder_style IN ('gentle', 'none')),
  focus_level TEXT DEFAULT 'light' CHECK (focus_level IN ('light', 'deep')),
  calendar_connected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own settings" ON public.settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.settings FOR UPDATE USING (auth.uid() = user_id);

-- Create usage_events table (internal analytics)
CREATE TABLE public.usage_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own events" ON public.usage_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own events" ON public.usage_events FOR SELECT USING (auth.uid() = user_id);

-- Create experiment_metrics table (internal)
CREATE TABLE public.experiment_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  day_1_used BOOLEAN DEFAULT false,
  day_2_used BOOLEAN DEFAULT false,
  day_3_used BOOLEAN DEFAULT false,
  user_activated BOOLEAN DEFAULT false,
  user_retained BOOLEAN DEFAULT false,
  streak_current INT DEFAULT 0,
  streak_max INT DEFAULT 0,
  last_active_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.experiment_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own metrics" ON public.experiment_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own metrics" ON public.experiment_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own metrics" ON public.experiment_metrics FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger function to auto-create profile, settings, default contexts, and experiment_metrics on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email) VALUES (NEW.id, NEW.email);
  INSERT INTO public.settings (user_id) VALUES (NEW.id);
  INSERT INTO public.experiment_metrics (user_id) VALUES (NEW.id);
  INSERT INTO public.contexts (user_id, name, color) VALUES
    (NEW.id, 'Trabajo', '#4BE277'),
    (NEW.id, 'Personal', '#4AE176'),
    (NEW.id, 'Salud', '#FF8B7C'),
    (NEW.id, 'Aprendizaje', '#C7C6C6');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
