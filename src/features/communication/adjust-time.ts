/**
 * Moves an event's time by `minutes`, staying inside the event's own local day and never
 * into the future. Keeping the day fixed means editing the time cannot make the event
 * jump to another day's list.
 */
export function shiftWithinDay(moment: Date, minutes: number, now: Date): Date {
  const startOfDay = new Date(moment.getFullYear(), moment.getMonth(), moment.getDate());
  const nextDay = new Date(moment.getFullYear(), moment.getMonth(), moment.getDate() + 1);
  const latest = Math.min(nextDay.getTime() - 60_000, now.getTime());
  const shifted = moment.getTime() + minutes * 60_000;
  return new Date(Math.max(startOfDay.getTime(), Math.min(shifted, latest)));
}
