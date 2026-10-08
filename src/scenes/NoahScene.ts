import Phaser from 'phaser';
import { Audio } from '../systems/Audio';
import { Bible } from '../systems/Bible';
import { Follower } from '../systems/Follower';
import { Player } from '../systems/Player';
import { completeScene } from '../systems/Save';
import { Triggers } from '../systems/Triggers';
import { distance } from '../systems/steering';
import { isSceneData, type SceneData } from '../types/sceneData';
import { uiOf, type UIScene } from './UIScene';

type NoahStage = 'gather' | 'flood' | 'dove' | 'done';

interface Animal {
  sprite: Phaser.Physics.Arcade.Sprite;
  follower: Follower;
  homeX: number;
  homeY: number;
  phase: number;
  boarded: boolean;
}

const RAINBOW: number[] = [0xd94a4a, 0xe08a3c, 0xe8d44a, 0x4aa84a, 0x4a7ad9];

export class NoahScene extends Phaser.Scene {
  private sceneData: SceneData | null = null;
  private pairs: string[] = [];
  private rampId = 'ark-ramp';
  private player: Player | null = null;
  private ui: UIScene | null = null;
  private audio: Audio | null = null;
  private triggers = new Triggers();
  private animals: Animal[] = [];
  private stage: NoahStage = 'gather';
  private boarded = 0;
  private counter: Phaser.GameObjects.Text | null = null;
  private water: Phaser.GameObjects.Rectangle | null = null;
  private drops: Phaser.GameObjects.Image[] = [];
  private dayText: Phaser.GameObjects.Text | null = null;
  private floodProgress = 0;
  private floodMidShown = false;
  private floodLateShown = false;
  private bird: Phaser.Physics.Arcade.Sprite | null = null;
  private doveTaps = 0;
  private finished = false;

  constructor() {
    super('NoahScene');
  }

  init(packet: { data?: unknown }): void {
    const raw = packet.data;
    this.sceneData = isSceneData(raw) && raw.id === 'noah' ? raw : null;
  }

  create(): void {
    if (this.sceneData === null) {
      this.scene.start('HubScene');
      return;
    }
    const data = this.sceneData;
    if (data.interaction.type !== 'gatherPairs') {
      this.scene.start('HubScene');
      return;
    }
    this.pairs = [...data.interaction.pairs];
    this.rampId = data.interaction.target;
    this.stage = 'gather';
    this.boarded = 0;
    this.animals = [];
    this.drops = [];
    this.doveTaps = 0;
    this.finished = false;
    this.floodProgress = 0;
    this.floodMidShown = false;
    this.floodLateShown = false;

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

    const g = this.add.graphics();
    g.fillStyle(0x1a2233, 1);
    g.fillRect(0, 0, 1280, 720);
    g.fillStyle(0x232c1a, 1);
    g.fillRect(0, 480, 1280, 240);

    this.add.image(640, 300, 'ark').setScale(1.2).setDepth(3);
    const ramp = data.triggers.find((t) => t.id === this.rampId)?.zone;
    const rampCX = ramp !== undefined ? ramp.x + ramp.width / 2 : 640;
    const rampCY = ramp !== undefined ? ramp.y + ramp.height / 2 : 420;
    const planks = this.add.graphics().setDepth(2);
    planks.fillStyle(0x7a5a36, 1);
    planks.fillRect(rampCX - 30, rampCY - 10, 60, 90);

    this.add.circle(1000, 540, 14, 0xe8dcc0, 1).setDepth(3);
    this.add
      .text(1000, 570, 'Noah', {
        fontFamily: 'Pixelify Sans, Courier New, monospace',
        fontSize: '16px',
        color: '#e8dcc0',
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.pairs.forEach((name, i) => {
      for (let k = 0; k < 2; k += 1) {
        const homeX = 140 + i * 170 + k * 48;
        const homeY = 200 + (i % 2) * 60;
        const sprite = this.physics.add.sprite(homeX, homeY, `animal-${name}`).setDepth(3);
        sprite.setScale(1.4);
        const follower = new Follower(sprite, k === 0 ? -44 : 44, 30);
        this.animals.push({ sprite, follower, homeX, homeY, phase: i * 1.3 + k * 2.1, boarded: false });
      }
    });

    this.counter = this.add
      .text(80, 40, `Pairs: 0/${this.pairs.length}`, {
        fontFamily: 'Pixelify Sans, Courier New, monospace',
        fontSize: '24px',
        color: '#e8dcc0',
      })
      .setDepth(10);

    const mote = this.physics.add.sprite(640, 600, 'mote').setDepth(5);
    const halo = this.add.circle(640, 600, 44, 0x7aa2f7, 0.18).setDepth(4);
    this.player = new Player(this, mote, halo);
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      this.player?.setTarget(ptr.worldX, ptr.worldY);
    });

    this.triggers.fromData(data.triggers);
    this.ui = uiOf(this);
    for (const ref of data.intro) this.ui.showVerse(ref, Bible.lookup(ref));
  }

