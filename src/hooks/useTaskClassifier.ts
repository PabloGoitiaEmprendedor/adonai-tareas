import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ClassificationResult {
  refined_title: string;
  description: string;
  importance: boolean;
  urgency: boolean;
  priority: 'high' | 'medium' | 'low';
  estimated_minutes: number;
  context_id: string | null;
  goal_id: string | null;
  reasoning: string;
}

export const useTaskClassifier = () => {
  const [isClassifying, setIsClassifying] = useState(false);

  const classifyTask = async (taskTitle: string, dueDate?: string): Promise<ClassificationResult | null> => {
    setIsClassifying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/classify-task`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ taskTitle, dueDate }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Classification failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Classification error:', error);
      return null;
    } finally {
      setIsClassifying(false);
    }
  };

  return { classifyTask, isClassifying };
};
