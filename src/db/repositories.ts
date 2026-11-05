import { defaultDeps, toLocalDate, type RepositoryDeps } from './clock';
import type { SqlDatabase } from './database';

interface SyncColumns {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  loggedBy: string | null;
}

export interface ChildRecord extends SyncColumns {
  name: string;
}

export interface EventRecord extends SyncColumns {
  childId: string;
  typeId: string;
  /** UTC ISO 8601 timestamp. */
  occurredAt: string;
  /** Local calendar day the event belongs to (YYYY-MM-DD). */
  localDate: string;
  note: string | null;
  /** Whether the event counts toward the daily target (false for an off-context word). */
  counts: boolean;
}

export interface DayNoteRecord extends SyncColumns {
  childId: string;
  localDate: string;
  body: string;
}

export interface CommunicationTypeRecord extends SyncColumns {
  label: string;
  /** Emoji shown on the logging button. */
  icon: string;
  /** Position in the type grid, ascending. */
  sortOrder: number;
}

const SYNC_SELECT = `id, created_at AS createdAt, updated_at AS updatedAt,
  deleted_at AS deletedAt, logged_by AS loggedBy`;

const CHILD_SELECT = `SELECT ${SYNC_SELECT}, name FROM child`;
const EVENT_SELECT = `SELECT ${SYNC_SELECT}, child_id AS childId, type_id AS typeId,
  occurred_at AS occurredAt, local_date AS localDate, note, counts FROM event`;

type EventRow = Omit<EventRecord, 'counts'> & { counts: number };
const toEvent = (row: EventRow): EventRecord => ({ ...row, counts: row.counts !== 0 });
const DAY_NOTE_SELECT = `SELECT ${SYNC_SELECT}, child_id AS childId, local_date AS localDate,
  body FROM day_note`;

const COMMUNICATION_TYPE_SELECT = `SELECT ${SYNC_SELECT}, label, icon,
  sort_order AS sortOrder FROM communication_type`;

export function createCommunicationTypeRepository(db: SqlDatabase) {
  return {
    /** Live types in display order. */
    list(): Promise<CommunicationTypeRecord[]> {
      return db.getAllAsync<CommunicationTypeRecord>(
        `${COMMUNICATION_TYPE_SELECT} WHERE deleted_at IS NULL ORDER BY sort_order`,
        [],
      );
    },
  };
}

