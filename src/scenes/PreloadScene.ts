import Phaser from 'phaser';

const ANIMALS: Array<{ name: string; color: number }> = [
  { name: 'lion', color: 0xc98a3a },
  { name: 'elephant', color: 0x8a93a6 },
  { name: 'sheep', color: 0xe8e4da },
  { name: 'camel', color: 0xb3814d },
  { name: 'dove', color: 0xf2f2f2 },
  { name: 'giraffe', color: 0xd9a94a },
  { name: 'raven', color: 0x2a2d3a },
];

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0b0d12');
    const w = this.scale.width;
    const h = this.scale.height;
    this.add
      .text(w / 2, h / 2, 'Preparing the journey…', {
        fontFamily: 'Pixelify Sans, Courier New, monospace',
        fontSize: '24px',
        color: '#e8dcc0',
      })
      .setOrigin(0.5);
    this.makeTextures();
    if (typeof document !== 'undefined' && typeof document.fonts !== 'undefined') {
      let started = false;
      const go = (): void => {
        if (started) return;
        started = true;
        this.scene.start('HubScene');
      };
      const timeout = new Promise((resolve: (value: unknown) => void) => {
        setTimeout(resolve, 1200);
      });
      void Promise.race([document.fonts.ready, timeout]).then(go, go);
    } else {
      this.scene.start('HubScene');
    }
  }

  private makeTextures(): void {
    if (!this.textures.exists('mote')) {
      const g = this.add.graphics();
      g.fillStyle(0x7aa2f7, 0.3);
      g.fillCircle(16, 16, 15);
      g.fillStyle(0xfff6d8, 1);
      g.fillCircle(16, 16, 7);
      g.generateTexture('mote', 32, 32);
      g.destroy();
    }
    for (const animal of ANIMALS) {
      const key = `animal-${animal.name}`;
      if (this.textures.exists(key)) continue;
      const g = this.add.graphics();
      g.fillStyle(0x0b0d12, 1);
      g.fillCircle(16, 18, 13);
      g.fillStyle(animal.color, 1);
      g.fillCircle(16, 18, 11);
      g.fillCircle(23, 10, 6);
      g.generateTexture(key, 32, 32);
      g.destroy();
    }
    if (!this.textures.exists('tree')) {
      const g = this.add.graphics();
      g.fillStyle(0x5a3a22, 1);
      g.fillRect(14, 26, 5, 20);
      g.fillStyle(0x2f7a3d, 1);
      g.fillCircle(16, 16, 14);
      g.fillStyle(0x3da34d, 1);
      g.fillCircle(12, 12, 7);
      g.generateTexture('tree', 32, 48);
      g.destroy();
    }
    if (!this.textures.exists('ark')) {
      const g = this.add.graphics();
      g.fillStyle(0x6b4a2a, 1);
      g.fillRect(0, 40, 320, 80);
      g.fillStyle(0x4a3018, 1);
      g.fillRect(0, 100, 320, 20);
      g.fillStyle(0x7a5a36, 1);
      g.fillRect(40, 0, 240, 44);
      g.fillStyle(0x2a1c0e, 1);
      g.fillRect(150, 60, 24, 40);
      g.generateTexture('ark', 320, 120);
      g.destroy();
    }
    if (!this.textures.exists('drop')) {
      const g = this.add.graphics();
      g.lineStyle(2, 0x7aa2f7, 0.8);
      g.lineBetween(1, 0, 1, 12);
      g.generateTexture('drop', 3, 13);
      g.destroy();
    }
  }
}
