import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export const useTasks = (filters?: { date?: string; status?: string }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', user?.id, filters],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase.from('tasks').select('*, contexts(*)').eq('user_id', user.id);
      if (filters?.date) query = query.eq('due_date', filters.date);
      if (filters?.status) query = query.eq('status', filters.status);
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
      due_date?: string;
      source_type?: string;
      context_id?: string | null;
      goal_id?: string | null;
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

      // Log usage event
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
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
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

  return { tasks, isLoading, createTask, updateTask };
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
