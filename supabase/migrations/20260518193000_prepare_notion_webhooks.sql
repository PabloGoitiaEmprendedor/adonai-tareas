CREATE TABLE IF NOT EXISTS public.notion_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text,
  workspace_id text,
  notion_user_id text,
  page_id text,
  database_id text,
  subscription_id text,
  verification_token text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notion_webhook_events_workspace_id ON public.notion_webhook_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notion_webhook_events_event_type ON public.notion_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_notion_webhook_events_created_at ON public.notion_webhook_events(created_at);

ALTER TABLE public.notion_webhook_events ENABLE ROW LEVEL SECURITY;
