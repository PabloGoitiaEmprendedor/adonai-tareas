import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const directKey = (a: string, b: string) => `direct:${[a, b].sort().join(':')}`;

const friendChatAction = async (action: string, payload: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.rpc('friend_chat_action', { action, payload } as any);
  if (error) throw error;
  return data as any;
};

export type FriendMessageKind = 'text' | 'image' | 'task_request' | 'folder_share' | 'system';

export type FriendTaskPayload = {
  title: string;
  link?: string | null;
  priority?: 'high' | 'medium' | 'low';
  urgency?: boolean;
  importance?: boolean;
  estimated_minutes?: number;
  due_date?: string;
  description?: string;
};

export const useFriendUnreadCount = () => {
  const { user } = useAuth();

  const { data = 0 } = useQuery({
    queryKey: ['friend-unread-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const data = await friendChatAction('summary');
      return Number(data?.unread_count || 0) + Number(data?.invite_task_count || 0);
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  return data;
};

export const useFriendChats = (conversationId?: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const conversationsQuery = useQuery({
    queryKey: ['friend-conversations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const data = await friendChatAction('list');
      return data?.conversations || [];
    },
    enabled: !!user,
    refetchInterval: 12000,
  });

  const conversationDetailQuery = useQuery({
    queryKey: ['friend-conversation-detail', conversationId, user?.id],
    queryFn: async () => {
      if (!conversationId || !user) return null;
      const data = await friendChatAction('list', { conversation_id: conversationId });
      return data || null;
    },
    enabled: !!conversationId && !!user,
    refetchInterval: 8000,
  });

  const selectedConversation = useMemo(() => {
    if (!conversationId) return undefined;
    const baseConversation = (conversationsQuery.data || []).find((conversation: any) => conversation.id === conversationId);
    const detail = conversationDetailQuery.data?.conversation;
    if (!detail && !baseConversation) return undefined;

    return {
      ...(baseConversation || {}),
      ...(detail || {}),
      members: conversationDetailQuery.data?.members || baseConversation?.members || [],
      lastMessage: baseConversation?.lastMessage,
    };
  }, [conversationId, conversationsQuery.data, conversationDetailQuery.data]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['friend-conversations'] });
    queryClient.invalidateQueries({ queryKey: ['friend-conversation-detail'] });
    queryClient.invalidateQueries({ queryKey: ['friend-unread-count'] });
  };

  const messages = conversationDetailQuery.data?.messages || [];
  const taskRequests = conversationDetailQuery.data?.task_requests || [];

  const ensureDirectConversation = useMutation({
    mutationFn: async (friendId: string) => {
      if (!user) throw new Error('No user');
      const data = await friendChatAction('ensure_direct', { friend_id: friendId });
      return data?.conversation;
    },
    onSuccess: invalidate,
  });

  const createGroup = useMutation({
    mutationFn: async ({ title, memberIds }: { title: string; memberIds: string[] }) => {
      if (!user) throw new Error('No user');
      const data = await friendChatAction('create_group', { title: title.trim(), member_ids: memberIds });
      return data?.conversation;
    },
    onSuccess: invalidate,
  });

  const addGroupMembers = useMutation({
    mutationFn: async ({ conversationId, memberIds }: { conversationId: string; memberIds: string[] }) => {
      if (!user) throw new Error('No user');
      const data = await friendChatAction('add_group_members', {
        conversation_id: conversationId,
        member_ids: memberIds,
      });
      return data?.conversation;
    },
    onSuccess: invalidate,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('No user');
      await friendChatAction('mark_read', { conversation_id: id });
    },
    onSuccess: invalidate,
  });

  const sendMessage = useMutation({
    mutationFn: async ({ id, kind = 'text', body, payload = {} }: { id: string; kind?: FriendMessageKind; body?: string; payload?: any }) => {
      if (!user) throw new Error('No user');
      const data = await friendChatAction('send_message', {
        conversation_id: id,
        kind,
        body,
        payload,
      });
      return data?.message;
    },
    onSuccess: invalidate,
  });

  const sendTaskRequest = useMutation({
    mutationFn: async ({ id, receiverId, task, scheduledFor }: { id: string; receiverId: string; task: FriendTaskPayload; scheduledFor?: string | null }) => {
      if (!user) throw new Error('No user');
      const data = await friendChatAction('send_task_request', {
        conversation_id: id,
        receiver_id: receiverId,
        task,
        scheduled_for: scheduledFor || null,
      });
      return data?.request;
    },
    onSuccess: invalidate,
  });

  const approveTaskRequest = useMutation({
    mutationFn: async ({ request, folderId }: { request: any; folderId?: string | null }) => {
      if (!user) throw new Error('No user');
      await friendChatAction('approve_task_request', {
        request_id: request.id,
        folder_id: folderId || null,
      });
    },
    onSuccess: invalidate,
  });

  const rejectTaskRequest = useMutation({
    mutationFn: async (request: any) => {
      if (!user) throw new Error('No user');
      await friendChatAction('reject_task_request', { request_id: request.id });
    },
    onSuccess: invalidate,
  });

  return {
    conversations: conversationsQuery.data || [],
    conversationsLoading: conversationsQuery.isLoading,
    messages,
    messagesLoading: conversationDetailQuery.isLoading,
    taskRequests,
    selectedConversation,
    ensureDirectConversation,
    createGroup,
    addGroupMembers,
    sendMessage,
    sendTaskRequest,
    approveTaskRequest,
    rejectTaskRequest,
    markRead,
  };
};
