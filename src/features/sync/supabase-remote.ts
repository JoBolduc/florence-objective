import type { SupabaseClient } from '@supabase/supabase-js';

import type { SyncRemote, SyncRow } from './engine';

/** Rows pulled again on purpose: a commit can become visible slightly out of order. */
const PULL_OVERLAP_MS = 5000;

const TIMESTAMP_COLUMNS = ['created_at', 'updated_at', 'deleted_at', 'occurred_at'];

/** Local row -> server row: adds the household and turns `counts` into a boolean. */
export function toRemoteRow(row: SyncRow, householdId: string): Record<string, unknown> {
  const remote: Record<string, unknown> = { ...row, household_id: householdId };
  if ('counts' in remote) remote.counts = remote.counts !== 0;
  return remote;
}

/**
 * Server row -> local row. Timestamps come back as `2026-11-02T14:00:00+00:00`; the app
 * compares them as strings, so they are normalised to `...000Z`.
 */
export function fromRemoteRow(remote: Record<string, unknown>): SyncRow {
  const { household_id: _household, server_synced_at: _cursor, ...rest } = remote;
  const row: SyncRow = {};
  for (const [key, value] of Object.entries(rest)) {
    if (value === null || value === undefined) row[key] = null;
    else if (TIMESTAMP_COLUMNS.includes(key)) row[key] = new Date(value as string).toISOString();
    else if (typeof value === 'boolean') row[key] = value ? 1 : 0;
    else row[key] = value as string | number;
  }
  return row;
}

/** Where to resume a pull: the saved cursor, minus the overlap. */
export function pullStart(cursor: string | null): string | null {
  return cursor === null ? null : new Date(Date.parse(cursor) - PULL_OVERLAP_MS).toISOString();
}

export function createSupabaseRemote(client: SupabaseClient, householdId: string): SyncRemote {
  return {
    async push(table, rows) {
      const { error } = await client.from(table).upsert(
        rows.map((r) => toRemoteRow(r, householdId)),
        { onConflict: 'id' },
      );
      if (error) throw new Error(error.message);
    },

    async pull(table, cursor, limit) {
      let query = client.from(table).select('*').eq('household_id', householdId);
      const start = pullStart(cursor);
      if (start) query = query.gt('server_synced_at', start);
      const { data, error } = await query
        .order('server_synced_at', { ascending: true })
        .limit(limit);
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      const last = rows[rows.length - 1] as { server_synced_at?: string } | undefined;
      return {
        rows: rows.map(fromRemoteRow),
        nextCursor: last?.server_synced_at ? new Date(last.server_synced_at).toISOString() : cursor,
      };
    },
  };
}
