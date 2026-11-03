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
}

export interface DayNoteRecord extends SyncColumns {
  childId: string;
  localDate: string;
  body: string;
}

const SYNC_SELECT = `id, created_at AS createdAt, updated_at AS updatedAt,
  deleted_at AS deletedAt, logged_by AS loggedBy`;

const CHILD_SELECT = `SELECT ${SYNC_SELECT}, name FROM child`;
const EVENT_SELECT = `SELECT ${SYNC_SELECT}, child_id AS childId, type_id AS typeId,
  occurred_at AS occurredAt, local_date AS localDate, note FROM event`;
const DAY_NOTE_SELECT = `SELECT ${SYNC_SELECT}, child_id AS childId, local_date AS localDate,
  body FROM day_note`;

export function createChildRepository(db: SqlDatabase, deps: RepositoryDeps = defaultDeps) {
  return {
    async insert(input: { name: string; loggedBy?: string | null }): Promise<ChildRecord> {
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
    },

    list(): Promise<ChildRecord[]> {
      return db.getAllAsync<ChildRecord>(
        `${CHILD_SELECT} WHERE deleted_at IS NULL ORDER BY created_at`,
        [],
      );
    },
  };
}

export function createEventRepository(db: SqlDatabase, deps: RepositoryDeps = defaultDeps) {
  const getById = (id: string) =>
    db.getFirstAsync<EventRecord>(`${EVENT_SELECT} WHERE id = ? AND deleted_at IS NULL`, [id]);

  return {
    getById,

    async insert(input: {
      childId: string;
      typeId: string;
      occurredAt?: Date;
      note?: string | null;
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
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        deletedAt: null,
        loggedBy: input.loggedBy ?? null,
      };
      await db.runAsync(
        `INSERT INTO event (id, child_id, type_id, occurred_at, local_date, note,
           created_at, updated_at, deleted_at, logged_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          record.childId,
          record.typeId,
          record.occurredAt,
          record.localDate,
          record.note,
          record.createdAt,
          record.updatedAt,
          null,
          record.loggedBy,
        ],
      );
      return record;
    },

    /** Live events of one local day, newest first. */
    listByDay(childId: string, localDate: string): Promise<EventRecord[]> {
      return db.getAllAsync<EventRecord>(
        `${EVENT_SELECT} WHERE child_id = ? AND local_date = ? AND deleted_at IS NULL
         ORDER BY occurred_at DESC`,
        [childId, localDate],
      );
    },

    /** Returns the updated event, or null if it does not exist or was deleted. */
    async update(
      id: string,
      patch: { typeId?: string; occurredAt?: Date; note?: string | null },
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
