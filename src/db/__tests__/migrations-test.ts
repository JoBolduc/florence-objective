import { getSchemaVersion, migrate, MIGRATIONS, type Migration } from '../migrations';
import { createChildRepository, createEventRepository } from '../repositories';
import { openTestDatabase, testDeps } from '../testing/node-sqlite';

const tableNames = async (db: ReturnType<typeof openTestDatabase>) =>
  (
    await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      [],
    )
  ).map((t) => t.name);

describe('migrate', () => {
  it('creates schema v1 on a fresh install', async () => {
    const db = openTestDatabase();
    expect(await getSchemaVersion(db)).toBe(0);

    expect(await migrate(db)).toBe(1);

    expect(await getSchemaVersion(db)).toBe(1);
    expect(await tableNames(db)).toEqual(['child', 'day_note', 'event']);
  });

  it('is a no-op when already up to date', async () => {
    const db = openTestDatabase();
    await migrate(db);
    expect(await migrate(db)).toBe(1);
  });

  it('applies a v2 migration on existing data with no loss', async () => {
    const db = openTestDatabase();
    await migrate(db);
    const { deps } = testDeps();
    const child = await createChildRepository(db, deps).insert({ name: 'Florence' });
    const events = createEventRepository(db, deps);
    const at = new Date(2026, 10, 2, 9, 30);
    const first = await events.insert({ childId: child.id, typeId: 'pointer', occurredAt: at });
    const second = await events.insert({
      childId: child.id,
      typeId: 'regard',
      occurredAt: at,
      note: 'à la fenêtre',
    });

    const v2: Migration = {
      version: 2,
      up: `ALTER TABLE event ADD COLUMN intensity INTEGER NOT NULL DEFAULT 1;
           CREATE TABLE activity (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL);`,
    };
    expect(await migrate(db, [...MIGRATIONS, v2])).toBe(2);

    expect(await tableNames(db)).toContain('activity');
    const rows = await db.getAllAsync<{ id: string; note: string | null; intensity: number }>(
      'SELECT id, note, intensity FROM event ORDER BY note',
      [],
    );
    expect(rows).toEqual([
      { id: first.id, note: null, intensity: 1 },
      { id: second.id, note: 'à la fenêtre', intensity: 1 },
    ]);
    expect(await events.listByDay(child.id, '2026-11-02')).toHaveLength(2);
  });

  it('rolls back a failing migration and keeps the previous version', async () => {
    const db = openTestDatabase();
    await migrate(db);
    const broken: Migration = {
      version: 2,
      up: 'CREATE TABLE half_done (id TEXT); INSERT INTO missing_table VALUES (1);',
    };

    await expect(migrate(db, [...MIGRATIONS, broken])).rejects.toThrow();

    expect(await getSchemaVersion(db)).toBe(1);
    expect(await tableNames(db)).not.toContain('half_done');
  });

  it('refuses a database newer than the app', async () => {
    const db = openTestDatabase();
    await db.execAsync('PRAGMA user_version = 5');
    await expect(migrate(db)).rejects.toThrow(/newer than this app/);
  });

  it('rejects migrations with gaps in their versions', async () => {
    const db = openTestDatabase();
    await expect(migrate(db, [...MIGRATIONS, { version: 3, up: '' }])).rejects.toThrow(
      /expected 2/,
    );
  });
});
