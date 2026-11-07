import { randomUUID } from 'node:crypto';

import { migrate } from '../migrations';
import {
  createChildRepository,
  createDayNoteRepository,
  createEventRepository,
  createGoalSettingRepository,
} from '../repositories';
import { openTestDatabase, testDeps } from '../testing/node-sqlite';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

async function setup() {
  const db = openTestDatabase();
  await migrate(db);
  const { deps, advance } = testDeps();
  const child = await createChildRepository(db, deps).insert({ name: 'Florence' });
  return {
    db,
    advance,
    child,
    events: createEventRepository(db, deps),
    dayNotes: createDayNoteRepository(db, deps),
  };
}

describe('event repository', () => {
  it('inserts with a UUID, sync columns and the local day', async () => {
    const { events, child } = await setup();
    const at = new Date(2026, 10, 2, 23, 45); // local time, late evening

    const event = await events.insert({ childId: child.id, typeId: 'pointer', occurredAt: at });

    expect(event.id).toMatch(UUID);
    expect(event).toMatchObject({
      localDate: '2026-11-02',
      occurredAt: at.toISOString(),
      createdAt: '2026-11-02T14:00:00.000Z',
      updatedAt: '2026-11-02T14:00:00.000Z',
      deletedAt: null,
      loggedBy: null,
      note: null,
    });
    expect(await events.getById(event.id)).toEqual(event);
  });

  it('lists one day newest first, excluding other days and deleted events', async () => {
    const { events, child } = await setup();
    const early = await events.insert({
      childId: child.id,
      typeId: 'a',
      occurredAt: new Date(2026, 10, 2, 8, 0),
    });
    const late = await events.insert({
      childId: child.id,
      typeId: 'b',
      occurredAt: new Date(2026, 10, 2, 18, 0),
    });
    await events.insert({ childId: child.id, typeId: 'c', occurredAt: new Date(2026, 10, 3, 8) });
    const gone = await events.insert({
      childId: child.id,
      typeId: 'd',
      occurredAt: new Date(2026, 10, 2, 12, 0),
    });
    await events.softDelete(gone.id);

    const day = await events.listByDay(child.id, '2026-11-02');

    expect(day.map((e) => e.id)).toEqual([late.id, early.id]);
  });

  it('updates fields, moves the event to its new day and bumps updated_at', async () => {
    const { events, child, advance } = await setup();
    const event = await events.insert({
      childId: child.id,
      typeId: 'a',
      occurredAt: new Date(2026, 10, 2, 9),
    });
    advance(60_000);
    const newTime = new Date(2026, 10, 1, 20);

    const updated = await events.update(event.id, {
      typeId: 'b',
      occurredAt: newTime,
      note: 'au bain',
    });

    expect(updated).toMatchObject({
      typeId: 'b',
      occurredAt: newTime.toISOString(),
      localDate: '2026-11-01',
      note: 'au bain',
      createdAt: '2026-11-02T14:00:00.000Z',
      updatedAt: '2026-11-02T14:01:00.000Z',
    });
  });

  it('counts events by default, and a word marked as not counting stays out of the day count', async () => {
    const { events, child } = await setup();
    const at = new Date(2026, 10, 2, 9);
    await events.insert({ childId: child.id, typeId: 'encore', occurredAt: at });
    const word = await events.insert({
      childId: child.id,
      typeId: 'mot',
      note: 'lait',
      counts: false,
      occurredAt: at,
    });

    expect(word.counts).toBe(false);
    expect(await events.countByDay(child.id, '2026-11-02')).toBe(1);
    expect((await events.listByDay(child.id, '2026-11-02')).map((e) => e.counts).sort()).toEqual([
      false,
      true,
    ]);

    const updated = await events.update(word.id, { counts: true });
    expect(updated).toMatchObject({ counts: true, note: 'lait' });
    expect(await events.countByDay(child.id, '2026-11-02')).toBe(2);
  });

  it('clears a note with null', async () => {
    const { events, child } = await setup();
    const event = await events.insert({ childId: child.id, typeId: 'a', note: 'x' });
    expect((await events.update(event.id, { note: null }))?.note).toBeNull();
  });

  it('soft deletes: the row stays, marked deleted, and can no longer be updated', async () => {
    const { db, events, child, advance } = await setup();
    const event = await events.insert({ childId: child.id, typeId: 'a' });
    advance(1000);

    expect(await events.softDelete(event.id)).toBe(true);
    expect(await events.softDelete(event.id)).toBe(false);

    expect(await events.getById(event.id)).toBeNull();
    expect(await events.update(event.id, { note: 'trop tard' })).toBeNull();
    const raw = await db.getFirstAsync<{ deleted_at: string; updated_at: string }>(
      'SELECT deleted_at, updated_at FROM event WHERE id = ?',
      [event.id],
    );
    expect(raw).toEqual({
      deleted_at: '2026-11-02T14:00:01.000Z',
      updated_at: '2026-11-02T14:00:01.000Z',
    });
  });

  it('rejects an event for an unknown child', async () => {
    const { events } = await setup();
    await expect(events.insert({ childId: randomUUID(), typeId: 'a' })).rejects.toThrow(
      /FOREIGN KEY/,
    );
  });
});

