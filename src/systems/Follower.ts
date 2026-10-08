import type Phaser from 'phaser';
import { distance, stepToward } from './steering';

export class Follower {
  following = false;

  constructor(
    private readonly sprite: Phaser.Physics.Arcade.Sprite,
    private offsetX = 40,
    private offsetY = 30,
  ) {}

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  setOffset(x: number, y: number): void {
    this.offsetX = x;
    this.offsetY = y;
  }

  update(deltaMs: number, targetX: number, targetY: number): void {
    if (!this.following) return;
    const gx = targetX + this.offsetX;
    const gy = targetY + this.offsetY;
    if (distance(this.sprite.x, this.sprite.y, gx, gy) > 500) {
      this.sprite.setPosition(gx, gy);
      return;
    }
    const p = stepToward(this.sprite.x, this.sprite.y, gx, gy, 220 * (deltaMs / 1000));
    this.sprite.setPosition(p.x, p.y);
  }
}
