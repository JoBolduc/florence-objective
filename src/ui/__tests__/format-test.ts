import { formatDate, formatTime } from '../format';

// Intl separates some words with non-breaking spaces; only the words matter here.
const plainSpaces = (text: string) => text.replace(/\s/g, ' ');

describe('formatDate', () => {
  it('writes the full date in French', () => {
    expect(plainSpaces(formatDate(new Date(2026, 10, 3, 14, 5)))).toBe('mardi 3 novembre 2026');
  });

  it('writes the first of the month as 1er', () => {
    expect(plainSpaces(formatDate(new Date(2026, 10, 1)))).toBe('dimanche 1er novembre 2026');
  });

  it.each([
    [new Date(2026, 10, 11), 'mercredi 11 novembre 2026'],
    [new Date(2026, 10, 21), 'samedi 21 novembre 2026'],
  ])('leaves other days ending in 1 alone', (date, expected) => {
    expect(plainSpaces(formatDate(date))).toBe(expected);
  });
});

describe('formatTime', () => {
  it('uses the 24-hour French form', () => {
    expect(plainSpaces(formatTime(new Date(2026, 10, 3, 14, 5)))).toBe('14 h 05');
  });

  it('starts the day at 0 h', () => {
    expect(plainSpaces(formatTime(new Date(2026, 10, 3, 0, 5)))).toBe('0 h 05');
  });
});
