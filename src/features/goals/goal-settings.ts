import { addDays, type GoalSettingRow } from '@/db';

export const DEFAULT_DAILY_TARGET = 10;
export const DEFAULT_PROGRAM_WEEKS = 17;
export const MIN_DAILY_TARGET = 1;
export const MAX_DAILY_TARGET = 50;
export const MIN_PROGRAM_WEEKS = 1;
export const MAX_PROGRAM_WEEKS = 52;

export const KEYS = {
  dailyTarget: 'daily_target',
  programStart: 'program_start',
  programEnd: 'program_end',
  masteryWindowDays: 'mastery_window_days',
  masteryGreenDays: 'mastery_green_days',
  masteryYellowDays: 'mastery_yellow_days',
} as const;

export interface GoalSettings {
  /** Signs per day the target was on `localDate`: a change never rewrites past days. */
  dailyTargetOn(localDate: string): number;
  /** First and last local day of the program (YYYY-MM-DD). */
  programStart: string;
  programEnd: string;
  /** Rule behind the per-sign colors (E5-S7). */
  mastery: { windowDays: number; greenDays: number; yellowDays: number };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar day written YYYY-MM-DD. */
export function isLocalDate(text: string): boolean {
  if (!DATE.test(text)) return false;
  const [y, m, d] = text.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** The end day of a program of `weeks` full weeks starting on `start`. */
export function programEndFor(start: string, weeks: number): string {
  return addDays(start, weeks * 7 - 1);
}

/** Whole weeks between the two days, rounded up (a program is counted in weeks). */
export function programWeeks(start: string, end: string): number {
  const days = Math.round(
    (new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) /
      86_400_000,
  );
  return Math.max(1, Math.ceil((days + 1) / 7));
}

function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

/**
 * Turns the stored rows into settings. A missing or unreadable row falls back to the
 * plan's default, so the app always has a complete set. `fallbackStart` is the program
 * start used while none is stored.
 */
export function buildGoalSettings(rows: GoalSettingRow[], fallbackStart: string): GoalSettings {
  const forKey = (key: string) =>
    rows
      .filter((r) => r.key === key)
      .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  const latest = (key: string) => forKey(key).at(-1)?.value;

  const targets = forKey(KEYS.dailyTarget);
  const storedStart = latest(KEYS.programStart);
  const programStart = storedStart && isLocalDate(storedStart) ? storedStart : fallbackStart;
  const storedEnd = latest(KEYS.programEnd);
  const programEnd =
    storedEnd && isLocalDate(storedEnd) && storedEnd >= programStart
      ? storedEnd
      : programEndFor(programStart, DEFAULT_PROGRAM_WEEKS);

  return {
    dailyTargetOn(localDate) {
      // Last change that already took effect; a day before the first change keeps the first value.
      const inForce =
        [...targets].reverse().find((r) => r.effectiveFrom <= localDate) ?? targets[0];
      return positiveInt(inForce?.value, DEFAULT_DAILY_TARGET);
    },
    programStart,
    programEnd,
    mastery: {
      windowDays: positiveInt(latest(KEYS.masteryWindowDays), 7),
      greenDays: positiveInt(latest(KEYS.masteryGreenDays), 5),
      yellowDays: positiveInt(latest(KEYS.masteryYellowDays), 1),
    },
  };
}
