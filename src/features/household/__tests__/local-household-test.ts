import { migrate } from '@/db/migrations';
import { createChildRepository, createEventRepository } from '@/db/repositories';
import { openTestDatabase, testDeps } from '@/db/testing/node-sqlite';

import { discardUnsyncedLocalData, getHouseholdId, setHouseholdId } from '../local-household';

describe('local household', () => {
  it('remembers the household id', async () => {
    const db = openTestDatabase();
    await migrate(db);
    expect(await getHouseholdId(db)).toBeNull();

    await setHouseholdId(db, 'h1');
    await setHouseholdId(db, 'h2');

    expect(await getHouseholdId(db)).toBe('h2');
  });

  it('discards only rows that never reached the server', async () => {
    const db = openTestDatabase();
    await migrate(db);
    const { deps } = testDeps();
    const children = createChildRepository(db, deps);
    const events = createEventRepository(db, deps);
    const stray = await children.insert({ name: 'Florence' });
    await events.insert({ childId: stray.id, typeId: 'encore' });
    const shared = await children.insert({ name: 'Household child' });
    await db.runAsync('UPDATE child SET synced_at = updated_at WHERE id = ?', [shared.id]);

    await discardUnsyncedLocalData(db);

    expect((await children.list()).map((c) => c.id)).toEqual([shared.id]);
    expect(await events.countByDay(stray.id, '2026-11-02')).toBe(0);
  });
});
