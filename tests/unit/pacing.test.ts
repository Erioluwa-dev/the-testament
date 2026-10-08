import { describe, expect, it } from 'vitest';
import { visibleChars } from '../../src/systems/pacing';

describe('visibleChars', () => {
  it('shows nothing for empty text', () => {
    expect(visibleChars(5000, 'normal', 0)).toBe(0);
  });

  it('reveals the first character immediately and caps at the total', () => {
    expect(visibleChars(0, 'normal', 10)).toBe(1);
    expect(visibleChars(60_000, 'normal', 10)).toBe(10);
  });

  it('types faster on fast than on slow', () => {
    const slow = visibleChars(1000, 'slow', 1000);
    const normal = visibleChars(1000, 'normal', 1000);
    const fast = visibleChars(1000, 'fast', 1000);
    expect(slow).toBe(18);
    expect(normal).toBe(32);
    expect(fast).toBe(55);
    expect(slow).toBeLessThan(normal);
    expect(normal).toBeLessThan(fast);
  });
});
