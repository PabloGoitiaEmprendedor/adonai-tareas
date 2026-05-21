import { supabase } from '@/integrations/supabase/client';

const ANON_USER_ID_KEY = 'adonai_anonymous_user_id';

export function saveAnonymousUserId(userId: string): void {
  const prev = localStorage.getItem(ANON_USER_ID_KEY);
  if (prev && prev !== userId) {
    localStorage.setItem(ANON_USER_ID_KEY + '_prev', prev);
  }
  localStorage.setItem(ANON_USER_ID_KEY, userId);
}

export function getPreviousAnonymousUserId(): string | null {
  return localStorage.getItem(ANON_USER_ID_KEY + '_prev');
}

export function clearAnonymousUserId(): void {
  localStorage.removeItem(ANON_USER_ID_KEY);
  localStorage.removeItem(ANON_USER_ID_KEY + '_prev');
}

export function getCurrentAnonymousUserId(): string | null {
  return localStorage.getItem(ANON_USER_ID_KEY);
}

export async function migrateAnonymousData(oldUserId: string, newUserId: string): Promise<boolean> {
  if (!oldUserId || !newUserId || oldUserId === newUserId) return false;
  try {
    const { error } = await supabase.rpc('migrate_anonymous_data', {
      old_user_id: oldUserId,
      new_user_id: newUserId,
    });
    if (error) {
      console.error('[anonymousSession] Migration RPC error:', error);
      return false;
    }
    console.log(`[anonymousSession] Data migrated from ${oldUserId} to ${newUserId}`);
    localStorage.removeItem(ANON_USER_ID_KEY + '_prev');
    return true;
  } catch (err) {
    console.error('[anonymousSession] Migration exception:', err);
    return false;
  }
}
