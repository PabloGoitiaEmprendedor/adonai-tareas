-- Subtareas: parent_task_id
ALTER TABLE public.tasks ADD COLUMN parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;
CREATE INDEX idx_tasks_parent ON public.tasks(parent_task_id);

-- Gamificación en experiment_metrics
ALTER TABLE public.experiment_metrics 
  ADD COLUMN xp_total INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN level INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN tasks_completed_total INTEGER NOT NULL DEFAULT 0;

-- Catálogo de logros
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'trophy',
  xp_reward INTEGER NOT NULL DEFAULT 50,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view achievements catalog"
ON public.achievements FOR SELECT TO authenticated USING (true);

-- Logros desbloqueados por usuario
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can unlock own achievements"
ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_achievements_user ON public.user_achievements(user_id);

-- Catálogo inicial de logros
INSERT INTO public.achievements (code, name, description, icon, xp_reward, category) VALUES
  ('first_task', 'Primer Paso', 'Completa tu primera tarea', 'sparkles', 25, 'milestone'),
  ('tasks_10', 'En Marcha', 'Completa 10 tareas', 'rocket', 50, 'milestone'),
  ('tasks_50', 'Productivo', 'Completa 50 tareas', 'zap', 100, 'milestone'),
  ('tasks_100', 'Centurión', 'Completa 100 tareas', 'crown', 250, 'milestone'),
  ('streak_3', 'Constancia', 'Mantén una racha de 3 días', 'flame', 30, 'streak'),
  ('streak_7', 'Semana Perfecta', 'Mantén una racha de 7 días', 'flame', 75, 'streak'),
  ('streak_30', 'Imparable', 'Mantén una racha de 30 días', 'flame', 300, 'streak'),
  ('level_5', 'Aprendiz', 'Alcanza el nivel 5', 'star', 50, 'level'),
  ('level_10', 'Experto', 'Alcanza el nivel 10', 'star', 150, 'level'),
  ('first_block', 'Planificador', 'Crea tu primer bloque de tiempo', 'calendar', 30, 'feature'),
  ('first_goal', 'Visionario', 'Define tu primera meta', 'target', 30, 'feature');