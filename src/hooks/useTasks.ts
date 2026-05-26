import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { toast } from 'sonner';
import { trackAnalyticsEvent } from '@/lib/analytics';

import type { Database } from '@/integrations/supabase/types';

type TaskUpdate = Database['public']['Tables']['tasks']['Update'] & { metadata?: Record<string, unknown> | null };

const VIRTUAL_TASK_ID_REGEX = /^virtual-(.+)-(\d{4}-\d{2}-\d{2})$/;

const parseVirtualTaskId = (id: string) => {
  const match = id.match(VIRTUAL_TASK_ID_REGEX);
  if (!match) return null;

  return {
    recurrenceId: match[1],
    dueDate: match[2],
  };
};

export const useTasks = (filters?: { date?: string; startDate?: string; endDate?: string; status?: string; excludeEvents?: boolean }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const pushTaskChangesToNotion = async (taskId: string, updates: Partial<TaskUpdate>) => {
    if (!user) return;

    const relevantKeys: (keyof TaskUpdate)[] = ['title', 'due_date', 'link'];
    const hasRelevantChange = relevantKeys.some((key) => Object.prototype.hasOwnProperty.call(updates, key));
    if (!hasRelevantChange) return;

    const payload: Record<string, unknown> = { task_id: taskId };
    for (const key of relevantKeys) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        payload[key] = updates[key] ?? null;
      }
    }

    const { error } = await supabase.functions.invoke('notion-update-linked-task', { body: payload });
    if (error) {
      console.warn('[useTasks] Notion sync skipped:', error);
    }
  };

  const { data: allData, isLoading } = useQuery({
    queryKey: ['tasks', user?.id, filters],
    queryFn: async () => {
      if (!user) return { tasks: [], rules: [], templates: [] };
      
      // 1. Fetch shared folder IDs first
      const { data: sharedRelations } = await supabase
        .from('folder_shares')
        .select('folder_id')
        .eq('shared_with_id', user.id);
      const sharedFolderIds = (sharedRelations || []).map(r => r.folder_id);

      // 2. Fetch real tasks
      let query = supabase.from('tasks').select('*, contexts(*)');
      
      if (sharedFolderIds.length > 0) {
        query = query.or(`user_id.eq.${user.id},folder_id.in.(${sharedFolderIds.map(id => `"${id}"`).join(',')})`);
      } else {
        query = query.eq('user_id', user.id);
      }
      
      // Exclude calendar-only events from task queries
      if (filters?.excludeEvents) {
        query = query.or('metadata->>creation_source.neq.event,metadata->>creation_source.is.null');
      }

      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const recentDoneCutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString();

      if (filters?.status === 'history') {
        query = query.in('status', ['done', 'deleted']);
      } else {
        // Main App Logic: Hide deleted, and archive done tasks from previous days
        query = query.neq('status', 'deleted');
        
        // Keep completed tasks visible briefly, then archive them from notebook views.
        query = query.or(`status.neq.done,and(status.eq.done,completed_at.gte.${recentDoneCutoff})`);
      }

      if (filters?.date) {
        if (filters.date === todayStr && filters?.status !== 'history') {
          // Rolling tasks for Today view:
          // We already filtered 'done' tasks above (only very recent completions allowed).
          // Now we just need to handle which tasks to fetch by due_date.
          query = query.or(`due_date.eq.${filters.date},and(due_date.lt.${filters.date},status.neq.done),and(status.eq.done,completed_at.gte.${recentDoneCutoff})`);
        } else {
          query = query.eq('due_date', filters.date);
        }
      } else if (filters?.startDate && filters?.endDate) {
        // Fetch tasks in range OR overdue tasks (past due date and not done)
        query = query.or(`and(due_date.gte.${filters.startDate},due_date.lte.${filters.endDate}),and(due_date.lt.${filters.startDate},status.neq.done)`);
      }

      // Exclude subtasks from main list — they are loaded per-parent via useSubtasks
      query = query.is('parent_task_id', null);

      const { data: realTasks, error: tasksError } = await query.order('due_date', { ascending: true });
      if (tasksError) {
        console.error("[useTasks] Error fetching tasks:", tasksError);
        throw tasksError;
      }
      console.log(`[useTasks] Fetched ${realTasks?.length || 0} tasks for date ${filters?.date}`);

      // 2. Fetch recurrence rules
      const { data: rules, error: rulesError } = await supabase
        .from('recurrence_rules')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null);
      if (rulesError) throw rulesError;

      // 3. Fetch template tasks for those rules
      const ruleIds = rules.map(r => r.id);
      let templates: Database['public']['Tables']['tasks']['Row'][] = [];

      if (ruleIds.length > 0) {
        const { data: templateRows, error: templatesError } = await supabase
          .from('tasks')
          .select('*')
          .in('recurrence_id', ruleIds)
          .neq('status', 'deleted')
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
    refetchInterval: filters?.status === 'history' ? false : 10000,
  });

  const tasks = useMemo(() => {
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
  }, [allData, filters]);


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
      metadata?: Record<string, unknown>;
      /** Where the creation was triggered from: 'fab', 'mini_voice', 'mini_plus', 'secondary', 'recurrence' */
      creation_source?: string;
    }) => {
      if (!user) throw new Error('No user');
      const { creation_source, metadata, ...rest } = task;
      const creationSource = creation_source || 'fab';
      const taskMetadata = {
        ...(metadata || {}),
        creation_source: creationSource,
      };
      
      // Strip null/undefined values to avoid sending columns that don't exist in the table
      const cleanData = Object.fromEntries(
        Object.entries(rest).filter(([, v]) => v !== null && v !== undefined)
      );
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...cleanData,
          metadata: taskMetadata,
          user_id: user.id,
          due_date: cleanData.due_date || format(new Date(), 'yyyy-MM-dd'),
        } as any)
        .select()
        .single();

      if (error) {
        console.error("[useTasks] Error inserting task:", error, "taskData:", task);
        throw error;
      }

      // Determine the event type based on source
      let eventType = 'task_created_text';
      if (task.source_type === 'voice') eventType = 'task_created_voice';
      else if (task.source_type === 'image') eventType = 'task_created_image';

      await supabase.from('usage_events').insert({
        user_id: user.id,
        event_type: eventType,
        metadata: { creation_source: creationSource },
      });

      trackAnalyticsEvent('task_created', {
        creation_source: creationSource,
        source_type: task.source_type || 'text',
        has_due_date: Boolean(data.due_date),
        has_link: Boolean(data.link),
        priority: data.priority || 'none',
      });

      return data;
    },
    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', user?.id] });

      const previousQueries = queryClient.getQueriesData({ queryKey: ['tasks', user?.id] });
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimisticTask = {
        ...task,
        id: tempId,
        user_id: user?.id,
        due_date: task.due_date || format(new Date(), 'yyyy-MM-dd'),
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        contexts: null,
      };

      previousQueries.forEach(([queryKey, value]) => {
        if (!value) return;
        const queryFilters = Array.isArray(queryKey) ? queryKey[2] as typeof filters | undefined : undefined;
        const optimisticDate = optimisticTask.due_date;
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const belongsToQuery = (() => {
          if (!queryFilters?.date && !queryFilters?.startDate && !queryFilters?.endDate) return true;
          if (queryFilters?.date) {
            if (queryFilters.date === todayStr) {
              return optimisticDate === queryFilters.date || optimisticDate < queryFilters.date;
            }
            return optimisticDate === queryFilters.date;
          }
          if (queryFilters?.startDate && queryFilters?.endDate) {
            return optimisticDate >= queryFilters.startDate && optimisticDate <= queryFilters.endDate;
          }
          return true;
        })();
        if (!belongsToQuery) return;

        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old?.tasks) return old;
          return {
            ...old,
            tasks: [...old.tasks, optimisticTask],
          };
        });
      });

      return { previousQueries };
    },
    onError: (_err, _task, context) => {
      context?.previousQueries?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      (window as any).electronAPI?.syncData?.();
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, creation_source, ...updates }: { id: string, creation_source?: string } & TaskUpdate) => {
      if (!user) throw new Error('No user');
      
      let targetId = id;
      if (id.startsWith('virtual-')) {
        const parsedVirtualTask = parseVirtualTaskId(id);
        if (!parsedVirtualTask) throw new Error('Invalid virtual task id');

        const { recurrenceId, dueDate } = parsedVirtualTask;
        
        // Use optional chaining and fallback to empty array to prevent crashes
        const existingRealTask = allData?.tasks?.find((t: any) => 
          t.recurrence_id === recurrenceId && t.due_date === dueDate
        );

        if (existingRealTask) {
          const { error } = await supabase.from('tasks').update(updates as any).eq('id', existingRealTask.id);
          if (error) throw error;
          targetId = existingRealTask.id;
        } else {
          const { templates = [] } = allData || {};
          let template = templates.find((t: any) => t.recurrence_id === recurrenceId);
          
          if (!template) {
            // Fallback: fetch template directly from DB if not in cache (common in smaller hook instances)
            const { data: fetchedTemplate, error: fetchErr } = await supabase
              .from('tasks')
              .select('*')
              .eq('recurrence_id', recurrenceId)
              .order('created_at', { ascending: true })
              .limit(1)
              .maybeSingle();
              
            if (fetchErr || !fetchedTemplate) throw new Error('No se encontró la plantilla de la tarea recurrente');
            template = fetchedTemplate;
          }
          
          // Omit internal fields from template to avoid insertion errors
          const { id: _tId, created_at: _tCa, ...templateData } = template;
          
          const { data, error } = await supabase
            .from('tasks')
            .insert({
              ...templateData,
              due_date: dueDate,
              recurrence_id: recurrenceId,
              status: updates.status || 'pending',
              user_id: user.id,
              ...updates
            })
            .select()
            .maybeSingle();
            
          if (error) throw error;
          if (!data) throw new Error('Error al materializar la tarea: no se devolvieron datos');
          targetId = data.id;
        }
      } else {
        const { data: updated, error } = await supabase.from('tasks').update(updates as any).eq('id', id).select();
        if (error) throw error;
        if (!updated || updated.length === 0) {
          throw new Error('No se encontró la tarea (sesión expirada o sin permisos)');
        }
      }

      await pushTaskChangesToNotion(targetId, updates);

      if (updates.status === 'done') {
        await supabase.from('usage_events').insert({
          user_id: user.id,
          event_type: 'task_completed',
          metadata: creation_source ? { creation_source } : undefined,
        });
        trackAnalyticsEvent('task_completed', {
          creation_source: creation_source || 'unknown',
          task_id: targetId,
        });
      }
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', user?.id] });
      const previousData = queryClient.getQueryData(['tasks', user?.id, filters]);

      queryClient.setQueryData(['tasks', user?.id, filters], (old: any) => {
        if (!old) return old;
        
        const isVirtual = id.startsWith('virtual-');
        if (isVirtual) {
          const virtualTask = tasks.find(t => t.id === id);
          if (virtualTask) {
            const key = `${virtualTask.recurrence_id}__${virtualTask.due_date}`;
            // Add to real tasks and update materializedSet to suppress the virtual one
            return {
              ...old,
              tasks: [...old.tasks, { ...virtualTask, ...updates, isVirtual: false, id: `temp-${id}` }],
              materializedSet: new Set([...Array.from(old.materializedSet || []), key])
            };
          }
        }

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
      console.error("Error updating task:", err, "variables:", variables);
      queryClient.setQueryData(['tasks', user?.id, filters], context?.previousData);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`No se pudo actualizar la tarea: ${errorMessage}`);
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
          .maybeSingle();
        if (fetchError) throw fetchError;
        recurrenceId = row?.recurrence_id ?? null;
      }

      const deletedAt = new Date().toISOString();

      // Recurring task: soft-delete the whole series (template + materialized
      // instances) AND soft-delete the rule so no future virtual instances appear.
      if (recurrenceId) {
        const { error: tasksErr } = await supabase
          .from('tasks')
          .update({ status: 'deleted', deleted_at: deletedAt } as any)
          .eq('user_id', user.id)
          .eq('recurrence_id', recurrenceId);
        if (tasksErr) throw tasksErr;

        const { error: ruleErr } = await supabase
          .from('recurrence_rules')
          .update({ deleted_at: deletedAt } as any)
          .eq('user_id', user.id)
          .eq('id', recurrenceId);
        if (ruleErr) throw ruleErr;
        trackAnalyticsEvent('task_deleted', {
          recurrence: 'series',
        });
        return;
      }

      // Plain (non-recurring) task: soft-delete only this one.
      const { data: deletedRows, error } = await supabase
        .from('tasks')
        .update({ status: 'deleted', deleted_at: deletedAt } as any)
        .eq('user_id', user.id)
        .eq('id', id)
        .select('id');
      if (error) throw error;
      if (!deletedRows || deletedRows.length === 0) {
        throw new Error('No se encontro la tarea o no tienes permisos para borrarla');
      }
      trackAnalyticsEvent('task_deleted', {
        recurrence: 'none',
      });
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
      const { error } = await supabase.from('tasks').delete().eq('id', id);
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
