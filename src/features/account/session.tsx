import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase } from './supabase';

export type SessionState =
  /** The Supabase project is not configured: the app is local-only. */
  | { status: 'unavailable' }
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; session: Session };

const SessionContext = createContext<SessionState>({ status: 'unavailable' });

/** Restores the saved session at launch and follows sign-in, sign-out and token refresh. */
export function SessionProvider({ children }: { children: ReactNode }) {
  // undefined = still restoring the saved session.
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!cancelled) setSession((current) => (current === undefined ? data.session : current));
      })
      .catch(() => {
        if (!cancelled) setSession((current) => (current === undefined ? null : current));
      });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  const state = useMemo<SessionState>(() => {
    if (!supabase) return { status: 'unavailable' };
    if (session === undefined) return { status: 'loading' };
    return session ? { status: 'signedIn', session } : { status: 'signedOut' };
  }, [session]);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);
