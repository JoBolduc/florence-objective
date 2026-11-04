import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useMemo } from 'react';

import { migrate } from './migrations';
import {
  createChildRepository,
  createCommunicationTypeRepository,
  createDayNoteRepository,
  createEventRepository,
} from './repositories';
import { createUpdateCheckRepository } from './update-check';

export { DATABASE_NAME } from './database';
export type {
  ChildRecord,
  CommunicationTypeRecord,
  DayNoteRecord,
  EventRecord,
} from './repositories';

/** Passed to `<SQLiteProvider onInit>`: runs before any screen renders. */
export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await migrate(db);
}

export function useRepositories() {
  const db = useSQLiteContext();
  return {
    children: createChildRepository(db),
    communicationTypes: createCommunicationTypeRepository(db),
    events: createEventRepository(db),
    dayNotes: createDayNoteRepository(db),
  };
}

export function useUpdateCheckRepository() {
  const db = useSQLiteContext();
  return useMemo(() => createUpdateCheckRepository(db), [db]);
}
