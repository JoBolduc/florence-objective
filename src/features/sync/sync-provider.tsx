import { useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { useSession } from '@/features/account/session';
import { supabase } from '@/features/account/supabase';
import { fetchMemberInitials } from '@/features/household/household-api';
import {
  getHouseholdId,
  getMemberInitials,
  setMemberInitials,
} from '@/features/household/local-household';

import { createSyncController, type SyncController, type SyncState } from './controller';
import { createSyncEngine } from './engine';
import { createSupabaseRemote } from './supabase-remote';

/** While the app is open, ask the server for the partner's changes this often. */
const FOREGROUND_POLL_MS = 60_000;

interface SyncContextValue {
  /** False until the parent is signed in and belongs to a household. */
  enabled: boolean;
  state: SyncState;
  /** Initials of each parent by user id, for the timeline. */
  memberInitials: Record<string, string>;
  /** Call after every local write: schedules a debounced sync. */
  noteWrite: () => void;
  /** Sync right now (pull to refresh). Never rejects; the state reports failures. */
  syncNow: () => Promise<void>;
  /** Called once the parent created or joined a household. */
  attachHousehold: (householdId: string) => void;
}

const IDLE: SyncState = { status: 'synced', pending: 0, revision: 0 };

const SyncContext = createContext<SyncContextValue>({
  enabled: false,
  state: IDLE,
  memberInitials: {},
  noteWrite: () => {},
  syncNow: async () => {},
  attachHousehold: () => {},
});

const noSubscription = () => () => {};

export function SyncProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const session = useSession();
  const [householdId, setHousehold] = useState<string | null>(null);
  const [memberInitials, setInitials] = useState<Record<string, string>>({});
  const signedIn = session.status === 'signedIn';

  useEffect(() => {
    let cancelled = false;
    getHouseholdId(db)
      .then((id) => !cancelled && setHousehold(id))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [db]);

  // Creating the controller has no side effects; the effect below starts and stops it.
  const controller = useMemo<SyncController | null>(
    () =>
      supabase && signedIn && householdId
        ? createSyncController(createSyncEngine(db, createSupabaseRemote(supabase, householdId)))
        : null,
    [db, signedIn, householdId],
  );

  useEffect(() => {
    if (!controller) return;
    controller.refreshPending();
    controller.syncNow();
    const poll = setInterval(() => {
      if (AppState.currentState === 'active') controller.syncNow();
    }, FOREGROUND_POLL_MS);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') controller.syncNow();
    });
    return () => {
      clearInterval(poll);
      subscription.remove();
      controller.dispose();
    };
  }, [controller]);

  const state = useSyncExternalStore(
    controller ? controller.subscribe : noSubscription,
    controller ? controller.getState : () => IDLE,
  );

  // Cached initials first (works offline), then refreshed after each sync that changed data.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setInitials(await getMemberInitials(db));
      if (!supabase || !controller) return;
      const fresh = await fetchMemberInitials(supabase);
      await setMemberInitials(db, fresh);
      if (!cancelled) setInitials(fresh);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [db, controller, state.revision]);

  const noteWrite = useCallback(() => controller?.noteWrite(), [controller]);
  const syncNow = useCallback(async () => {
    await controller?.syncNow();
  }, [controller]);

  const value = useMemo<SyncContextValue>(
    () => ({
      enabled: controller !== null,
      state,
      memberInitials,
      noteWrite,
      syncNow,
      attachHousehold: setHousehold,
    }),
    [controller, state, memberInitials, noteWrite, syncNow],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export const useSync = () => useContext(SyncContext);
