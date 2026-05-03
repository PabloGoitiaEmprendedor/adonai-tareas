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
    let mounted = true;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser && _event === 'SIGNED_IN') {
        supabase.from('usage_events').insert({
          user_id: currentUser.id,
          event_type: 'session_start',
          metadata: { timestamp: new Date().toISOString() },
        }).then(() => {});
        sessionStorage.setItem('adonai_session_start', Date.now().toString());
      }
      
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser && !sessionStorage.getItem('adonai_session_start')) {
        supabase.from('usage_events').insert({
          user_id: currentUser.id,
          event_type: 'session_start',
          metadata: { timestamp: new Date().toISOString() },
        }).then(() => {});
        sessionStorage.setItem('adonai_session_start', Date.now().toString());
      }
      
      setLoading(false);
    }).catch(() => {
      if (mounted) setLoading(false);
    });

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

    // Failsafe: si después de 5 segundos sigue cargando, forzar false
    const timeout = setTimeout(() => {
      if (mounted) {
        console.log('AuthContext: Timeout, setting loading to false');
        setLoading(false);
      }
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

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
      // Fallback: forcefully clear local storage if token was expired and network fails
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
