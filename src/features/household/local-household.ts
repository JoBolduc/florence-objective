import type { SqlDatabase } from '@/db/database';

const KEY = 'household_id';

/** The household this phone syncs with, or null before the parent created or joined one. */
export async function getHouseholdId(db: SqlDatabase): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_state WHERE key = ?',
    [KEY],
  );
  return row?.value ?? null;
}

export async function setHouseholdId(db: SqlDatabase, householdId: string): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO sync_state (key, value) VALUES (?, ?)', [
    KEY,
    householdId,
  ]);
}

/**
 * Joining a partner's household: whatever this phone logged on its own child was never
 * shared, and the household has its own child. Drops those never-synced rows so the
 * household's child is the only one. (Merging two phones that both logged before the
 * household existed is out of scope, E2-S4.)
 */
export async function discardUnsyncedLocalData(db: SqlDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM event WHERE synced_at IS NULL', []);
    await db.runAsync('DELETE FROM day_note WHERE synced_at IS NULL', []);
    await db.runAsync('DELETE FROM child WHERE synced_at IS NULL', []);
  });
}
