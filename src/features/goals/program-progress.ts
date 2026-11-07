import { weekNumber } from './weekly';

export type ProgramProgress =
  | { phase: 'upcoming'; start: string }
  | { phase: 'running'; week: number; weeks: number }
  | { phase: 'finished'; weeks: number };

/**
 * Where `today` falls in the program. Weeks are the same Monday-to-Sunday weeks as the
 * trends, with week 1 being the one holding the start date, so "Sem. 6" means the same
 * thing everywhere.
 */
export function programProgress(start: string, end: string, today: string): ProgramProgress {
  const weeks = weekNumber(start, end);
  if (today < start) return { phase: 'upcoming', start };
  if (today > end) return { phase: 'finished', weeks };
  return { phase: 'running', week: weekNumber(start, today), weeks };
}
