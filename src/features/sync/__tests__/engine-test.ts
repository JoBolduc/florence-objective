import { migrate } from '@/db/migrations';
import {
  createChildRepository,
  createDayNoteRepository,
  createEventRepository,
} from '@/db/repositories';
import { openTestDatabase, testDeps } from '@/db/testing/node-sqlite';

import { createSyncEngine, type SyncRemote, type SyncRow } from '../engine';

/** In-memory server: upserts by id and stamps each change with a growing cursor. */
function createFakeRemote() {
  const tables: Record<string, Map<string, SyncRow & { cursor: string }>> = {};
  let tick = 0;
  const remote: SyncRemote & { failNextPush: boolean; pushCalls: number } = {
    failNextPush: false,
    pushCalls: 0,
    async push(table, rows) {
      remote.pushCalls++;
      if (remote.failNextPush) {
        remote.failNextPush = false;
        throw new Error('offline');
      }
      const store = (tables[table] ??= new Map());
      for (const row of rows) {
        // Like the server trigger: a write older than the stored row is ignored.
        const stored = store.get(row.id as string);
        if (stored && (stored.updated_at as string) > (row.updated_at as string)) continue;
        const cursor = String(++tick).padStart(8, '0');
        store.set(row.id as string, { ...row, cursor });
      }
    },
    async pull(table, cursor, limit) {
      const store = tables[table] ?? new Map();
      const rows = [...store.values()]
        .filter((r) => cursor === null || r.cursor > cursor)
        .sort((a, b) => a.cursor.localeCompare(b.cursor))
        .slice(0, limit);
      const last = rows[rows.length - 1];
      return {
        rows: rows.map(({ cursor: _c, ...row }) => row),
        nextCursor: last ? last.cursor : cursor,
      };
    },
  };
  return { remote, tables };
}

async function phone(remote: SyncRemote, start?: Date) {
  const db = openTestDatabase();
  await migrate(db);
  const { deps, advance } = testDeps(start);
  return {
    db,
    advance,
    engine: createSyncEngine(db, remote),
    children: createChildRepository(db, deps),
    events: createEventRepository(db, deps),
    dayNotes: createDayNoteRepository(db, deps),
  };
}

const total = (p: Awaited<ReturnType<typeof phone>>, childId: string) =>
  p.events.countByDay(childId, '2026-11-02');

