import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  FolderOpen,
  Image,
  Inbox,
  Link2,
  MessageCircle,
  MoreVertical,
  Plus,
  Search,
  Send,
  Users,
  X,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFriendships } from '@/hooks/useFriendships';
import { FriendTaskPayload, useFriendChats } from '@/hooks/useFriendChats';
import { useFolders } from '@/hooks/useFolders';
import { useFolderShares } from '@/hooks/useFolderShares';

const priorityOptions = [
  { key: 'important-urgent', label: 'Importante/Urgente', value: 'high', urgency: true, importance: true },
  { key: 'urgent-not-important', label: 'Urgente/No importante', value: 'medium', urgency: true, importance: false },
  { key: 'important-not-urgent', label: 'Importante/No urgente', value: 'medium', urgency: false, importance: true },
  { key: 'not-urgent-not-important', label: 'No urgente/No importante', value: 'low', urgency: false, importance: false },
] as const;

const publicAppUrl = (import.meta.env.VITE_PUBLIC_APP_URL || 'https://webadonai.com').replace(/\/$/, '');

const needsChatMigration = (error: any) => {
  const message = String(error?.message || error?.details || '');
  return (
    message.includes('friend_chat_action')
    || message.includes('schema cache')
    || message.includes('friend_conversations')
    || message.includes('friend_conversation_members')
  );
};

const friendChatAction = async (action: string, payload: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.rpc('friend_chat_action', { action, payload } as any);
  if (error) throw error;
  return data as any;
};

const FriendsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { friends, pendingReceived, pendingSent, sendRequest, respondRequest } = useFriendships();
  const { folders } = useFolders();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [mode, setMode] = useState<'chat' | 'search'>('chat');
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [taskDraft, setTaskDraft] = useState<FriendTaskPayload>({
    title: '',
    priority: 'medium',
    urgency: true,
    importance: false,
    estimated_minutes: 30,
    due_date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [taskSchedule, setTaskSchedule] = useState<'now' | 'later'>('now');
  const [scheduledFor, setScheduledFor] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [shareFolderId, setShareFolderId] = useState('');
  const [showTaskBox, setShowTaskBox] = useState(false);
  const [showImageBox, setShowImageBox] = useState(false);
  const [showFolderBox, setShowFolderBox] = useState(false);
  const [showGroupBox, setShowGroupBox] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showAddMembersBox, setShowAddMembersBox] = useState(false);
  const [newGroupMembers, setNewGroupMembers] = useState<string[]>([]);
  const [approvalFolders, setApprovalFolders] = useState<Record<string, string>>({});
  const [publicTaskFolders, setPublicTaskFolders] = useState<Record<string, string>>({});
  const [approvedRequestIds, setApprovedRequestIds] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const selectedPriorityKey = priorityOptions.find((option) => (
    option.urgency === Boolean(taskDraft.urgency)
    && option.importance === Boolean(taskDraft.importance)
  ))?.key || 'urgent-not-important';

  const friendUserIds = friends.map((f) => (f.requester_id === user?.id ? f.addressee_id : f.requester_id));
  const inviteLink = user ? `${publicAppUrl}/#/invite/${user.id}` : '';

  const { data: friendProfiles = [] } = useQuery({
    queryKey: ['friend-profiles', friendUserIds],
    queryFn: async () => {
      if (friendUserIds.length === 0) return [];
      const { data } = await supabase.from('profiles').select('user_id, name, email').in('user_id', friendUserIds);
      return data || [];
    },
    enabled: friendUserIds.length > 0,
  });

  const pendingUserIds = pendingReceived.map((f) => f.requester_id);
  const { data: pendingProfiles = [] } = useQuery({
    queryKey: ['pending-profiles', pendingUserIds],
    queryFn: async () => {
      if (pendingUserIds.length === 0) return [];
      const { data } = await supabase.from('profiles').select('user_id, name, email').in('user_id', pendingUserIds);
      return data || [];
    },
    enabled: pendingUserIds.length > 0,
  });

  const {
    conversations,
    messages,
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
  } = useFriendChats(selectedId);

  const { shareWithFriend } = useFolderShares(shareFolderId || undefined);

  const { data: publicTaskSubmissions = [] } = useQuery({
    queryKey: ['friend-invite-task-submissions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const data = await friendChatAction('invite_list');
      return data?.submissions || [];
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (!selectedId) return;
    markRead.mutate(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ block: 'end' });
    });
  }, [selectedId, messages.length]);

  const selectedOtherMember = selectedConversation?.members?.find((m: any) => m.user_id !== user?.id);
  const selectedReceiverId = selectedConversation?.type === 'direct' ? selectedOtherMember?.user_id : null;

  const chats = useMemo(() => {
    return conversations.map((conversation: any) => {
      const other = conversation.members?.find((m: any) => m.user_id !== user?.id);
      const title = conversation.type === 'group'
        ? conversation.title || 'Grupo'
        : other?.profile?.name || other?.profile?.email || 'Amigo';
      return { ...conversation, title, other };
    });
  }, [conversations, user?.id]);

  const selectedMemberIds = useMemo(
    () => new Set((selectedConversation?.members || []).map((member: any) => member.user_id)),
    [selectedConversation?.members],
  );
  const availableGroupFriends = friendProfiles.filter((profile: any) => !selectedMemberIds.has(profile.user_id));
  const selectedChatTitle = chats.find((chat: any) => chat.id === selectedId)?.title || selectedConversation?.title || 'Grupo';
  const groupInviteLink = selectedConversation?.type === 'group' && selectedId ? `${publicAppUrl}/#/group-invite/${selectedId}` : '';

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    setMode('search');
    const { data } = await supabase
      .from('profiles')
      .select('user_id, name, email')
      .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      .neq('user_id', user.id)
      .limit(12);
    setSearchResults(data || []);
  };

  const openDirectChat = async (friendId: string) => {
    try {
      const conversation = await ensureDirectConversation.mutateAsync(friendId);
      setSelectedId(conversation.id);
      setMode('chat');
    } catch (error: any) {
      console.error('[friends] openDirectChat failed', error);
      toast.error(needsChatMigration(error) ? 'Falta aplicar la funcion de chats en Supabase' : error?.message || 'No se pudo abrir el chat');
    }
  };

  const handleSendText = async () => {
    if (!selectedId || !message.trim()) return;
    await sendMessage.mutateAsync({ id: selectedId, body: message.trim() });
    setMessage('');
  };

  const handleSendImage = async () => {
    if (!selectedId || !imageUrl.trim()) return;
    await sendMessage.mutateAsync({ id: selectedId, kind: 'image', body: 'Foto', payload: { url: imageUrl.trim() } });
    setImageUrl('');
    setShowImageBox(false);
  };

  const handleSendTask = async () => {
    if (!selectedId || !selectedReceiverId || !taskDraft.title.trim()) {
      toast.error('Abre un chat directo y escribe la tarea');
      return;
    }
    await sendTaskRequest.mutateAsync({
      id: selectedId,
      receiverId: selectedReceiverId,
      task: taskDraft,
      scheduledFor: taskSchedule === 'later' ? scheduledFor : null,
    });
    setTaskDraft({
      title: '',
      priority: 'medium',
      urgency: true,
      importance: false,
      estimated_minutes: 30,
      due_date: format(new Date(), 'yyyy-MM-dd'),
    });
    setScheduledFor('');
    setTaskSchedule('now');
    setShowTaskBox(false);
  };

  const handleShareFolder = async () => {
    if (!shareFolderId || !selectedReceiverId || !selectedId) {
      toast.error('Escoge una carpeta y abre un chat directo');
      return;
    }
    await shareWithFriend.mutateAsync({ folderId: shareFolderId, friendId: selectedReceiverId });
    const folder = folders.find((f: any) => f.id === shareFolderId);
    await sendMessage.mutateAsync({
      id: selectedId,
      kind: 'folder_share',
      body: `Carpeta compartida: ${folder?.name || 'Carpeta'}`,
      payload: { folder_id: shareFolderId, folder_name: folder?.name },
    });
    setShareFolderId('');
    setShowFolderBox(false);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || groupMembers.length === 0) {
      toast.error('Escribe un nombre y escoge al menos un amigo');
      return;
    }
    try {
      const conversation = await createGroup.mutateAsync({ title: groupName.trim(), memberIds: groupMembers });
      setSelectedId(conversation.id);
      setGroupName('');
      setGroupMembers([]);
      setShowGroupBox(false);
    } catch (error: any) {
      console.error('[friends] createGroup failed', error);
      toast.error(needsChatMigration(error) ? 'Falta aplicar la funcion de chats en Supabase' : error?.message || 'No se pudo crear el grupo');
    }
  };

  const handleAddGroupMembers = async () => {
    if (!selectedId || selectedConversation?.type !== 'group' || newGroupMembers.length === 0) {
      toast.error('Escoge al menos un amigo');
      return;
    }

    await addGroupMembers.mutateAsync({ conversationId: selectedId, memberIds: newGroupMembers });
    setNewGroupMembers([]);
    setShowAddMembersBox(false);
    setShowChatMenu(false);
    toast.success('Amigos agregados al grupo');
  };

  const handleCopyInviteLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    toast.success('Link de invitacion copiado');
  };

  useEffect(() => {
    const copyLink = () => {
      void handleCopyInviteLink();
    };
    const createGroup = () => setShowGroupBox(true);
    window.addEventListener('adonai:friends-copy-link', copyLink);
    window.addEventListener('adonai:friends-create-group', createGroup);
    return () => {
      window.removeEventListener('adonai:friends-copy-link', copyLink);
      window.removeEventListener('adonai:friends-create-group', createGroup);
    };
  }, [inviteLink]);

  const handleCopyGroupInviteLink = async () => {
    if (!groupInviteLink) return;
    await navigator.clipboard.writeText(groupInviteLink);
    setShowChatMenu(false);
    toast.success('Link del grupo copiado');
  };

  const approvePublicTask = useMutation({
    mutationFn: async ({ submission, folderId }: { submission: any; folderId?: string | null }) => {
      if (!user) throw new Error('No user');
      queryClient.setQueryData(['friend-invite-task-submissions', user.id], (current: any) => {
        if (!Array.isArray(current)) return current;
        return current.filter((item: any) => item.id !== submission.id);
      });
      await friendChatAction('invite_approve', {
        submission_id: submission.id,
        folder_id: folderId || null,
      });
      return submission;
    },
    onSuccess: (submission) => {
      queryClient.invalidateQueries({ queryKey: ['friend-invite-task-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`La tarea ${submission?.task_payload?.title || 'recibida'} se guardo correctamente`);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-invite-task-submissions'] });
      toast.error('No se pudo aprobar la tarea');
    },
  });

  const handleApproveTaskRequest = async (request: any) => {
    setApprovedRequestIds((current) => [...current, request.id]);
    try {
      await approveTaskRequest.mutateAsync({ request, folderId: approvalFolders[request.id] || null });
      toast.success(`La tarea ${request?.task_payload?.title || request?.payload?.task?.title || 'recibida'} se guardo correctamente`);
    } catch (error: any) {
      setApprovedRequestIds((current) => current.filter((id) => id !== request.id));
      toast.error(error?.message || 'No se pudo aprobar la tarea');
    }
  };

  const rejectPublicTask = useMutation({
    mutationFn: async (submission: any) => {
      await friendChatAction('invite_reject', { submission_id: submission.id });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friend-invite-task-submissions'] }),
  });

  const requestForMessage = (messageId: string) => taskRequests.find((request: any) => request.message_id === messageId);

  const closeComposerPanels = () => {
    setShowTaskBox(false);
    setShowImageBox(false);
    setShowFolderBox(false);
  };

  const openComposerPanel = (panel: 'task' | 'image' | 'folder') => {
    setShowTaskBox(panel === 'task' ? !showTaskBox : false);
    setShowImageBox(panel === 'image' ? !showImageBox : false);
    setShowFolderBox(panel === 'folder' ? !showFolderBox : false);
  };

  const activeComposer = showTaskBox ? 'Tarea' : showImageBox ? 'Foto' : showFolderBox ? 'Carpeta' : null;
  const mobileTopOffset = typeof window !== 'undefined' && window.electronAPI ? '4rem' : '3.5rem';

  return (
    <div
      className="fixed inset-x-0 bottom-[72px] z-40 flex flex-col bg-surface text-foreground md:static md:min-h-screen md:bg-background md:px-6 md:py-6"
      style={{ top: mobileTopOffset }}
    >
      <div className="mx-auto flex w-full overflow-hidden rounded-none border-outline-variant/10 bg-surface shadow-none md:max-w-6xl md:rounded-[24px] md:border md:bg-background flex-1 min-h-0 md:h-[calc(100vh-8rem)] lg:h-[calc(100vh-7rem)]">
        <aside className={`${selectedId ? 'hidden lg:flex' : 'flex'} w-full min-w-0 flex-col border-r border-outline-variant/12 bg-surface lg:w-[380px] lg:shrink-0`}>
          <div className="sticky top-0 z-20 border-b border-outline-variant/10 bg-surface p-3 md:p-4">
            <div className="mb-4 hidden items-center justify-between md:flex">
              <div className="hidden md:block">
                <h1 className="text-2xl font-black tracking-tight">Amigos</h1>
                <p className="text-xs font-medium text-on-surface-variant/55">Chats, tareas y carpetas</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyInviteLink}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-foreground shadow-sm"
                  title="Copiar link personal"
                >
                  <Link2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowGroupBox(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
                  title="Crear grupo"
                >
                  <Users className="h-4 w-4" />
                </button>
              </div>
            </div>

            <button
              onClick={handleCopyInviteLink}
              className="mb-3 hidden w-full items-center justify-between rounded-2xl border border-outline-variant/12 bg-surface-container/70 px-3 py-2 text-left transition hover:bg-surface-container md:flex"
            >
              <span className="min-w-0">
                <span className="block text-xs font-black">Link personal de invitacion</span>
                <span className="block truncate text-[11px] font-semibold text-on-surface-variant/50">{inviteLink}</span>
              </span>
              <Copy className="ml-3 h-4 w-4 shrink-0 text-on-surface-variant/60" />
            </button>

            <div className="flex items-center gap-2 rounded-full bg-surface-container px-3 py-2">
              <Search className="h-4 w-4 text-on-surface-variant/45" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
                placeholder="Buscar o invitar"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-on-surface-variant/35"
              />
              {searchQuery && (
                <button onClick={handleSearch} className="text-xs font-black text-primary">Buscar</button>
              )}
            </div>
          </div>

          <div className="sticky top-[62px] z-10 flex border-b border-outline-variant/10 bg-surface px-3 py-2 md:top-[137px]">
            <button onClick={() => setMode('chat')} className={`rounded-full px-3 py-1.5 text-xs font-black ${mode === 'chat' ? 'bg-foreground text-background' : 'text-on-surface-variant'}`}>Chats</button>
            <button onClick={() => setMode('search')} className={`rounded-full px-3 py-1.5 text-xs font-black ${mode === 'search' ? 'bg-foreground text-background' : 'text-on-surface-variant'}`}>Personas</button>
            {pendingReceived.length > 0 && <span className="ml-auto rounded-full bg-red-500 px-2 py-1 text-[10px] font-black text-white">{pendingReceived.length}</span>}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-surface">
            {publicTaskSubmissions.length > 0 && mode === 'chat' && (
              <div className="space-y-2 border-b border-outline-variant/10 p-3">
                <div className="flex items-center gap-2 px-1 text-xs font-black text-on-surface-variant/60">
                  <Inbox className="h-4 w-4" />
                  Tareas desde tu link
                </div>
                {publicTaskSubmissions.map((submission: any) => (
                  <div key={submission.id} className="space-y-3 rounded-2xl bg-surface-container p-3">
                    <div>
                      <p className="text-sm font-black">{submission.task_payload?.title || 'Tarea recibida'}</p>
                      <p className="mt-1 text-xs font-semibold text-on-surface-variant/55">
                        {submission.sender_name || submission.sender_email || 'Visitante del link'}
                      </p>
                      {submission.message && <p className="mt-2 text-xs font-semibold leading-5 text-on-surface-variant/70">{submission.message}</p>}
                    </div>
                    <select
                      value={publicTaskFolders[submission.id] || ''}
                      onChange={(event) => setPublicTaskFolders((prev) => ({ ...prev, [submission.id]: event.target.value }))}
                      className="w-full rounded-xl bg-background px-3 py-2 text-xs font-bold outline-none"
                    >
                      <option value="">Agregar a Hoy</option>
                      {folders.map((folder: any) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <button onClick={() => approvePublicTask.mutate({ submission, folderId: publicTaskFolders[submission.id] || null })} className="flex-1 rounded-xl bg-primary py-2 text-xs font-black text-primary-foreground">Aprobar</button>
                      <button onClick={() => rejectPublicTask.mutate(submission)} className="rounded-xl bg-background px-3 text-xs font-black text-on-surface-variant">No</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pendingReceived.length > 0 && mode === 'chat' && (
              <div className="space-y-2 border-b border-outline-variant/10 p-3">
                {pendingReceived.map((request) => {
                  const profile = pendingProfiles.find((p: any) => p.user_id === request.requester_id);
                  return (
                    <div key={request.id} className="rounded-2xl bg-surface-container p-3">
                      <p className="text-sm font-black">{profile?.name || profile?.email || 'Solicitud'}</p>
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => respondRequest.mutate({ id: request.id, status: 'accepted' })} className="flex-1 rounded-xl bg-primary py-2 text-xs font-black text-primary-foreground">Aceptar</button>
                        <button onClick={() => respondRequest.mutate({ id: request.id, status: 'rejected' })} className="rounded-xl bg-background px-3 text-xs font-black text-on-surface-variant">No</button>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}

            {mode === 'search' ? (
              <div className="p-2">
                {[...friendProfiles, ...searchResults].filter((profile, index, arr) => arr.findIndex((p) => p.user_id === profile.user_id) === index).map((profile: any) => {
                  const isFriend = friendUserIds.includes(profile.user_id);
                  const sent = pendingSent.some((request) => request.addressee_id === profile.user_id);
                  return (
                    <div key={profile.user_id} className="flex items-center gap-3 rounded-2xl p-3 hover:bg-surface-container">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/12 text-sm font-black text-primary">
                        {(profile.name || profile.email || 'A')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black">{profile.name || 'Usuario'}</p>
                        <p className="truncate text-xs text-on-surface-variant/55">{profile.email}</p>
                      </div>
                      {isFriend ? (
                        <button onClick={() => openDirectChat(profile.user_id)} className="rounded-full bg-foreground px-3 py-2 text-xs font-black text-background">Chat</button>
                      ) : sent ? (
                        <span className="text-xs font-bold text-on-surface-variant/45">Enviada</span>
                      ) : (
                        <button onClick={() => sendRequest.mutate(profile.user_id)} className="rounded-full bg-primary px-3 py-2 text-xs font-black text-primary-foreground">Conectar</button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : chats.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                <MessageCircle className="mb-4 h-10 w-10 text-on-surface-variant/25" />
                <p className="text-sm font-black">Todavia no hay chats</p>
                <p className="mt-1 text-xs text-on-surface-variant/55">Busca un amigo y abre una conversación.</p>
              </div>
            ) : (
              chats.map((chat: any) => (
                <button
                  key={chat.id}
                  onClick={() => { setSelectedId(chat.id); setMode('chat'); }}
                  className={`flex w-full items-center gap-3 border-b border-outline-variant/8 p-4 text-left transition-colors hover:bg-surface-container ${selectedId === chat.id ? 'bg-primary/8' : ''}`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/12 text-sm font-black text-primary">
                    {chat.type === 'group' ? <Users className="h-5 w-5" /> : (chat.title || 'A')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-black">{chat.title}</p>
                      {(chat.me?.unread_count || 0) > 0 && <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black text-white">{chat.me.unread_count}</span>}
                    </div>
                    <p className="truncate text-xs text-on-surface-variant/55">{chat.lastMessage?.body || 'Sin mensajes todavia'}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className={`min-w-0 flex-1 flex-col bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--surface-container-low)))] ${selectedId ? 'flex' : 'hidden lg:flex'}`}>
          {!selectedConversation ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <MessageCircle className="mb-4 h-12 w-12 text-on-surface-variant/25" />
              <h2 className="text-xl font-black">Selecciona un chat</h2>
              <p className="mt-1 max-w-xs text-sm text-on-surface-variant/55">Habla, comparte tareas, fotos y carpetas desde un solo lugar.</p>
            </div>
          ) : (
            <>
              <div className="flex h-14 shrink-0 items-center gap-3 border-b border-outline-variant/12 bg-surface/95 px-3 backdrop-blur-xl md:h-auto md:px-4 md:py-3">
                <button onClick={() => { closeComposerPanels(); setShowChatMenu(false); setSelectedId(null); }} className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant md:hidden"><ArrowLeft className="h-5 w-5" /></button>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-black text-primary">
                  {selectedConversation.type === 'group' ? <Users className="h-5 w-5" /> : (chats.find((c: any) => c.id === selectedId)?.title || 'A')[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black">{selectedChatTitle}</p>
                  <p className="text-xs text-on-surface-variant/55">{selectedConversation.members?.length || 0} participantes</p>
                </div>
                <div className="relative">
                  <button onClick={() => setShowChatMenu((value) => !value)} className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                  {showChatMenu && (
                    <div className="absolute right-0 top-11 z-30 w-64 overflow-hidden rounded-2xl border border-outline-variant/15 bg-surface shadow-2xl">
                      {selectedConversation.type === 'group' ? (
                        <>
                          <button onClick={() => { setShowAddMembersBox(true); setShowChatMenu(false); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold hover:bg-surface-container">
                            <Users className="h-4 w-4 text-primary" />
                            Añadir amigos al grupo
                          </button>
                          <button onClick={handleCopyGroupInviteLink} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold hover:bg-surface-container">
                            <Link2 className="h-4 w-4 text-primary" />
                            Copiar link del grupo
                          </button>
                        </>
                      ) : (
                        <div className="px-4 py-3 text-xs font-bold text-on-surface-variant/60">Sin acciones disponibles</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4 md:space-y-3 md:p-4">
                {messages.map((msg: any) => {
                  const mine = msg.sender_id === user?.id;
                  const request = msg.kind === 'task_request' ? requestForMessage(msg.id) : null;
                  return (
                    <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 shadow-sm md:max-w-[82%] md:px-4 md:py-3 ${mine ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-surface text-foreground'}`}>
                        {msg.kind === 'image' && msg.payload?.url ? (
                          <img src={msg.payload.url} alt="" className="mb-2 max-h-52 rounded-xl object-cover" />
                        ) : msg.kind === 'folder_share' ? (
                          <div className="mb-1 flex items-center gap-2 text-sm font-black"><FolderOpen className="h-4 w-4" /> {msg.payload?.folder_name || 'Carpeta compartida'}</div>
                        ) : msg.kind === 'task_request' ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-black"><CheckCircle2 className="h-4 w-4" /> Tarea enviada</div>
                            <p className="text-sm font-bold">{msg.payload?.task?.title || msg.body}</p>
                            {msg.payload?.task?.link && <p className="break-all text-xs opacity-75">{msg.payload.task.link}</p>}
                            {request && request.receiver_id === user?.id && request.status === 'pending' && !approvedRequestIds.includes(request.id) && (
                              <div className="mt-3 space-y-2 rounded-xl bg-background/35 p-2">
                                <select
                                  value={approvalFolders[request.id] || ''}
                                  onChange={(event) => setApprovalFolders((prev) => ({
                                    ...prev,
                                    [request.id]: event.target.value,
                                  }))}
                                  className="w-full rounded-lg bg-background px-2 py-2 text-xs font-bold text-foreground outline-none"
                                >
                                  <option value="">Agregar a Hoy</option>
                                  {folders.map((folder: any) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                                </select>
                                <div className="flex gap-2">
                                  <button onClick={() => handleApproveTaskRequest(request)} className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-black text-primary-foreground">Aprobar</button>
                                  <button onClick={() => rejectTaskRequest.mutate(request)} className="rounded-lg bg-red-500 px-3 py-2 text-xs font-black text-white">Rechazar</button>
                                </div>
                              </div>
                            )}
                            {request?.status && request.status !== 'pending' && <p className="text-[10px] font-black uppercase opacity-60">{request.status}</p>}
                          </div>
                        ) : msg.kind === 'system' ? (
                          <p className="text-xs font-bold opacity-70">{msg.body}</p>
                        ) : (
                          <p className="whitespace-pre-wrap break-words text-sm font-semibold">{msg.body}</p>
                        )}
                        <p className={`mt-1 text-[10px] font-bold ${mine ? 'text-primary-foreground/60' : 'text-on-surface-variant/45'}`}>{format(new Date(msg.created_at), 'p', { locale: es })}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {(showTaskBox || showImageBox || showFolderBox) && (
                <div className="shrink-0 border-t border-outline-variant/10 bg-surface/95 p-3 shadow-[0_-18px_45px_rgba(0,0,0,0.12)] backdrop-blur-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/12 text-primary">
                        {showTaskBox ? <Check className="h-4 w-4" /> : showImageBox ? <Image className="h-4 w-4" /> : <FolderOpen className="h-4 w-4" />}
                      </span>
                      <p className="text-sm font-black">{activeComposer}</p>
                    </div>
                    <button onClick={closeComposerPanels} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container text-on-surface-variant" title="Cerrar">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {showTaskBox && (
                    <div className="grid gap-2 md:grid-cols-[1fr_130px_120px]">
                      <input value={taskDraft.title} onChange={(e) => setTaskDraft({ ...taskDraft, title: e.target.value })} placeholder="Nombre de la tarea" className="rounded-xl bg-surface-container px-3 py-2 text-sm font-bold outline-none" />
                      <input value={taskDraft.link || ''} onChange={(e) => setTaskDraft({ ...taskDraft, link: e.target.value })} placeholder="Link" className="rounded-xl bg-surface-container px-3 py-2 text-sm font-bold outline-none" />
                      <select value={selectedPriorityKey} onChange={(e) => {
                        const option = priorityOptions.find((p) => p.key === e.target.value) || priorityOptions[1];
                        setTaskDraft({ ...taskDraft, priority: option.value, urgency: option.urgency, importance: option.importance });
                      }} className="rounded-xl bg-surface-container px-3 py-2 text-sm font-bold outline-none">
                        {priorityOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                      </select>
                      <label className="rounded-xl bg-surface-container px-3 py-2">
                        <span className="block text-[10px] font-black uppercase text-on-surface-variant/45">Vence</span>
                        <input type="date" value={taskDraft.due_date} onChange={(e) => setTaskDraft({ ...taskDraft, due_date: e.target.value })} className="w-full bg-transparent text-sm font-bold outline-none" />
                      </label>
                      <select value={taskSchedule} onChange={(e) => setTaskSchedule(e.target.value as 'now' | 'later')} className="rounded-xl bg-surface-container px-3 py-2 text-sm font-bold outline-none">
                        <option value="now">Enviar ahora</option>
                        <option value="later">Programar</option>
                      </select>
                      {taskSchedule === 'later' && (
                        <label className="rounded-xl bg-surface-container px-3 py-2">
                          <span className="block text-[10px] font-black uppercase text-on-surface-variant/45">Enviar a las</span>
                          <input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className="w-full bg-transparent text-sm font-bold outline-none" />
                        </label>
                      )}
                      <button onClick={handleSendTask} className="rounded-xl bg-primary px-4 py-3 text-xs font-black text-primary-foreground md:py-2">Enviar tarea</button>
                    </div>
                  )}
                  {showImageBox && (
                    <div className="flex gap-2">
                      <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="URL de foto" className="min-w-0 flex-1 rounded-xl bg-surface-container px-3 py-2 text-sm font-bold outline-none" />
                      <button onClick={handleSendImage} className="rounded-xl bg-primary px-4 py-2 text-xs font-black text-primary-foreground">Enviar</button>
                    </div>
                  )}
                  {showFolderBox && (
                    <div className="flex gap-2">
                      <select value={shareFolderId} onChange={(e) => setShareFolderId(e.target.value)} className="min-w-0 flex-1 rounded-xl bg-surface-container px-3 py-2 text-sm font-bold outline-none">
                        <option value="">Escoge carpeta</option>
                        {folders.map((folder: any) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                      </select>
                      <button onClick={handleShareFolder} className="rounded-xl bg-primary px-4 py-2 text-xs font-black text-primary-foreground">Compartir</button>
                    </div>
                  )}
                </div>
              )}

              <div className="shrink-0 border-t border-outline-variant/12 bg-surface/95 p-2.5 backdrop-blur-xl md:p-3">
                <div className="mb-2 flex gap-2 overflow-x-auto pb-0.5">
                  <button onClick={() => openComposerPanel('task')} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${showTaskBox ? 'bg-primary text-primary-foreground' : 'bg-surface-container'}`}><Check className="mr-1 inline h-3 w-3" />Tarea</button>
                  <button onClick={() => openComposerPanel('image')} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${showImageBox ? 'bg-primary text-primary-foreground' : 'bg-surface-container'}`}><Image className="mr-1 inline h-3 w-3" />Foto</button>
                  <button onClick={() => openComposerPanel('folder')} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${showFolderBox ? 'bg-primary text-primary-foreground' : 'bg-surface-container'}`}><FolderOpen className="mr-1 inline h-3 w-3" />Carpeta</button>
                </div>
                <div className="flex items-end gap-2 rounded-[22px] bg-surface-container p-1.5">
                  <button onClick={() => openComposerPanel('task')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant"><Plus className="h-5 w-5" /></button>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); } }} placeholder="Mensaje" rows={1} className="max-h-28 min-h-10 flex-1 resize-none bg-transparent py-2 text-sm font-semibold outline-none" />
                  <button onClick={handleSendText} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"><Send className="h-4 w-4" /></button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {showGroupBox && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-outline-variant/20 bg-surface p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black">Crear grupo</h2>
              <button onClick={() => setShowGroupBox(false)}><X className="h-5 w-5" /></button>
            </div>
            <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Nombre del grupo" className="mb-3 w-full rounded-xl bg-surface-container px-3 py-3 text-sm font-bold outline-none" />
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {friendProfiles.map((profile: any) => (
                <label key={profile.user_id} className="flex items-center gap-3 rounded-xl p-3 hover:bg-surface-container">
                  <input type="checkbox" checked={groupMembers.includes(profile.user_id)} onChange={(e) => setGroupMembers((prev) => e.target.checked ? [...prev, profile.user_id] : prev.filter((id) => id !== profile.user_id))} />
                  <span className="text-sm font-bold">{profile.name || profile.email}</span>
                </label>
              ))}
            </div>
            <button onClick={handleCreateGroup} className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-black text-primary-foreground">Crear grupo</button>
          </div>
        </div>
      )}

      {showAddMembersBox && selectedConversation?.type === 'group' && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-background/70 p-3 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-3xl border border-outline-variant/20 bg-surface p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">Añadir al grupo</h2>
                <p className="text-xs font-semibold text-on-surface-variant/55">{selectedChatTitle}</p>
              </div>
              <button onClick={() => { setShowAddMembersBox(false); setNewGroupMembers([]); }} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container"><X className="h-4 w-4" /></button>
            </div>

            {availableGroupFriends.length === 0 ? (
              <div className="rounded-2xl bg-surface-container p-4 text-sm font-bold text-on-surface-variant/65">
                Todos tus amigos ya estan en este grupo.
              </div>
            ) : (
              <div className="max-h-72 space-y-1 overflow-y-auto">
                {availableGroupFriends.map((profile: any) => (
                  <label key={profile.user_id} className="flex items-center gap-3 rounded-xl p-3 hover:bg-surface-container">
                    <input
                      type="checkbox"
                      checked={newGroupMembers.includes(profile.user_id)}
                      onChange={(event) => setNewGroupMembers((prev) => (
                        event.target.checked ? [...prev, profile.user_id] : prev.filter((id) => id !== profile.user_id)
                      ))}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{profile.name || profile.email || 'Amigo'}</p>
                      <p className="truncate text-xs text-on-surface-variant/50">{profile.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <button
              onClick={handleAddGroupMembers}
              disabled={newGroupMembers.length === 0}
              className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-black text-primary-foreground disabled:opacity-45"
            >
              Añadir amigos
            </button>
            <button
              onClick={handleCopyGroupInviteLink}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-surface-container py-3 text-sm font-black"
            >
              <Link2 className="h-4 w-4" />
              Copiar link del grupo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendsPage;
