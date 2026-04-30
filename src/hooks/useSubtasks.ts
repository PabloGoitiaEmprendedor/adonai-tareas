import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useSubtasks = (parentId: string | null | undefined) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const enabled = !!user && !!parentId && !parentId.startsWith('virtual-');

  const { data: subtasks = [], isLoading } = useQuery({
    queryKey: ['subtasks', parentId],
    queryFn: async () => {
      if (!enabled) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('parent_task_id', parentId!)
        .neq('status', 'deleted')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled,
  });

  const createSubtask = useMutation({
    mutationFn: async (title: string) => {
      if (!user || !parentId) throw new Error('Missing parent or user');
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title,
          parent_task_id: parentId,
          status: 'pending',
          source_type: 'text',
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subtasks', parentId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      (window as any).electronAPI?.syncData?.();
    },
  });

  const toggleSubtask = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: done ? 'done' : 'pending',
          completed_at: done ? new Date().toISOString() : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: ['subtasks', parentId] });
      const prev = qc.getQueryData<any[]>(['subtasks', parentId]);
      qc.setQueryData(['subtasks', parentId], (old: any[] = []) =>
        old.map(s => s.id === id ? { ...s, status: done ? 'done' : 'pending' } : s)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['subtasks', parentId], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['subtasks', parentId] });
      (window as any).electronAPI?.syncData?.();
    },
  });

  const deleteSubtask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').update({ status: 'deleted' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subtasks', parentId] });
      (window as any).electronAPI?.syncData?.();
    },
  });

  const updateSubtask = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from('tasks').update({ title }).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, title }) => {
      await qc.cancelQueries({ queryKey: ['subtasks', parentId] });
      const prev = qc.getQueryData<any[]>(['subtasks', parentId]);
      qc.setQueryData(['subtasks', parentId], (old: any[] = []) =>
        old.map(s => s.id === id ? { ...s, title } : s)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['subtasks', parentId], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['subtasks', parentId] });
      (window as any).electronAPI?.syncData?.();
    },
  });

  return { subtasks, isLoading, createSubtask, toggleSubtask, updateSubtask, deleteSubtask };
};
