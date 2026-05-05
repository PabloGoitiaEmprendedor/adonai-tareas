import { useState } from 'react';
import { useFriendships } from '@/hooks/useFriendships';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Users, Search, UserPlus, Check, X, FolderOpen, ChevronRight, ChevronDown, Clock, Calendar, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const horizonLabels: Record<string, string> = {
  daily: 'Día',
  weekly: 'Semana',
  monthly: 'Mes',
  quarterly: 'Trimestre',
  annual: 'Año',
};

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  if (selectedFriend && selectedFriendProfile) {
    return (
      <div className="min-h-screen bg-background pb-32">
        <div className="max-w-[430px] lg:max-w-4xl mx-auto px-6 pt-12 space-y-12">
          {/* Back Header */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedFriend(null)}
              className="p-3 rounded-2xl bg-surface-container hover:bg-surface-container-high transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-xl font-black text-primary">
                {(selectedFriendProfile.name || 'U')[0].toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-black font-headline tracking-tight leading-none">{selectedFriendProfile.name || 'Usuario'}</h1>
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 mt-1">{selectedFriendProfile.email}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-on-surface-variant/40">Proyectos Públicos</h2>
              <div className="h-px flex-1 bg-outline-variant/30" />
            </div>

            {friendFolders.length === 0 ? (
              <div className="bg-surface/30 border border-dashed border-outline-variant/30 p-12 rounded-[32px] text-center">
                <FolderOpen className="w-8 h-8 opacity-20 mx-auto mb-4" />
                <p className="text-sm text-on-surface-variant/60 font-medium">Este amigo no tiene proyectos públicos aún.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {friendFolders.map((folder: any) => {
                  const fTasks = friendTasks.filter((t: any) => t.folder_id === folder.id);
                  const doneTasks = fTasks.filter((t: any) => t.status === 'done').length;
                  const isExpanded = expandedFolders.has(folder.id);
                  return (
                    <div key={folder.id} className="bg-surface-container/50 border border-outline-variant/30 rounded-[32px] overflow-hidden">
                      <button 
                        onClick={() => toggleFolder(folder.id)}
                        className="w-full p-6 flex items-center gap-4 hover:bg-surface-container transition-colors"
                      >
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: (folder.color || '#4BE277') + '15' }}>
                          <FolderOpen className="w-5 h-5" style={{ color: folder.color || '#4BE277' }} />
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="text-lg font-black font-headline tracking-tight">{folder.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">{doneTasks} / {fTasks.length} Completadas</span>
                          </div>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-on-surface-variant/30 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }} 
                            animate={{ height: 'auto', opacity: 1 }} 
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-outline-variant/20 bg-surface/20"
                          >
                            <div className="p-4 space-y-1">
                              {fTasks.length === 0 ? (
                                <p className="p-4 text-xs text-on-surface-variant/40 font-medium italic text-center">No hay tareas visibles.</p>
                              ) : (
                                fTasks.map((task: any) => {
                                  const isDone = task.status === 'done';
                                  return (
                                    <div key={task.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-surface-container/50 transition-colors group">
                                      <button 
                                        onClick={(e) => handleToggleTask(task, e)}
                                        className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center transition-all ${isDone ? 'bg-primary shadow-lg shadow-primary/20' : 'border-2 border-outline-variant group-hover:border-primary'}`}
                                      >
                                        {isDone && <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={4} />}
                                      </button>
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-bold tracking-tight ${isDone ? 'text-on-surface-variant/40 line-through' : 'text-foreground'}`}>{task.title}</p>
                                        <div className="flex items-center gap-3 mt-1 opacity-60">
                                          {task.due_date && <span className="text-[10px] font-black uppercase flex items-center gap-1"><Calendar className="w-3 h-3" /> {task.due_date}</span>}
                                          {task.estimated_minutes && <span className="text-[10px] font-black uppercase flex items-center gap-1"><Clock className="w-3 h-3" /> {task.estimated_minutes}M</span>}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-[430px] lg:max-w-6xl mx-auto px-6 pt-12 space-y-12">
        
        {/* Header Section */}
        <header className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-1 bg-primary rounded-full" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/60">
                  Tu Comunidad
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight font-headline leading-tight">
                Tus <span className="opacity-20">Amigos.</span>
              </h1>
            </div>

            <div className="flex-1 max-w-md w-full relative">
              <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
              <input 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o email..."
                className="w-full bg-surface-container rounded-full pl-14 pr-6 py-4 text-foreground font-medium text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-outline-variant/30"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()} 
              />
              {searching && (
                <div className="absolute right-5 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Search Results */}
        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-surface-container/50 border border-outline-variant/30 rounded-[32px] p-2 space-y-1 shadow-2xl"
            >
              <div className="p-4 border-b border-outline-variant/10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">Resultados de búsqueda</p>
              </div>
              {searchResults.map((p) => {
                const alreadyFriend = friendUserIds.includes(p.user_id);
                const alreadySent = pendingSent.some((f) => f.addressee_id === p.user_id);
                return (
                  <div key={p.user_id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-surface-container transition-colors">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-lg font-black text-primary">
                      {(p.name || 'U')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black tracking-tight">{p.name || 'Usuario'}</h4>
                      <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">{p.email}</p>
                    </div>
                    {alreadyFriend ? (
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary px-4 py-2 bg-primary/10 rounded-full">Amigos</span>
                    ) : alreadySent ? (
                      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 px-4 py-2 bg-surface-container rounded-full">Enviada</span>
                    ) : (
                      <button 
                        onClick={() => handleSendRequest(p.user_id)}
                        className="px-6 py-3 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                      >
                        Agregar
                      </button>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Tabs */}
        <div className="space-y-8">
          <div className="flex bg-surface-container rounded-[24px] p-1.5 w-fit border border-outline-variant/30">
            <button 
              onClick={() => setTab('friends')}
              className={`px-8 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'friends' ? 'bg-background text-foreground shadow-sm' : 'text-on-surface-variant/40 hover:text-foreground'}`}
            >
              Amigos ({friends.length})
            </button>
            <button 
              onClick={() => setTab('requests')}
              className={`px-8 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all relative ${tab === 'requests' ? 'bg-background text-foreground shadow-sm' : 'text-on-surface-variant/40 hover:text-foreground'}`}
            >
              Solicitudes
              {pendingReceived.length > 0 && (
                <span className="ml-2 bg-error text-error-foreground px-1.5 py-0.5 rounded-md text-[9px]">
                  {pendingReceived.length}
                </span>
              )}
            </button>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {tab === 'friends' && (
              friends.length === 0 ? (
                <div className="col-span-full py-20 bg-surface/30 border border-dashed border-outline-variant/30 rounded-[40px] text-center flex flex-col items-center">
                  <div className="w-20 h-20 rounded-[32px] bg-surface-container flex items-center justify-center mb-6">
                    <Users className="w-10 h-10 opacity-20" />
                  </div>
                  <h3 className="text-xl font-black font-headline mb-3">Tu Comunidad</h3>
                  <p className="text-sm text-on-surface-variant/60 max-w-[280px] leading-relaxed">
                    Conecta con otros usuarios para compartir proyectos y motivarse mutuamente.
                  </p>
                </div>
              ) : (
                friends.map((friendship) => {
                  const friendId = friendship.requester_id === user?.id ? friendship.addressee_id : friendship.requester_id;
                  const profile = friendProfiles.find((p: any) => p.user_id === friendId);
                  return (
                    <motion.div 
                      key={friendship.id} 
                      variants={itemVariants}
                      onClick={() => setSelectedFriend(friendId)}
                      className="group p-8 rounded-[32px] bg-surface-container/50 border border-outline-variant/30 hover:border-primary/30 transition-all duration-500 cursor-pointer relative overflow-hidden"
                    >
                      <div className="relative z-10 space-y-6">
                        <div className="w-16 h-16 rounded-[24px] bg-primary/10 flex items-center justify-center text-2xl font-black text-primary group-hover:scale-110 transition-transform duration-500">
                          {(profile?.name || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-lg font-black font-headline tracking-tight group-hover:text-primary transition-colors">{profile?.name || 'Usuario'}</h4>
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 mt-1">{profile?.email}</p>
                        </div>
                        <div className="pt-4 border-t border-outline-variant/10 flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/30 group-hover:text-primary transition-colors">Ver Perfil</span>
                          <ChevronRight className="w-5 h-5 text-on-surface-variant/20 group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                      <div className="absolute -right-4 -top-4 w-32 h-32 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  );
                })
              )
            )}

            {tab === 'requests' && (
              pendingReceived.length === 0 ? (
                <div className="col-span-full py-20 bg-surface/30 border border-dashed border-outline-variant/30 rounded-[40px] text-center flex flex-col items-center">
                  <p className="text-sm text-on-surface-variant/40 font-black uppercase tracking-[0.2em]">Sin solicitudes pendientes</p>
                </div>
              ) : (
                pendingReceived.map((req) => {
                  const profile = pendingProfiles.find((p: any) => p.user_id === req.requester_id);
                  return (
                    <motion.div 
                      key={req.id} 
                      variants={itemVariants}
                      className="p-8 rounded-[32px] bg-surface-container border border-outline-variant/30 space-y-8"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-[24px] bg-primary/10 flex items-center justify-center text-2xl font-black text-primary">
                          {(profile?.name || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-lg font-black font-headline tracking-tight">{profile?.name || 'Usuario'}</h4>
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 mt-1">{profile?.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => respondRequest.mutate({ id: req.id, status: 'accepted' })}
                          className="flex-1 py-4 rounded-[20px] bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                        >
                          Aceptar
                        </button>
                        <button 
                          onClick={() => respondRequest.mutate({ id: req.id, status: 'rejected' })}
                          className="px-6 py-4 rounded-[20px] bg-surface-container-high text-on-surface-variant font-black text-[10px] uppercase tracking-widest hover:text-error transition-all"
                        >
                          Rechazar
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default FriendsPage;
