import { addDays } from '@/db';
import { WORD_TYPE_ID } from '@/features/communication/word-type';

export type MasteryStatus = 'grey' | 'yellow' | 'green';

export interface MasteryRule {
  /** Days looked at, today included. */
  windowDays: number;
  /** Days with the sign needed for green. */
  greenDays: number;
  /** Days with the sign needed for yellow. */
  yellowDays: number;
}

/** First day of the window that ends on `today`. */
export function windowStart(today: string, windowDays: number): string {
  return addDays(today, -(windowDays - 1));
}

export function statusForDays(days: number, rule: MasteryRule): MasteryStatus {
  if (days >= rule.greenDays) return 'green';
  if (days >= rule.yellowDays) return 'yellow';
  return 'grey';
}

/**
 * Status and day count of every type that has a status. `activeDays` has one row per type
 * and day it was logged on. The Mot type has none: each word is different, so how often
 * the type is used says nothing about one sign.
 */
export function masteryByType(
  typeIds: string[],
  activeDays: { typeId: string; localDate: string }[],
  rule: MasteryRule,
): Record<string, { status: MasteryStatus; days: number }> {
  const distinct = new Map<string, Set<string>>();
  for (const row of activeDays) {
    const set = distinct.get(row.typeId) ?? new Set<string>();
    set.add(row.localDate);
    distinct.set(row.typeId, set);
  }
  const result: Record<string, { status: MasteryStatus; days: number }> = {};
  for (const id of typeIds) {
    if (id === WORD_TYPE_ID) continue;
    const days = distinct.get(id)?.size ?? 0;
    result[id] = { status: statusForDays(days, rule), days };
  }
  return result;
}

/** Keeps green >= yellow >= 1 and both within the window. */
export function normalizeRule(rule: MasteryRule): MasteryRule {
  const windowDays = Math.max(1, rule.windowDays);
  const greenDays = Math.min(Math.max(1, rule.greenDays), windowDays);
  const yellowDays = Math.min(Math.max(1, rule.yellowDays), greenDays);
  return { windowDays, greenDays, yellowDays };
}
