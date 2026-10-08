export interface StepResult {
  x: number;
  y: number;
}

export function stepToward(
  x: number,
  y: number,
  tx: number,
  ty: number,
  maxStep: number,
): StepResult {
  const dx = tx - x;
  const dy = ty - y;
  const dist = Math.hypot(dx, dy);
  if (dist <= maxStep || dist === 0) return { x: tx, y: ty };
  return { x: x + (dx / dist) * maxStep, y: y + (dy / dist) * maxStep };
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}
