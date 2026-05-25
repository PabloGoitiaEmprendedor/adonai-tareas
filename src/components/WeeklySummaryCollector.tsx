import { useEffect } from 'react';
import { format, startOfWeek } from 'date-fns';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSaveWeeklySummary, useWeeklySummary } from '@/hooks/useWeeklySummary';

// Background job: saves the weekly summary so it appears in Profile.
// Intentionally no UI — the weekly report should "reflect" only in the profile page.
export const WeeklySummaryCollector = () => {
  const { user } = useAuth();
  const { data: metrics } = useWeeklySummary();
  const saveSummary = useSaveWeeklySummary();

  useEffect(() => {
    const run = async () => {
      const today = new Date();
      const isSunday = today.getDay() === 0;
      if (!isSunday || !user || !metrics) return;

      // Only save once per week (start of week = Monday).
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekStartIso = format(weekStart, 'yyyy-MM-dd') + 'T00:00:00';

      const { data: existing } = await supabase
        .from('usage_events')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_type', 'weekly_summary_saved')
        .gte('created_at', weekStartIso)
        .limit(1)
        .maybeSingle();

      if (existing) return;
      await saveSummary(metrics);
    };

    run();
  }, [user?.id, metrics, saveSummary]);

  return null;
};

