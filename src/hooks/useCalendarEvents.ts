import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  location: string;
  allDay: boolean;
  color: string | null;
  links: string[];
  recurrence?: string[];
  reminders?: { useDefault?: boolean; overrides?: { method: string; minutes: number }[] } | null;
}

export const useCalendarEvents = (timeMin?: string, timeMax?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['calendar-events', user?.id, timeMin, timeMax],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { events: [], connected: false };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-calendar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: 'fetch', timeMin, timeMax }),
        }
      );

      if (!response.ok) return { events: [], connected: false };
      return await response.json();
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');
    return session;
  };

  const createEvent = useMutation({
    mutationFn: async (eventData: any) => {
      const session = await getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'create', eventData }),
      });
      if (!response.ok) throw new Error('Failed to create event');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendar-events'] }),
  });

  const updateEvent = useMutation({
    mutationFn: async ({ eventId, eventData }: { eventId: string; eventData: any }) => {
      const session = await getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'update', eventId, eventData }),
      });
      if (!response.ok) throw new Error('Failed to update event');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendar-events'] }),
  });

  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const session = await getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'delete', eventId }),
      });
      if (!response.ok) throw new Error('Failed to delete event');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendar-events'] }),
  });

  return {
    events: (data?.events || []) as CalendarEvent[],
    connected: (data?.connected as boolean) ?? false,
    isLoading,
    refetch,
    createEvent,
    updateEvent,
    deleteEvent,
  };
};
