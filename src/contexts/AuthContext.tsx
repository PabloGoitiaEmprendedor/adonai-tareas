import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  ensureAnonymousSession,
  saveAnonymousUserId,
  getPreviousAnonymousUserId,
  migrateAnonymousData,
  migrateStoredAnonymousDataToUser,
  getPendingAnonymousEmailUpgradeUserId,
  clearAnonymousEmailUpgrade,
} from '@/lib/anonymousSession';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
  isAnonymous: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const userRef = useRef<User | null>(null);
  const manualSignOutRef = useRef(false);

  // Keep ref in sync so beforeunload always has latest user
  useEffect(() => { userRef.current = user; }, [user]);

  // ── Helpers for session persistence tracking ──────────────────────
  const saveSessionFlags = (session: Session | null) => {
    if (session?.user) {
      localStorage.setItem('adonai_had_session', 'true');
      localStorage.setItem('adonai_session_type', session.user.is_anonymous ? 'anonymous' : 'email');
      if (!session.user.is_anonymous) {
        localStorage.setItem('adonai_has_linked_account', 'true');
      }
      if (session.user.is_anonymous) {
        saveAnonymousUserId(session.user.id);
      }
    } else {
      localStorage.removeItem('adonai_had_session');
      localStorage.removeItem('adonai_session_type');
    }
  };

  const clearSessionFlags = () => {
    localStorage.removeItem('adonai_had_session');
    localStorage.removeItem('adonai_session_type');
    localStorage.removeItem('adonai_anonymous_user_id_prev');
  };

  useEffect(() => {
    let mounted = true;

    // ── 1. Auth state listener (set up BEFORE getSession) ────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      console.log(`[Auth] Event: ${event}`);

      const previousUser = userRef.current;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'TOKEN_REFRESHED') {
        console.log('[Auth] Token refreshed');
        saveSessionFlags(newSession);
      }

      if (event === 'SIGNED_IN') {
        saveSessionFlags(newSession);
        if (newSession?.user && !newSession.user.is_anonymous) {
          const pendingAnonymousUserId = getPendingAnonymousEmailUpgradeUserId();
          const previousAnonymousUserId = previousUser?.is_anonymous ? previousUser.id : null;
          const anonymousUserId = pendingAnonymousUserId || previousAnonymousUserId;
          migrateStoredAnonymousDataToUser(newSession.user.id, anonymousUserId).then((ok) => {
            if (ok) {
              console.log('[Auth] Anonymous data linked to email account');
              queryClient.invalidateQueries();
              clearAnonymousEmailUpgrade();
            }
          });
        }
        if (newSession?.provider_token) {
          console.log('[Auth] Google provider token detected, saving for calendar sync');
          const expiresAt = new Date(Date.now() + 3500 * 1000).toISOString();
          supabase.from('google_calendar_tokens').upsert({
            user_id: newSession.user.id,
            access_token: newSession.provider_token,
            refresh_token: newSession.provider_refresh_token || '',
            expires_at: expiresAt,
            email: newSession.user.email
          }, { onConflict: 'user_id' }).then(({ error }) => {
            if (error) console.error("Error saving calendar token:", error);
            else {
              console.log("Calendar token saved successfully");
              supabase.from('settings').upsert({ user_id: newSession.user.id, calendar_connected: true }, { onConflict: 'user_id' }).then(()=>{});
            }
          });
        }
        if (newSession?.user && !sessionStorage.getItem('adonai_session_start')) {
          supabase.from('usage_events').insert({
            user_id: newSession.user.id,
            event_type: 'session_start',
            metadata: { timestamp: new Date().toISOString() },
          }).then(() => {});
          sessionStorage.setItem('adonai_session_start', Date.now().toString());
        }
        // queryClient.invalidateQueries();
      }

      if (event === 'SIGNED_OUT') {
        queryClient.clear();
        // Auto-recover anonymous sessions that expired (not manual sign out)
        const prevUser = userRef.current;
        const isEmailUpgrade = Boolean(getPendingAnonymousEmailUpgradeUserId());
        if (!manualSignOutRef.current && prevUser?.is_anonymous && !isEmailUpgrade) {
          const oldUserId = prevUser.id;
          ensureAnonymousSession().then((session) => {
            if (session && mounted) {
              setSession(session);
              setUser(session.user);
              saveSessionFlags(session);
              // Migrate data from expired session to new one
              if (oldUserId !== session.user.id) {
                migrateAnonymousData(oldUserId, session.user.id);
              }
            }
          }).catch((error) => console.error('[Auth] Anonymous auto-recovery failed:', error));
        }
        if (manualSignOutRef.current) {
          clearSessionFlags();
        }
        manualSignOutRef.current = false;
      }

      setLoading(false);
    });

    // ── 2. Initialize: get cached session or recover ───
    const initAuth = async () => {
      try {
        const { data: { session: cached } } = await supabase.auth.getSession();

        if (!cached) {
          const hadSession = localStorage.getItem('adonai_had_session') === 'true';
          const sessionType = localStorage.getItem('adonai_session_type');

          if (hadSession && sessionType === 'anonymous') {
            console.log('[Auth] Recovering expired anonymous session');
            const oldUserId = getPreviousAnonymousUserId();
            try {
              const recovered = await ensureAnonymousSession();
              if (recovered && mounted) {
                setSession(recovered);
                setUser(recovered.user);
                saveSessionFlags(recovered);
                setLoading(false);
                // Migrate data from old anonymous user to new one
                if (oldUserId && oldUserId !== recovered.user.id) {
                  migrateAnonymousData(oldUserId, recovered.user.id).then((ok) => {
                    if (ok) console.log('[Auth] Anonymous data migration complete');
                    else console.warn('[Auth] Anonymous data migration failed or skipped');
                  });
                }
                return;
              }
            } catch {
              console.log('[Auth] Anonymous recovery failed, showing welcome');
            }
          }

          console.log('[Auth] No cached session — showing welcome screen');
          if (mounted) {
            setSession(null);
            setUser(null);
            setLoading(false);
          }
          return;
        }

        // Sesión cachead existente — intentar refresh inmediato si está por expirar
        if (cached.expires_at) {
          const expiresMs = cached.expires_at * 1000;
          if (expiresMs - Date.now() < 60 * 1000) {
            console.log('[Auth] Session expiring soon on init, refreshing...');
            try {
              const { data: refreshed } = await supabase.auth.refreshSession();
              if (refreshed?.session && mounted) {
                setSession(refreshed.session);
                setUser(refreshed.session.user);
                saveSessionFlags(refreshed.session);
                setLoading(false);
                return;
              }
            } catch {
              console.log('[Auth] Refresh on init failed, using cached');
            }
          }
        }

        if (mounted) {
          setSession(cached);
          setUser(cached.user);
          saveSessionFlags(cached);
          setLoading(false);
        }
      } catch (err) {
        console.error('[Auth] Init error:', err);
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // ── 3. Periodic health check — refresh before token expires ──────
    const healthCheck = setInterval(async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (s?.expires_at) {
          const expiresMs = s.expires_at * 1000;
          if (expiresMs - Date.now() < 5 * 60 * 1000) {
            console.log('[Auth] Proactive refresh — token expiring soon');
            const { data: refreshed } = await supabase.auth.refreshSession();
            if (refreshed?.session) {
              saveSessionFlags(refreshed.session);
            }
          }
        }
      } catch (_) { /* silent */ }
    }, 2 * 60 * 1000); // Cada 2 minutos en lugar de 4

    // ── 4. Session end tracking ──────────────────────────────────────
    const handleBeforeUnload = () => {
      const currentUser = userRef.current;
      const startStr = sessionStorage.getItem('adonai_session_start');
      if (startStr && currentUser) {
        const durationMinutes = Math.round((Date.now() - parseInt(startStr, 10)) / 60000);
        const url = 'https://bpckgibqjrqdxzbvtiyn.supabase.co/rest/v1/usage_events';
        const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwY2tnaWJxanJxZHh6YnZ0aXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0OTMyNTAsImV4cCI6MjA5MzA2OTI1MH0.zitsCHcdKbw6fQ0Hbl5CTv-6AEJww72Hb5b3pqy6sKU';
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

    // ── 5. Failsafe timeout ──────────────────────────────────────────
    const timeout = setTimeout(() => {
      if (mounted) {
        console.log('[Auth] Timeout safety — forcing loading=false');
        setLoading(false);
      }
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      clearInterval(healthCheck);
      subscription.unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [queryClient]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signInAnonymously = async () => {
    setLoading(true);
    try {
      const anonymousSession = await ensureAnonymousSession();
      saveSessionFlags(anonymousSession);
      setSession(anonymousSession);
      setUser(anonymousSession.user);
    } catch (error) {
      setLoading(false);
      throw error;
    }
    setLoading(false);
  };

  const signOut = async () => {
    manualSignOutRef.current = true;
    try {
      const wasAnonymous = user?.is_anonymous ?? false;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Solo auto-crear sesión anónima si el usuario era anónimo
      // Si tenía email, redirigir a la pantalla de inicio de sesión
      if (wasAnonymous) {
        await signInAnonymously();
      }
    } catch (err) {
      console.error("Error signing out, forcing local clear", err);
      localStorage.clear();
      window.location.reload();
    }
  };

  const isAnonymous = user?.is_anonymous ?? false;

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signInAnonymously, signOut, isAnonymous }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
