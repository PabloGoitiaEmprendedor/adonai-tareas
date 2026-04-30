import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useTimeBlocks = (date: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: allBlocks = [], isLoading } = useQuery({
    queryKey: ['time_blocks', date],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('time_blocks')
        .select('*')
        .eq('user_id', user.id)
        .or(`block_date.eq.${date},is_recurring.eq.true`)
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!date,
  });

  const dayOfWeek = (new Date(`${date}T12:00:00`)).getDay(); // 0-6

  const timeBlocks = allBlocks.filter(b => {
    if (!b.is_recurring) return b.block_date === date;
    if (!b.days_of_week || b.days_of_week.length === 0) return true;
    return b.days_of_week.includes(dayOfWeek);
  });

  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  const hasCollision = (newBlock: { start_time: string; end_time: string; id?: string }) => {
    if (!user) return false;
    const s1 = timeToMinutes(newBlock.start_time);
    const e1 = timeToMinutes(newBlock.end_time);

    return timeBlocks.some(b => {
      if (b.id === newBlock.id) return false;
      const s2 = timeToMinutes(b.start_time);
      const e2 = timeToMinutes(b.end_time);
      return s1 < e2 && s2 < e1;
    });
  };

  const createBlock = useMutation({
    mutationFn: async (block: { title: string; start_time: string; end_time: string; block_date: string | null; color?: string; is_recurring?: boolean; days_of_week?: number[] }) => {
      if (!user) throw new Error('No user');
      
      if (hasCollision(block)) {
        throw new Error('ESTE HORARIO YA ESTÁ OCUPADO');
      }

      const { data, error } = await supabase
        .from('time_blocks')
        .insert({ ...block, user_id: user.id })
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Error al crear el bloque: no se devolvieron datos');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time_blocks'] });
      toast.success('Bloque programado');
    },
    onError: (err: any) => {
      const msg = err.message === 'ESTE HORARIO YA ESTÁ OCUPADO' ? err.message : 'Error al crear bloque';
      toast.error(msg, {
        style: { background: '#ef4444', color: '#fff', border: 'none' }
      });
    }
  });

  const updateBlock = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; start_time?: string; end_time?: string; block_date?: string | null; color?: string; is_recurring?: boolean; days_of_week?: number[] }) => {
      if (!user) throw new Error('No user');

      if (updates.start_time || updates.end_time) {
        // We need full block to check collision reliably
        const current = allBlocks.find(b => b.id === id);
        if (hasCollision({ 
          ...current, 
          ...updates, 
          start_time: updates.start_time || current.start_time,
          end_time: updates.end_time || current.end_time,
          id 
        })) {
          throw new Error('ESTE HORARIO YA ESTÁ OCUPADO');
        }
      }

      const { data, error } = await supabase
        .from('time_blocks')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Error al actualizar el bloque: no se encontró el registro');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time_blocks'] });
      toast.success('Bloque actualizado');
    },
    onError: (err: any) => {
      const msg = err.message === 'ESTE HORARIO YA ESTÁ OCUPADO' ? err.message : 'Error al actualizar bloque';
      toast.error(msg, {
        style: { background: '#ef4444', color: '#fff', border: 'none' }
      });
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
