import Phaser from 'phaser';
import { Audio } from '../systems/Audio';
import { Bible } from '../systems/Bible';
import { Player } from '../systems/Player';
import { completeScene } from '../systems/Save';
import { isSceneData, type SceneData, type SpeakDayData } from '../types/sceneData';
import { uiOf, type UIScene } from './UIScene';

export class CreationScene extends Phaser.Scene {
  private sceneData: SceneData | null = null;
  private days: SpeakDayData[] = [];
  private player: Player | null = null;
  private ui: UIScene | null = null;
  private audio: Audio | null = null;
  private world: Phaser.GameObjects.Graphics | null = null;
  private doneDays: boolean[] = [];
  private glyphVisuals: Phaser.GameObjects.Arc[] = [];
  private stage = 0;
  private finished = false;

  constructor() {
    super('CreationScene');
  }

  init(packet: { data?: unknown }): void {
    const raw = packet.data;
    this.sceneData = isSceneData(raw) && raw.id === 'creation' ? raw : null;
  }

  create(): void {
    if (this.sceneData === null) {
      this.scene.start('HubScene');
      return;
    }
    const data = this.sceneData;
    if (data.interaction.type !== 'speakDays') {
      this.scene.start('HubScene');
      return;
    }
    this.days = data.interaction.days;
    this.doneDays = this.days.map(() => false);
    this.finished = false;
    this.stage = 0;
    this.glyphVisuals = [];

    this.cameras.main.setBackgroundColor('#0b0d12');
    this.cameras.main.fadeIn(400);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.scene.isActive('UIScene')) this.scene.stop('UIScene');
    });

    this.audio = new Audio(this);
    this.input.once('pointerdown', () => {
      this.audio?.unlock();
      this.audio?.playMusic(data.music);
    });

    this.world = this.add.graphics();
    this.drawWorld(0);

    const mote = this.physics.add.sprite(640, 500, 'mote').setDepth(5);
    const halo = this.add.circle(640, 500, 44, 0x7aa2f7, 0.18).setDepth(4);
    this.player = new Player(this, mote, halo);
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      this.player?.setTarget(ptr.worldX, ptr.worldY);
    });

    this.ui = uiOf(this);
    for (const ref of data.intro) this.ui.showVerse(ref, Bible.lookup(ref));

    this.days.forEach((day, i) => {
      const x = 240 + i * 133;
      const y = 300;
      const ring = this.add.circle(x, y, 26, 0x7aa2f7, 0.25).setDepth(6);
      this.glyphVisuals.push(ring);
      this.add
        .text(x, y + 44, `Day ${i + 1}`, {
          fontFamily: 'Pixelify Sans, Courier New, monospace',
          fontSize: '16px',
          color: '#8a7a5a',
        })
        .setOrigin(0.5)
        .setDepth(6);
      const zone = this.add.zone(x, y, 76, 76).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.onGlyph(i);
      });
    });
    this.tweens.add({ targets: this.glyphVisuals, alpha: 0.45, duration: 900, yoyo: true, repeat: -1 });
  }

  override update(_time: number, delta: number): void {
    this.player?.update(delta);
  }

  private onGlyph(index: number): void {
    const day = this.days[index];
    if (day === undefined || this.doneDays[index] === true || this.finished) return;
    if (this.ui?.isTyping() === true) return;
    if (day.withheld === true) {
      this.waitForRest(day);
      return;
    }
    for (const ref of day.verses) this.ui?.showVerse(ref, Bible.lookup(ref));
    this.doneDays[index] = true;
    this.stage = Math.max(this.stage, index + 1);
    this.drawWorld(this.stage);
    this.refreshGlyph(index);
    this.maybeWitness();
  }

  private waitForRest(day: SpeakDayData): void {
    this.ui?.setLocked(true);
    const waitMs = day.waitMs ?? 7000;
    const note = this.add
      .text(640, 420, '…wait. Rest is coming.', {
        fontFamily: 'EB Garamond, Georgia, serif',
        fontSize: '26px',
        color: '#c9a86d',
        fontStyle: 'italic',
      })
      .setOrigin(0.5)
      .setDepth(7);
    this.time.delayedCall(waitMs, () => {
      note.destroy();
      for (const ref of day.verses) this.ui?.showVerse(ref, Bible.lookup(ref));
      this.doneDays[this.days.indexOf(day)] = true;
      this.stage = 7;
      this.drawWorld(this.stage);
      this.refreshGlyph(this.days.indexOf(day));
      this.ui?.setLocked(false);
      this.maybeWitness();
    });
  }

  private refreshGlyph(index: number): void {
    const ring = this.glyphVisuals[index];
    if (ring === undefined) return;
    ring.setFillStyle(0xc9a86d, 0.5);
    this.tweens.killTweensOf(ring);
    ring.setAlpha(1);
  }

  private maybeWitness(): void {
    if (this.finished || this.doneDays.some((d) => !d)) return;
    this.finished = true;
    this.ui?.setLocked(true);
    this.cameras.main.flash(600);
    const verses = this.sceneData?.witness.verses ?? [];
    for (const ref of verses) this.ui?.showVerse(ref, Bible.lookup(ref));
    this.time.delayedCall(3500, () => {
      this.finishScene();
    });
  }

  private finishScene(): void {
    if (this.sceneData === null) {
      this.scene.start('HubScene');
      return;
    }
    completeScene('creation', this.sceneData.scrollPage.id);
    const verseRef = this.sceneData.scrollPage.verse;
    const packet = {
      sceneId: 'creation',
      page: this.sceneData.scrollPage.id,
      verseRef,
      verseText: Bible.lookup(verseRef),
      title: this.sceneData.title,
      reread: false,
    };
    this.scene.stop('UIScene');
    this.scene.start('ScrollScene', packet);
  }

  private drawWorld(stage: number): void {
    const g = this.world;
    if (g === null) return;
    const w = this.scale.width;
    const h = this.scale.height;
    g.clear();
    g.fillStyle(0x0b0d12, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(0x0e1420, 0.7);
    g.fillRect(0, h * 0.72, w, h - h * 0.72);
    if (stage >= 1) {
      g.fillStyle(0x2a3a5f, 1);
      g.fillRect(0, 0, w, h * 0.6);
      g.fillStyle(0xfff3c4, 0.9);
      g.fillCircle(w / 2, h * 0.28, 56);
      g.fillStyle(0xfff3c4, 0.25);
      g.fillCircle(w / 2, h * 0.28, 110);
    }
    if (stage >= 2) {
      g.fillStyle(0x7aa2f7, 0.45);
      g.fillRect(0, h * 0.42, w, 26);
    }
    if (stage >= 3) {
      g.fillStyle(0x1d4a2a, 1);
      g.fillRect(0, h * 0.55, w * 0.42, h * 0.2);
      g.fillRect(w * 0.58, h * 0.6, w * 0.42, h * 0.15);
      g.fillStyle(0x3da34d, 1);
      for (let i = 0; i < 12; i += 1) {
        g.fillCircle(60 + (i % 6) * 70, h * 0.6 + Math.floor(i / 6) * 40, 6);
      }
    }
    if (stage >= 4) {
      g.fillStyle(0xffe9a8, 1);
      g.fillCircle(w * 0.78, h * 0.16, 26);
      g.fillStyle(0xdfe6f5, 1);
      g.fillCircle(w * 0.2, h * 0.14, 18);
      for (let i = 0; i < 24; i += 1) {
        g.fillCircle(40 + ((i * 173) % 1200), 30 + ((i * 97) % 180), 2);
      }
    }
    if (stage >= 5) {
      g.fillStyle(0x2a5a8a, 1);
      for (let i = 0; i < 6; i += 1) {
        g.fillEllipse(200 + i * 90, h * 0.8, 44, 18);
      }
      g.lineStyle(3, 0xe8dcc0, 0.9);
      for (let i = 0; i < 5; i += 1) {
        const bx = 300 + i * 150;
        g.strokeCircle(bx, h * 0.22, 10);
      }
    }
    if (stage >= 6) {
      g.fillStyle(0x0b0d12, 1);
      g.fillCircle(w * 0.44, h * 0.62, 16);
      g.fillCircle(w * 0.56, h * 0.62, 16);
      g.fillStyle(0xfff6d8, 0.35);
      g.fillCircle(w * 0.44, h * 0.62, 26);
      g.fillCircle(w * 0.56, h * 0.62, 26);
    }
    if (stage >= 7) {
      g.fillStyle(0xc9a86d, 0.12);
      g.fillRect(0, 0, w, h);
    }
  }
}
