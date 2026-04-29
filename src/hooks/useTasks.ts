import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, isSameDay, parseISO, addDays, eachDayOfInterval } from 'date-fns';
import { toast } from 'sonner';

import type { Database } from '@/integrations/supabase/types';

type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

const VIRTUAL_TASK_ID_REGEX = /^virtual-(.+)-(\d{4}-\d{2}-\d{2})$/;

const parseVirtualTaskId = (id: string) => {
  const match = id.match(VIRTUAL_TASK_ID_REGEX);
  if (!match) return null;

  return {
    recurrenceId: match[1],
    dueDate: match[2],
  };
};

export const useTasks = (filters?: { date?: string; startDate?: string; endDate?: string; status?: string }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: allData, isLoading } = useQuery({
    queryKey: ['tasks', user?.id, filters],
    queryFn: async () => {
      if (!user) return { tasks: [], rules: [], templates: [] };
      
      // 1. Fetch real tasks
      let query = supabase.from('tasks').select('*, contexts(*)').eq('user_id', user.id);
      
      if (filters?.date) {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        if (filters.date === todayStr && filters?.status !== 'history') {
          // Rolling tasks: Include tasks due today, OR tasks due in the past that are not done
          query = query.or(`due_date.eq.${filters.date},and(due_date.lt.${filters.date},status.neq.done,status.neq.deleted)`);
        } else {
          query = query.eq('due_date', filters.date);
        }
      } else if (filters?.startDate && filters?.endDate) {
        query = query.gte('due_date', filters.startDate).lte('due_date', filters.endDate);
      }

      if (filters?.status === 'history') {
        query = query.in('status', ['done', 'deleted']);
      } else if (filters?.status) {
        query = query.eq('status', filters.status);
      } else {
        query = query.neq('status', 'deleted');
      }

      // Exclude subtasks from main list — they are loaded per-parent via useSubtasks
      query = query.is('parent_task_id', null);

      const { data: realTasks, error: tasksError } = await query.order('due_date', { ascending: true });
      if (tasksError) throw tasksError;

      // 2. Fetch recurrence rules
      const { data: rules, error: rulesError } = await supabase
        .from('recurrence_rules')
        .select('*')
        .eq('user_id', user.id);
      if (rulesError) throw rulesError;

      // 3. Fetch template tasks for those rules
      const ruleIds = rules.map(r => r.id);
      let templates: Database['public']['Tables']['tasks']['Row'][] = [];

      if (ruleIds.length > 0) {
        const { data: templateRows, error: templatesError } = await supabase
          .from('tasks')
          .select('*')
          .in('recurrence_id', ruleIds)
          .order('created_at', { ascending: true });

        if (templatesError) throw templatesError;
        templates = templateRows || [];
      }

      // 4. Fetch ALL materialized recurrent task instances (no date filter)
      // to correctly suppress virtual generation for any date range
      let materializedSet = new Set<string>();
      if (ruleIds.length > 0) {
        const { data: allMaterialized } = await supabase
          .from('tasks')
          .select('recurrence_id, due_date, status')
          .eq('user_id', user.id)
          .not('recurrence_id', 'is', null);
        materializedSet = new Set(
          (allMaterialized || []).map(t => `${t.recurrence_id}__${t.due_date}`)
        );
      }

      return { tasks: realTasks, rules, templates: templates || [], materializedSet };
    },
    enabled: !!user,
  });

  const tasks = (() => {
    if (!allData) return [];
    const { tasks: realTasks, rules, templates, materializedSet } = allData;
    
    let start, end;
    if (filters?.date) {
      start = parseISO(filters.date);
      end = start;
    } else if (filters?.startDate && filters?.endDate) {
      start = parseISO(filters.startDate);
      end = parseISO(filters.endDate);
    } else {
      return realTasks;
    }

    const interval = eachDayOfInterval({ start, end });
    const virtualTasks: any[] = [];
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    interval.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');

      // Never generate virtual tasks for past days — if it wasn't done, it's gone
      if (dateStr < todayStr) return;

      rules.forEach(rule => {
        const startDate = parseISO(rule.start_date);
        const template = templates.find(t => t.recurrence_id === rule.id);
        if (!template || day < startDate) return;

        const diffDays = Math.floor((day.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        let shouldShow = false;
        if (rule.frequency === 'daily') {
          shouldShow = diffDays % (rule.interval || 1) === 0;
        } else if (rule.frequency === 'weekly') {
          const dayOfWeek = day.getDay();
          const daysConfig = rule.days_of_week || [];
          const isCorrectDay = daysConfig.length > 0
            ? daysConfig.includes(dayOfWeek)
            : dayOfWeek === startDate.getDay();
          if (isCorrectDay) {
            const weekDiff = Math.floor(diffDays / 7);
            shouldShow = weekDiff % (rule.interval || 1) === 0;
          }
        } else if (rule.frequency === 'monthly') {
          const isCorrectDay = day.getDate() === (rule.day_of_month || startDate.getDate());
          if (isCorrectDay) {
            const monthDiff = (day.getFullYear() - startDate.getFullYear()) * 12 + (day.getMonth() - startDate.getMonth());
            shouldShow = monthDiff % (rule.interval || 1) === 0;
          }
        }

        if (shouldShow) {
          // Check against ALL materialized instances, not just the current filter range
          const alreadyExists = materializedSet.has(`${rule.id}__${dateStr}`);
          if (!alreadyExists) {
            virtualTasks.push({
              ...template,
              id: `virtual-${rule.id}-${dateStr}`,
              due_date: dateStr,
              status: 'pending',
              isVirtual: true,
            });
          }
        }
      });
    });

    return [...realTasks, ...virtualTasks];
  })();


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
      time_block_id?: string | null;
      link?: string | null;
      parent_task_id?: string | null;
      /** Where the creation was triggered from: 'fab', 'mini_voice', 'mini_plus', 'secondary', 'recurrence' */
      creation_source?: string;
    }) => {
      if (!user) throw new Error('No user');
      const { creation_source, ...taskData } = task;
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          user_id: user.id,
          due_date: taskData.due_date || format(new Date(), 'yyyy-MM-dd'),
        })
        .select()
        .single();
      if (error) throw error;

      // Determine the event type based on source
      let eventType = 'task_created_text';
      if (taskData.source_type === 'voice') eventType = 'task_created_voice';
      else if (taskData.source_type === 'image') eventType = 'task_created_image';

      await supabase.from('usage_events').insert({
        user_id: user.id,
        event_type: eventType,
        metadata: creation_source ? { creation_source } : null,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      (window as any).electronAPI?.syncData?.();
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & TaskUpdate) => {
      if (!user) throw new Error('No user');
      
      let targetId = id;
      if (id.startsWith('virtual-')) {
        const parsedVirtualTask = parseVirtualTaskId(id);
        if (!parsedVirtualTask) throw new Error('Invalid virtual task id');

        const { recurrenceId, dueDate } = parsedVirtualTask;
        
        const { tasks: _, templates } = allData || { tasks: [], templates: [] };
        const template = templates.find(t => t.recurrence_id === recurrenceId);
        if (!template) throw new Error('Recurring task template not found');
        
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            ...template,
            id: undefined,
            due_date: dueDate,
            recurrence_id: recurrenceId,
            status: updates.status || 'pending',
            created_at: undefined,
            user_id: user.id,
            ...updates
          })
          .select()
          .single();
          
        if (error) throw error;
        targetId = data.id;
      } else {
        const { error } = await supabase.from('tasks').update(updates).eq('id', id).eq('user_id', user.id);
        if (error) throw error;
      }

      if (updates.status === 'done') {
        await supabase.from('usage_events').insert({
          user_id: user.id,
          event_type: 'task_completed',
        });
      }
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', user?.id] });
      const previousData = queryClient.getQueryData(['tasks', user?.id, filters]);

      queryClient.setQueryData(['tasks', user?.id, filters], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks.map((task: any) => 
            task.id === id ? { ...task, ...updates } : task
          ),
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['tasks', user?.id, filters], context?.previousData);
      toast.error("No se pudo actualizar la tarea");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
      (window as any).electronAPI?.syncData?.();
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('No user');

      // Determine if this task is part of a recurrence series.
      // - Virtual tasks always belong to a series (their id encodes the rule).
      // - Real tasks may belong to a series via the recurrence_id column.
      let recurrenceId: string | null = null;

      if (id.startsWith('virtual-')) {
        const parsed = parseVirtualTaskId(id);
        recurrenceId = parsed?.recurrenceId ?? null;
      } else {
        const { data: row, error: fetchError } = await supabase
          .from('tasks')
          .select('recurrence_id')
          .eq('id', id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (fetchError) throw fetchError;
        recurrenceId = row?.recurrence_id ?? null;
      }

      // Recurring task: wipe the whole series (template + all materialized
      // instances) AND remove the rule so no future virtual instances appear.
      if (recurrenceId) {
        const { error: tasksErr } = await supabase
          .from('tasks')
          .update({ status: 'deleted' })
          .eq('user_id', user.id)
          .eq('recurrence_id', recurrenceId);
        if (tasksErr) throw tasksErr;

        const { error: ruleErr } = await supabase
          .from('recurrence_rules')
          .delete()
          .eq('id', recurrenceId)
          .eq('user_id', user.id);
        if (ruleErr) throw ruleErr;
        return;
      }

      // Plain (non-recurring) task: soft-delete only this one.
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'deleted' })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', user?.id] });
      const previousData = queryClient.getQueryData(['tasks', user?.id, filters]);
      queryClient.setQueryData(['tasks', user?.id, filters], (old: any) => {
        if (!old) return old;
        const target = old.tasks.find((t: any) => t.id === id);
        const recurrenceId = target?.recurrence_id
          ?? (id.startsWith('virtual-') ? parseVirtualTaskId(id)?.recurrenceId : null);
        if (recurrenceId) {
          return {
            ...old,
            tasks: old.tasks.filter((t: any) => t.recurrence_id !== recurrenceId),
            rules: (old.rules || []).filter((r: any) => r.id !== recurrenceId),
            templates: (old.templates || []).filter((t: any) => t.recurrence_id !== recurrenceId),
          };
        }
        return {
          ...old,
          tasks: old.tasks.filter((t: any) => t.id !== id),
        };
      });
      return { previousData };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(['tasks', user?.id, filters], context?.previousData);
      toast.error('No se pudo mover la tarea a la papelera');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      (window as any).electronAPI?.syncData?.();
    },
  });



  const hardDeleteTask = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  return { tasks, isLoading, createTask, updateTask, deleteTask, hardDeleteTask };
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