  override update(_time: number, delta: number): void {
    this.player?.update(delta);
    if (this.player === null || this.finished) return;
    if (this.stage === 'gather') this.updateGather(_time, delta);
    else if (this.stage === 'flood') this.updateFlood(delta);
  }

  private updateGather(time: number, delta: number): void {
    const px = this.player?.x ?? 0;
    const py = this.player?.y ?? 0;
    const ramp = this.sceneData?.triggers.find((t) => t.id === this.rampId)?.zone;
    for (const animal of this.animals) {
      if (animal.boarded) continue;
      if (!animal.follower.following) {
        if (distance(animal.sprite.x, animal.sprite.y, px, py) < 110) {
          animal.follower.following = true;
        } else {
          animal.sprite.setPosition(
            animal.homeX + Math.sin(time / 900 + animal.phase) * 36,
            animal.homeY + Math.cos(time / 1200 + animal.phase) * 24,
          );
          continue;
        }
      }
      animal.follower.update(delta, px, py);
      if (
        ramp !== undefined &&
        animal.sprite.x >= ramp.x &&
        animal.sprite.x <= ramp.x + ramp.width &&
        animal.sprite.y >= ramp.y &&
        animal.sprite.y <= ramp.y + ramp.height
      ) {
        animal.boarded = true;
        animal.sprite.destroy();
        this.boarded += 1;
        this.counter?.setText(`Pairs: ${Math.floor(this.boarded / 2)}/${this.pairs.length}`);
        if (this.boarded === 1) {
          const verses = this.triggers.fire(this.rampId);
          if (verses !== null) {
            for (const ref of verses) this.ui?.showVerse(ref, Bible.lookup(ref));
          }
        }
      }
    }
    if (distance(px, py, 1000, 540) < 110 && !this.triggers.isFired('family')) {
      const verses = this.triggers.fire('family');
      if (verses !== null) {
        for (const ref of verses) this.ui?.showVerse(ref, Bible.lookup(ref));
      }
    }
    if (this.boarded >= this.animals.length) this.startFlood();
  }

  private startFlood(): void {
    this.stage = 'flood';
    this.ui?.showVerse('Genesis 7:16', Bible.lookup('Genesis 7:16'));
    this.water = this.add.rectangle(640, 720, 1280, 1, 0x1a3a5f, 0.88).setOrigin(0.5, 1).setDepth(7);
    for (let i = 0; i < 50; i += 1) {
      const drop = this.add
        .image(Math.random() * 1280, Math.random() * 720, 'drop')
        .setDepth(8);
      this.drops.push(drop);
    }
    this.dayText = this.add
      .text(1120, 60, 'Day 1', {
        fontFamily: 'Pixelify Sans, Courier New, monospace',
        fontSize: '30px',
        color: '#e8dcc0',
      })
      .setOrigin(0.5)
      .setDepth(10);
  }

  private updateFlood(delta: number): void {
    this.floodProgress = Math.min(1, this.floodProgress + delta / 45000);
    const p = this.floodProgress;
    this.water?.setScale(1, Math.max(1, p * 540));
    for (const drop of this.drops) {
      drop.y += 520 * (delta / 1000);
      if (drop.y > 720) {
        drop.y = -20;
        drop.x = Math.random() * 1280;
      }
    }
    if (p < 0.4) this.dayText?.setText('Day 1');
    else if (p < 0.85) this.dayText?.setText('Day 40');
    else this.dayText?.setText('Day 150');
    if (p > 0.3 && !this.floodMidShown) {
      this.floodMidShown = true;
      this.ui?.showVerse('Genesis 7:17', Bible.lookup('Genesis 7:17'));
    }
    if (p > 0.7 && !this.floodLateShown) {
      this.floodLateShown = true;
      this.ui?.showVerse('Genesis 8:1', Bible.lookup('Genesis 8:1'));
    }
    if (p >= 1) this.startDove();
  }

