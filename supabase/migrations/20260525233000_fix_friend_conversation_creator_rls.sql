DROP POLICY IF EXISTS "Members can view conversations" ON public.friend_conversations;

CREATE POLICY "Members and creators can view conversations"
  ON public.friend_conversations FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.friend_conversation_members m
      WHERE m.conversation_id = id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can update conversations" ON public.friend_conversations;

CREATE POLICY "Members and creators can update conversations"
  ON public.friend_conversations FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.friend_conversation_members m
      WHERE m.conversation_id = id AND m.user_id = auth.uid()
    )
  );
