import { randomUUID } from 'expo-crypto';

/** Time and id sources, injectable so tests are deterministic. */
export interface RepositoryDeps {
  now: () => Date;
  newId: () => string;
}

export const defaultDeps: RepositoryDeps = {
  now: () => new Date(),
  newId: randomUUID,
};

/** Calendar day (YYYY-MM-DD) of a moment, in the phone's local time zone. */
export function toLocalDate(moment: Date): string {
  const y = moment.getFullYear();
  const m = String(moment.getMonth() + 1).padStart(2, '0');
  const d = String(moment.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Local midnight at the start of `localDate` (YYYY-MM-DD), as a Date. */
export function fromLocalDate(localDate: string): Date {
  const [y, m, d] = localDate.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Milliseconds from `now` to the next local midnight (the start of the next day). */
export function msUntilNextMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}
