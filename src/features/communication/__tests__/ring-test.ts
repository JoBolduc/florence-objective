import { ringDots } from '../ring';

describe('ringDots', () => {
  it('starts at the top and goes clockwise', () => {
    const dots = ringDots(0, 4, 100);
    expect(dots.map((d) => [d.x, d.y])).toEqual([
      [0, -100],
      [100, 0],
      [0, 100],
      [-100, 0],
    ]);
  });

  it('fills the first dots up to the count', () => {
    expect(ringDots(7, 10, 80).filter((d) => d.filled)).toHaveLength(7);
  });

  it('keeps every dot filled past the target', () => {
    const dots = ringDots(14, 10, 80);
    expect(dots).toHaveLength(10);
    expect(dots.every((d) => d.filled)).toBe(true);
  });
});
