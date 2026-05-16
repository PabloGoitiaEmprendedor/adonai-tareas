import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useAdminDeleteUsers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userIds: string[]) => {
      const { data, error } = await supabase.functions.invoke('admin-delete-users', {
        body: { userIds },
      });

      if (error) {
        throw new Error(`Error deleting users: ${error.message || JSON.stringify(error)}`);
      }

      if (data?.error) {
        throw new Error(`Server error: ${data.error}`);
      }

      return data as { deleted: number; errors: { id: string; error: string }[]; total: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
    },
  });
};
