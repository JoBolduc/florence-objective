import { strings } from '@/ui/strings';

import type { SyncState } from './controller';

/** What the indicator says: synced, syncing, N pending, or an error. */
export function syncLabel(state: SyncState): string {
  switch (state.status) {
    case 'syncing':
      return strings.sync.syncing;
    case 'pending':
      return strings.sync.pending(state.pending);
    case 'error':
      return strings.sync.error;
    case 'synced':
      return strings.sync.synced;
  }
}
