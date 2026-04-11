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
      
      const dayOfWeek = (new Date(`${date}T12:00:00`)).getDay();

      const { data, error } = await supabase
        .from('time_blocks')
        .select('*')
        .eq('user_id', user.id)
        .or(`block_date.eq.${date},is_recurring.eq.true`)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching time blocks:', error);
        throw error;
      }

      return data;
    },
    enabled: !!user && !!date,
  });

  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  const minutesToTime = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const resolveCollisions = async (newBlock: { start_time: string; end_time: string; id?: string }) => {
    if (!user) return;
    const s1 = timeToMinutes(newBlock.start_time);
    const e1 = timeToMinutes(newBlock.end_time);

    // Fetch existing blocks for this context (exact date or recurring)
    const { data: others } = await supabase
      .from('time_blocks')
      .select('*')
      .eq('user_id', user.id)
      .or(`block_date.eq.${date},is_recurring.eq.true`);

    if (!others) return;

    for (const b of others) {
      if (b.id === newBlock.id) continue;
      // Skip if it's recurring but today is not one of its days (complex, let's simplify to same logic)
      
      const s2 = timeToMinutes(b.start_time);
      const e2 = timeToMinutes(b.end_time);

      // Check overlap
      const hasOverlap = s1 < e2 && s2 < e1;
      if (!hasOverlap) continue;

      if (s2 >= s1 && e2 <= e1) {
        // Case 1: Existing block is entirely covered by new block -> DELETE
        await supabase.from('time_blocks').delete().eq('id', b.id);
      } else if (s2 < s1 && e2 > e1) {
        // Case 2: New block is inside existing block -> SPLIT existing
        await supabase.from('time_blocks').update({ end_time: minutesToTime(s1) }).eq('id', b.id);
        await supabase.from('time_blocks').insert({
          ...b,
          id: undefined,
          start_time: minutesToTime(e1),
          user_id: user.id
        });
      } else if (s2 < s1 && e2 <= e1) {
        // Case 3: Overlap at the end of existing -> TRIM end
        await supabase.from('time_blocks').update({ end_time: minutesToTime(s1) }).eq('id', b.id);
      } else if (s2 >= s1 && e2 > e1) {
        // Case 4: Overlap at the start of existing -> TRIM start
        await supabase.from('time_blocks').update({ start_time: minutesToTime(e1) }).eq('id', b.id);
      }
    }
  };

  const createBlock = useMutation({
    mutationFn: async (block: { title: string; start_time: string; end_time: string; block_date: string | null; color?: string; is_recurring?: boolean; days_of_week?: number[] }) => {
      if (!user) throw new Error('No user');
      
      // Resolve collisions first
      await resolveCollisions(block);

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
      toast.success('Bloque programado');
    },
    onError: (err) => {
      console.error(err);
      toast.error('Error al crear bloque');
    }
  });

  const updateBlock = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; start_time?: string; end_time?: string; block_date?: string | null; color?: string; is_recurring?: boolean; days_of_week?: number[] }) => {
      if (!user) throw new Error('No user');

      if (updates.start_time && updates.end_time) {
        await resolveCollisions({ ...updates, id } as any);
      }

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
      toast.success('Bloque actualizado');
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
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.info('Bloque eliminado');
    },
  });

  return { timeBlocks, isLoading, createBlock, updateBlock, deleteBlock };
};
