import type { SyncResult } from './engine';

export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'error';

export interface SyncState {
  status: SyncStatus;
  /** Local rows the server has not acknowledged yet. */
  pending: number;
  /** Bumps whenever a sync changed local data, so screens can reload. */
  revision: number;
}

interface Engine {
  sync(): Promise<SyncResult>;
  pendingCount(): Promise<number>;
}

export const WRITE_DEBOUNCE_MS = 2000;

/**
 * Decides when to sync and what the indicator says. The engine does the work; this
 * only schedules it: a write schedules one debounced sync, so a burst of taps is one
 * round trip, and `syncNow` (foreground, pull to refresh) skips the wait.
 */
export function createSyncController(engine: Engine, debounceMs = WRITE_DEBOUNCE_MS) {
  let state: SyncState = { status: 'synced', pending: 0, revision: 0 };
  let timer: ReturnType<typeof setTimeout> | null = null;
  let failed = false;
  const listeners = new Set<() => void>();

  const set = (patch: Partial<SyncState>) => {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  };

  const idleStatus = (pending: number): SyncStatus =>
    pending > 0 ? 'pending' : failed ? 'error' : 'synced';

  /** Recounts pending rows, e.g. right after a local write. */
  async function refreshPending() {
    try {
      const pending = await engine.pendingCount();
      if (state.status !== 'syncing') set({ pending, status: idleStatus(pending) });
      else set({ pending });
    } catch {
      // The count is cosmetic; keep the previous one.
    }
  }

  async function syncNow(): Promise<void> {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    set({ status: 'syncing' });
    let changed = false;
    try {
      const result = await engine.sync();
      failed = false;
      changed = result.pulled > 0;
    } catch {
      failed = true;
    }
    let pending = state.pending;
    try {
      pending = await engine.pendingCount();
    } catch {
      // keep the previous count
    }
    set({
      pending,
      status: idleStatus(pending),
      revision: changed ? state.revision + 1 : state.revision,
    });
  }

  /** Call after every local write. */
  function noteWrite() {
    refreshPending();
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      syncNow();
    }, debounceMs);
  }

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    syncNow,
    noteWrite,
    refreshPending,
    /** Cancels a scheduled sync. The controller stays usable (React may re-run effects). */
    dispose() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}

export type SyncController = ReturnType<typeof createSyncController>;
