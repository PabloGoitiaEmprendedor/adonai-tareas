import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, MessageCircle, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const groupChatAction = async (action: string, payload: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.rpc('friend_chat_action', { action, payload } as any);
  if (error) throw error;
  return data as any;
};

const GroupInvitePage = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [joining, setJoining] = useState(false);

  const storageKey = useMemo(() => `adonai_pending_group_invite:${groupId}`, [groupId]);

  const { data, isLoading } = useQuery({
    queryKey: ['group-invite-info', groupId],
    queryFn: async () => {
      if (!groupId) return null;
      return groupChatAction('group_invite_info', { conversation_id: groupId });
    },
    enabled: !!groupId,
  });

  const group = data?.group;
  const ownerName = group?.owner?.name || 'Tu amigo';
  const groupTitle = group?.title || 'Grupo de Adonai';

  const joinGroup = async () => {
    if (!groupId) return;
    if (!user) {
      localStorage.setItem(storageKey, 'true');
      navigate(`/auth?redirect=/group-invite/${groupId}`);
      return;
    }

    setJoining(true);
    try {
      await groupChatAction('group_join', { conversation_id: groupId });
      localStorage.removeItem(storageKey);
      queryClient.invalidateQueries({ queryKey: ['friend-conversations'] });
      toast.success('Ya estas dentro del grupo');
      navigate('/friends');
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo entrar al grupo');
    } finally {
      setJoining(false);
    }
  };

  useEffect(() => {
    if (!user || !groupId || localStorage.getItem(storageKey) !== 'true' || joining) return;
    void joinGroup();
  }, [user?.id, groupId]);

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-[#172033]">
      <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-4 py-8">
        <div className="rounded-[28px] border border-[#dfe3ea] bg-white p-5 shadow-[0_24px_80px_rgba(23,32,51,0.12)] sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6f8cff] text-white">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#6f7a90]">Invitacion de grupo</p>
              <h1 className="text-2xl font-black tracking-tight text-[#121826]">{isLoading ? 'Cargando grupo...' : groupTitle}</h1>
            </div>
          </div>

          <div className="rounded-3xl bg-[#f7f8fb] p-5">
            <p className="text-base font-bold leading-7 text-[#273247]">
              {ownerName} te invito a unirte a este grupo en Adonai para conversar, compartir tareas y coordinar trabajo en un solo lugar.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-4">
                <MessageCircle className="mb-3 h-5 w-5 text-[#6f8cff]" />
                <p className="text-sm font-black">Chat directo</p>
                <p className="mt-1 text-xs font-semibold text-[#6f7a90]">Mensajes y contexto del grupo.</p>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <ShieldCheck className="mb-3 h-5 w-5 text-[#27ae60]" />
                <p className="text-sm font-black">Entrada segura</p>
                <p className="mt-1 text-xs font-semibold text-[#6f7a90]">El link te agrega al grupo al iniciar sesion.</p>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <Users className="mb-3 h-5 w-5 text-[#121826]" />
                <p className="text-sm font-black">{group?.member_count || 0} miembros</p>
                <p className="mt-1 text-xs font-semibold text-[#6f7a90]">Listo para colaborar.</p>
              </div>
            </div>

            <button
              onClick={joinGroup}
              disabled={joining || isLoading}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#121826] text-sm font-black text-white transition active:scale-[0.98] disabled:opacity-55"
            >
              {user ? 'Entrar al grupo' : 'Usar Adonai y entrar'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default GroupInvitePage;
