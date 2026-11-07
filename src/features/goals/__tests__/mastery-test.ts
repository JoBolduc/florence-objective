import { masteryByType, normalizeRule, statusForDays, windowStart } from '../mastery';

const RULE = { windowDays: 7, greenDays: 5, yellowDays: 1 };

describe('mastery', () => {
  it('is grey, yellow or green by the number of days a sign was logged', () => {
    expect(statusForDays(0, RULE)).toBe('grey');
    expect(statusForDays(1, RULE)).toBe('yellow');
    expect(statusForDays(2, RULE)).toBe('yellow');
    expect(statusForDays(4, RULE)).toBe('yellow');
    expect(statusForDays(5, RULE)).toBe('green');
    expect(statusForDays(7, RULE)).toBe('green');
  });

  it('counts days, not events: ten taps on one day is one day', () => {
    const rows = Array.from({ length: 10 }, () => ({ typeId: 'fini', localDate: '2026-11-02' }));
    expect(masteryByType(['fini'], rows, RULE).fini).toEqual({ status: 'yellow', days: 1 });
  });

  it('is green with 5 distinct days and grey when never seen', () => {
    const days = ['01', '02', '04', '05', '07'].map((d) => ({
      typeId: 'encore',
      localDate: `2026-11-${d}`,
    }));
    const result = masteryByType(['encore', 'fache'], days, RULE);
    expect(result.encore).toEqual({ status: 'green', days: 5 });
    expect(result.fache).toEqual({ status: 'grey', days: 0 });
  });

  it('gives Mot no status', () => {
    expect(masteryByType(['mot', 'fini'], [], RULE)).not.toHaveProperty('mot');
  });

  it('follows changed thresholds', () => {
    const rows = [1, 2, 3].map((d) => ({ typeId: 'fini', localDate: `2026-11-0${d}` }));
    const strict = { windowDays: 7, greenDays: 6, yellowDays: 4 };
    expect(masteryByType(['fini'], rows, strict).fini.status).toBe('grey');
    expect(masteryByType(['fini'], rows, { ...RULE, greenDays: 3 }).fini.status).toBe('green');
  });

  it('starts the window so that today is its last day', () => {
    expect(windowStart('2026-11-07', 7)).toBe('2026-11-01');
    expect(windowStart('2026-03-02', 7)).toBe('2026-02-24');
  });

  it('keeps green and yellow inside the window and in order', () => {
    expect(normalizeRule({ windowDays: 4, greenDays: 6, yellowDays: 5 })).toEqual({
      windowDays: 4,
      greenDays: 4,
      yellowDays: 4,
    });
  });
});
