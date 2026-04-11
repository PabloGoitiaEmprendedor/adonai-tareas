import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useTimeBlocks = (date: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: timeBlocks = [], isLoading } = useQuery({
    queryKey: ['time_blocks', date],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('time_blocks')
        .select('*')
        .eq('user_id', user.id)
        .eq('block_date', date)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching time blocks:', error);
        throw error;
      }
      return data;
    },
    enabled: !!user && !!date,
  });

  const createBlock = useMutation({
    mutationFn: async (block: { title: string; start_time: string; end_time: string; block_date: string; color?: string }) => {
      if (!user) throw new Error('No user');
      const { data, error } = await supabase
        .from('time_blocks')
        .insert({ ...block, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time_blocks'] });
    },
    onError: (err) => {
      console.error(err);
      toast.error('Error al crear bloque');
    }
  });

  const updateBlock = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; start_time?: string; end_time?: string; block_date?: string; color?: string }) => {
      const { data, error } = await supabase
        .from('time_blocks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time_blocks'] });
    },
    onError: (err) => {
      console.error(err);
      toast.error('Error al actualizar bloque');
    }
  });

  const deleteBlock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('time_blocks')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time_blocks'] });
      // Invalidate tasks as well since they might lose their block_id
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  return { timeBlocks, isLoading, createBlock, updateBlock, deleteBlock };
};
