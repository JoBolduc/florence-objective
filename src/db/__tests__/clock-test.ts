import { fromLocalDate, msUntilNextMidnight, toLocalDate } from '../clock';

describe('local day helpers', () => {
  it('assigns 23:59 to its own day and 00:01 to the next', () => {
    expect(toLocalDate(new Date(2026, 10, 4, 23, 59))).toBe('2026-11-04');
    expect(toLocalDate(new Date(2026, 10, 5, 0, 1))).toBe('2026-11-05');
  });

  it('round-trips a local date', () => {
    expect(toLocalDate(fromLocalDate('2026-11-04'))).toBe('2026-11-04');
  });

  it('counts the time left until the next local midnight', () => {
    expect(msUntilNextMidnight(new Date(2026, 10, 4, 23, 59))).toBe(60_000);
    expect(msUntilNextMidnight(new Date(2026, 10, 4, 0, 0))).toBe(24 * 3_600_000);
  });
});
