import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

export const useTasks = (filters?: { date?: string; status?: string }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', user?.id, filters],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase.from('tasks').select('*, contexts(*)').eq('user_id', user.id);
      if (filters?.date) query = query.eq('due_date', filters.date);
      if (filters?.status) {
        query = query.eq('status', filters.status);
      } else {
        query = query.neq('status', 'deleted');
      }
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createTask = useMutation({
    mutationFn: async (task: {
      title: string;
      description?: string;
      priority?: string;
      urgency?: boolean;
      importance?: boolean;
      estimated_minutes?: number;
      due_date?: string;
      source_type?: string;
      context_id?: string | null;
      goal_id?: string | null;
      folder_id?: string | null;
      recurrence_id?: string | null;
    }) => {
      if (!user) throw new Error('No user');
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...task,
          user_id: user.id,
          due_date: task.due_date || format(new Date(), 'yyyy-MM-dd'),
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from('usage_events').insert({
        user_id: user.id,
        event_type: task.source_type === 'voice' ? 'task_created_voice' : 'task_created_text',
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & TaskUpdate) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase.from('tasks').update(updates).eq('id', id).eq('user_id', user.id);
      if (error) throw error;

      if (updates.status === 'done') {
        await supabase.from('usage_events').insert({
          user_id: user.id,
          event_type: 'task_completed',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  return { tasks, isLoading, createTask, updateTask, deleteTask };


};

export const useTodayTasks = () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  return useTasks({ date: today });
};

export const useEisenhowerSort = (tasks: any[]) => {
  return [...tasks].sort((a, b) => {
    const scoreA = (a.urgency ? 2 : 0) + (a.importance ? 1 : 0);
    const scoreB = (b.urgency ? 2 : 0) + (b.importance ? 1 : 0);
    return scoreB - scoreA;
  });
};
