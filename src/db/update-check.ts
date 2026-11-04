import type { SqlDatabase } from './database';

/**
 * Temporary (E0-S2): a saved counter that shows local data survives installing a newer APK.
 * Its table stays outside the migrations so it never touches the real schema.
 * Remove with E1-S2, and drop the table in that story's migration.
 */
export function createUpdateCheckRepository(db: SqlDatabase) {
  const ensureTable = () =>
    db.execAsync(
      `CREATE TABLE IF NOT EXISTS update_check (
         id INTEGER PRIMARY KEY CHECK (id = 1),
         count INTEGER NOT NULL
       )`,
    );

  const read = async () => {
    await ensureTable();
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT count FROM update_check WHERE id = 1`,
      [],
    );
    return row?.count ?? 0;
  };

  return {
    read,

    async increment(): Promise<number> {
      await ensureTable();
      await db.runAsync(
        `INSERT INTO update_check (id, count) VALUES (1, 1)
         ON CONFLICT (id) DO UPDATE SET count = count + 1`,
        [],
      );
      return read();
    },
  };
}
