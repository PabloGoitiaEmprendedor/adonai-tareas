CREATE TABLE IF NOT EXISTS public.friend_invite_task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL,
  sender_name TEXT,
  sender_email TEXT,
  task_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_task_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_friend_invite_task_submissions_inviter_status
  ON public.friend_invite_task_submissions(inviter_id, status, created_at DESC);

ALTER TABLE public.friend_invite_task_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can send limited invite tasks"
  ON public.friend_invite_task_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    jsonb_typeof(task_payload) = 'object'
    AND char_length(coalesce(task_payload->>'title', '')) BETWEEN 2 AND 140
  );

CREATE POLICY "Inviters can view their invite tasks"
  ON public.friend_invite_task_submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = inviter_id);

CREATE POLICY "Inviters can update their invite tasks"
  ON public.friend_invite_task_submissions FOR UPDATE
  TO authenticated
  USING (auth.uid() = inviter_id)
  WITH CHECK (auth.uid() = inviter_id);

CREATE OR REPLACE FUNCTION public.get_invite_profile(inviter UUID)
RETURNS TABLE(user_id UUID, name TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, coalesce(nullif(trim(p.name), ''), 'Tu amigo') AS name
  FROM public.profiles p
  WHERE p.user_id = inviter
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_profile(UUID) TO anon, authenticated;
