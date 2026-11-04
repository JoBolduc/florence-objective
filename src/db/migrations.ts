import type { SqlDatabase } from './database';

export interface Migration {
  /** Schema version this migration produces. Versions start at 1 and have no gaps. */
  version: number;
  /** SQL run inside one transaction together with the version bump. */
  up: string;
}

/**
 * Every table carries the same sync-ready columns (E2 sync relies on them):
 * - id: client-generated UUID, never reused
 * - created_at / updated_at: UTC ISO 8601 strings, updated_at drives last-write-wins
 * - deleted_at: soft delete, rows are never removed
 * - logged_by: the parent who wrote the row, null until accounts exist (E2)
 */
const SCHEMA_V1 = `
CREATE TABLE child (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  logged_by TEXT
);

CREATE TABLE event (
  id TEXT PRIMARY KEY NOT NULL,
  child_id TEXT NOT NULL REFERENCES child (id),
  type_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  local_date TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  logged_by TEXT
);

CREATE INDEX event_child_day ON event (child_id, local_date, occurred_at);

CREATE TABLE day_note (
  id TEXT PRIMARY KEY NOT NULL,
  child_id TEXT NOT NULL REFERENCES child (id),
  local_date TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  logged_by TEXT
);

CREATE UNIQUE INDEX day_note_child_day ON day_note (child_id, local_date) WHERE deleted_at IS NULL;
`;

/**
 * Communication types: the behaviours a parent can log (E1-S1). The seven starter
 * types are the words of "Les mains animées" the specialists' plan focuses on.
 * Ids are stable slugs because `event.type_id` points at them. The seed is frozen
 * here: later changes to types go through a new migration or the in-app editor (E6-S5).
 */
const SCHEMA_V2 = `
CREATE TABLE communication_type (
  id TEXT PRIMARY KEY NOT NULL,
  label TEXT NOT NULL,
  icon TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  logged_by TEXT
);

INSERT INTO communication_type (id, label, icon, sort_order, created_at, updated_at) VALUES
  ('encore',   'Encore',   '🔄', 1, '2026-11-03T00:00:00.000Z', '2026-11-03T00:00:00.000Z'),
  ('fini',     'Fini',     '✅', 2, '2026-11-03T00:00:00.000Z', '2026-11-03T00:00:00.000Z'),
  ('fache',    'Fâché',    '😠', 3, '2026-11-03T00:00:00.000Z', '2026-11-03T00:00:00.000Z'),
  ('donner',   'Donner',   '🎁', 4, '2026-11-03T00:00:00.000Z', '2026-11-03T00:00:00.000Z'),
  ('aider',    'Aider',    '🤝', 5, '2026-11-03T00:00:00.000Z', '2026-11-03T00:00:00.000Z'),
  ('attendre', 'Attendre', '⏳', 6, '2026-11-03T00:00:00.000Z', '2026-11-03T00:00:00.000Z'),
  ('manger',   'Manger',   '🍽️', 7, '2026-11-03T00:00:00.000Z', '2026-11-03T00:00:00.000Z');
`;

/** Drops the temporary E0-S2 update-check counter, which lived outside the migrations. */
const SCHEMA_V3 = `DROP TABLE IF EXISTS update_check;`;

export const MIGRATIONS: readonly Migration[] = [
  { version: 1, up: SCHEMA_V1 },
  { version: 2, up: SCHEMA_V2 },
  { version: 3, up: SCHEMA_V3 },
];

export async function getSchemaVersion(db: SqlDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  return row?.user_version ?? 0;
}

/**
 * Brings the database up to the latest version, one migration per transaction,
 * so a crash mid-way leaves the schema at the last completed version.
 * Returns the resulting version.
 */
export async function migrate(
  db: SqlDatabase,
  migrations: readonly Migration[] = MIGRATIONS,
): Promise<number> {
  migrations.forEach((m, i) => {
    if (m.version !== i + 1) {
      throw new Error(`Migration ${i} has version ${m.version}, expected ${i + 1}`);
    }
  });

  const latest = migrations.length;
  let current = await getSchemaVersion(db);
  if (current > latest) {
    throw new Error(`Database is at version ${current}, newer than this app (${latest})`);
  }

  for (const m of migrations.slice(current)) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(m.up);
      // PRAGMA does not accept bound parameters; version is a validated integer.
      await db.execAsync(`PRAGMA user_version = ${m.version}`);
    });
    current = m.version;
  }
  return current;
}
