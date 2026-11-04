import { getSchemaVersion, migrate, MIGRATIONS, type Migration } from '../migrations';
import {
  createChildRepository,
  createCommunicationTypeRepository,
  createEventRepository,
} from '../repositories';
import { openTestDatabase, testDeps } from '../testing/node-sqlite';

const LATEST = MIGRATIONS.length;

const tableNames = async (db: ReturnType<typeof openTestDatabase>) =>
  (
    await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      [],
    )
  ).map((t) => t.name);

describe('migrate', () => {
  it('creates the latest schema on a fresh install', async () => {
    const db = openTestDatabase();
    expect(await getSchemaVersion(db)).toBe(0);

    expect(await migrate(db)).toBe(LATEST);

    expect(await getSchemaVersion(db)).toBe(LATEST);
    expect(await tableNames(db)).toEqual(['child', 'communication_type', 'day_note', 'event']);
  });

  it('is a no-op when already up to date', async () => {
    const db = openTestDatabase();
    await migrate(db);
    expect(await migrate(db)).toBe(LATEST);
  });

  it('seeds the seven communication types in the specialists’ order', async () => {
    const db = openTestDatabase();
    await migrate(db);

    const types = await createCommunicationTypeRepository(db).list();

    expect(types.map((t) => [t.id, t.label, t.icon, t.sortOrder])).toEqual([
      ['encore', 'Encore', '🔄', 1],
      ['fini', 'Fini', '✅', 2],
      ['fache', 'Fâché', '😠', 3],
      ['donner', 'Donner', '🎁', 4],
      ['aider', 'Aider', '🤝', 5],
      ['attendre', 'Attendre', '⏳', 6],
      ['manger', 'Manger', '🍽️', 7],
    ]);
    expect(new Set(types.map((t) => t.icon)).size).toBe(7);
  });

  it('adds the communication types to a v1 database without touching its data', async () => {
    const db = openTestDatabase();
    await migrate(db, MIGRATIONS.slice(0, 1));
    const { deps } = testDeps();
    const child = await createChildRepository(db, deps).insert({ name: 'Florence' });
    const event = await createEventRepository(db, deps).insert({
      childId: child.id,
      typeId: 'encore',
    });

    expect(await migrate(db)).toBe(LATEST);

    expect(await createCommunicationTypeRepository(db).list()).toHaveLength(7);
    expect(await createEventRepository(db, deps).getById(event.id)).toMatchObject({
      typeId: 'encore',
    });
  });

  it('applies a later migration on existing data with no loss', async () => {
    const db = openTestDatabase();
    await migrate(db);
    const { deps } = testDeps();
    const child = await createChildRepository(db, deps).insert({ name: 'Florence' });
    const events = createEventRepository(db, deps);
    const at = new Date(2026, 10, 2, 9, 30);
    const first = await events.insert({ childId: child.id, typeId: 'donner', occurredAt: at });
    const second = await events.insert({
      childId: child.id,
      typeId: 'manger',
      occurredAt: at,
      note: 'à la fenêtre',
    });

    const next: Migration = {
      version: LATEST + 1,
      up: `ALTER TABLE event ADD COLUMN intensity INTEGER NOT NULL DEFAULT 1;
           CREATE TABLE activity (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL);`,
    };
    expect(await migrate(db, [...MIGRATIONS, next])).toBe(LATEST + 1);

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
      version: LATEST + 1,
      up: 'CREATE TABLE half_done (id TEXT); INSERT INTO missing_table VALUES (1);',
    };

    await expect(migrate(db, [...MIGRATIONS, broken])).rejects.toThrow();

    expect(await getSchemaVersion(db)).toBe(LATEST);
    expect(await tableNames(db)).not.toContain('half_done');
  });

  it('refuses a database newer than the app', async () => {
    const db = openTestDatabase();
    await db.execAsync(`PRAGMA user_version = ${LATEST + 3}`);
    await expect(migrate(db)).rejects.toThrow(/newer than this app/);
  });

  it('rejects migrations with gaps in their versions', async () => {
    const db = openTestDatabase();
    await expect(migrate(db, [...MIGRATIONS, { version: LATEST + 2, up: '' }])).rejects.toThrow(
      new RegExp(`expected ${LATEST + 1}`),
    );
  });
});

describe('migration 3', () => {
  it('drops the temporary update_check table and keeps its absence idempotent', async () => {
    const db = openTestDatabase();
    await migrate(db, MIGRATIONS.slice(0, 2));
    await db.execAsync('CREATE TABLE update_check (id INTEGER PRIMARY KEY, count INTEGER)');

    await migrate(db);
    expect(await tableNames(db)).not.toContain('update_check');

    const fresh = openTestDatabase();
    await migrate(fresh);
    expect(await tableNames(fresh)).not.toContain('update_check');
  });
});
