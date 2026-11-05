import { shiftWithinDay } from '../adjust-time';

const NOW = new Date(2026, 10, 4, 18, 0);

describe('shiftWithinDay', () => {
  it('moves the time by the given minutes', () => {
    const moved = shiftWithinDay(new Date(2026, 10, 4, 10, 0), -5, NOW);
    expect(moved).toEqual(new Date(2026, 10, 4, 9, 55));
  });

  it('stops at the start of the day', () => {
    const moved = shiftWithinDay(new Date(2026, 10, 4, 0, 20), -60, NOW);
    expect(moved).toEqual(new Date(2026, 10, 4, 0, 0));
  });

  it('never goes past the current time', () => {
    const moved = shiftWithinDay(new Date(2026, 10, 4, 17, 50), 60, NOW);
    expect(moved).toEqual(NOW);
  });

  it('stops at 23:59 for an event on an earlier day', () => {
    const moved = shiftWithinDay(new Date(2026, 10, 3, 23, 30), 60, NOW);
    expect(moved).toEqual(new Date(2026, 10, 3, 23, 59));
  });
});
