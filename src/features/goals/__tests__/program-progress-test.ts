import { programProgress } from '../program-progress';

// 17 weeks from Monday 2 Nov 2026 end on Sunday 28 Feb 2027.
const START = '2026-11-02';
const END = '2027-02-28';

describe('program progress', () => {
  it('computes the week from the start date', () => {
    expect(programProgress(START, END, '2026-11-02')).toEqual({
      phase: 'running',
      week: 1,
      weeks: 17,
    });
    expect(programProgress(START, END, '2026-12-07')).toMatchObject({ week: 6 });
    expect(programProgress(START, END, '2027-02-28')).toMatchObject({ week: 17, weeks: 17 });
  });

  it('knows before and after the program', () => {
    expect(programProgress(START, END, '2026-10-30')).toEqual({ phase: 'upcoming', start: START });
    expect(programProgress(START, END, '2027-03-01')).toEqual({ phase: 'finished', weeks: 17 });
  });

  it('counts the start week even when the program starts mid-week', () => {
    expect(programProgress('2026-11-04', '2027-03-02', '2026-11-08')).toMatchObject({ week: 1 });
    expect(programProgress('2026-11-04', '2027-03-02', '2026-11-09')).toMatchObject({ week: 2 });
  });
});
