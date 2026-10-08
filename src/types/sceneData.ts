/**
 * Scene data contract for the Witness game (plan §6).
 *
 * All text is referenced by ID (`Genesis 1:3` or a range). Verse text is
 * resolved at runtime by `Bible.lookup`, so scene JSON never embeds KJV text.
 *
 * `interaction.type` is a discriminated union (`speakDays | followPath |
 * gatherPairs`). Each scene class handles its own type; the shared systems
 * (verse box, triggers, save, audio) handle everything else.
 */

export type SceneId = 'creation' | 'eden' | 'noah';
export type PageId = 'page-creation' | 'page-eden' | 'page-noah';
export type DayEffect =
  | 'light'
  | 'firmament'
  | 'land'
  | 'lights'
  | 'creatures'
  | 'mankind'
  | 'rest';

/** One day of the Creation scene's speakDays interaction. */
export interface SpeakDayData {
  id: string;
  verses: string[];
  effect: DayEffect;
  /** Day 7: the tap is withheld; the player waits and rest settles. */
  withheld?: boolean;
  /** Milliseconds to wait before rest settles (withheld days only). */
  waitMs?: number;
}

export interface SpeakDaysInteraction {
  type: 'speakDays';
  days: SpeakDayData[];
}

/** One stop on the Eden garden path. Coordinates are fractions of the
 *  playfield (0–1) so scenes scale across viewports. */
export interface PathWaypointData {
  id: string;
  x: number;
  y: number;
  verses: string[];
}

export interface FollowPathInteraction {
  type: 'followPath';
  waypoints: PathWaypointData[];
  /** Clearing at the end of the path: the tree (fractions of playfield). */
  tree: { x: number; y: number };
}

export interface GatherPairsInteraction {
  type: 'gatherPairs';
  pairs: string[];
  /** Trigger id that boards a pair (the ark ramp zone). */
  target: string;
}

export type SceneInteraction =
  | SpeakDaysInteraction
  | FollowPathInteraction
  | GatherPairsInteraction;

/** A verse trigger: a Tiled-object-style zone or an NPC conversation. */
export interface TriggerData {
  id: string;
  /** Rectangular zone in playfield pixels (design resolution 1280×720). */
  zone?: { x: number; y: number; width: number; height: number };
  /** NPC key (e.g. "noah") for dialogue triggers. */
  npc?: string;
  verses: string[];
  once?: boolean;
}

export interface WitnessData {
  verses: string[];
  effect: string;
  music: string;
}

export interface ScrollPageData {
  id: PageId;
  verse: string;
  image: string;
}

export interface SceneData {
  id: SceneId;
  title: string;
  music: string;
  /** Tiled map key under public/assets/maps (optional: Creation is procedural). */
  map?: string;
  intro: string[];
  triggers: TriggerData[];
  interaction: SceneInteraction;
  witness: WitnessData;
  scrollPage: ScrollPageData;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry): entry is string => typeof entry === 'string');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

const SCENE_IDS: readonly string[] = ['creation', 'eden', 'noah'];
const PAGE_IDS: readonly string[] = ['page-creation', 'page-eden', 'page-noah'];
const DAY_EFFECTS: readonly string[] = [
  'light',
  'firmament',
  'land',
  'lights',
  'creatures',
  'mankind',
  'rest',
];

function isSpeakDay(value: unknown): value is SpeakDayData {
  if (!isRecord(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    isStringArray(value['verses']) &&
    value['verses'].length > 0 &&
    typeof value['effect'] === 'string' &&
    DAY_EFFECTS.includes(value['effect']) &&
    (value['withheld'] === undefined || typeof value['withheld'] === 'boolean') &&
    (value['waitMs'] === undefined || isNumber(value['waitMs']))
  );
}

function isSpeakDaysInteraction(value: unknown): value is SpeakDaysInteraction {
  if (!isRecord(value) || value['type'] !== 'speakDays') return false;
  return (
    Array.isArray(value['days']) &&
    value['days'].length > 0 &&
    (value['days'] as unknown[]).every(isSpeakDay)
  );
}

function isPathWaypoint(value: unknown): value is PathWaypointData {
  if (!isRecord(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    isNumber(value['x']) &&
    isNumber(value['y']) &&
    isStringArray(value['verses']) &&
    value['verses'].length > 0
  );
}

function isFollowPathInteraction(value: unknown): value is FollowPathInteraction {
  if (!isRecord(value) || value['type'] !== 'followPath') return false;
  if (!Array.isArray(value['days']) && !Array.isArray(value['waypoints'])) return false;
  const waypoints = value['waypoints'];
  if (!Array.isArray(waypoints) || waypoints.length === 0) return false;
  if (!(waypoints as unknown[]).every(isPathWaypoint)) return false;
  const tree = value['tree'];
  if (!isRecord(tree) || !isNumber(tree['x']) || !isNumber(tree['y'])) return false;
  return true;
}

function isGatherPairsInteraction(value: unknown): value is GatherPairsInteraction {
  if (!isRecord(value) || value['type'] !== 'gatherPairs') return false;
  return (
    isStringArray(value['pairs']) &&
    (value['pairs'] as string[]).length > 0 &&
    typeof value['target'] === 'string'
  );
}

function isInteraction(value: unknown): value is SceneInteraction {
  return (
    isSpeakDaysInteraction(value) ||
    isFollowPathInteraction(value) ||
    isGatherPairsInteraction(value)
  );
}

function isTrigger(value: unknown): value is TriggerData {
  if (!isRecord(value)) return false;
  if (typeof value['id'] !== 'string') return false;
  if (!isStringArray(value['verses']) || value['verses'].length === 0) return false;
  if (value['once'] !== undefined && typeof value['once'] !== 'boolean') return false;
  const zone = value['zone'];
  if (zone !== undefined) {
    if (!isRecord(zone)) return false;
    if (
      !isNumber(zone['x']) ||
      !isNumber(zone['y']) ||
      !isNumber(zone['width']) ||
      !isNumber(zone['height'])
    ) {
      return false;
    }
  }
  if (value['npc'] !== undefined && typeof value['npc'] !== 'string') return false;
  return true;
}

function isWitness(value: unknown): value is WitnessData {
  if (!isRecord(value)) return false;
  return (
    isStringArray(value['verses']) &&
    value['verses'].length > 0 &&
    typeof value['effect'] === 'string' &&
    typeof value['music'] === 'string'
  );
}

function isScrollPage(value: unknown): value is ScrollPageData {
  if (!isRecord(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    PAGE_IDS.includes(value['id']) &&
    typeof value['verse'] === 'string' &&
    typeof value['image'] === 'string'
  );
}

export function isSceneData(value: unknown): value is SceneData {
  if (!isRecord(value)) return false;
  if (
    typeof value['id'] !== 'string' ||
    !SCENE_IDS.includes(value['id']) ||
    typeof value['title'] !== 'string' ||
    typeof value['music'] !== 'string' ||
    !isStringArray(value['intro'])
  ) {
    return false;
  }
  if (value['map'] !== undefined && typeof value['map'] !== 'string') return false;
  // Triggers are always present on disk (possibly empty); the guard enforces it.
  if (!Array.isArray(value['triggers'])) return false;
  if (!(value['triggers'] as unknown[]).every(isTrigger)) return false;
  if (!isInteraction(value['interaction'])) return false;
  if (!isWitness(value['witness'])) return false;
  if (!isScrollPage(value['scrollPage'])) return false;
  return true;
}
