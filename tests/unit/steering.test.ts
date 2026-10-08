import { describe, expect, it } from 'vitest';
import { distance, stepToward } from '../../src/systems/steering';

describe('stepToward', () => {
  it('snaps to the target within one step', () => {
    expect(stepToward(0, 0, 3, 4, 5)).toEqual({ x: 3, y: 4 });
  });

  it('moves maxStep along the bearing otherwise', () => {
    const p = stepToward(0, 0, 10, 0, 4);
    expect(p.x).toBeCloseTo(4);
    expect(p.y).toBeCloseTo(0);
  });
});

describe('distance', () => {
  it('measures 3-4-5', () => {
    expect(distance(0, 0, 3, 4)).toBe(5);
  });
});
