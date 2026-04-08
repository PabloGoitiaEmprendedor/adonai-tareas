import { useState } from 'react';
import { useFriendships } from '@/hooks/useFriendships';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Users, Search, UserPlus, Check, X, FolderOpen, ChevronRight, ChevronDown, Clock, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const FriendsPage = () => {
  const { user } = useAuth();
  const { friends, pendingReceived, pendingSent, sendRequest, respondRequest } = useFriendships();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [tab, setTab] = useState<'friends' | 'requests'>('friends');

  // Get profiles for friend IDs
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

  // Get profiles for pending requests
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

  // Get public folders for selected friend
  const { data: friendFolders = [] } = useQuery({
    queryKey: ['friend-folders', selectedFriend],
    queryFn: async () => {
      if (!selectedFriend) return [];
      const { data } = await supabase.from('folders').select('*').eq('user_id', selectedFriend).eq('is_public', true);
      return data || [];
    },
    enabled: !!selectedFriend,
  });

  // Get tasks for friend's public folders
  const folderIds = friendFolders.map((f: any) => f.id);
  const { data: friendTasks = [] } = useQuery({
    queryKey: ['friend-tasks', folderIds],
    queryFn: async () => {
      if (folderIds.length === 0) return [];
      const { data } = await supabase.from('tasks').select('*').in('folder_id', folderIds);
      return data || [];
    },
    enabled: folderIds.length > 0,
  });

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
      <div className="min-h-screen bg-background pb-24 lg:pl-20 lg:pb-6">
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
                return (
                  <div key={folder.id} className="bg-surface-container-low rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: (folder.color || '#4BE277') + '20' }}>
                        <FolderOpen className="w-4 h-4" style={{ color: folder.color || '#4BE277' }} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">{folder.name}</h3>
                        <p className="text-[10px] text-on-surface-variant">{fTasks.length} tareas</p>
                      </div>
                    </div>
                    {fTasks.length > 0 && (
                      <div className="space-y-1 pl-12">
                        {fTasks.map((task: any) => (
                          <div key={task.id} className="flex items-center gap-2 py-1">
                            <div className={`w-3 h-3 rounded-sm flex-shrink-0 ${task.status === 'done' ? 'bg-primary' : 'border border-outline-variant'}`} />
                            <span className={`text-xs ${task.status === 'done' ? 'text-on-surface-variant line-through' : 'text-foreground'}`}>{task.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 lg:pl-20 lg:pb-6">
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
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="w-full bg-surface-container-low rounded-lg pl-9 pr-3 py-2.5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
          </div>
          <button onClick={handleSearch} className="px-4 rounded-lg primary-gradient text-primary-foreground text-sm font-bold">
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
        <div className="flex bg-surface-container-low rounded-lg p-0.5">
          <button onClick={() => setTab('friends')}
            className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${tab === 'friends' ? 'bg-primary text-primary-foreground' : 'text-on-surface-variant'}`}>
            Amigos ({friends.length})
          </button>
          <button onClick={() => setTab('requests')}
            className={`flex-1 py-2 rounded-md text-sm font-bold transition-all relative ${tab === 'requests' ? 'bg-primary text-primary-foreground' : 'text-on-surface-variant'}`}>
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
      <BottomNav />
    </div>
  );
};

export default FriendsPage;
