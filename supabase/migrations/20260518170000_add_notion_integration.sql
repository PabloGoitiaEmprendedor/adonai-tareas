CREATE TABLE IF NOT EXISTS public.notion_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  access_token text NOT NULL,
  refresh_token text,
  workspace_id text,
  workspace_name text,
  bot_id text,
  owner jsonb DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notion_oauth_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redirect_to text,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notion_database_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notion_database_id text NOT NULL,
  notion_data_source_id text NOT NULL,
  notion_title text NOT NULL,
  folder_id uuid NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  sync_direction text NOT NULL DEFAULT 'notion_to_adonai' CHECK (sync_direction IN ('notion_to_adonai', 'two_way')),
  property_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, notion_data_source_id)
);

CREATE TABLE IF NOT EXISTS public.notion_page_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mapping_id uuid NOT NULL REFERENCES public.notion_database_mappings(id) ON DELETE CASCADE,
  notion_page_id text NOT NULL,
  notion_last_edited_time timestamptz,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, notion_page_id)
);

CREATE INDEX IF NOT EXISTS idx_notion_database_mappings_user_id ON public.notion_database_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_notion_page_tasks_user_id ON public.notion_page_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_notion_page_tasks_mapping_id ON public.notion_page_tasks(mapping_id);

ALTER TABLE public.notion_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notion_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notion_database_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notion_page_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own Notion connection"
  ON public.notion_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own Notion connection"
  ON public.notion_connections FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own Notion mappings"
  ON public.notion_database_mappings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own Notion mappings"
  ON public.notion_database_mappings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own Notion mappings"
  ON public.notion_database_mappings FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own Notion page task links"
  ON public.notion_page_tasks FOR SELECT
  USING (auth.uid() = user_id);
