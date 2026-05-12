import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type AdminNotification = {
  id: string;
  title: string;
  body: string;
  target_type: 'all' | 'user';
  target_user_id: string | null;
  created_by: string;
  created_at: string;
  sent_count: number;
  read_count: number;
};

export function useAdminNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['admin-notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as AdminNotification[];
    },
    enabled: !!user,
  });

  const createNotification = useMutation({
    mutationFn: async (notif: {
      title: string;
      body: string;
      target_type: 'all' | 'user';
      target_user_id?: string;
    }) => {
      const { data, error } = await supabase.from('admin_notifications').insert({
        title: notif.title,
        body: notif.body,
        target_type: notif.target_type,
        target_user_id: notif.target_user_id || null,
        created_by: user?.id,
        sent_count: 0,
        read_count: 0,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      toast.success('Notificación creada');
    },
    onError: (err: Error) => {
      toast.error(`Error: ${err.message}`);
    },
  });

  return { notifications, isLoading, createNotification };
}
