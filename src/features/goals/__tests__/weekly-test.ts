import {
  totalsByDay,
  weekBreakdown,
  weekNumber,
  weekStartOf,
  weeklyStats,
  type TypeDayCount,
} from '../weekly';

const ten = () => 10;

describe('weekly stats', () => {
  it('starts weeks on Monday', () => {
    expect(weekStartOf('2026-11-02')).toBe('2026-11-02'); // Monday
    expect(weekStartOf('2026-11-08')).toBe('2026-11-02'); // Sunday
    expect(weekStartOf('2026-11-09')).toBe('2026-11-09');
  });

  it('numbers weeks from the program start', () => {
    expect(weekNumber('2026-11-04', '2026-11-04')).toBe(1);
    expect(weekNumber('2026-11-04', '2026-11-09')).toBe(2);
    expect(weekNumber('2026-11-04', '2026-12-14')).toBe(7);
  });

  it('averages over the days of the program only, in partial first and last weeks', () => {
    // Program starts Wednesday 4 Nov; today is Friday 13 Nov.
    const totals = { '2026-11-04': 10, '2026-11-05': 4, '2026-11-09': 12, '2026-11-10': 8 };
    const weeks = weeklyStats(totals, '2026-11-04', '2026-11-13', ten);

    expect(weeks).toHaveLength(2);
    expect(weeks[0]).toMatchObject({ number: 1, days: 5, total: 14, daysAtTarget: 1 });
    expect(weeks[0].average).toBeCloseTo(2.8);
    expect(weeks[1]).toMatchObject({ number: 2, days: 5, total: 20, daysAtTarget: 1 });
    expect(weeks[1].shareAtTarget).toBeCloseTo(0.2);
  });

  it('judges each day with its own target', () => {
    const target = (d: string) => (d < '2026-11-10' ? 10 : 6);
    const weeks = weeklyStats(
      { '2026-11-09': 8, '2026-11-10': 8 },
      '2026-11-09',
      '2026-11-10',
      target,
    );
    expect(weeks[0].daysAtTarget).toBe(1);
  });

  it('is empty before the program starts', () => {
    expect(weeklyStats({}, '2026-12-01', '2026-11-13', ten)).toEqual([]);
  });
});

describe('week breakdown', () => {
  const rows: TypeDayCount[] = [
    { typeId: 'fini', localDate: '2026-11-02', total: 3 },
    { typeId: 'encore', localDate: '2026-11-02', total: 2 },
    { typeId: 'fini', localDate: '2026-11-04', total: 1 },
    { typeId: 'fini', localDate: '2026-11-09', total: 9 },
  ];

  it('adds up to the weekly total and ignores other weeks', () => {
    const shares = weekBreakdown(rows, '2026-11-02');
    expect(shares).toEqual([
      { typeId: 'fini', total: 4, share: 4 / 6 },
      { typeId: 'encore', total: 2, share: 2 / 6 },
    ]);
    const weekTotal = weeklyStats(totalsByDay(rows), '2026-11-02', '2026-11-08', ten)[0].total;
    expect(shares.reduce((n, s) => n + s.total, 0)).toBe(weekTotal);
  });

  it('is empty for a week without signs', () => {
    expect(weekBreakdown(rows, '2026-11-16')).toEqual([]);
  });
});
