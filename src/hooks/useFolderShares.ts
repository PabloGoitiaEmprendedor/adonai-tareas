import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useFolderShares = (folderId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: shares = [], isLoading } = useQuery({
    queryKey: ['folder_shares', folderId],
    queryFn: async () => {
      if (!user || !folderId) return [];
      const { data, error } = await supabase
        .from('folder_shares')
        .select('*, profiles!folder_shares_shared_with_id_fkey(name, email)')
        .eq('folder_id', folderId)
        .eq('owner_id', user.id);
      if (error) {
        // Fallback: query without join if FK doesn't exist
        const { data: basic, error: err2 } = await supabase
          .from('folder_shares')
          .select('*')
          .eq('folder_id', folderId)
          .eq('owner_id', user.id);
        if (err2) throw err2;
        return basic || [];
      }
      return data || [];
    },
    enabled: !!user && !!folderId,
  });

  const shareWithFriend = useMutation({
    mutationFn: async ({ folderId, friendId }: { folderId: string; friendId: string }) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase
        .from('folder_shares')
        .insert({ folder_id: folderId, owner_id: user.id, shared_with_id: friendId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['folder_shares'] }),
  });

  const removeShare = useMutation({
    mutationFn: async (shareId: string) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase
        .from('folder_shares')
        .delete()
        .eq('id', shareId)
        .eq('owner_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['folder_shares'] }),
  });

  return { shares, isLoading, shareWithFriend, removeShare };
};
