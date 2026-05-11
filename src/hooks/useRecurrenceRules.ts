import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface RecurrenceRule {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  link: string | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  days_of_week: number[] | null;
  day_of_month: number | null;
  month_of_year: number | null;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  estimated_minutes: number | null;
  created_at: string;
}

export const useRecurrenceRules = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['recurrence_rules', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('recurrence_rules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as RecurrenceRule[];
    },
    enabled: !!user,
  });

  const createRule = useMutation({
    mutationFn: async (rule: Omit<RecurrenceRule, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) throw new Error('No user');
      // Only insert columns that definitely exist in the base table schema
      const insertData: Record<string, unknown> = {
        user_id: user.id,
        frequency: rule.frequency,
        interval: rule.interval,
        start_date: rule.start_date,
        end_date: rule.end_date || null,
      };
      if (rule.days_of_week && rule.days_of_week.length > 0) {
        insertData.days_of_week = rule.days_of_week;
      }
      if (rule.day_of_month != null) {
        insertData.day_of_month = rule.day_of_month;
      }
      if (rule.month_of_year != null) {
        insertData.month_of_year = rule.month_of_year;
      }

      const { data, error } = await supabase
        .from('recurrence_rules')
        .insert(insertData)
        .select()
        .maybeSingle();
      if (error) {
        console.error('[recurrence] Error creating rule:', error, 'insertData:', insertData);
        throw error;
      }
      if (!data) {
        console.error('[recurrence] No data returned for insertData:', insertData);
        throw new Error('Error al crear la regla: no se devolvieron datos');
      }
      return data as RecurrenceRule;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurrence_rules'] }),
    onError: (err) => console.error('[recurrence] createRule mutation error:', err),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase.from('recurrence_rules').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurrence_rules'] }),
  });

  return { rules, isLoading, createRule, deleteRule };
};

export const formatRecurrenceLabel = (rule: RecurrenceRule): string => {
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const freq = rule.frequency;
  const interval = rule.interval;

  if (freq === 'daily') {
    return interval === 1 ? 'Todos los días' : `Cada ${interval} días`;
  }
  if (freq === 'weekly') {
    const days = (rule.days_of_week || []).map((d) => dayNames[d]).join(', ');
    const prefix = interval === 1 ? 'Cada semana' : `Cada ${interval} semanas`;
    return days ? `${prefix} (${days})` : prefix;
  }
  if (freq === 'monthly') {
    const prefix = interval === 1 ? 'Cada mes' : `Cada ${interval} meses`;
    return rule.day_of_month ? `${prefix} el día ${rule.day_of_month}` : prefix;
  }
  if (freq === 'yearly') {
    return interval === 1 ? 'Cada año' : `Cada ${interval} años`;
  }
  return 'Recurrente';
};
