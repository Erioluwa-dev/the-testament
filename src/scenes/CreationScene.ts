import Phaser from 'phaser';
import { Audio } from '../systems/Audio';
import { Bible } from '../systems/Bible';
import { Player } from '../systems/Player';
import { completeScene } from '../systems/Save';
import { isSceneData, type DayEffect, type SceneData, type SpeakDayData } from '../types/sceneData';
import { uiOf, type UIScene } from './UIScene';

// Scene art stays below the VerseBox (depth 100+); vignette and letterbox
// sit above the world but under the UI overlay.
const DEPTH = {
  sky: 0,
  world: 1,
  glow: 2,
  moteOuter: 3,
  moteHalo: 4,
  mote: 5,
  moteOver: 6,
  glyph: 6,
  note: 7,
  ambient: 8,
  burst: 9,
  vignette: 40,
  letterbox: 90,
} as const;

// Tuning map: SKY_STOPS is the per-stage sky palette; createStageFx holds glow
// positions/alphas and per-day particle budgets (60 ambient alive across the
// mote trail + day emitters, 40 per burst); vignette density lives in
// ensureTextures; the camera push-in step lives in applyStage.
const SKY_W = 32;
const SKY_H = 240;

/** Letterbox bars are sized for the post-push-in zoom (~1.06). */
const LETTER_TOP_ON = -60;
const LETTER_TOP_OFF = -240;
const LETTER_BOTTOM_ON = 780;
const LETTER_BOTTOM_OFF = 960;
const LETTER_W = 1600;
const LETTER_H = 240;

/** Vertical gradient stops per stage: [top, middle, horizon]. */
const SKY_STOPS: ReadonlyArray<readonly [number, number, number]> = [
  [0x05070c, 0x0a0e16, 0x0e1420],
  [0x080b14, 0x1d2c4e, 0x454c70],
  [0x0a1220, 0x24406b, 0x3a6ea5],
  [0x0d1622, 0x24405c, 0x2f5a4a],
  [0x070b18, 0x152040, 0x2a3a5f],
  [0x16283f, 0x35618f, 0x6a93b8],
  [0x241f30, 0x6b4a55, 0xb3795a],
  [0x191822, 0x3a3448, 0x6d5c4a],
];

interface GlowLayer {
  image: Phaser.GameObjects.Image;
  alpha: number;
}

interface StageFx {
  glows: GlowLayer[];
  emitter: Phaser.GameObjects.Particles.ParticleEmitter | null;
}

