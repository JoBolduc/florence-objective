import type { SqlDatabase, SqlValue } from '@/db/database';

/** A row as exchanged with the server: snake_case columns, timestamps as ISO 8601 UTC. */
export type SyncRow = Record<string, SqlValue>;

export interface SyncTable {
  name: string;
  columns: readonly string[];
}

const SYNC_COLUMNS = ['id', 'created_at', 'updated_at', 'deleted_at', 'logged_by'] as const;

/** Parents first: events and notes point at the child. */
export const SYNC_TABLES: readonly SyncTable[] = [
  { name: 'child', columns: [...SYNC_COLUMNS, 'name'] },
  { name: 'day_note', columns: [...SYNC_COLUMNS, 'child_id', 'local_date', 'body'] },
  {
    name: 'event',
    columns: [
      ...SYNC_COLUMNS,
      'child_id',
      'type_id',
      'occurred_at',
      'local_date',
      'note',
      'counts',
    ],
  },
];

/**
 * The server side of the sync. Implementations convert to/from the engine's row shape
 * (ISO timestamps, `counts` as 0/1) and own the cursor format.
 */
export interface SyncRemote {
  /** Upserts rows by id. Resolves only once the server has stored all of them. */
  push(table: string, rows: SyncRow[]): Promise<void>;
  /** Rows the server changed after `cursor` (null = from the start), oldest first. */
  pull(
    table: string,
    cursor: string | null,
    limit: number,
  ): Promise<{ rows: SyncRow[]; nextCursor: string | null }>;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
}

const PUSH_BATCH = 200;
const PULL_PAGE = 500;

const PENDING = '(synced_at IS NULL OR updated_at > synced_at)';

export function createSyncEngine(db: SqlDatabase, remote: SyncRemote) {
  /** Rows written locally that the server has not acknowledged yet. */
  async function pendingCount(): Promise<number> {
    let total = 0;
    for (const table of SYNC_TABLES) {
      const row = await db.getFirstAsync<{ n: number }>(
        `SELECT COUNT(*) AS n FROM ${table.name} WHERE ${PENDING}`,
        [],
      );
      total += row?.n ?? 0;
    }
    return total;
  }

  async function pushTable(table: SyncTable): Promise<number> {
    let pushed = 0;
    for (;;) {
      const rows = await db.getAllAsync<SyncRow>(
        `SELECT ${table.columns.join(', ')} FROM ${table.name}
         WHERE ${PENDING} ORDER BY updated_at, id LIMIT ${PUSH_BATCH}`,
        [],
      );
      if (rows.length === 0) return pushed;
      await remote.push(table.name, rows);
      // Acknowledge the version that was sent: an edit made while pushing stays pending.
      await db.withTransactionAsync(async () => {
        for (const row of rows) {
          await db.runAsync(`UPDATE ${table.name} SET synced_at = ? WHERE id = ?`, [
            row.updated_at,
            row.id,
          ]);
        }
      });
      pushed += rows.length;
    }
  }

  /**
   * Two phones can each create the day's note before syncing, but only one live note per
   * child and day may exist. The later edit (then the greater id) wins on both phones.
   * Returns false when the incoming note loses and must be stored as deleted.
   */
  async function resolveDayNoteClash(incoming: SyncRow): Promise<boolean> {
    const other = await db.getFirstAsync<{ id: string; updated_at: string }>(
      `SELECT id, updated_at FROM day_note
       WHERE child_id = ? AND local_date = ? AND deleted_at IS NULL AND id <> ?`,
      [incoming.child_id, incoming.local_date, incoming.id],
    );
    if (!other) return true;
    const incomingAt = incoming.updated_at as string;
    const incomingWins =
      incomingAt > other.updated_at ||
      (incomingAt === other.updated_at && (incoming.id as string) > other.id);
    if (!incomingWins) return false;
    // The local note loses: delete it, stamped later than both so the deletion syncs.
    const now = new Date().toISOString();
    const stamp = now > incomingAt ? now : incomingAt;
    await db.runAsync(`UPDATE day_note SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
      stamp,
      stamp,
      other.id,
    ]);
    return true;
  }

  /** Applies one server row unless a newer local edit wins (last write wins by updated_at). */
  async function applyRemoteRow(table: SyncTable, remoteRow: SyncRow): Promise<boolean> {
    const local = await db.getFirstAsync<{ updated_at: string; synced_at: string | null }>(
      `SELECT updated_at, synced_at FROM ${table.name} WHERE id = ?`,
      [remoteRow.id],
    );
    const remoteUpdatedAt = remoteRow.updated_at as string;
    if (local) {
      const pending = local.synced_at === null || local.updated_at > local.synced_at;
      if (pending && local.updated_at > remoteUpdatedAt) return false;
    }

    const row = { ...remoteRow };
    if (table.name === 'day_note' && row.deleted_at === null) {
      if (!(await resolveDayNoteClash(row))) row.deleted_at = remoteUpdatedAt;
    }

    const cols = [...table.columns, 'synced_at'];
    const values = [...table.columns.map((c) => row[c] ?? null), remoteUpdatedAt];
    const updates = cols
      .filter((c) => c !== 'id')
      .map((c) => `${c} = excluded.${c}`)
      .join(', ');
    await db.runAsync(
      `INSERT INTO ${table.name} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})
       ON CONFLICT (id) DO UPDATE SET ${updates}`,
      values,
    );
    return true;
  }

  async function pullTable(table: SyncTable): Promise<number> {
    const key = `cursor:${table.name}`;
    const saved = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM sync_state WHERE key = ?`,
      [key],
    );
    let cursor = saved?.value ?? null;
    let pulled = 0;
    for (;;) {
      const page = await remote.pull(table.name, cursor, PULL_PAGE);
      // The page and its cursor commit together: a crash re-pulls the page, never skips it.
      await db.withTransactionAsync(async () => {
        for (const row of page.rows) {
          if (await applyRemoteRow(table, row)) pulled++;
        }
        if (page.nextCursor !== null) {
          await db.runAsync(`INSERT OR REPLACE INTO sync_state (key, value) VALUES (?, ?)`, [
            key,
            page.nextCursor,
          ]);
        }
      });
      const progressed = page.nextCursor !== null && page.nextCursor !== cursor;
      cursor = page.nextCursor ?? cursor;
      if (page.rows.length < PULL_PAGE || !progressed) return pulled;
    }
  }

  async function runOnce(): Promise<SyncResult> {
    let pushed = 0;
    let pulled = 0;
    for (const table of SYNC_TABLES) pushed += await pushTable(table);
    for (const table of SYNC_TABLES) pulled += await pullTable(table);
    return { pushed, pulled };
  }

  // One sync at a time; a request made during a run triggers one more pass afterwards,
  // so a write landing mid-sync is never left waiting for the next trigger.
  let running: Promise<SyncResult> | null = null;
  let again = false;

  function sync(): Promise<SyncResult> {
    if (running) {
      again = true;
      return running;
    }
    running = (async () => {
      const total: SyncResult = { pushed: 0, pulled: 0 };
      try {
        do {
          again = false;
          const result = await runOnce();
          total.pushed += result.pushed;
          total.pulled += result.pulled;
        } while (again);
        return total;
      } finally {
        running = null;
      }
    })();
    return running;
  }

  return { sync, pendingCount };
}

export type SyncEngine = ReturnType<typeof createSyncEngine>;
