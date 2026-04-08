import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface RecurrenceRule {
  id: string;
  user_id: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  days_of_week: number[];
  day_of_month: number | null;
  month_of_year: number | null;
  start_date: string;
  end_date: string | null;
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
      const { data, error } = await supabase
        .from('recurrence_rules')
        .insert({ ...rule, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as RecurrenceRule;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurrence_rules'] }),
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
