import { useQuery } from '@tanstack/react-query';
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
  htmlLink: string;
}

export const useCalendarEvents = (timeMin?: string, timeMax?: string) => {
  const { user } = useAuth();

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
          body: JSON.stringify({ timeMin, timeMax }),
        }
      );

      if (!response.ok) return { events: [], connected: false };
      return await response.json();
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return {
    events: (data?.events || []) as CalendarEvent[],
    connected: data?.connected || false,
    isLoading,
    refetch,
  };
};
