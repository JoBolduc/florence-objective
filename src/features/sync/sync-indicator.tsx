import { AppText } from '@/ui/app-text';

import { syncLabel } from './sync-label';
import { useSync } from './sync-provider';

/** Small line under the date: synced, syncing, N pending, or error. Hidden without sync. */
export function SyncIndicator() {
  const { enabled, state } = useSync();
  if (!enabled) return null;
  return (
    <AppText
      variant="caption"
      color={state.status === 'error' ? 'danger' : 'textMuted'}
      accessibilityLiveRegion="polite"
      style={{ textAlign: 'center' }}
    >
      {syncLabel(state)}
    </AppText>
  );
}
