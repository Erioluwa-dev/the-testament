import type { PageId, SceneId } from '../types/sceneData';
import type { TextSpeed } from './pacing';

export interface SaveSettings {
  musicVolume: number;
  sfxVolume: number;
  textSpeed: TextSpeed;
}

export interface SaveV1 {
  version: 1;
  completedScenes: SceneId[];
  pages: PageId[];
  settings: SaveSettings;
}

export const SAVE_KEY = 'witness.save.v1';

const SCENE_IDS: readonly string[] = ['creation', 'eden', 'noah'];
const PAGE_IDS: readonly string[] = ['page-creation', 'page-eden', 'page-noah'];
const SPEEDS: readonly string[] = ['slow', 'normal', 'fast'];

function defaultSave(): SaveV1 {
  return {
    version: 1,
    completedScenes: [],
    pages: [],
    settings: { musicVolume: 0.6, sfxVolume: 0.9, textSpeed: 'normal' },
  };
}

export function isSaveV1(value: unknown): value is SaveV1 {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v['version'] !== 1) return false;
  const scenes = v['completedScenes'];
  if (!Array.isArray(scenes)) return false;
  const scenesOk = (scenes as unknown[]).every(
    (s): s is SceneId => typeof s === 'string' && SCENE_IDS.includes(s),
  );
  if (!scenesOk) return false;
  const pages = v['pages'];
  if (!Array.isArray(pages)) return false;
  const pagesOk = (pages as unknown[]).every(
    (p): p is PageId => typeof p === 'string' && PAGE_IDS.includes(p),
  );
  if (!pagesOk) return false;
  const settings = v['settings'];
  if (typeof settings !== 'object' || settings === null) return false;
  const st = settings as Record<string, unknown>;
  return (
    typeof st['musicVolume'] === 'number' &&
    typeof st['sfxVolume'] === 'number' &&
    typeof st['textSpeed'] === 'string' &&
    SPEEDS.includes(st['textSpeed'])
  );
}

let memory: SaveV1 | null = null;

function storage(): Storage | null {
  try {
    if (typeof globalThis.localStorage === 'undefined') return null;
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function loadSave(): SaveV1 {
  const store = storage();
  if (store === null) {
    const fresh = defaultSave();
    memory = fresh;
    return fresh;
  }
  let raw: string | null = null;
  try {
    raw = store.getItem(SAVE_KEY);
  } catch {
    // Blocked storage reads fall through to a fresh save below.
  }
  if (raw === null) {
    const fresh = defaultSave();
    memory = fresh;
    return fresh;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isSaveV1(parsed)) {
      memory = parsed;
      return parsed;
    }
  } catch {
    // Corrupt JSON falls through to a fresh save below.
  }
  const fresh = defaultSave();
  memory = fresh;
  return fresh;
}

export function storeSave(save: SaveV1): void {
  memory = save;
  const store = storage();
  if (store === null) return;
  try {
    store.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Blocked storage keeps the in-memory copy; the game never crashes.
  }
}

export function currentSave(): SaveV1 {
  return memory ?? loadSave();
}

export function resetSave(): SaveV1 {
  const fresh = defaultSave();
  storeSave(fresh);
  return fresh;
}

export function completeScene(scene: SceneId, page: PageId): SaveV1 {
  const save = currentSave();
  if (!save.completedScenes.includes(scene)) save.completedScenes.push(scene);
  if (!save.pages.includes(page)) save.pages.push(page);
  storeSave(save);
  return save;
}

export function isCorruptSave(raw: string): boolean {
  try {
    const parsed: unknown = JSON.parse(raw);
    return !isSaveV1(parsed);
  } catch {
    return true;
  }
}
