-- Clerk is the user-facing authenticator. Supabase Auth rows remain as
-- internal UUID identities so existing foreign keys and RLS policies keep
-- working during the migration.

CREATE TABLE IF NOT EXISTS public.clerk_user_links (
  clerk_user_id TEXT PRIMARY KEY,
  internal_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clerk_user_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own Clerk link" ON public.clerk_user_links;
CREATE POLICY "Users can view own Clerk link"
ON public.clerk_user_links
FOR SELECT
TO authenticated
USING (
  internal_user_id = auth.uid()
);

CREATE OR REPLACE FUNCTION public.touch_clerk_user_links_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_clerk_user_links_updated_at ON public.clerk_user_links;
CREATE TRIGGER touch_clerk_user_links_updated_at
BEFORE UPDATE ON public.clerk_user_links
FOR EACH ROW
EXECUTE FUNCTION public.touch_clerk_user_links_updated_at();

CREATE INDEX IF NOT EXISTS idx_clerk_user_links_internal_user_id
ON public.clerk_user_links(internal_user_id);
