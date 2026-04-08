import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useFriendships = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: friendships = [], isLoading } = useQuery({
    queryKey: ['friendships', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const friends = friendships.filter((f) => f.status === 'accepted');
  const pendingReceived = friendships.filter((f) => f.status === 'pending' && f.addressee_id === user?.id);
  const pendingSent = friendships.filter((f) => f.status === 'pending' && f.requester_id === user?.id);

  const sendRequest = useMutation({
    mutationFn: async (addresseeId: string) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase.from('friendships').insert({
        requester_id: user.id,
        addressee_id: addresseeId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friendships'] }),
  });

  const respondRequest = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'accepted' | 'rejected' }) => {
      const { error } = await supabase.from('friendships').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friendships'] }),
  });

  const removeFriend = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('friendships').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friendships'] }),
  });

  const searchUsers = async (query: string) => {
    if (!query.trim()) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, name, email')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .neq('user_id', user?.id || '')
      .limit(10);
    if (error) return [];
    return data;
  };

  return { friendships, friends, pendingReceived, pendingSent, isLoading, sendRequest, respondRequest, removeFriend, searchUsers };
};
