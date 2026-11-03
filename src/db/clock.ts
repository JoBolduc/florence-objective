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
