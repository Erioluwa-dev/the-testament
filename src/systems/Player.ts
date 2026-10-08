import type Phaser from 'phaser';
import { stepToward } from './steering';

const MOVE_SPEED = 260;

export class Player {
  private targetX: number;
  private targetY: number;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private readonly held = new Set<string>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly sprite: Phaser.Physics.Arcade.Sprite,
    private readonly halo: Phaser.GameObjects.Arc,
  ) {
    this.targetX = sprite.x;
    this.targetY = sprite.y;
    const kb = scene.input.keyboard;
    if (kb !== null) {
      this.cursors = kb.createCursorKeys();
      for (const code of ['W', 'A', 'S', 'D']) {
        kb.on(`keydown-${code}`, () => {
          this.held.add(code);
        });
        kb.on(`keyup-${code}`, () => {
          this.held.delete(code);
        });
      }
    }
  }

  setTarget(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  getSprite(): Phaser.Physics.Arcade.Sprite {
    return this.sprite;
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    let dx = 0;
    let dy = 0;
    if (this.cursors !== null) {
      if (this.cursors.left.isDown) dx -= 1;
      if (this.cursors.right.isDown) dx += 1;
      if (this.cursors.up.isDown) dy -= 1;
      if (this.cursors.down.isDown) dy += 1;
    }
    if (this.held.has('A')) dx -= 1;
    if (this.held.has('D')) dx += 1;
    if (this.held.has('W')) dy -= 1;
    if (this.held.has('S')) dy += 1;
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      this.sprite.x += (dx / len) * MOVE_SPEED * dt;
      this.sprite.y += (dy / len) * MOVE_SPEED * dt;
      this.targetX = this.sprite.x;
      this.targetY = this.sprite.y;
    } else {
      const p = stepToward(this.sprite.x, this.sprite.y, this.targetX, this.targetY, MOVE_SPEED * dt);
      this.sprite.setPosition(p.x, p.y);
    }
    this.halo.setPosition(this.sprite.x, this.sprite.y);
  }
}
