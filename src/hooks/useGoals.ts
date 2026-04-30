import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type GoalUpdate = Database['public']['Tables']['goals']['Update'];

export const useGoals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createGoal = useMutation({
    mutationFn: async (goal: { title: string; description?: string; horizon?: string }) => {
      if (!user) throw new Error('No user');
      const { data, error } = await supabase
        .from('goals')
        .insert({ ...goal, user_id: user.id })
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Error al crear la meta: no se devolvieron datos');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & GoalUpdate) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase.from('goals').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  return { goals, isLoading, createGoal, updateGoal };
};