describe('day note repository', () => {
  it('creates the note once per day and replaces its text afterwards', async () => {
    const { dayNotes, child, advance } = await setup();

    const created = await dayNotes.save({
      childId: child.id,
      localDate: '2026-11-02',
      body: 'Bonne journée',
    });
    advance(1000);
    const edited = await dayNotes.save({
      childId: child.id,
      localDate: '2026-11-02',
      body: 'Très bonne journée',
    });

    expect(created.id).toMatch(UUID);
    expect(edited.id).toBe(created.id);
    expect(await dayNotes.getForDay(child.id, '2026-11-02')).toMatchObject({
      body: 'Très bonne journée',
      updatedAt: '2026-11-02T14:00:01.000Z',
    });
  });

  it('starts a fresh note after the previous one was deleted', async () => {
    const { dayNotes, child } = await setup();
    const first = await dayNotes.save({ childId: child.id, localDate: '2026-11-02', body: 'a' });
    await dayNotes.softDelete(first.id);

    expect(await dayNotes.getForDay(child.id, '2026-11-02')).toBeNull();
    const second = await dayNotes.save({ childId: child.id, localDate: '2026-11-02', body: 'b' });
    expect(second.id).not.toBe(first.id);
  });
});

describe('child repository', () => {
  it('creates the child once and returns it afterwards', async () => {
    const db = openTestDatabase();
    await migrate(db);
    const children = createChildRepository(db, testDeps().deps);

    const first = await children.getOrCreateFirst('Florence');
    const again = await children.getOrCreateFirst('Autre');

    expect(again.id).toBe(first.id);
    expect(await children.list()).toHaveLength(1);
  });
});

describe('event counts', () => {
  it('counts live events of one day only', async () => {
    const { events, child } = await setup();
    const day = new Date(2026, 10, 2, 10, 0);
    await events.insert({ childId: child.id, typeId: 'encore', occurredAt: day });
    const gone = await events.insert({ childId: child.id, typeId: 'fini', occurredAt: day });
    await events.insert({
      childId: child.id,
      typeId: 'manger',
      occurredAt: new Date(2026, 10, 3, 8),
    });
    await events.softDelete(gone.id);

    expect(await events.countByDay(child.id, '2026-11-02')).toBe(1);
    expect(await events.countByDay(child.id, '2026-11-03')).toBe(1);
    expect(await events.countByDay(child.id, '2026-11-04')).toBe(0);
  });

  it('counts live events per type for one day', async () => {
    const { events, child } = await setup();
    const day = new Date(2026, 10, 2, 10, 0);
    await events.insert({ childId: child.id, typeId: 'encore', occurredAt: day });
    await events.insert({ childId: child.id, typeId: 'encore', occurredAt: day });
    const gone = await events.insert({ childId: child.id, typeId: 'fini', occurredAt: day });
    await events.insert({ childId: child.id, typeId: 'encore', occurredAt: new Date(2026, 10, 3) });
    await events.softDelete(gone.id);

    expect(await events.countsByType(child.id, '2026-11-02')).toEqual({ encore: 2 });
  });
});