describe('sync engine', () => {
  it('converges two phones that logged offline', async () => {
    const { remote } = createFakeRemote();
    const a = await phone(remote);
    const b = await phone(remote);
    const child = await a.children.insert({ name: 'Florence' });
    await a.engine.sync(); // household child reaches the server
    await b.engine.sync();

    for (let i = 0; i < 3; i++) await a.events.insert({ childId: child.id, typeId: 'encore' });
    for (let i = 0; i < 4; i++) await b.events.insert({ childId: child.id, typeId: 'fini' });
    expect(await a.engine.pendingCount()).toBe(3);

    await a.engine.sync();
    await b.engine.sync();
    await a.engine.sync();

    expect(await total(a, child.id)).toBe(7);
    expect(await total(b, child.id)).toBe(7);
    expect(await a.engine.pendingCount()).toBe(0);
    expect(await b.engine.pendingCount()).toBe(0);
  });

  it('never duplicates rows when syncing repeatedly', async () => {
    const { remote, tables } = createFakeRemote();
    const a = await phone(remote);
    const b = await phone(remote);
    const child = await a.children.insert({ name: 'Florence' });
    await a.events.insert({ childId: child.id, typeId: 'encore' });

    for (let i = 0; i < 3; i++) {
      await a.engine.sync();
      await b.engine.sync();
    }

    expect(tables.event.size).toBe(1);
    expect(await total(b, child.id)).toBe(1);
    const second = await a.engine.sync();
    expect(second.pushed).toBe(0);
  });

  it('keeps rows pending when the push fails, then pushes them on the next sync', async () => {
    const { remote } = createFakeRemote();
    const a = await phone(remote);
    const child = await a.children.insert({ name: 'Florence' });
    await a.events.insert({ childId: child.id, typeId: 'encore' });

    remote.failNextPush = true;
    await expect(a.engine.sync()).rejects.toThrow('offline');
    expect(await a.engine.pendingCount()).toBe(2);

    await a.engine.sync();
    expect(await a.engine.pendingCount()).toBe(0);
  });

  it('propagates edits and deletes (last write wins)', async () => {
    const { remote } = createFakeRemote();
    const a = await phone(remote);
    const b = await phone(remote);
    const child = await a.children.insert({ name: 'Florence' });
    const keep = await a.events.insert({ childId: child.id, typeId: 'encore' });
    const drop = await a.events.insert({ childId: child.id, typeId: 'fini' });
    await a.engine.sync();
    await b.engine.sync();

    b.advance(60_000);
    await b.events.update(keep.id, { note: 'edited on b' });
    await b.events.softDelete(drop.id);
    await b.engine.sync();
    await a.engine.sync();

    expect((await a.events.getById(keep.id))?.note).toBe('edited on b');
    expect(await a.events.getById(drop.id)).toBeNull();
  });

  it('keeps the newer edit when both phones edit the same event', async () => {
    const { remote } = createFakeRemote();
    const a = await phone(remote);
    const b = await phone(remote);
    const child = await a.children.insert({ name: 'Florence' });
    const event = await a.events.insert({ childId: child.id, typeId: 'encore' });
    await a.engine.sync();
    await b.engine.sync();

    a.advance(10_000);
    b.advance(20_000); // b edits later
    await a.events.update(event.id, { note: 'from a' });
    await b.events.update(event.id, { note: 'from b' });

    await b.engine.sync();
    await a.engine.sync(); // a's older pending edit loses to b's
    await b.engine.sync();

    expect((await a.events.getById(event.id))?.note).toBe('from b');
    expect((await b.events.getById(event.id))?.note).toBe('from b');
  });

  it('does not lose a local edit made after the version that was pushed', async () => {
    const { remote } = createFakeRemote();
    const a = await phone(remote);
    const child = await a.children.insert({ name: 'Florence' });
    const event = await a.events.insert({ childId: child.id, typeId: 'encore' });
    const push = remote.push.bind(remote);
    let edited = false;
    remote.push = async (table, rows) => {
      await push(table, rows);
      if (table === 'event' && !edited) {
        edited = true;
        a.advance(1000);
        await a.events.update(event.id, { note: 'typed during sync' });
      }
    };

    await a.engine.sync(); // the edit made mid-push is pushed in the same sync

    expect(await a.engine.pendingCount()).toBe(0);
  });

  it('converges when both phones wrote the day note before syncing', async () => {
    const { remote } = createFakeRemote();
    const a = await phone(remote);
    const b = await phone(remote);
    const child = await a.children.insert({ name: 'Florence' });
    await a.engine.sync();
    await b.engine.sync();

    await a.dayNotes.save({ childId: child.id, localDate: '2026-11-02', body: 'from a' });
    b.advance(5000);
    await b.dayNotes.save({ childId: child.id, localDate: '2026-11-02', body: 'from b' });

    await a.engine.sync();
    await b.engine.sync();
    await a.engine.sync();
    await b.engine.sync();

    expect((await a.dayNotes.getForDay(child.id, '2026-11-02'))?.body).toBe('from b');
    expect((await b.dayNotes.getForDay(child.id, '2026-11-02'))?.body).toBe('from b');
  });

  it('runs one sync at a time', async () => {
    const { remote } = createFakeRemote();
    const a = await phone(remote);
    const child = await a.children.insert({ name: 'Florence' });
    await a.events.insert({ childId: child.id, typeId: 'encore' });

    await Promise.all([a.engine.sync(), a.engine.sync(), a.engine.sync()]);

    // child + event pushed once each, plus at most one extra empty pass
    expect(remote.pushCalls).toBe(2);
  });
});
