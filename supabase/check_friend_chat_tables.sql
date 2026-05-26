select
  to_regclass('public.friend_conversations') as friend_conversations,
  to_regclass('public.friend_conversation_members') as friend_conversation_members,
  to_regclass('public.friend_messages') as friend_messages,
  to_regclass('public.friend_task_requests') as friend_task_requests,
  to_regclass('public.friend_invite_task_submissions') as friend_invite_task_submissions;
