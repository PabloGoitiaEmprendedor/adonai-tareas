import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useFolders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: folders = [], isLoading } = useQuery({
    queryKey: ['folders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Fetch owned folders
      const { data: ownedData, error: ownedError } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (ownedError) throw ownedError;

      // Fetch shared folders
      const { data: sharedRelations, error: sharedError } = await supabase
        .from('folder_shares')
        .select('folder_id')
        .eq('shared_with_id', user.id);
      
      if (sharedError) throw sharedError;

      if (sharedRelations && sharedRelations.length > 0) {
        const sharedFolderIds = sharedRelations.map(r => r.folder_id);
        const { data: sharedData, error: sharedFolderError } = await supabase
          .from('folders')
          .select('*')
          .in('id', sharedFolderIds);
        
        if (sharedFolderError) throw sharedFolderError;
        
        // Combine and mark shared folders
        return [
          ...ownedData.map(f => ({ ...f, isShared: false })),
          ...sharedData.map(f => ({ ...f, isShared: true }))
        ];
      }

      return ownedData.map(f => ({ ...f, isShared: false }));
    },
    enabled: !!user,
  });

  const createFolder = useMutation({
    mutationFn: async (folder: { name: string; color?: string; icon?: string; is_public?: boolean }) => {
      if (!user) throw new Error('No user');
      const { data, error } = await supabase
        .from('folders')
        .insert({ ...folder, user_id: user.id })
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Error al crear la carpeta: no se devolvieron datos');
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['folders'] }),
  });

  const updateFolder = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; color?: string; icon?: string; is_public?: boolean }) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase.from('folders').update(updates).eq('id', id).eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['folders'] }),
  });

  const deleteFolder = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase.from('folders').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['folders'] }),
  });

  return { folders, isLoading, createFolder, updateFolder, deleteFolder };
};
