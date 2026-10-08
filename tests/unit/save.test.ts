import { beforeAll, describe, expect, it } from 'vitest';
import {
  SAVE_KEY,
  completeScene,
  currentSave,
  isCorruptSave,
  isSaveV1,
  loadSave,
  resetSave,
  storeSave,
} from '../../src/systems/Save';

function installStorage(): void {
  const store = new Map<string, string>();
  const stub: Storage = {
    get length(): number {
      return store.size;
    },
    key(index: number): string | null {
      return [...store.keys()][index] ?? null;
    },
    getItem(k: string): string | null {
      return store.get(k) ?? null;
    },
    setItem(k: string, v: string): void {
      store.set(k, v);
    },
    removeItem(k: string): void {
      store.delete(k);
    },
    clear(): void {
      store.clear();
    },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: stub, configurable: true });
}

beforeAll(() => {
  installStorage();
});

describe('Save', () => {
  it('round-trips through storage', () => {
    resetSave();
    completeScene('creation', 'page-creation');
    const reloaded = loadSave();
    expect(reloaded.completedScenes).toEqual(['creation']);
    expect(reloaded.pages).toEqual(['page-creation']);
    expect(isSaveV1(reloaded)).toBe(true);
  });

  it('falls back to a fresh save on corrupt data and version mismatch', () => {
    const store = globalThis.localStorage;
    store.setItem(SAVE_KEY, '{not json');
    expect(loadSave().completedScenes).toEqual([]);
    expect(isCorruptSave('{not json')).toBe(true);
    store.setItem(SAVE_KEY, JSON.stringify({ version: 2, completedScenes: [], pages: [] }));
    expect(loadSave().completedScenes).toEqual([]);
    expect(isCorruptSave('{"version":1}')).toBe(true);
  });

  it('never throws when storage itself throws', () => {
    const throwing: Storage = {
      get length(): number {
        return 0;
      },
      key(): string | null {
        return null;
      },
      getItem(): string | null {
        throw new Error('blocked');
      },
      setItem(): void {
        throw new Error('blocked');
      },
      removeItem(): void {},
      clear(): void {},
    };
    Object.defineProperty(globalThis, 'localStorage', { value: throwing, configurable: true });
    expect(() => storeSave(currentSave())).not.toThrow();
    expect(() => loadSave()).not.toThrow();
    installStorage();
    resetSave();
  });
});