/** Uniform random point inside a rect, typed for the particle zone source contract. */
function rectSource(x: number, y: number, width: number, height: number): Phaser.Types.GameObjects.Particles.RandomZoneSource {
  return {
    getRandomPoint: (point) => {
      point.x = x + Math.random() * width;
      point.y = y + Math.random() * height;
    },
  };
}

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

  private skies: Phaser.GameObjects.Image[] = [];
  private readonly stageFx = new Map<DayEffect, StageFx>();
  private moteOuter: Phaser.GameObjects.Image | null = null;
  private moteOver: Phaser.GameObjects.Image | null = null;
  private trail: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private burst: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private letterTop: Phaser.GameObjects.Rectangle | null = null;
  private letterBottom: Phaser.GameObjects.Rectangle | null = null;

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
    this.stageFx.clear();

    this.cameras.main.setBackgroundColor('#0b0d12');
    this.cameras.main.setZoom(1);
    this.cameras.main.fadeIn(400);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.scene.isActive('UIScene')) this.scene.stop('UIScene');
    });

    this.audio = new Audio(this);
    this.input.once('pointerdown', () => {
      this.audio?.unlock();
      this.audio?.playMusic(data.music);
    });

    this.ensureTextures();
    this.createSkies();
    this.world = this.add.graphics().setDepth(DEPTH.world);
    this.drawWorld(0);
    this.createVignette();

    const mote = this.physics.add.sprite(640, 500, 'mote').setDepth(DEPTH.mote);
    const halo = this.add
      .circle(640, 500, 44, 0x7aa2f7, 0.18)
      .setDepth(DEPTH.moteHalo)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.player = new Player(this, mote, halo);
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      this.player?.setTarget(ptr.worldX, ptr.worldY);
    });
    this.createMoteFx();
    this.createStageFx();

    this.ui = uiOf(this);
    for (const ref of data.intro) this.ui.showVerse(ref, Bible.lookup(ref));

    this.days.forEach((day, i) => {
      const x = 240 + i * 133;
      const y = 300;
      const ring = this.add.circle(x, y, 26, 0x7aa2f7, 0.25).setDepth(DEPTH.glyph);
      this.glyphVisuals.push(ring);
      this.add
        .text(x, y + 44, `Day ${i + 1}`, {
          fontFamily: 'Pixelify Sans, Courier New, monospace',
          fontSize: '16px',
          color: '#8a7a5a',
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.glyph);
      const zone = this.add.zone(x, y, 76, 76).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.onGlyph(i);
      });
    });
    this.tweens.add({ targets: this.glyphVisuals, alpha: 0.45, duration: 900, yoyo: true, repeat: -1 });

    this.letterTop = this.add
      .rectangle(640, LETTER_TOP_OFF, LETTER_W, LETTER_H, 0x000000, 1)
      .setDepth(DEPTH.letterbox);
    this.letterBottom = this.add
      .rectangle(640, LETTER_BOTTOM_OFF, LETTER_W, LETTER_H, 0x000000, 1)
      .setDepth(DEPTH.letterbox);

    this.applyStage(0);
  }

  override update(_time: number, delta: number): void {
    const p = this.player;
    if (p === null) return;
    p.update(delta);
    this.moteOuter?.setPosition(p.x, p.y);
    this.moteOver?.setPosition(p.x, p.y);
    this.trail?.setPosition(p.x, p.y);
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
    this.applyStage(this.stage);
    this.activateDay(day.effect);
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
      .setDepth(DEPTH.note);
    this.time.delayedCall(waitMs, () => {
      note.destroy();
      for (const ref of day.verses) this.ui?.showVerse(ref, Bible.lookup(ref));
      this.doneDays[this.days.indexOf(day)] = true;
      this.stage = 7;
      this.drawWorld(this.stage);
      this.refreshGlyph(this.days.indexOf(day));
      this.ui?.setLocked(false);
      this.applyStage(this.stage);
      this.activateDay(day.effect);
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
    this.tweenLetterbox(LETTER_TOP_ON, LETTER_BOTTOM_ON, 700);
    const verses = this.sceneData?.witness.verses ?? [];
    for (const ref of verses) this.ui?.showVerse(ref, Bible.lookup(ref));
    this.time.delayedCall(3500, () => {
      this.finishScene();
    });
    // Bars retract just before the ScrollScene handoff so the cut stays clean.
    this.time.delayedCall(2950, () => {
      this.tweenLetterbox(LETTER_TOP_OFF, LETTER_BOTTOM_OFF, 450);
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
    g.fillStyle(0x0e1420, 0.7);
    g.fillRect(0, h * 0.72, w, h - h * 0.72);
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

  private applyStage(stage: number): void {
    const shown = Math.min(stage, this.skies.length - 1);
    this.skies.forEach((sky, i) => sky.setVisible(i === shown));
    const cam = this.cameras.main;
    this.tweens.killTweensOf(cam);
    this.tweens.add({
      targets: cam,
      zoom: 1 + (0.06 * stage) / 7,
      duration: 1400,
      ease: 'Sine.easeInOut',
    });
    this.syncAmbientEmitters();
  }

  private syncAmbientEmitters(): void {
    this.days.forEach((day, i) => {
      const fx = this.stageFx.get(day.effect);
      if (fx === undefined || fx.emitter === null) return;
      if (this.doneDays[i] === true) fx.emitter.start();
      else fx.emitter.stop();
    });
  }

  private activateDay(effect: DayEffect): void {
    const fx = this.stageFx.get(effect);
    if (fx === undefined) return;
    for (const layer of fx.glows) {
      layer.image.setVisible(true);
      this.tweens.add({ targets: layer.image, alpha: layer.alpha, duration: 1000, ease: 'Sine.easeOut' });
    }
    this.playDayFx(effect);
  }

  private playDayFx(effect: DayEffect): void {
    if (effect === 'light') {
      const cam = this.cameras.main;
      cam.flash(500, 255, 246, 220);
      cam.shake(320, 0.004);
      this.burst?.setParticleTint(0xfff3c4);
      this.burst?.explode(30, 240, 300);
      const ring = this.add
        .image(240, 300, 'creation-ring')
        .setDepth(DEPTH.burst)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.2)
        .setAlpha(0.85);
      this.tweens.add({
        targets: ring,
        scale: 6,
        alpha: 0,
        duration: 1200,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
      });
      const rays = this.add
        .image(240, 300, 'creation-rays')
        .setDepth(DEPTH.burst)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.6)
        .setAlpha(0.8);
      this.tweens.add({
        targets: rays,
        scale: 2.6,
        alpha: 0,
        angle: rays.angle + 24,
        duration: 1500,
        ease: 'Cubic.easeOut',
        onComplete: () => rays.destroy(),
      });
    } else if (effect === 'rest') {
      this.burst?.setParticleTint(0xc9a86d);
      this.burst?.explode(16, 640, 300);
    }
  }

  private tweenLetterbox(topY: number, bottomY: number, duration: number): void {
    if (this.letterTop !== null) {
      this.tweens.add({ targets: this.letterTop, y: topY, duration, ease: 'Cubic.easeOut' });
    }
    if (this.letterBottom !== null) {
      this.tweens.add({ targets: this.letterBottom, y: bottomY, duration, ease: 'Cubic.easeOut' });
    }
  }

  private createSkies(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    this.skies = [];
    SKY_STOPS.forEach((_stops, i) => {
      this.makeSky(i);
      this.skies.push(
        this.add
          .image(w / 2, h / 2, `creation-sky-${i}`)
          .setDisplaySize(w, h)
          .setDepth(DEPTH.sky)
          .setVisible(i === 0),
      );
    });
  }

  private makeSky(index: number): void {
    const key = `creation-sky-${index}`;
    if (this.textures.exists(key)) return;
    const stops = SKY_STOPS[index];
    if (stops === undefined) return;
    const g = this.add.graphics();
    const half = SKY_H / 2;
    g.fillGradientStyle(stops[0], stops[0], stops[1], stops[1], 1);
    g.fillRect(0, 0, SKY_W, half);
    g.fillGradientStyle(stops[1], stops[1], stops[2], stops[2], 1);
    g.fillRect(0, half, SKY_W, SKY_H - half);
    g.generateTexture(key, SKY_W, SKY_H);
    g.destroy();
  }

  private createVignette(): void {
    this.add
      .image(this.scale.width / 2, this.scale.height / 2, 'creation-vignette')
      .setDisplaySize(this.scale.width, this.scale.height)
      .setDepth(DEPTH.vignette);
  }

  private createMoteFx(): void {
    const p = this.player;
    if (p === null) return;
    this.moteOuter = this.add
      .image(p.x, p.y, 'creation-glow')
      .setScale(4.6)
      .setTint(0x7aa2f7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.moteOuter)
      .setAlpha(0.2);
    this.moteOver = this.add
      .image(p.x, p.y, 'creation-glow')
      .setScale(1.5)
      .setTint(0xcfe0ff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.moteOver)
      .setAlpha(0.45);
    this.tweens.add({
      targets: this.moteOver,
      alpha: 0.62,
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.trail = this.add.particles(p.x, p.y, 'creation-speck', {
      blendMode: Phaser.BlendModes.ADD,
      radial: false,
      emitting: true,
      frequency: 150,
      maxAliveParticles: 6,
      lifespan: { random: [500, 850] },
      alpha: { start: 0.5, end: 0 },
      scale: { start: 0.85, end: 0.1 },
      speedX: { random: [-18, 18] },
      speedY: { random: [-18, 18] },
      tint: 0x9db8ff,
    });
    this.trail.setDepth(DEPTH.moteHalo);
  }

  private createStageFx(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    // Day 1's particle channel is the burst emitter (explode-only, see playDayFx).
    this.stageFx.set('light', {
      glows: [
        this.glow(240, 300, 2.4, 2.4, 0xfff3c4, 0.38),
        this.glow(w / 2, h * 0.52, 7, 1.4, 0x8fa8e0, 0.16),
      ],
      emitter: null,
    });

    this.stageFx.set('firmament', {
      glows: [
        this.glow(w / 2, h * 0.42, 7.5, 1.6, 0x7aa2f7, 0.3),
        this.glow(w / 2, h * 0.2, 6, 2.2, 0x4a6fbf, 0.14),
      ],
      emitter: this.ambient('creation-mist', {
        blendMode: Phaser.BlendModes.ADD,
        radial: false,
        frequency: 480,
        maxAliveParticles: 9,
        lifespan: { random: [4500, 7500] },
        speedX: { random: [-8, 8] },
        speedY: { random: [-30, -12] },
        alpha: { start: 0.22, end: 0 },
        scale: { start: 1, end: 2.2 },
        tint: 0x7aa2f7,
        emitZone: { type: 'random', source: rectSource(0, 470, w, 250) },
      }),
    });

    this.stageFx.set('land', {
      glows: [
        this.glow(w * 0.21, h * 0.64, 3.2, 2.4, 0x3da34d, 0.28),
        this.glow(w * 0.79, h * 0.66, 2.8, 2.2, 0x3da34d, 0.24),
      ],
      emitter: this.ambient('creation-flora', {
        blendMode: Phaser.BlendModes.ADD,
        radial: false,
        frame: ['pollen', 'leaf'],
        frequency: 520,
        maxAliveParticles: 9,
        lifespan: { random: [5000, 9000] },
        speedX: { random: [-22, 22] },
        speedY: { random: [-14, 6] },
        gravityY: 6,
        rotate: { random: [0, 359] },
        alpha: { start: 0.9, end: 0 },
        scale: { random: [0.7, 1.3] },
        emitZone: { type: 'random', source: rectSource(0, 330, w, 330) },
      }),
    });

    this.stageFx.set('lights', {
      glows: [
        this.glow(w * 0.78, h * 0.16, 3.2, 3.2, 0xffe9a8, 0.5),
        this.glow(w * 0.2, h * 0.14, 2.4, 2.4, 0xdfe6f5, 0.4),
      ],
      emitter: this.ambient('creation-star', {
        blendMode: Phaser.BlendModes.ADD,
        radial: false,
        frequency: 300,
        maxAliveParticles: 12,
        lifespan: { random: [1600, 3400] },
        speedX: 0,
        speedY: 0,
        alpha: { start: 0.95, end: 0 },
        scale: { start: 1, end: 0.4 },
        tint: 0xdfe6f5,
        emitZone: { type: 'random', source: rectSource(0, 0, w, 320) },
      }),
    });

    // Zones alternate bird/fish in lockstep with the cycling frame pair.
    const skyLife = this.ambient('creation-silo', {
      blendMode: Phaser.BlendModes.NORMAL,
      frame: { frames: ['bird', 'fish'], cycle: true },
      frequency: 1700,
      maxAliveParticles: 6,
      lifespan: { random: [9500, 11000] },
      speedX: { random: [140, 190] },
      speedY: 0,
      emitZone: [
        { type: 'random', source: rectSource(-60, 110, 70, 150) },
        { type: 'random', source: rectSource(-60, 545, 70, 70) },
      ],
    });
    for (const zone of skyLife.emitZones) zone.total = 1;
    this.stageFx.set('creatures', {
      glows: [this.glow(w / 2, h * 0.36, 8, 4, 0xcfe0f5, 0.15)],
      emitter: skyLife,
    });

    this.stageFx.set('mankind', {
      glows: [
        this.glow(w * 0.44, h * 0.62, 1.9, 1.9, 0xffd9a0, 0.42),
        this.glow(w * 0.56, h * 0.62, 1.9, 1.9, 0xffd9a0, 0.42),
      ],
      emitter: this.ambient('creation-firefly', {
        blendMode: Phaser.BlendModes.ADD,
        radial: false,
        frequency: 340,
        maxAliveParticles: 11,
        lifespan: { random: [2200, 4200] },
        speedX: { random: [-10, 10] },
        speedY: { random: [-14, 4] },
        alpha: { start: 0.9, end: 0 },
        scale: { start: 1, end: 0.5 },
        tint: 0xffe9a8,
        emitZone: { type: 'random', source: rectSource(0, 360, w, 300) },
      }),
    });

    this.stageFx.set('rest', {
      glows: [this.glow(w / 2, h * 0.42, 7, 3.4, 0xc9a86d, 0.3)],
      emitter: this.ambient('creation-gold', {
        blendMode: Phaser.BlendModes.ADD,
        radial: false,
        frequency: 640,
        maxAliveParticles: 7,
        lifespan: { random: [7000, 11000] },
        speedX: { random: [-6, 6] },
        speedY: { random: [-10, -4] },
        alpha: { start: 0.55, end: 0 },
        scale: { start: 1, end: 0.7 },
        tint: 0xc9a86d,
        emitZone: { type: 'random', source: rectSource(0, 90, w, 560) },
      }),
    });

    this.burst = this.add.particles(0, 0, 'creation-star', {
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
      frequency: 200,
      maxAliveParticles: 40,
      lifespan: { random: [650, 1200] },
      speed: { random: [90, 300] },
      alpha: { start: 1, end: 0 },
      scale: { start: 1.5, end: 0.2 },
      tint: 0xfff3c4,
    });
    this.burst.setDepth(DEPTH.burst);
  }

  private glow(
    x: number,
    y: number,
    scaleX: number,
    scaleY: number,
    tint: number,
    alpha: number,
  ): GlowLayer {
    const image = this.add
      .image(x, y, 'creation-glow')
      .setScale(scaleX, scaleY)
      .setTint(tint)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.glow)
      .setAlpha(0)
      .setVisible(false);
    return { image, alpha };
  }

  private ambient(
    key: string,
    config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
  ): Phaser.GameObjects.Particles.ParticleEmitter {
    const emitter = this.add.particles(0, 0, key, { ...config, emitting: false });
    emitter.setDepth(DEPTH.ambient);
    return emitter;
  }

  private bakeTexture(key: string, width: number, height: number, draw: (g: Phaser.GameObjects.Graphics) => void): void {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    draw(g);
    g.generateTexture(key, width, height);
    g.destroy();
  }

  private ensureTextures(): void {
    this.bakeTexture('creation-vignette', 320, 180, (g) => {
      for (let i = 0; i < 16; i += 1) {
        g.fillStyle(0x000000, 0.05);
        g.fillRect(i * 4, i * 2, 320 - i * 8, 180 - i * 4);
      }
    });
    this.bakeTexture('creation-glow', 96, 96, (g) => {
      for (let r = 44; r >= 4; r -= 4) {
        g.fillStyle(0xffffff, 0.05);
        g.fillCircle(48, 48, r);
      }
      g.fillStyle(0xffffff, 0.4);
      g.fillCircle(48, 48, 7);
    });
    this.bakeTexture('creation-ring', 160, 160, (g) => {
      g.lineStyle(7, 0xffffff, 0.9);
      g.strokeCircle(80, 80, 72);
      g.lineStyle(3, 0xfff3c4, 0.5);
      g.strokeCircle(80, 80, 62);
    });
    this.bakeTexture('creation-rays', 256, 256, (g) => {
      g.fillStyle(0xffffff, 0.5);
      for (let i = 0; i < 12; i += 1) {
        const a = (i * Math.PI * 2) / 12;
        const spread = 0.1;
        g.fillTriangle(
          128,
          128,
          128 + Math.cos(a - spread) * 122,
          128 + Math.sin(a - spread) * 122,
          128 + Math.cos(a + spread) * 122,
          128 + Math.sin(a + spread) * 122,
        );
      }
      g.fillStyle(0xffffff, 0.55);
      g.fillCircle(128, 128, 18);
    });
    this.bakeTexture('creation-mist', 32, 16, (g) => {
      g.fillStyle(0xffffff, 0.08);
      g.fillEllipse(16, 8, 30, 14);
      g.fillStyle(0xffffff, 0.12);
      g.fillEllipse(16, 8, 20, 9);
      g.fillStyle(0xffffff, 0.16);
      g.fillEllipse(16, 8, 10, 5);
    });
    if (!this.textures.exists('creation-flora')) {
      this.bakeTexture('creation-flora', 24, 12, (g) => {
        g.fillStyle(0xfff2c8, 0.35);
        g.fillCircle(6, 6, 5);
        g.fillStyle(0xfff2c8, 1);
        g.fillCircle(6, 6, 3);
        g.fillStyle(0x7fc46a, 1);
        g.fillEllipse(18, 6, 11, 5);
        g.fillStyle(0x4f9a48, 1);
        g.fillRect(13, 6, 10, 1);
      });
      const flora = this.textures.get('creation-flora');
      flora.add('pollen', 0, 0, 0, 12, 12);
      flora.add('leaf', 0, 12, 0, 12, 12);
    }
    if (!this.textures.exists('creation-silo')) {
      this.bakeTexture('creation-silo', 40, 16, (g) => {
        g.fillStyle(0x141a26, 1);
        g.fillTriangle(0, 12, 9, 4, 10, 12);
        g.fillTriangle(10, 12, 11, 4, 20, 12);
        g.fillEllipse(32, 8, 14, 7);
        g.fillTriangle(26, 8, 21, 4, 21, 12);
      });
      const silo = this.textures.get('creation-silo');
      silo.add('bird', 0, 0, 0, 20, 16);
      silo.add('fish', 0, 20, 0, 20, 16);
    }
    this.bakeTexture('creation-star', 7, 7, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillRect(3, 1, 1, 5);
      g.fillRect(1, 3, 5, 1);
      g.fillStyle(0xffffff, 0.6);
      g.fillRect(2, 2, 3, 3);
    });
    this.bakeTexture('creation-firefly', 9, 9, (g) => {
      g.fillStyle(0xffffff, 0.3);
      g.fillCircle(4, 4, 4);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(4, 4, 2);
    });
    this.bakeTexture('creation-speck', 6, 6, (g) => {
      g.fillStyle(0xffffff, 0.4);
      g.fillCircle(3, 3, 3);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(3, 3, 1.5);
    });
    this.bakeTexture('creation-gold', 8, 8, (g) => {
      g.fillStyle(0xffffff, 0.35);
      g.fillCircle(4, 4, 3.6);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(4, 4, 2);
    });
  }
}
