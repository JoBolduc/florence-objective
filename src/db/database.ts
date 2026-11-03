export type SqlValue = string | number | null;

/**
 * The subset of expo-sqlite's `SQLiteDatabase` the db layer relies on.
 * Keeping it narrow lets tests run the real SQL against Node's built-in SQLite.
 */
export interface SqlDatabase {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params: SqlValue[]): Promise<{ changes: number }>;
  getFirstAsync<T>(sql: string, params: SqlValue[]): Promise<T | null>;
  getAllAsync<T>(sql: string, params: SqlValue[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

export const DATABASE_NAME = 'petits-pas.db';
