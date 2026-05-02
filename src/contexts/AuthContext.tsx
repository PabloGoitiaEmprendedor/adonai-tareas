import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      // Track session start for analytics
      if (currentUser && _event === 'SIGNED_IN') {
        supabase.from('usage_events').insert({
          user_id: currentUser.id,
          event_type: 'session_start',
          metadata: { timestamp: new Date().toISOString() },
        }).then(() => {});
        // Store session start time for duration calculation
        sessionStorage.setItem('adonai_session_start', Date.now().toString());
      }
      
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      // Track session start for returning users who have a persisted session
      if (currentUser && !sessionStorage.getItem('adonai_session_start')) {
        supabase.from('usage_events').insert({
          user_id: currentUser.id,
          event_type: 'session_start',
          metadata: { timestamp: new Date().toISOString() },
        }).then(() => {});
        sessionStorage.setItem('adonai_session_start', Date.now().toString());
      }
      
      setLoading(false);
    });

    // Track session end and duration on unload
    const handleBeforeUnload = () => {
      const startStr = sessionStorage.getItem('adonai_session_start');
      if (startStr && user) {
        const durationMs = Date.now() - parseInt(startStr, 10);
        const durationMinutes = Math.round(durationMs / 60000);
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/usage_events`;
        const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const payload = JSON.stringify({
          user_id: user.id,
          event_type: 'session_end',
          metadata: { duration_minutes: durationMinutes, timestamp: new Date().toISOString() },
        });
        // sendBeacon doesn't support custom headers, so we use fetch with keepalive instead
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apikey,
            'Authorization': `Bearer ${apikey}`,
            'Prefer': 'return=minimal',
          },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
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
