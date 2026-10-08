import { describe, expect, it } from 'vitest';
import { isSceneData } from '../../src/types/sceneData';
import creationJson from '../../src/data/scenes/creation.json';
import edenJson from '../../src/data/scenes/eden.json';
import noahJson from '../../src/data/scenes/noah.json';

describe('isSceneData', () => {
  it('accepts the three shipped scenes', () => {
    expect(isSceneData(creationJson)).toBe(true);
    expect(isSceneData(edenJson)).toBe(true);
    expect(isSceneData(noahJson)).toBe(true);
  });

  it('rejects malformed data', () => {
    expect(isSceneData(null)).toBe(false);
    expect(isSceneData({})).toBe(false);
    expect(isSceneData({ ...creationJson, id: 'exodus' })).toBe(false);
    expect(isSceneData({ ...creationJson, interaction: { type: 'speakDays', days: [] } })).toBe(
      false,
    );
    expect(isSceneData({ ...creationJson, interaction: { type: 'teleport' } })).toBe(false);
    expect(isSceneData({ ...creationJson, triggers: [{ id: 'x' }] })).toBe(false);
    expect(isSceneData({ ...creationJson, witness: { verses: [], effect: 'x', music: 'y' } })).toBe(
      false,
    );
  });
});
