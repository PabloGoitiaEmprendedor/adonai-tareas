-- Admin broadcast notifications shown through the app notification manager.
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'user')),
  target_user_id UUID NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_count INTEGER NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
  read_count INTEGER NOT NULL DEFAULT 0 CHECK (read_count >= 0),
  CONSTRAINT admin_notifications_target_user_required
    CHECK (target_type = 'all' OR target_user_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at
  ON public.admin_notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_target_user
  ON public.admin_notifications (target_user_id)
  WHERE target_user_id IS NOT NULL;

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_adonai_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT auth.jwt() ->> 'email' = 'pablogoitiaemprendedor@gmail.com';
$$;

DROP POLICY IF EXISTS "Admin can manage notifications" ON public.admin_notifications;
CREATE POLICY "Admin can manage notifications"
  ON public.admin_notifications
  FOR ALL
  USING (public.is_adonai_admin())
  WITH CHECK (public.is_adonai_admin());

DROP POLICY IF EXISTS "Users can view targeted notifications" ON public.admin_notifications;
CREATE POLICY "Users can view targeted notifications"
  ON public.admin_notifications
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      target_type = 'all'
      OR target_user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.mark_admin_notification_sent(notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.admin_notifications
  SET sent_count = sent_count + 1
  WHERE id = notification_id
    AND auth.uid() IS NOT NULL
    AND (
      public.is_adonai_admin()
      OR target_type = 'all'
      OR target_user_id = auth.uid()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_admin_notification_sent(UUID) TO authenticated;
