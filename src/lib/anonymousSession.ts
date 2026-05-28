import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

const ANON_USER_ID_KEY = 'adonai_anonymous_user_id';
const ANON_UPGRADE_KEY = 'adonai_anonymous_upgrade_user_id';
const AUTH_LOCK_RETRY_DELAYS_MS = [150, 350, 700, 1200, 2000];

let pendingAnonymousSession: Promise<Session> | null = null;

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

export function beginAnonymousEmailUpgrade(userId?: string | null): string | null {
  const anonymousUserId = userId || getCurrentAnonymousUserId() || getPreviousAnonymousUserId();
  if (anonymousUserId) {
    localStorage.setItem(ANON_UPGRADE_KEY, anonymousUserId);
  }
  return anonymousUserId;
}

export function getPendingAnonymousEmailUpgradeUserId(): string | null {
  return localStorage.getItem(ANON_UPGRADE_KEY);
}

export function clearAnonymousEmailUpgrade(): void {
  localStorage.removeItem(ANON_UPGRADE_KEY);
}

function isAuthLockError(error: unknown): boolean {
  const err = error as { name?: string; message?: string; isAcquireTimeout?: boolean };
  const message = `${err?.name ?? ''} ${err?.message ?? ''}`.toLowerCase();
  return Boolean(
    err?.isAcquireTimeout ||
      message.includes('lock broken') ||
      message.includes('steal') ||
      message.includes('navigator lock') ||
      message.includes('acquire lock') ||
      message.includes('aborterror')
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureAnonymousSessionInternal(): Promise<Session> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= AUTH_LOCK_RETRY_DELAYS_MS.length; attempt++) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        return sessionData.session;
      }

      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      if (!data.session?.user) throw new Error('No se pudo crear sesion anonima');

      return data.session;
    } catch (error) {
      lastError = error;
      if (!isAuthLockError(error) || attempt === AUTH_LOCK_RETRY_DELAYS_MS.length) {
        throw error;
      }

      await wait(AUTH_LOCK_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('No se pudo crear sesion anonima');
}

export async function ensureAnonymousSession(): Promise<Session> {
  if (!pendingAnonymousSession) {
    pendingAnonymousSession = ensureAnonymousSessionInternal().finally(() => {
      pendingAnonymousSession = null;
    });
  }

  return pendingAnonymousSession;
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

export async function migrateStoredAnonymousDataToUser(newUserId: string, oldUserId?: string | null): Promise<boolean> {
  const anonymousUserId = oldUserId || getPendingAnonymousEmailUpgradeUserId() || getCurrentAnonymousUserId() || getPreviousAnonymousUserId();
  if (!anonymousUserId || !newUserId || anonymousUserId === newUserId) return false;

  const migrationKey = `adonai_anonymous_migrated_${anonymousUserId}_${newUserId}`;
  if (localStorage.getItem(migrationKey) === 'true') return false;

  const migrated = await migrateAnonymousData(anonymousUserId, newUserId);
  if (migrated) {
    localStorage.setItem(migrationKey, 'true');
    clearAnonymousEmailUpgrade();
    clearAnonymousUserId();
    localStorage.setItem('adonai_session_type', 'email');
  }

  return migrated;
}
