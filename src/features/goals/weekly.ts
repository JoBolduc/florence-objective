import { addDays } from '@/db';

/** One counted event total for a type on a day. */
export interface TypeDayCount {
  typeId: string;
  localDate: string;
  total: number;
}

export interface WeekStats {
  /** Monday of the week (YYYY-MM-DD). */
  start: string;
  /** 1 for the week the program started in. */
  number: number;
  /** Days of this week that belong to the program so far (partial weeks at both ends). */
  days: number;
  total: number;
  /** Signs per day over `days`. */
  average: number;
  daysAtTarget: number;
  /** Share of `days` that reached that day's target, 0 to 1. */
  shareAtTarget: number;
}

const MS_PER_DAY = 86_400_000;

function dayNumber(localDate: string): number {
  return Math.round(new Date(`${localDate}T00:00:00Z`).getTime() / MS_PER_DAY);
}

/** Days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

/** The Monday of the week holding `localDate`. */
export function weekStartOf(localDate: string): string {
  const weekday = (new Date(`${localDate}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  return addDays(localDate, -weekday);
}

/** "Week 6": 1 for the week holding the program start. */
export function weekNumber(programStart: string, localDate: string): number {
  return Math.floor(daysBetween(weekStartOf(programStart), localDate) / 7) + 1;
}

/** Counted signs per day, from the per-type rows. */
export function totalsByDay(rows: TypeDayCount[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const r of rows) totals[r.localDate] = (totals[r.localDate] ?? 0) + r.total;
  return totals;
}

/**
 * Weekly stats from the program start to the last day (today, or the program end if
 * earlier), oldest week first. Every day is judged against the target of that day.
 */
export function weeklyStats(
  dayTotals: Record<string, number>,
  programStart: string,
  lastDay: string,
  targetOn: (localDate: string) => number,
): WeekStats[] {
  const weeks: WeekStats[] = [];
  if (lastDay < programStart) return weeks;
  for (let start = weekStartOf(programStart); start <= lastDay; start = addDays(start, 7)) {
    let days = 0;
    let total = 0;
    let daysAtTarget = 0;
    for (let i = 0; i < 7; i++) {
      const day = addDays(start, i);
      if (day < programStart || day > lastDay) continue;
      const count = dayTotals[day] ?? 0;
      days++;
      total += count;
      if (count >= targetOn(day)) daysAtTarget++;
    }
    weeks.push({
      start,
      number: weekNumber(programStart, start),
      days,
      total,
      average: days ? total / days : 0,
      daysAtTarget,
      shareAtTarget: days ? daysAtTarget / days : 0,
    });
  }
  return weeks;
}

export interface TypeShare {
  typeId: string;
  total: number;
  /** 0 to 1 of the week's counted signs. */
  share: number;
}

/** Counted signs of the week starting `weekStart`, per type, largest first. */
export function weekBreakdown(rows: TypeDayCount[], weekStart: string): TypeShare[] {
  const weekEnd = addDays(weekStart, 6);
  const totals = new Map<string, number>();
  for (const r of rows) {
    if (r.localDate < weekStart || r.localDate > weekEnd) continue;
    totals.set(r.typeId, (totals.get(r.typeId) ?? 0) + r.total);
  }
  const sum = [...totals.values()].reduce((a, b) => a + b, 0);
  return [...totals.entries()]
    .map(([typeId, total]) => ({ typeId, total, share: sum ? total / sum : 0 }))
    .sort((a, b) => b.total - a.total || a.typeId.localeCompare(b.typeId));
}
