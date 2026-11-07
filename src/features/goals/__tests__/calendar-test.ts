import { dayLevel, monthCells, monthRange, shiftMonth } from '../calendar';

describe('calendar', () => {
  it('levels a day against its own target', () => {
    expect(dayLevel(0, 10)).toBe('empty');
    expect(dayLevel(9, 10)).toBe('below');
    expect(dayLevel(10, 10)).toBe('reached');
    expect(dayLevel(12, 10)).toBe('reached');
    expect(dayLevel(9, 8)).toBe('reached');
  });

  it('lays out November 2026 from a Monday start', () => {
    const cells = monthCells('2026-11'); // 1 Nov 2026 is a Sunday
    expect(cells.slice(0, 6).every((c) => c === null)).toBe(true);
    expect(cells[6]).toBe('2026-11-01');
    expect(cells.at(-1)).toBe('2026-11-30');
    expect(cells).toHaveLength(6 + 30);
  });

  it('starts directly on the first column when the 1st is a Monday', () => {
    expect(monthCells('2026-06')[0]).toBe('2026-06-01');
  });

  it('knows month ends, including leap years, and shifts across years', () => {
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });
});
