import { useState } from 'react';
import { useFriendships } from '@/hooks/useFriendships';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Users, Search, UserPlus, Check, X, FolderOpen, ChevronRight, ChevronDown, Clock, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NavigationWrapper from '@/components/NavigationWrapper';
import { Flame } from 'lucide-react';

const FriendsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { friends, pendingReceived, pendingSent, sendRequest, respondRequest } = useFriendships();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [tab, setTab] = useState<'friends' | 'requests'>('friends');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const friendUserIds = friends.map((f) => f.requester_id === user?.id ? f.addressee_id : f.requester_id);
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

  const { data: friendFolders = [] } = useQuery({
    queryKey: ['friend-folders', selectedFriend],
    queryFn: async () => {
      if (!selectedFriend) return [];
      const { data } = await supabase.from('folders').select('*').eq('user_id', selectedFriend).eq('is_public', true);
      return data || [];
    },
    enabled: !!selectedFriend,
  });

  const folderIds = friendFolders.map((f: any) => f.id);
  const { data: friendTasks = [] } = useQuery({
    queryKey: ['friend-tasks', folderIds],
    queryFn: async () => {
      if (folderIds.length === 0) return [];
      const { data } = await supabase.from('tasks').select('*').in('folder_id', folderIds).order('sort_order', { ascending: true });
      return data || [];
    },
    enabled: folderIds.length > 0,
  });

  const updateFriendTask = useMutation({
    mutationFn: async (updates: { id: string; status?: string; completed_at?: string | null }) => {
      const { id, ...rest } = updates;
      const { error } = await supabase.from('tasks').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-tasks'] });
      toast.success('Tarea actualizada');
    },
    onError: () => toast.error('Error al actualizar tarea'),
  });

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const handleToggleTask = (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = task.status === 'done' ? 'pending' : 'done';
    updateFriendTask.mutate({
      id: task.id,
      status: newStatus,
      completed_at: newStatus === 'done' ? new Date().toISOString() : null,
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('user_id, name, email')
      .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      .neq('user_id', user?.id || '')
      .limit(10);
    setSearchResults(data || []);
    setSearching(false);
  };

  const handleSendRequest = (userId: string) => {
    sendRequest.mutate(userId, {
      onSuccess: () => { toast.success('Solicitud enviada'); setSearchResults([]); setSearchQuery(''); },
      onError: () => toast.error('Error al enviar solicitud'),
    });
  };

  const selectedFriendProfile = friendProfiles.find((p: any) => p.user_id === selectedFriend);

  if (selectedFriend && selectedFriendProfile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[430px] lg:max-w-[800px] mx-auto px-5 pt-6 space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedFriend(null)} className="text-on-surface-variant hover:text-foreground">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center">
              <span className="text-lg font-bold text-primary">{(selectedFriendProfile.name || 'U')[0].toUpperCase()}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{selectedFriendProfile.name || 'Usuario'}</h1>
              <p className="text-xs text-on-surface-variant">{selectedFriendProfile.email}</p>
            </div>
          </div>

          <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Carpetas públicas</h2>

          {friendFolders.length === 0 ? (
            <div className="bg-surface-container-low p-6 rounded-lg text-center">
              <p className="text-on-surface-variant text-sm">Este amigo no tiene carpetas públicas.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {friendFolders.map((folder: any) => {
                const fTasks = friendTasks.filter((t: any) => t.folder_id === folder.id);
                const doneTasks = fTasks.filter((t: any) => t.status === 'done').length;
                const isExpanded = expandedFolders.has(folder.id);
                return (
                  <div key={folder.id} className="bg-surface-container-low rounded-xl overflow-hidden">
                    <button onClick={() => toggleFolder(folder.id)}
                      className="w-full p-4 flex items-center gap-3 hover:bg-surface-container-high transition-colors">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: (folder.color || '#4BE277') + '20' }}>
                        <FolderOpen className="w-4 h-4" style={{ color: folder.color || '#4BE277' }} />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="text-sm font-bold text-foreground">{folder.name}</h3>
                        <p className="text-[10px] text-on-surface-variant">{doneTasks}/{fTasks.length} completadas</p>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden">
                          {fTasks.length === 0 ? (
                            <p className="px-4 pb-4 text-xs text-on-surface-variant">No hay tareas en esta carpeta.</p>
                          ) : (
                            <div className="px-4 pb-4 space-y-1">
                              {fTasks.map((task: any) => {
                                const isDone = task.status === 'done';
                                return (
                                  <div key={task.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-surface-container-high transition-colors">
                                    <button onClick={(e) => handleToggleTask(task, e)}
                                      className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-all ${isDone ? 'bg-primary' : 'border-2 border-outline-variant hover:border-primary'}`}>
                                      {isDone && <Check className="w-3 h-3 text-primary-foreground" />}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-medium ${isDone ? 'text-on-surface-variant line-through' : 'text-foreground'}`}>{task.title}</p>
                                      {task.description && (
                                        <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">{task.description}</p>
                                      )}
                                      <div className="flex items-center gap-3 mt-1">
                                        {task.due_date && (
                                          <span className="flex items-center gap-1 text-[10px] text-on-surface-variant">
                                            <Calendar className="w-3 h-3" /> {task.due_date}
                                          </span>
                                        )}
                                        {task.estimated_minutes && (
                                          <span className="flex items-center gap-1 text-[10px] text-on-surface-variant">
                                            <Clock className="w-3 h-3" /> {task.estimated_minutes}min
                                          </span>
                                        )}
                                        {task.urgency && <span className="text-[10px] px-1.5 py-0.5 rounded bg-error/10 text-error font-bold">Urgente</span>}
                                        {task.importance && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">Importante</span>}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[430px] lg:max-w-[800px] mx-auto px-5 pt-6 space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs uppercase tracking-widest text-on-surface-variant font-bold">Comunidad</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Amigos</h1>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input id="friend-search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="w-full bg-surface-container-low rounded-lg pl-9 pr-3 py-2.5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
          </div>
          <button id="friend-search-button" onClick={handleSearch} className="px-4 rounded-lg primary-gradient text-primary-foreground text-sm font-bold">
            Buscar
          </button>
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="space-y-1">
            {searchResults.map((p) => {
              const alreadyFriend = friendUserIds.includes(p.user_id);
              const alreadySent = pendingSent.some((f) => f.addressee_id === p.user_id);
              return (
                <div key={p.user_id} className="flex items-center gap-3 bg-surface-container-low rounded-lg p-3">
                  <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{(p.name || 'U')[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground truncate">{p.name || 'Usuario'}</h4>
                    <p className="text-[10px] text-on-surface-variant">{p.email}</p>
                  </div>
                  {alreadyFriend ? (
                    <span className="text-xs text-primary font-semibold">Amigos</span>
                  ) : alreadySent ? (
                    <span className="text-xs text-on-surface-variant">Enviada</span>
                  ) : (
                    <button onClick={() => handleSendRequest(p.user_id)}
                      className="p-2 rounded-lg bg-primary/10 text-primary"><UserPlus className="w-4 h-4" /></button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tabs */}
        <div id="friends-tabs" className="flex bg-surface-container-low rounded-lg p-0.5">
          <button onClick={() => setTab('friends')}
            className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${tab === 'friends' ? 'bg-primary text-primary-foreground' : 'text-on-surface-variant'}`}>
            Amigos ({friends.length})
          </button>
          <button 
            onClick={() => setTab('requests')}
            className={`flex-1 py-3 rounded-[24px] text-xs font-black uppercase tracking-widest transition-all relative ${
              tab === 'requests' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-on-surface-variant/60 hover:text-foreground'
            }`}
          >
            Solicitudes
            {pendingReceived.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-error text-[10px] text-error-foreground flex items-center justify-center font-bold">
                {pendingReceived.length}
              </span>
            )}
          </button>
        </div>

        {tab === 'friends' && (
          friends.length === 0 ? (
            <div className="bg-surface-container-low p-8 rounded-lg text-center space-y-3">
              <Users className="w-12 h-12 text-on-surface-variant/30 mx-auto" />
              <p className="text-on-surface-variant">Busca amigos por nombre o email para ver sus carpetas públicas.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {friends.map((friendship) => {
                const friendId = friendship.requester_id === user?.id ? friendship.addressee_id : friendship.requester_id;
                const profile = friendProfiles.find((p: any) => p.user_id === friendId);
                return (
                  <motion.div key={friendship.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    onClick={() => setSelectedFriend(friendId)}
                    className="flex items-center gap-3 bg-surface-container-low rounded-lg p-3.5 cursor-pointer hover:bg-surface-container-high transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">{(profile?.name || 'U')[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-foreground truncate">{profile?.name || 'Usuario'}</h4>
                      <p className="text-[10px] text-on-surface-variant">{profile?.email}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-on-surface-variant" />
                  </motion.div>
                );
              })}
            </div>
          )
        )}

        {tab === 'requests' && (
          pendingReceived.length === 0 ? (
            <div className="bg-surface-container-low p-6 rounded-lg text-center">
              <p className="text-on-surface-variant text-sm">No tienes solicitudes pendientes.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {pendingReceived.map((req) => {
                const profile = pendingProfiles.find((p: any) => p.user_id === req.requester_id);
                return (
                  <div key={req.id} className="flex items-center gap-3 bg-surface-container-low rounded-lg p-3.5">
                    <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">{(profile?.name || 'U')[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-foreground truncate">{profile?.name || 'Usuario'}</h4>
                      <p className="text-[10px] text-on-surface-variant">{profile?.email}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => respondRequest.mutate({ id: req.id, status: 'accepted' })}
                        className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Check className="w-4 h-4" /></button>
                      <button onClick={() => respondRequest.mutate({ id: req.id, status: 'rejected' })}
                        className="w-8 h-8 rounded-lg bg-error/10 text-error flex items-center justify-center"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
      </div>
  );
};

export default FriendsPage;
