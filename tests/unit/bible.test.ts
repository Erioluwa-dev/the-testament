import { describe, expect, it } from 'vitest';
import { Bible } from '../../src/systems/Bible';
import { isSceneData, type SceneData } from '../../src/types/sceneData';
import creationJson from '../../src/data/scenes/creation.json';
import edenJson from '../../src/data/scenes/eden.json';
import noahJson from '../../src/data/scenes/noah.json';

describe('Bible.lookup', () => {
  it('resolves a single verse', () => {
    expect(Bible.lookup('Genesis 1:1')).toBe(
      'In the beginning God created the heaven and the earth.',
    );
  });

  it('joins a same-chapter range', () => {
    const text = Bible.lookup('Genesis 2:2-3');
    expect(text).toContain('he rested on the seventh day');
    expect(text).toContain('God blessed the seventh day');
  });

  it('joins a cross-chapter range', () => {
    const text = Bible.lookup('Genesis 1:31-2:1');
    expect(text).toContain('very good');
    expect(text).toContain('Thus the heavens and the earth were finished');
  });

  it('throws on unshipped chapters, verses, and reversed ranges', () => {
    expect(() => Bible.lookup('Genesis 12:1')).toThrow();
    expect(() => Bible.lookup('Genesis 1:99')).toThrow();
    expect(() => Bible.lookup('Genesis 2:3-2:1')).toThrow();
  });

  it('resolves every verse referenced by scene data and scripted scene flows', () => {
    const scenes: SceneData[] = [creationJson, edenJson, noahJson].map((raw) => {
      if (!isSceneData(raw)) throw new Error('scene JSON failed its guard');
      return raw;
    });
    const refs: string[] = [];
    for (const s of scenes) {
      refs.push(...s.intro);
      for (const t of s.triggers) refs.push(...t.verses);
      const ix = s.interaction;
      if (ix.type === 'speakDays') {
        for (const d of ix.days) refs.push(...d.verses);
      } else if (ix.type === 'followPath') {
        for (const w of ix.waypoints) refs.push(...w.verses);
      }
      refs.push(...s.witness.verses, s.scrollPage.verse);
    }
    refs.push(
      'Genesis 3:6-8',
      'Genesis 7:16',
      'Genesis 7:17',
      'Genesis 8:1',
      'Genesis 8:6',
      'Genesis 8:7',
      'Genesis 8:8-9',
      'Genesis 8:10-11',
      'Genesis 8:12',
    );
    expect(refs.length).toBeGreaterThan(20);
    for (const ref of refs) {
      expect(Bible.has(ref), ref).toBe(true);
    }
  });
});
