import type Phaser from 'phaser';
import { visibleChars, type TextSpeed } from './pacing';

export type { TextSpeed } from './pacing';

interface QueuedVerse {
  ref: string;
  text: string;
}

export class VerseBox {
  private readonly label: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly queue: QueuedVerse[] = [];
  private current: QueuedVerse | null = null;
  private speed: TextSpeed;
  private elapsedMs = 0;
  private shown = 0;
  private typing = false;

  constructor(scene: Phaser.Scene, opts?: { speed?: TextSpeed }) {
    this.speed = opts?.speed ?? 'normal';
    const cx = scene.scale.width / 2;
    const bottom = scene.scale.height;
    const bg = scene.add.rectangle(cx, bottom - 80, Math.min(1120, scene.scale.width - 160), 150, 0x0b0d12, 0.88);
    bg.setStrokeStyle(1, 0xc9a86d, 0.5);
    bg.setDepth(100);
    this.label = scene.add
      .text(cx, bottom - 140, '', {
        fontFamily: 'Pixelify Sans, Courier New, monospace',
        fontSize: '15px',
        color: '#c9a86d',
      })
      .setOrigin(0.5)
      .setDepth(101);
    this.body = scene.add
      .text(cx, bottom - 114, '', {
        fontFamily: 'EB Garamond, Georgia, serif',
        fontSize: '22px',
        color: '#f3ede0',
        align: 'center',
        lineSpacing: 6,
        wordWrap: { width: Math.min(1040, scene.scale.width - 220) },
      })
      .setOrigin(0.5, 0)
      .setDepth(101);
    this.hint = scene.add
      .text(cx, bottom - 14, '', {
        fontFamily: 'Pixelify Sans, Courier New, monospace',
        fontSize: '14px',
        color: '#8a7a5a',
      })
      .setOrigin(0.5)
      .setDepth(101);
  }

  setSpeed(speed: TextSpeed): void {
    this.speed = speed;
  }

  queueVerse(ref: string, text: string): void {
    this.queue.push({ ref, text });
    if (this.current === null) this.next();
  }

  advance(): boolean {
    if (this.current === null) {
      this.next();
      return this.current !== null;
    }
    if (this.typing) {
      this.finish();
      return true;
    }
    this.next();
    return this.current !== null;
  }

  isTyping(): boolean {
    return this.typing;
  }

  hasMore(): boolean {
    return this.current !== null || this.queue.length > 0;
  }

  currentRef(): string {
    return this.current?.ref ?? '';
  }

  update(_time: number, delta: number): void {
    if (!this.typing || this.current === null) return;
    this.elapsedMs += delta;
    const n = visibleChars(this.elapsedMs, this.speed, this.current.text.length);
    if (n !== this.shown) {
      this.shown = n;
      this.render();
    }
    if (n >= this.current.text.length) this.typing = false;
  }

  private next(): void {
    const verse = this.queue.shift();
    if (verse === undefined) {
      this.current = null;
      this.label.setText('');
      this.body.setText('');
      this.hint.setText('');
      return;
    }
    this.current = verse;
    this.elapsedMs = 0;
    this.shown = 0;
    this.typing = true;
    this.label.setText(verse.ref);
    this.hint.setText('tap ▸');
    this.render();
  }

  private finish(): void {
    if (this.current === null) return;
    this.typing = false;
    this.shown = this.current.text.length;
    this.render();
  }

  private render(): void {
    if (this.current === null) return;
    this.body.setText(this.current.text.slice(0, this.shown));
  }
}
