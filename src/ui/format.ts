const LOCALE = 'fr-CA';

// Building a formatter is slow on Android, and event lists will call these once per row.
const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  hour: 'numeric',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** "mardi 3 novembre 2026". The first of the month reads "1er", which Intl leaves out. */
export function formatDate(date: Date): string {
  return dateFormatter.format(date).replace(/(^|\s)1(?=\s)/, (_, before) => `${before}1er`);
}

/** "14 h 05" */
export function formatTime(date: Date): string {
  return timeFormatter.format(date);
}

const monthFormatter = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' });

/** "novembre 2026" */
export function formatMonth(date: Date): string {
  return monthFormatter.format(date);
}
