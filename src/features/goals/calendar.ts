import { toLocalDate } from '@/db';

export type DayLevel = 'empty' | 'below' | 'reached';

/** A day with no counted sign is empty, below the target is "below", at or above is "reached". */
export function dayLevel(count: number, target: number): DayLevel {
  if (count <= 0) return 'empty';
  return count >= target ? 'reached' : 'below';
}

/** "2026-11" for a local date or month key. */
export function monthKey(localDate: string): string {
  return localDate.slice(0, 7);
}

/** First and last local day of a month key (YYYY-MM). */
export function monthRange(key: string): { from: string; to: string } {
  const [y, m] = key.split('-').map(Number);
  return { from: `${key}-01`, to: toLocalDate(new Date(y, m, 0)) };
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * The cells of a month grid, weeks starting on Monday: `null` pads the first week
 * before the 1st, then one local date per day.
 */
export function monthCells(key: string): (string | null)[] {
  const { from, to } = monthRange(key);
  const [y, m] = key.split('-').map(Number);
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const last = Number(to.slice(8));
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= last; d++) cells.push(`${from.slice(0, 8)}${String(d).padStart(2, '0')}`);
  return cells;
}
