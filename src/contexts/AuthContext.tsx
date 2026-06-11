import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useClerk, useSession, useUser as useClerkUser } from '@clerk/react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  getCurrentAnonymousUserId,
  getPreviousAnonymousUserId,
  migrateStoredAnonymousDataToUser,
  clearAnonymousUserId,
} from '@/lib/anonymousSession';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  isAnonymous: boolean;
  hasAnonymousData: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type ClerkBridgeResponse = {
  email: string;
  internal_user_id: string;
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    aud: string;
    role: string;
    email: string;
    app_metadata: Record<string, unknown>;
    user_metadata: Record<string, unknown>;
  };
};

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAnonymousData, setHasAnonymousData] = useState(false);
  const { isLoaded: userLoaded, user: clerkUser } = useClerkUser();
  const { isLoaded: sessionLoaded, session: clerkSession } = useSession();
  const clerk = useClerk();
  const queryClient = useQueryClient();
  const syncKeyRef = useRef<string | null>(null);
  const userRef = useRef<User | null>(null);

  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    const hadSession = localStorage.getItem('adonai_had_session') === 'true';
    const sessionType = localStorage.getItem('adonai_session_type');
    if (hadSession && sessionType === 'anonymous') {
      setHasAnonymousData(true);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const clearInternalSession = async () => {
      syncKeyRef.current = null;
      setSession(null);
      setUser(null);
      queryClient.clear();
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.warn('[Auth] Failed to clear internal Supabase session', error);
      }
      if (mounted) setLoading(false);
    };

    const syncClerkToSupabase = async () => {
      if (!userLoaded || !sessionLoaded) return;

      if (!clerkUser) {
        await clearInternalSession();
        return;
      }

      if (!clerkSession) {
        setLoading(true);
        return;
      }

      const syncKey = `${clerkUser.id}:${clerkSession.id}`;
      if (syncKeyRef.current === syncKey) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const clerkToken = await clerkSession.getToken();
        if (!clerkToken) throw new Error('No Clerk session token');

        const { data, error: invokeError } = await supabase.functions.invoke<ClerkBridgeResponse>('clerk-supabase-token', {
          headers: { Authorization: `Bearer ${clerkToken}` },
        });
        if (invokeError) {
          let detail = invokeError.message;
          try {
            const ctx = (invokeError as { context?: Response | { error?: string } }).context;
            if (ctx && 'json' in ctx && typeof ctx.json === 'function') {
              const body = await ctx.json();
              if (body?.error) detail = body.error;
            } else if (ctx && typeof ctx === 'object' && 'error' in ctx) {
              detail = (ctx as { error: string }).error;
            }
          } catch (_) { /* ignore parse errors */ }
          throw new Error(detail);
        }
        if (!data?.email || !data.access_token || typeof data.refresh_token !== 'string') {
          throw new Error('Invalid Clerk bridge response');
        }

        const anonymousUserId = getCurrentAnonymousUserId() || getPreviousAnonymousUserId();

        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (sessionError) throw sessionError;
        if (!sessionData.session?.user) throw new Error('Internal Supabase session was not created');

        const verifiedSession = sessionData.session;

        const newUserId = verifiedSession.user.id;
        if (anonymousUserId && anonymousUserId !== newUserId) {
          console.log('[Auth] Migrating anonymous data to Clerk-linked account');
          await migrateStoredAnonymousDataToUser(newUserId, anonymousUserId).then((ok) => {
            if (ok) {
              console.log('[Auth] Anonymous data migrated successfully');
              queryClient.invalidateQueries();
              clearAnonymousUserId();
            }
          });
        }

        localStorage.setItem('adonai_had_session', 'true');
        localStorage.setItem('adonai_session_type', 'clerk');
        localStorage.setItem('adonai_has_linked_account', 'true');

        syncKeyRef.current = syncKey;
        if (!mounted) return;
        setSession(verifiedSession);
        setUser(verifiedSession.user);
        setHasAnonymousData(false);
        queryClient.invalidateQueries();
      } catch (error) {
        syncKeyRef.current = null;
        console.error('[Auth] Clerk to Supabase bridge failed:', error);
        const msg = error instanceof Error ? error.message : 'Error desconocido';
        if (typeof window !== 'undefined') toast.error(`Error al conectar sesión: ${msg}`);
        if (!mounted) return;
        setSession(null);
        setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void syncClerkToSupabase();

    return () => {
      mounted = false;
    };
  }, [clerkSession, clerkUser, queryClient, sessionLoaded, userLoaded]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentUser = userRef.current;
      const startStr = sessionStorage.getItem('adonai_session_start');
      if (startStr && currentUser) {
        const durationMinutes = Math.round((Date.now() - parseInt(startStr, 10)) / 60000);
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/usage_events`;
        const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apikey,
            'Authorization': `Bearer ${apikey}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            user_id: currentUser.id,
            event_type: 'session_end',
            metadata: { duration_minutes: durationMinutes, timestamp: new Date().toISOString() },
          }),
          keepalive: true,
        }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const healthCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    healthCheckRef.current = setInterval(async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (s?.expires_at) {
          const expiresMs = s.expires_at * 1000;
          if (expiresMs - Date.now() < 5 * 60 * 1000) {
            console.log('[Auth] Proactive refresh — token expiring soon');
            await supabase.auth.refreshSession();
          }
        }
      } catch (_) { /* silent */ }
    }, 2 * 60 * 1000);
    return () => {
      if (healthCheckRef.current) clearInterval(healthCheckRef.current);
    };
  }, []);

  const signIn = async () => {
    clerk.openSignIn();
  };

  const signOut = async () => {
    syncKeyRef.current = null;
    queryClient.clear();
    try {
      await supabase.auth.signOut();
    } finally {
      await clerk.signOut();
      setSession(null);
      setUser(null);
      setHasAnonymousData(false);
      localStorage.removeItem('adonai_had_session');
      localStorage.removeItem('adonai_session_type');
    }
  };

  const isAnonymous = user?.is_anonymous ?? false;

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signOut, isAnonymous, hasAnonymousData }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export { AuthProvider };