export function createChildRepository(db: SqlDatabase, deps: RepositoryDeps = defaultDeps) {
  const list = () =>
    db.getAllAsync<ChildRecord>(`${CHILD_SELECT} WHERE deleted_at IS NULL ORDER BY created_at`, []);

  const insert = async (input: {
    name: string;
    loggedBy?: string | null;
  }): Promise<ChildRecord> => {
    const now = deps.now().toISOString();
    const record: ChildRecord = {
      id: deps.newId(),
      name: input.name,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      loggedBy: input.loggedBy ?? null,
    };
    await db.runAsync(
      `INSERT INTO child (id, name, created_at, updated_at, deleted_at, logged_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
      [record.id, record.name, now, now, null, record.loggedBy],
    );
    return record;
  };

  return {
    insert,

    list,

    /** The first child, created with `name` on first launch (the app tracks one child). */
    async getOrCreateFirst(name: string): Promise<ChildRecord> {
      const [first] = await list();
      return first ?? insert({ name });
    },
  };
}

export function createEventRepository(db: SqlDatabase, deps: RepositoryDeps = defaultDeps) {
  const getById = async (id: string) => {
    const row = await db.getFirstAsync<EventRow>(
      `${EVENT_SELECT} WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
    return row ? toEvent(row) : null;
  };

  return {
    getById,

    async insert(input: {
      childId: string;
      typeId: string;
      occurredAt?: Date;
      note?: string | null;
      counts?: boolean;
      loggedBy?: string | null;
    }): Promise<EventRecord> {
      const now = deps.now();
      const occurred = input.occurredAt ?? now;
      const record: EventRecord = {
        id: deps.newId(),
        childId: input.childId,
        typeId: input.typeId,
        occurredAt: occurred.toISOString(),
        localDate: toLocalDate(occurred),
        note: input.note ?? null,
        counts: input.counts ?? true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        deletedAt: null,
        loggedBy: input.loggedBy ?? null,
      };
      await db.runAsync(
        `INSERT INTO event (id, child_id, type_id, occurred_at, local_date, note, counts,
           created_at, updated_at, deleted_at, logged_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          record.childId,
          record.typeId,
          record.occurredAt,
          record.localDate,
          record.note,
          record.counts ? 1 : 0,
          record.createdAt,
          record.updatedAt,
          null,
          record.loggedBy,
        ],
      );
      return record;
    },

    /** Number of live events on one local day that count toward the daily target. */
    async countByDay(childId: string, localDate: string): Promise<number> {
      const row = await db.getFirstAsync<{ total: number }>(
        `SELECT COUNT(*) AS total FROM event
         WHERE child_id = ? AND local_date = ? AND deleted_at IS NULL AND counts = 1`,
        [childId, localDate],
      );
      return row?.total ?? 0;
    },

    /** Live events of one local day, per type id. Types never logged are absent. */
    async countsByType(childId: string, localDate: string): Promise<Record<string, number>> {
      const rows = await db.getAllAsync<{ typeId: string; total: number }>(
        `SELECT type_id AS typeId, COUNT(*) AS total FROM event
         WHERE child_id = ? AND local_date = ? AND deleted_at IS NULL
         GROUP BY type_id`,
        [childId, localDate],
      );
      return Object.fromEntries(rows.map((r) => [r.typeId, r.total]));
    },

    /** Live events of one local day, newest first. */
    async listByDay(childId: string, localDate: string): Promise<EventRecord[]> {
      const rows = await db.getAllAsync<EventRow>(
        `${EVENT_SELECT} WHERE child_id = ? AND local_date = ? AND deleted_at IS NULL
         ORDER BY occurred_at DESC`,
        [childId, localDate],
      );
      return rows.map(toEvent);
    },

    /** Returns the updated event, or null if it does not exist or was deleted. */
    async update(
      id: string,
      patch: { typeId?: string; occurredAt?: Date; note?: string | null; counts?: boolean },
    ): Promise<EventRecord | null> {
      const sets: string[] = [];
      const params: (string | null)[] = [];
      if (patch.typeId !== undefined) {
        sets.push('type_id = ?');
        params.push(patch.typeId);
      }
      if (patch.occurredAt !== undefined) {
        sets.push('occurred_at = ?', 'local_date = ?');
        params.push(patch.occurredAt.toISOString(), toLocalDate(patch.occurredAt));
      }
      if (patch.note !== undefined) {
        sets.push('note = ?');
        params.push(patch.note);
      }
      if (patch.counts !== undefined) {
        sets.push('counts = ?');
        params.push(patch.counts ? '1' : '0');
      }
      sets.push('updated_at = ?');
      params.push(deps.now().toISOString());

      const result = await db.runAsync(
        `UPDATE event SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
        [...params, id],
      );
      return result.changes > 0 ? getById(id) : null;
    },

    /** Marks the event deleted; the row stays so the deletion can sync. */
    async softDelete(id: string): Promise<boolean> {
      const now = deps.now().toISOString();
      const result = await db.runAsync(
        `UPDATE event SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
        [now, now, id],
      );
      return result.changes > 0;
    },
  };
}

export function createDayNoteRepository(db: SqlDatabase, deps: RepositoryDeps = defaultDeps) {
  const getForDay = (childId: string, localDate: string) =>
    db.getFirstAsync<DayNoteRecord>(
      `${DAY_NOTE_SELECT} WHERE child_id = ? AND local_date = ? AND deleted_at IS NULL`,
      [childId, localDate],
    );

  return {
    getForDay,

    /** Creates the day's note, or replaces its text if one exists. */
    async save(input: {
      childId: string;
      localDate: string;
      body: string;
      loggedBy?: string | null;
    }): Promise<DayNoteRecord> {
      const now = deps.now().toISOString();
      const existing = await getForDay(input.childId, input.localDate);
      if (existing) {
        await db.runAsync(`UPDATE day_note SET body = ?, updated_at = ? WHERE id = ?`, [
          input.body,
          now,
          existing.id,
        ]);
        return { ...existing, body: input.body, updatedAt: now };
      }
      const record: DayNoteRecord = {
        id: deps.newId(),
        childId: input.childId,
        localDate: input.localDate,
        body: input.body,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        loggedBy: input.loggedBy ?? null,
      };
      await db.runAsync(
        `INSERT INTO day_note (id, child_id, local_date, body, created_at, updated_at,
           deleted_at, logged_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [record.id, record.childId, record.localDate, record.body, now, now, null, record.loggedBy],
      );
      return record;
    },

    async softDelete(id: string): Promise<boolean> {
      const now = deps.now().toISOString();
      const result = await db.runAsync(
        `UPDATE day_note SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
        [now, now, id],
      );
      return result.changes > 0;
    },
  };
}
