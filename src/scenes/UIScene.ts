import Phaser from 'phaser';
import { VerseBox } from '../systems/VerseBox';
import type { TextSpeed } from '../systems/pacing';

export function uiOf(scene: Phaser.Scene): UIScene {
  if (!scene.scene.isActive('UIScene')) scene.scene.launch('UIScene');
  return scene.scene.get('UIScene') as UIScene;
}

function notifyTestHook(ref: string): void {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { __witnessVerses?: string[] };
  if (w.__witnessVerses === undefined) w.__witnessVerses = [];
  w.__witnessVerses.push(ref);
}

export class UIScene extends Phaser.Scene {
  private box: VerseBox | null = null;
  private readonly pending: Array<{ ref: string; text: string }> = [];
  private locked = false;

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.box = new VerseBox(this, { speed: 'normal' });
    for (const item of this.pending) this.box.queueVerse(item.ref, item.text);
    this.pending.length = 0;
    this.input.on('pointerdown', () => {
      this.advance();
    });
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.advance();
    });
  }

  showVerse(ref: string, text: string): void {
    notifyTestHook(ref);
    if (this.box === null) {
      this.pending.push({ ref, text });
      return;
    }
    this.box.queueVerse(ref, text);
  }

  advance(): void {
    if (this.locked) return;
    this.box?.advance();
  }

  isTyping(): boolean {
    return this.box?.isTyping() ?? false;
  }

  hasMore(): boolean {
    return (this.box?.hasMore() ?? false) || this.pending.length > 0;
  }

  setLocked(locked: boolean): void {
    this.locked = locked;
  }

  setSpeed(speed: TextSpeed): void {
    this.box?.setSpeed(speed);
  }

  override update(_time: number, delta: number): void {
    this.box?.update(_time, delta);
  }
}
