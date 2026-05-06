import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export const useProfile = (userId?: string) => {
  const { user: currentUser } = useAuth();
  const targetUserId = userId || currentUser?.id;
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!targetUserId,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: ProfileUpdate) => {
      if (!currentUser) throw new Error('No user');
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', currentUser.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', currentUser?.id] });
    },
  });

  return { profile, isLoading, error, updateProfile };
};
