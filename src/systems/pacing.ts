export type TextSpeed = 'slow' | 'normal' | 'fast';

export const CHARS_PER_SECOND: Record<TextSpeed, number> = {
  slow: 18,
  normal: 32,
  fast: 55,
};

export function visibleChars(elapsedMs: number, speed: TextSpeed, total: number): number {
  if (total <= 0) return 0;
  const cps = CHARS_PER_SECOND[speed];
  return Math.min(total, Math.max(1, Math.floor((elapsedMs / 1000) * cps)));
}
