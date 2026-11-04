import { openTestDatabase } from '../testing/node-sqlite';
import { createUpdateCheckRepository } from '../update-check';

describe('update check counter', () => {
  it('starts at zero', async () => {
    const repo = createUpdateCheckRepository(openTestDatabase());

    await expect(repo.read()).resolves.toBe(0);
  });

  it('adds one on each increment', async () => {
    const repo = createUpdateCheckRepository(openTestDatabase());

    await expect(repo.increment()).resolves.toBe(1);
    await expect(repo.increment()).resolves.toBe(2);
    await expect(repo.read()).resolves.toBe(2);
  });

  it('keeps the count when the app reopens the same database', async () => {
    const db = openTestDatabase();
    await createUpdateCheckRepository(db).increment();

    await expect(createUpdateCheckRepository(db).read()).resolves.toBe(1);
  });
});