describe('goal setting repository', () => {
  it('replaces a value saved twice for the same date and keeps other dates', async () => {
    const { db } = await setup();
    const repo = createGoalSettingRepository(db);
    await repo.save('daily_target', '10');
    await repo.save('daily_target', '12', '2026-12-01');
    await repo.save('daily_target', '14', '2026-12-01');

    expect(await repo.list()).toEqual([
      { key: 'daily_target', effectiveFrom: '0000-00-00', value: '10' },
      { key: 'daily_target', effectiveFrom: '2026-12-01', value: '14' },
    ]);
  });

  it('finds the first live event date', async () => {
    const { db, events, child } = await setup();
    const repo = createGoalSettingRepository(db);
    expect(await repo.firstEventDate()).toBeNull();
    await events.insert({
      childId: child.id,
      typeId: 'fini',
      occurredAt: new Date(2026, 10, 5, 9),
    });
    const early = await events.insert({
      childId: child.id,
      typeId: 'fini',
      occurredAt: new Date(2026, 10, 3, 9),
    });
    expect(await repo.firstEventDate()).toBe('2026-11-03');
    await events.softDelete(early.id);
    expect(await repo.firstEventDate()).toBe('2026-11-05');
  });
});

describe('event active days', () => {
  it('lists one row per type and day, within the range, without deleted events', async () => {
    const { events, child } = await setup();
    const at = (day: number, hour: number) => new Date(2026, 10, day, hour);
    await events.insert({ childId: child.id, typeId: 'fini', occurredAt: at(2, 9) });
    await events.insert({ childId: child.id, typeId: 'fini', occurredAt: at(2, 15) });
    await events.insert({ childId: child.id, typeId: 'fini', occurredAt: at(3, 9) });
    await events.insert({ childId: child.id, typeId: 'encore', occurredAt: at(10, 9) });
    const gone = await events.insert({ childId: child.id, typeId: 'aider', occurredAt: at(3, 9) });
    await events.softDelete(gone.id);

    const rows = await events.activeDays(child.id, '2026-11-02', '2026-11-08');

    expect(rows).toHaveLength(2);
    expect(rows).toEqual(
      expect.arrayContaining([
        { typeId: 'fini', localDate: '2026-11-02' },
        { typeId: 'fini', localDate: '2026-11-03' },
      ]),
    );
  });
});

describe('counted events per day', () => {
  it('counts only events that count, per day, within the range', async () => {
    const { events, child } = await setup();
    const at = (day: number) => new Date(2026, 10, day, 9);
    await events.insert({ childId: child.id, typeId: 'fini', occurredAt: at(2) });
    await events.insert({ childId: child.id, typeId: 'encore', occurredAt: at(2) });
    await events.insert({ childId: child.id, typeId: 'mot', occurredAt: at(2), counts: false });
    await events.insert({ childId: child.id, typeId: 'fini', occurredAt: at(4) });
    await events.insert({ childId: child.id, typeId: 'fini', occurredAt: new Date(2026, 11, 1) });

    const rows = await events.countsByDayRange(child.id, '2026-11-01', '2026-11-30');

    expect(rows).toHaveLength(2);
    expect(rows).toEqual(
      expect.arrayContaining([
        { localDate: '2026-11-02', total: 2 },
        { localDate: '2026-11-04', total: 1 },
      ]),
    );
  });
});

describe('counted events per type and day', () => {
  it('groups counted events by type and day and skips uncounted ones', async () => {
    const { events, child } = await setup();
    const at = (day: number) => new Date(2026, 10, day, 9);
    await events.insert({ childId: child.id, typeId: 'fini', occurredAt: at(2) });
    await events.insert({ childId: child.id, typeId: 'fini', occurredAt: at(2) });
    await events.insert({ childId: child.id, typeId: 'mot', occurredAt: at(2), counts: false });
    await events.insert({ childId: child.id, typeId: 'mot', occurredAt: at(3), note: 'lait' });

    const rows = await events.countsByTypeAndDay(child.id, '2026-11-01', '2026-11-30');

    expect(rows).toHaveLength(2);
    expect(rows).toEqual(
      expect.arrayContaining([
        { typeId: 'fini', localDate: '2026-11-02', total: 2 },
        { typeId: 'mot', localDate: '2026-11-03', total: 1 },
      ]),
    );
  });
});
