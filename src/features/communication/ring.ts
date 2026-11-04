export interface RingDot {
  /** Offset from the ring centre, in dp (y grows downwards). */
  x: number;
  y: number;
  filled: boolean;
}

/**
 * One dot per sign of the daily target, laid out clockwise from the top.
 * The first `count` dots are filled; counts past the target fill every dot.
 */
export function ringDots(count: number, target: number, radius: number): RingDot[] {
  return Array.from({ length: target }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / target;
    return {
      x: Math.round(radius * Math.cos(angle) * 100) / 100,
      y: Math.round(radius * Math.sin(angle) * 100) / 100,
      filled: i < count,
    };
  });
}
