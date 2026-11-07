import { BASE_DATE } from '@/db';

import { buildGoalSettings, isLocalDate, programEndFor, programWeeks } from '../goal-settings';

describe('goal settings', () => {
  it('falls back to the plan defaults when nothing is stored', () => {
    const s = buildGoalSettings([], '2026-11-02');
    expect(s.dailyTargetOn('2026-11-02')).toBe(10);
    expect(s.programStart).toBe('2026-11-02');
    expect(s.programEnd).toBe('2027-02-28'); // 17 weeks
    expect(s.mastery).toEqual({ windowDays: 7, greenDays: 5, yellowDays: 1 });
  });

  it('judges each day with the target in force on that date', () => {
    const s = buildGoalSettings(
      [
        { key: 'daily_target', effectiveFrom: BASE_DATE, value: '10' },
        { key: 'daily_target', effectiveFrom: '2026-12-01', value: '12' },
      ],
      '2026-11-02',
    );
    expect(s.dailyTargetOn('2026-11-30')).toBe(10);
    expect(s.dailyTargetOn('2026-12-01')).toBe(12);
    expect(s.dailyTargetOn('2027-01-15')).toBe(12);
  });

  it('keeps the first value for days before the first change', () => {
    const s = buildGoalSettings(
      [{ key: 'daily_target', effectiveFrom: '2026-12-01', value: '12' }],
      '2026-11-02',
    );
    expect(s.dailyTargetOn('2026-11-02')).toBe(12);
  });

  it('ignores unreadable values', () => {
    const s = buildGoalSettings(
      [
        { key: 'daily_target', effectiveFrom: BASE_DATE, value: 'abc' },
        { key: 'program_start', effectiveFrom: BASE_DATE, value: 'hier' },
        { key: 'program_end', effectiveFrom: BASE_DATE, value: '2020-01-01' },
      ],
      '2026-11-02',
    );
    expect(s.dailyTargetOn('2026-11-02')).toBe(10);
    expect(s.programStart).toBe('2026-11-02');
    expect(s.programEnd).toBe('2027-02-28');
  });

  it('computes program end and length', () => {
    expect(programEndFor('2026-11-02', 17)).toBe('2027-02-28');
    expect(programWeeks('2026-11-02', '2027-02-28')).toBe(17);
    expect(programWeeks('2026-11-02', '2026-11-02')).toBe(1);
  });

  it('validates real calendar days only', () => {
    expect(isLocalDate('2026-02-28')).toBe(true);
    expect(isLocalDate('2026-02-30')).toBe(false);
    expect(isLocalDate('26-02-28')).toBe(false);
  });
});
