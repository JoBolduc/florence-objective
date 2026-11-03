import { randomUUID } from 'node:crypto';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import type { RepositoryDeps } from '../clock';
import type { SqlDatabase } from '../database';

/** Real UUIDs from Node (expo-crypto is native, so mocked under Jest) and a controllable clock. */
export function testDeps(start = new Date('2026-11-02T14:00:00.000Z')) {
  let clock = start;
  const deps: RepositoryDeps = { now: () => clock, newId: randomUUID };
  const advance = (ms: number) => {
    clock = new Date(clock.getTime() + ms);
  };
  return { deps, advance };
}

/** Test-only: an in-memory database with the same interface the app gets from expo-sqlite. */
export function openTestDatabase(): SqlDatabase {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  // node:sqlite returns null-prototype rows; spread them into plain objects for assertions.
  const plain = <T>(row: unknown) => ({ ...(row as object) }) as T;

  return {
    async execAsync(sql) {
      db.exec(sql);
    },
    async runAsync(sql, params) {
      const result = db.prepare(sql).run(...(params as SQLInputValue[]));
      return { changes: Number(result.changes) };
    },
    async getFirstAsync<T>(sql: string, params: SQLInputValue[]) {
      const row = db.prepare(sql).get(...params);
      return row === undefined ? null : plain<T>(row);
    },
    async getAllAsync<T>(sql: string, params: SQLInputValue[]) {
      return db
        .prepare(sql)
        .all(...params)
        .map((row) => plain<T>(row));
    },
    async withTransactionAsync(task) {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
