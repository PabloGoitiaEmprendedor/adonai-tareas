import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Clock, Send, ShieldCheck, Sparkles, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFriendChats } from '@/hooks/useFriendChats';

const monthlyLimit = 3;
const priorityOptions = [
  { key: 'important-urgent', label: 'Importante/Urgente', value: 'high', urgency: true, importance: true, estimatedMinutes: 45 },
  { key: 'urgent-not-important', label: 'Urgente/No importante', value: 'medium', urgency: true, importance: false, estimatedMinutes: 30 },
  { key: 'important-not-urgent', label: 'Importante/No urgente', value: 'medium', urgency: false, importance: true, estimatedMinutes: 30 },
  { key: 'not-urgent-not-important', label: 'No urgente/No importante', value: 'low', urgency: false, importance: false, estimatedMinutes: 20 },
] as const;

const FriendInvitePage = () => {
  const { inviterId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { ensureDirectConversation } = useFriendChats(null);
  const [senderName, setSenderName] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskLink, setTaskLink] = useState('');
  const [message, setMessage] = useState('');
  const [priorityKey, setPriorityKey] = useState<(typeof priorityOptions)[number]['key']>('urgent-not-important');
  const [sending, setSending] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  const storageKey = useMemo(() => `adonai_invite_tasks_${inviterId}_${new Date().toISOString().slice(0, 7)}`, [inviterId]);

  useEffect(() => {
    setSentCount(Number(localStorage.getItem(storageKey) || '0'));
  }, [storageKey]);

  const { data: inviter, isLoading } = useQuery({
    queryKey: ['public-invite-profile', inviterId],
    queryFn: async () => {
      if (!inviterId) return null;
      const { data, error } = await (supabase as any).rpc('get_invite_profile', { inviter: inviterId });
      if (error) throw error;
      return Array.isArray(data) ? data[0] || null : data || null;
    },
    enabled: !!inviterId,
  });

  const hasAccount = !!user && !user.is_anonymous;
  const inviterName = inviter?.name || (isLoading ? 'Cargando...' : 'la persona que te invito');
  const limitReached = !hasAccount && sentCount >= monthlyLimit;
  const selectedPriority = priorityOptions.find((option) => option.key === priorityKey) || priorityOptions[1];

  const submitInviteTask = async () => {
    const { error } = await supabase.rpc('friend_chat_action', {
      action: 'invite_submit',
      payload: {
        inviter_id: inviterId,
        sender_name: senderName.trim() || null,
        sender_email: null,
        message: message.trim() || null,
        title: taskTitle.trim(),
        task_payload: {
          title: taskTitle.trim(),
          link: taskLink.trim() || null,
          priority: selectedPriority.value,
          urgency: selectedPriority.urgency,
          importance: selectedPriority.importance,
          estimated_minutes: selectedPriority.estimatedMinutes,
        },
      },
    } as any);
    if (error) throw error;
  };

  const handleSendTask = async () => {
    if (!inviterId || !taskTitle.trim()) {
      toast.error('Escribe una tarea concreta');
      return;
    }
    if (limitReached) {
      toast.error('Ya enviaste el limite de tareas por hoy desde este link');
      return;
    }

    setSending(true);
    try {
      await submitInviteTask();
      if (!hasAccount) {
        const nextCount = sentCount + 1;
        localStorage.setItem(storageKey, String(nextCount));
        setSentCount(nextCount);
      }
      setTaskTitle('');
      setTaskLink('');
      setMessage('');
      toast.success('Tarea enviada para revision');
    } catch {
      toast.error('No se pudo enviar la tarea');
    } finally {
      setSending(false);
    }
  };

  const handleConnect = async () => {
    if (!inviterId || isLoading) return;
    if (!user) {
      localStorage.setItem('adonai_pending_friend_invite', inviterId);
      localStorage.setItem('adonai_pending_friend_invite_name', inviterName);
      if (senderName.trim()) localStorage.setItem('adonai_onboarding_prefill_name', senderName.trim());
      navigate('/onboarding');
      return;
    }
    if (user.id === inviterId) {
      navigate('/friends');
      return;
    }

    setConnecting(true);
    try {
      const { data: existing } = await supabase
        .from('friendships')
        .select('id,status')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${inviterId}),and(requester_id.eq.${inviterId},addressee_id.eq.${user.id})`)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase.from('friendships').insert({
          requester_id: user.id,
          addressee_id: inviterId,
          status: 'pending',
        });
        if (error) throw error;
      }

      if (existing?.status === 'accepted') {
        await ensureDirectConversation.mutateAsync(inviterId);
        toast.success(`${inviterName} ya esta en tus amigos`);
      } else {
        toast.success(`Solicitud enviada a ${inviterName}`);
      }
      navigate('/friends');
    } catch {
      toast.error('No se pudo agregar el amigo');
    } finally {
      setConnecting(false);
    }
  };

  useEffect(() => {
    const pendingInvite = localStorage.getItem('adonai_pending_friend_invite');
    if (!user || !inviterId || pendingInvite !== inviterId || connecting) return;
    localStorage.removeItem('adonai_pending_friend_invite');
    localStorage.removeItem('adonai_pending_friend_invite_name');
    handleConnect();
  }, [user?.id, inviterId]);

  const handleLimitLogin = () => {
    if (!inviterId) return;
    navigate(`/auth?redirect=/invite/${inviterId}`);
  };

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-[#172033]">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-4 py-6 md:grid-cols-[1fr_420px] md:px-8">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#dfe3ea] bg-white px-3 py-2 text-xs font-black text-[#5b6b86] shadow-sm">
            <Sparkles className="h-4 w-4 text-[#6f8cff]" />
            Invitacion privada de Adonai
          </div>

          <div className="max-w-2xl space-y-5">
            <h1 className="text-[40px] font-black leading-[0.98] tracking-tight text-[#121826] md:text-6xl">
              {isLoading ? 'Alguien' : inviterName} quiere organizar tareas contigo.
            </h1>
              <p className="max-w-xl text-base font-semibold leading-7 text-[#647089] md:text-lg">
              Puedes enviarle una tarea ahora mismo. Sin cuenta puedes enviar 3 tareas al mes. Si usas Adonai, quedaran conectados para chatear,
              compartir carpetas y aprobar tareas sin copiar mensajes entre apps.
            </p>
          </div>

          <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
            {[
              ['Enviar tarea', 'Sin cuenta, hasta 3 por mes'],
              ['Conectar', 'Se agrega como amigo directo'],
              ['Colaborar', 'Chats, carpetas y prioridades'],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-2xl border border-[#dfe3ea] bg-white p-4 shadow-sm">
                <CheckCircle2 className="mb-3 h-5 w-5 text-[#27ae60]" />
                <p className="text-sm font-black">{title}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-[#6f7a90]">{copy}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-[#dfe3ea] bg-white p-4 shadow-[0_24px_80px_rgba(23,32,51,0.12)]">
          <div className="rounded-3xl bg-[#f7f8fb] p-4">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6f8cff] text-base font-black text-white">
                {inviterName[0]?.toUpperCase() || 'A'}
              </div>
              <div>
                <p className="text-sm font-black">{inviterName}</p>
                <p className="text-xs font-bold text-[#7a8498]">Recibira tu tarea en Adonai</p>
              </div>
            </div>

            <div className="space-y-3">
              <input value={senderName} onChange={(event) => setSenderName(event.target.value)} placeholder="Tu nombre" className="h-12 w-full rounded-2xl border border-[#e1e5ec] bg-white px-4 text-sm font-bold outline-none focus:border-[#6f8cff]" />
              <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Tarea que quieres enviar" className="h-12 w-full rounded-2xl border border-[#e1e5ec] bg-white px-4 text-sm font-bold outline-none focus:border-[#6f8cff]" />
              <input value={taskLink} onChange={(event) => setTaskLink(event.target.value)} placeholder="Link opcional" className="h-12 w-full rounded-2xl border border-[#e1e5ec] bg-white px-4 text-sm font-bold outline-none focus:border-[#6f8cff]" />
              <select value={priorityKey} onChange={(event) => setPriorityKey(event.target.value as typeof priorityKey)} className="h-12 w-full rounded-2xl border border-[#e1e5ec] bg-white px-4 text-sm font-bold outline-none focus:border-[#6f8cff]">
                {priorityOptions.map((option) => (
                  <option key={option.key} value={option.key}>{option.label}</option>
                ))}
              </select>
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Contexto breve opcional" rows={3} className="w-full resize-none rounded-2xl border border-[#e1e5ec] bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#6f8cff]" />
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-xs font-bold text-[#7a8498]">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Revision manual</span>
              <span>{hasAccount ? 'Ya tienes cuenta' : `${sentCount}/${monthlyLimit} este mes`}</span>
            </div>

            {limitReached && (
              <div className="mt-4 rounded-2xl border border-[#dfe3ea] bg-white p-4">
                <p className="text-sm font-black text-[#121826]">Quieres enviar mas tareas?</p>
                <p className="mt-1 text-xs font-bold leading-5 text-[#6f7a90]">
                  Inicia sesion con tu correo para enviar tareas sin este limite mensual y seguir conectado con {inviterName}.
                </p>
                <button
                  type="button"
                  onClick={handleLimitLogin}
                  className="mt-3 h-11 w-full rounded-2xl bg-[#6f8cff] text-sm font-black text-white transition active:scale-[0.98]"
                >
                  Iniciar sesion con correo
                </button>
              </div>
            )}

            <button onClick={handleSendTask} disabled={sending || limitReached} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#121826] text-sm font-black text-white transition active:scale-[0.98] disabled:opacity-45">
              <Send className="h-4 w-4" />
              {limitReached ? 'Limite alcanzado' : sending ? 'Enviando...' : 'Enviar tarea'}
            </button>

            <button onClick={handleConnect} disabled={connecting || isLoading} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#6f8cff] text-sm font-black text-white transition active:scale-[0.98] disabled:opacity-55">
              <UserPlus className="h-4 w-4 flex-shrink-0" />
              <span className="min-w-0 truncate">{`Iniciar sesión y agregar a ${inviterName}`}</span>
              <ArrowRight className="h-4 w-4 flex-shrink-0" />
            </button>

            <p className="mt-4 flex items-center justify-center gap-2 text-center text-[11px] font-bold leading-5 text-[#7a8498]">
              <Clock className="h-3.5 w-3.5" />
              Las tareas enviadas por link esperan aprobacion antes de entrar al cuaderno.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default FriendInvitePage;
