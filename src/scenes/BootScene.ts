import Phaser from 'phaser';
import { currentSave } from '../systems/Save';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    currentSave();
    const w = this.scale.width;
    const h = this.scale.height;
    this.cameras.main.setBackgroundColor('#0b0d12');
    this.cameras.main.fadeIn(400);
    this.add
      .text(w / 2, h / 2 - 60, 'WITNESS', {
        fontFamily: 'Pixelify Sans, Courier New, monospace',
        fontSize: '64px',
        color: '#e8dcc0',
      })
      .setOrigin(0.5);
    this.add
      .text(w / 2, h / 2, 'Genesis 1–11', {
        fontFamily: 'EB Garamond, Georgia, serif',
        fontSize: '30px',
        color: '#c9a86d',
      })
      .setOrigin(0.5);
    const prompt = this.add
      .text(w / 2, h / 2 + 110, 'Tap to begin', {
        fontFamily: 'Pixelify Sans, Courier New, monospace',
        fontSize: '24px',
        color: '#e8dcc0',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
    this.input.once('pointerdown', () => {
      this.scene.start('PreloadScene');
    });
  }
}
