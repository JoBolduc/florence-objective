import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';

import { migrate } from './migrations';
import {
  createChildRepository,
  createDayNoteRepository,
  createEventRepository,
} from './repositories';

export { DATABASE_NAME } from './database';
export type { ChildRecord, DayNoteRecord, EventRecord } from './repositories';

/** Passed to `<SQLiteProvider onInit>`: runs before any screen renders. */
export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await migrate(db);
}

export function useRepositories() {
  const db = useSQLiteContext();
  return {
    children: createChildRepository(db),
    events: createEventRepository(db),
    dayNotes: createDayNoteRepository(db),
  };
}
