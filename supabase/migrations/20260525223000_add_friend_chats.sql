CREATE TABLE IF NOT EXISTS public.friend_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  title TEXT,
  conversation_key TEXT UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.friend_conversation_members (
  conversation_id UUID NOT NULL REFERENCES public.friend_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  unread_count INTEGER NOT NULL DEFAULT 0 CHECK (unread_count >= 0),
  last_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.friend_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.friend_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'image', 'task_request', 'folder_share', 'system')),
  body TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.friend_task_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.friend_messages(id) ON DELETE SET NULL,
  conversation_id UUID NOT NULL REFERENCES public.friend_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_payload JSONB NOT NULL,
  scheduled_for TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  target_folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  created_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_friend_conversation_members_user
  ON public.friend_conversation_members(user_id);

CREATE INDEX IF NOT EXISTS idx_friend_messages_conversation_created
  ON public.friend_messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_friend_task_requests_receiver_status
  ON public.friend_task_requests(receiver_id, status);

ALTER TABLE public.friend_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_task_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view conversations"
  ON public.friend_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.friend_conversation_members m
      WHERE m.conversation_id = id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations"
  ON public.friend_conversations FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Members can update conversations"
  ON public.friend_conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.friend_conversation_members m
      WHERE m.conversation_id = id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view members"
  ON public.friend_conversation_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.friend_conversation_members m
      WHERE m.conversation_id = friend_conversation_members.conversation_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Conversation creator can add members"
  ON public.friend_conversation_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.friend_conversations c
      WHERE c.id = conversation_id AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "Members can update member read state"
  ON public.friend_conversation_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.friend_conversation_members m
      WHERE m.conversation_id = friend_conversation_members.conversation_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view messages"
  ON public.friend_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.friend_conversation_members m
      WHERE m.conversation_id = conversation_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can send messages"
  ON public.friend_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.friend_conversation_members m
      WHERE m.conversation_id = conversation_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Task request participants can view"
  ON public.friend_task_requests FOR SELECT
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can create sent task requests"
  ON public.friend_task_requests FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.friend_conversation_members m
      WHERE m.conversation_id = conversation_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Receivers can resolve task requests"
  ON public.friend_task_requests FOR UPDATE
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());
