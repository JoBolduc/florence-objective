import { randomUUID } from 'node:crypto';

import { migrate } from '../migrations';
import {
  createChildRepository,
  createDayNoteRepository,
  createEventRepository,
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
