import { useState } from 'react';
import { useFriendships } from '@/hooks/useFriendships';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Users, Search, UserPlus, Check, X, ChevronRight, Mail, Send, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } },
};

const FriendsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { friends, pendingReceived, pendingSent, sendRequest, respondRequest } = useFriendships();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [tab, setTab] = useState<'friends' | 'requests'>('friends');

  // Invite flow
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [showInviteBox, setShowInviteBox] = useState(false);

  const friendUserIds = friends.map((f) =>
    f.requester_id === user?.id ? f.addressee_id : f.requester_id
  );

  const { data: friendProfiles = [] } = useQuery({
    queryKey: ['friend-profiles', friendUserIds],
    queryFn: async () => {
      if (friendUserIds.length === 0) return [];
      const { data } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', friendUserIds);
      return data || [];
    },
    enabled: friendUserIds.length > 0,
  });

  const pendingUserIds = pendingReceived.map((f) => f.requester_id);
  const { data: pendingProfiles = [] } = useQuery({
    queryKey: ['pending-profiles', pendingUserIds],
    queryFn: async () => {
      if (pendingUserIds.length === 0) return [];
      const { data } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', pendingUserIds);
      return data || [];
    },
    enabled: pendingUserIds.length > 0,
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setShowInviteBox(false);
    const { data } = await supabase
      .from('profiles')
      .select('user_id, name, email')
      .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      .neq('user_id', user?.id || '')
      .limit(8);
    setSearchResults(data || []);
    setSearching(false);

    // If no results found, suggest invite
    if (!data || data.length === 0) {
      setInviteEmail(searchQuery.includes('@') ? searchQuery : '');
      setShowInviteBox(true);
    }
  };

  const handleSendRequest = (userId: string) => {
    sendRequest.mutate(userId, {
      onSuccess: () => {
        toast.success('Solicitud de conexión enviada');
        setSearchResults([]);
        setSearchQuery('');
      },
      onError: () => toast.error('Error al enviar solicitud'),
    });
  };

  const handleSendInviteEmail = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      toast.error('Ingresa un email válido');
      return;
    }
    setInviteSending(true);
    try {
      const emailLower = inviteEmail.trim().toLowerCase();

      // 1. Check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', emailLower)
        .maybeSingle();

      if (existingUser) {
        // User exists! Send direct friend request instead of invite
        sendRequest.mutate(existingUser.user_id, {
          onSuccess: () => {
            toast.success(`${emailLower} ya está en Adonai. ¡Solicitud enviada!`);
            setInviteEmail('');
            setShowInviteBox(false);
          },
          onError: () => toast.error('Ya tienes una solicitud pendiente con este usuario'),
        });
        return;
      }

      // 2. User doesn't exist, send invite email
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user?.id || '')
        .maybeSingle();

      const senderName = myProfile?.name || 'Tu amigo';
      const inviteUrl = `${window.location.origin}/onboarding`;

      const { error } = await supabase.functions.invoke('send-invite-email', {
        body: {
          to: emailLower,
          senderName,
          inviteUrl,
        },
      });

      if (error) throw error;
      toast.success(`Invitación enviada a ${inviteEmail}`);
      setInviteEmail('');
      setShowInviteBox(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error('Error in invite flow:', err);
      // Fallback: copy invite link
      const inviteUrl = `${window.location.origin}/onboarding?ref=${user?.id}`;
      await navigator.clipboard.writeText(inviteUrl).catch(() => {});
      toast.success('Enlace de invitación copiado al portapapeles');
    } finally {
      setInviteSending(false);
    }
  };

  const handleCopyInviteLink = async () => {
    const inviteUrl = `${window.location.origin}/onboarding?ref=${user?.id}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Enlace copiado. Compártelo con tu amigo de enfoque.');
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-[430px] lg:max-w-6xl mx-auto px-6 pt-12 space-y-10">

        {/* Header */}
        <header className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-1 bg-primary rounded-full" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/60">
                  Tu Comunidad
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                Amigos de <span className="text-primary">Enfoque</span>
              </h1>
              <p className="text-sm text-on-surface-variant/60 max-w-sm">
                Comparte tu progreso, mira el de tus amigos y crezcan juntos.
              </p>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md w-full relative">
              <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" />
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

        {/* Search Results & Action Center */}
        <AnimatePresence>
          {(searchResults.length > 0 || showInviteBox) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-surface-container/80 backdrop-blur-xl border border-outline-variant/30 rounded-[32px] p-2 space-y-1 shadow-2xl overflow-hidden"
            >
              {searchResults.length > 0 && (
                <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-3 h-3 text-primary" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">Usuarios encontrados en Adonai</p>
                  </div>
                  <button onClick={() => { setSearchResults([]); setSearchQuery(''); }} className="text-on-surface-variant/40 hover:text-foreground transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {searchResults.map((p) => {
                const alreadyFriend = friendUserIds.includes(p.user_id);
                const alreadySent = pendingSent.some((f) => f.addressee_id === p.user_id);
                return (
                  <div key={p.user_id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-surface-container transition-colors">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-lg font-black text-primary flex-shrink-0">
                      {(p.name || 'U')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black tracking-tight">{p.name || 'Usuario'}</h4>
                      <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest truncate">{p.email}</p>
                    </div>
                    {alreadyFriend ? (
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary px-4 py-2 bg-primary/10 rounded-full flex-shrink-0">Amigos</span>
                    ) : alreadySent ? (
                      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 px-4 py-2 bg-surface-container rounded-full flex-shrink-0">Enviada</span>
                    ) : (
                      <button
                        onClick={() => handleSendRequest(p.user_id)}
                        className="px-6 py-3 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all flex-shrink-0"
                      >
                        Conectar
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Explicit Invite Section when searching or explicitly triggered */}
              {(showInviteBox || (searchResults.length === 0 && searchQuery.includes('@'))) && (
                <div className="p-6 bg-primary/5 rounded-[24px] m-2 border border-primary/10 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black">Invitar a un amigo nuevo</h3>
                        <p className="text-[11px] text-on-surface-variant/60 mt-0.5 leading-relaxed">
                          Este correo no está registrado. Envíale una invitación para unirse a tu comunidad.
                        </p>
                      </div>
                    </div>
                    {showInviteBox && (
                      <button onClick={() => setShowInviteBox(false)} className="text-on-surface-variant/40 hover:text-foreground transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <input
                        autoFocus
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendInviteEmail()}
                        placeholder="email@ejemplo.com"
                        className="w-full bg-surface-container-lowest border border-outline-variant/30 focus:border-primary/50 rounded-2xl pl-5 pr-4 py-3 outline-none transition-all text-sm font-bold"
                      />
                    </div>
                    <button
                      onClick={handleSendInviteEmail}
                      disabled={inviteSending || !inviteEmail.includes('@')}
                      className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-30 flex-shrink-0 flex items-center gap-2"
                    >
                      {inviteSending ? (
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Enviar Invitación
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
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

            {/* Quick invite button */}
            <button
              onClick={() => { setShowInviteBox(true); setSearchResults([]); }}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-primary/10 text-primary font-black text-[10px] uppercase tracking-widest hover:bg-primary/20 transition-all border border-primary/20"
            >
              <UserPlus className="w-4 h-4" /> Invitar
            </button>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {/* Friends List */}
            {tab === 'friends' && (
              friends.length === 0 ? (
                <motion.div variants={itemVariants} className="col-span-full py-20 bg-surface/30 border border-dashed border-outline-variant/30 rounded-[40px] text-center flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-[32px] bg-surface-container flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-primary/30" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black mb-2">Tu Comunidad de Enfoque</h3>
                    <p className="text-sm text-on-surface-variant/60 max-w-[280px] leading-relaxed mx-auto">
                      Conecta con amigos para compartir rachas, reportes y motivarse mutuamente.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowInviteBox(true)}
                    className="mt-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-black text-sm shadow-lg shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" /> Invitar a tu primer amigo
                  </button>
                </motion.div>
              ) : (
                friends.map((friendship) => {
                  const friendId = friendship.requester_id === user?.id ? friendship.addressee_id : friendship.requester_id;
                  const profile = friendProfiles.find((p: any) => p.user_id === friendId);
                  return (
                    <motion.div
                      key={friendship.id}
                      variants={itemVariants}
                      onClick={() => navigate(`/profile/${friendId}`)}
                      className="group p-8 rounded-[32px] bg-surface-container/50 border border-outline-variant/30 hover:border-primary/30 transition-all duration-500 cursor-pointer relative overflow-hidden"
                    >
                      <div className="relative z-10 space-y-6">
                        <div className="w-16 h-16 rounded-[24px] bg-primary/10 flex items-center justify-center text-2xl font-black text-primary group-hover:scale-110 transition-transform duration-500">
                          {(profile?.name || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-lg font-black tracking-tight group-hover:text-primary transition-colors">{profile?.name || 'Usuario'}</h4>
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 mt-1 truncate max-w-[180px]">{profile?.email}</p>
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

            {/* Requests List */}
            {tab === 'requests' && (
              pendingReceived.length === 0 ? (
                <motion.div variants={itemVariants} className="col-span-full py-20 bg-surface/30 border border-dashed border-outline-variant/30 rounded-[40px] text-center flex flex-col items-center">
                  <p className="text-sm text-on-surface-variant/40 font-black uppercase tracking-[0.2em]">Sin solicitudes pendientes</p>
                </motion.div>
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
                          <h4 className="text-lg font-black tracking-tight">{profile?.name || 'Usuario'}</h4>
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 mt-1">{profile?.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => respondRequest.mutate({ id: req.id, status: 'accepted' })}
                          className="flex-1 py-4 rounded-[20px] bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" /> Aceptar
                        </button>
                        <button
                          onClick={() => respondRequest.mutate({ id: req.id, status: 'rejected' })}
                          className="px-6 py-4 rounded-[20px] bg-surface-container-high text-on-surface-variant font-black text-[10px] uppercase tracking-widest hover:text-error transition-all"
                        >
                          <X className="w-4 h-4" />
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