  private startDove(): void {
    this.stage = 'dove';
    for (const drop of this.drops) drop.destroy();
    this.drops = [];
    this.water?.destroy();
    this.dayText?.setText('The waters recede');
    this.ui?.showVerse('Genesis 8:6', Bible.lookup('Genesis 8:6'));
    const hint = this.add
      .text(640, 180, 'Tap the window to send out the birds', {
        fontFamily: 'Pixelify Sans, Courier New, monospace',
        fontSize: '18px',
        color: '#c9a86d',
      })
      .setOrigin(0.5)
      .setDepth(9);
    this.bird = this.physics.add.sprite(640, 260, 'animal-raven').setDepth(9);
    this.bird.setScale(1.4);
    const zone = this.add.zone(640, 260, 220, 160).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      if (this.ui?.isTyping() === true) return;
      hint.destroy();
      zone.disableInteractive();
      this.onBirdTap(zone, hint);
    });
  }

  private onBirdTap(zone: Phaser.GameObjects.Zone, hint: Phaser.GameObjects.Text): void {
    const idx = this.doveTaps;
    this.doveTaps += 1;
    const bird = this.bird;
    if (bird === null) return;
    if (idx === 0) {
      bird.setTexture('animal-raven');
      this.tweens.add({ targets: bird, x: 1100, y: 140, duration: 1200 });
      this.ui?.showVerse('Genesis 8:7', Bible.lookup('Genesis 8:7'));
      this.time.delayedCall(1400, () => {
        zone.setInteractive({ useHandCursor: true });
      });
    } else if (idx === 1) {
      bird.setTexture('animal-dove');
      bird.setPosition(1100, 140);
      this.tweens.add({ targets: bird, x: 640, y: 260, duration: 1200 });
      this.ui?.showVerse('Genesis 8:8-9', Bible.lookup('Genesis 8:8-9'));
      this.time.delayedCall(1400, () => {
        zone.setInteractive({ useHandCursor: true });
      });
    } else if (idx === 2) {
      this.tweens.add({ targets: bird, x: 1100, y: 140, duration: 1200 });
      this.ui?.showVerse('Genesis 8:10-11', Bible.lookup('Genesis 8:10-11'));
      this.add.circle(1110, 130, 6, 0x3da34d, 1).setDepth(9);
      this.time.delayedCall(1400, () => {
        zone.setInteractive({ useHandCursor: true });
        hint.setText('Tap once more');
      });
    } else {
      this.tweens.add({ targets: bird, x: 1400, y: 80, duration: 1500 });
      this.ui?.showVerse('Genesis 8:12', Bible.lookup('Genesis 8:12'));
      this.time.delayedCall(1700, () => {
        this.witnessRainbow();
      });
    }
  }

  private witnessRainbow(): void {
    this.stage = 'done';
    this.ui?.setLocked(true);
    const g = this.add.graphics().setDepth(6);
    RAINBOW.forEach((color, i) => {
      g.lineStyle(12, color, 0.9);
      g.strokeCircle(640, 760, 300 - i * 14);
    });
    this.audio?.playMusic('noah-resolve');
    const verses = this.sceneData?.witness.verses ?? [];
    for (const ref of verses) this.ui?.showVerse(ref, Bible.lookup(ref));
    this.time.delayedCall(4000, () => {
      this.finishScene();
    });
  }

  private finishScene(): void {
    if (this.finished) return;
    this.finished = true;
    if (this.sceneData === null) {
      this.scene.start('HubScene');
      return;
    }
    completeScene('noah', this.sceneData.scrollPage.id);
    const verseRef = this.sceneData.scrollPage.verse;
    const packet = {
      sceneId: 'noah',
      page: this.sceneData.scrollPage.id,
      verseRef,
      verseText: Bible.lookup(verseRef),
      title: this.sceneData.title,
      reread: false,
    };
    this.scene.stop('UIScene');
    this.scene.start('ScrollScene', packet);
  }
}
