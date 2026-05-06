import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const userRef = useRef<User | null>(null);

  // Keep ref in sync so beforeunload always has latest user
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    let mounted = true;

    // ── 1. Auth state listener (set up BEFORE getSession) ────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      console.log(`[Auth] Event: ${event}`);

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'TOKEN_REFRESHED') {
        console.log('[Auth] Token refreshed');
      }

      if (event === 'SIGNED_IN') {
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
      }

      setLoading(false);
    });

    // ── 2. Initialize: get cached session then refresh token ─────────
    const initAuth = async () => {
      try {
        const { data: { session: cached } } = await supabase.auth.getSession();

        if (!cached) {
          if (mounted) { setSession(null); setUser(null); setLoading(false); }
          return;
        }

        // Show UI immediately with cached session
        if (mounted) { setSession(cached); setUser(cached.user); }

        // KEY FIX: Proactively refresh the token so all API calls use a valid token.
        // Without this, queries fire with the expired cached token and return empty data.
        const { data: { session: fresh }, error } = await supabase.auth.refreshSession();

        if (mounted) {
          if (error || !fresh) {
            // Refresh token is also dead — user must re-login
            console.warn('[Auth] Session expired completely:', error?.message);
            setSession(null);
            setUser(null);
            queryClient.clear();
          } else {
            setSession(fresh);
            setUser(fresh.user);
            if (!sessionStorage.getItem('adonai_session_start')) {
              supabase.from('usage_events').insert({
                user_id: fresh.user.id,
                event_type: 'session_start',
                metadata: { timestamp: new Date().toISOString() },
              }).then(() => {});
              sessionStorage.setItem('adonai_session_start', Date.now().toString());
            }
          }
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
            await supabase.auth.refreshSession();
          }
        }
      } catch (_) { /* silent */ }
    }, 4 * 60 * 1000);

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

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      console.error("Error signing out, forcing local clear", err);
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
