import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useMemo } from 'react';

import { migrate } from './migrations';
import {
  createChildRepository,
  createCommunicationTypeRepository,
  createDayNoteRepository,
  createEventRepository,
  createGoalSettingRepository,
} from './repositories';

export { addDays, fromLocalDate, msUntilNextMidnight, toLocalDate } from './clock';
export { DATABASE_NAME } from './database';
export { BASE_DATE } from './repositories';
export type {
  ChildRecord,
  CommunicationTypeRecord,
  DayNoteRecord,
  EventRecord,
  GoalSettingRow,
} from './repositories';

/** Passed to `<SQLiteProvider onInit>`: runs before any screen renders. */
export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await migrate(db);
}

export function useRepositories() {
  const db = useSQLiteContext();
  return useMemo(
    () => ({
      children: createChildRepository(db),
      communicationTypes: createCommunicationTypeRepository(db),
      events: createEventRepository(db),
      dayNotes: createDayNoteRepository(db),
      goalSettings: createGoalSettingRepository(db),
    }),
    [db],
  );
}
