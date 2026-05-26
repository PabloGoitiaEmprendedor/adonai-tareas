-- Enhanced AI agent memory, global insights, and prompt methodologies.

CREATE TABLE IF NOT EXISTS public.chat_user_memory_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_user_memory_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own chat memory profile" ON public.chat_user_memory_profiles;
CREATE POLICY "Users can manage their own chat memory profile"
  ON public.chat_user_memory_profiles
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.chat_global_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  insight TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'productivity',
  weight REAL NOT NULL DEFAULT 0.7,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_global_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage chat global insights" ON public.chat_global_insights;
CREATE POLICY "Admins can manage chat global insights"
  ON public.chat_global_insights
  FOR ALL
  USING (public.is_adonai_admin())
  WITH CHECK (public.is_adonai_admin());

DROP POLICY IF EXISTS "Authenticated users can read active chat global insights" ON public.chat_global_insights;
CREATE POLICY "Authenticated users can read active chat global insights"
  ON public.chat_global_insights
  FOR SELECT
  USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_chat_global_insights_active_weight
  ON public.chat_global_insights(is_active, weight DESC);

CREATE TABLE IF NOT EXISTS public.chat_prompt_methodologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_prompt_methodologies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage chat methodologies" ON public.chat_prompt_methodologies;
CREATE POLICY "Admins can manage chat methodologies"
  ON public.chat_prompt_methodologies
  FOR ALL
  USING (public.is_adonai_admin())
  WITH CHECK (public.is_adonai_admin());

DROP POLICY IF EXISTS "Authenticated users can read active chat methodologies" ON public.chat_prompt_methodologies;
CREATE POLICY "Authenticated users can read active chat methodologies"
  ON public.chat_prompt_methodologies
  FOR SELECT
  USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_chat_prompt_methodologies_active
  ON public.chat_prompt_methodologies(is_active, created_at DESC);

INSERT INTO public.chat_prompt_methodologies(name, content, is_active)
SELECT
  'Nucleo Adonai',
  'Prioriza claridad, ejecucion y bajo ruido. Antes de proponer una metodologia, adapta la respuesta al estilo real del usuario, sus cuadernos, metas, agenda y patrones recordados.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.chat_prompt_methodologies WHERE name = 'Nucleo Adonai'
);
