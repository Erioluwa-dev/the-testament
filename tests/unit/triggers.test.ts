import { describe, expect, it } from 'vitest';
import { Triggers } from '../../src/systems/Triggers';
import type { TriggerData } from '../../src/types/sceneData';

const DATA: TriggerData[] = [
  {
    id: 'a',
    zone: { x: 0, y: 0, width: 100, height: 100 },
    verses: ['Genesis 1:1'],
    once: true,
  },
  { id: 'npc', npc: 'noah', verses: ['Genesis 6:13'], once: true },
];

describe('Triggers', () => {
  it('fires zone triggers once and skips npc triggers in tryFire', () => {
    const t = new Triggers();
    t.fromData(DATA);
    expect(t.pendingCount()).toBe(2);
    expect(t.tryFire(200, 200)).toBeNull();
    expect(t.tryFire(50, 50)).toEqual(['Genesis 1:1']);
    expect(t.tryFire(50, 50)).toBeNull();
    expect(t.pendingCount()).toBe(1);
  });

  it('fires npc triggers by id and reports completion', () => {
    const t = new Triggers();
    t.fromData(DATA);
    expect(t.fire('npc')).toEqual(['Genesis 6:13']);
    expect(t.fire('npc')).toBeNull();
    expect(t.fire('missing')).toBeNull();
    expect(t.isFired('npc')).toBe(true);
    expect(t.hasFiredAll()).toBe(false);
    t.fire('a');
    expect(t.hasFiredAll()).toBe(true);
    t.reset();
    expect(t.pendingCount()).toBe(2);
  });
});
