import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUserContext = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: userContext, isLoading } = useQuery({
    queryKey: ['user_context', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_context')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateContext = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase
        .from('user_context')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_context'] });
    },
  });

  return { userContext, isLoading, updateContext };
};
