import Phaser from 'phaser';
import { Audio } from '../systems/Audio';
import { Bible } from '../systems/Bible';
import { Player } from '../systems/Player';
import { completeScene } from '../systems/Save';
import { Triggers } from '../systems/Triggers';
import { isSceneData, type SceneData } from '../types/sceneData';
import { uiOf, type UIScene } from './UIScene';

export class EdenScene extends Phaser.Scene {
  private sceneData: SceneData | null = null;
  private player: Player | null = null;
  private ui: UIScene | null = null;
  private audio: Audio | null = null;
  private triggers = new Triggers();
  private witnessed = false;

  constructor() {
    super('EdenScene');
  }

  init(packet: { data?: unknown }): void {
    const raw = packet.data;
    this.sceneData = isSceneData(raw) && raw.id === 'eden' ? raw : null;
  }

  create(): void {
    if (this.sceneData === null) {
      this.scene.start('HubScene');
      return;
    }
    const data = this.sceneData;
    if (data.interaction.type !== 'followPath') {
      this.scene.start('HubScene');
      return;
    }
    const path = data.interaction;
    this.witnessed = false;

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

    const w = this.scale.width;
    const h = this.scale.height;
    const g = this.add.graphics();
    g.fillStyle(0x10241a, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(0x19213a, 0.85);
    g.fillRect(0, h * 0.6, w, 26);
    g.fillRect(w * 0.3, h * 0.3, 26, h * 0.35);
    g.fillRect(w * 0.62, h * 0.2, 22, h * 0.45);
    g.fillRect(w * 0.45, h * 0.55, w * 0.4, 22);
    g.fillStyle(0x1d4a2a, 1);
    for (let i = 0; i < 16; i += 1) {
      g.fillCircle(60 + ((i * 173) % 1160), 80 + ((i * 97) % 380), 10);
    }

    const treeX = path.tree.x * w;
    const treeY = path.tree.y * h;
    this.add.image(treeX, treeY, 'tree').setScale(3).setDepth(3);
    this.add
      .text(treeX, treeY - 90, 'the tree of the knowledge of good and evil', {
        fontFamily: 'Pixelify Sans, Courier New, monospace',
        fontSize: '14px',
        color: '#c9a86d',
      })
      .setOrigin(0.5)
      .setDepth(3);

    const dots = this.add.graphics().setDepth(2);
    dots.fillStyle(0xc9a86d, 0.4);
    for (const wp of path.waypoints) {
      dots.fillCircle(wp.x * w, wp.y * h, 5);
    }

    const start = path.waypoints[0];
    const startX = start !== undefined ? start.x * w : 120;
    const startY = start !== undefined ? start.y * h : 400;
    const mote = this.physics.add.sprite(startX, startY, 'mote').setDepth(5);
    const halo = this.add.circle(startX, startY, 44, 0x7aa2f7, 0.18).setDepth(4);
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
    if (this.player === null || this.witnessed) return;
    const hit = this.triggers.tryFire(this.player.x, this.player.y);
    if (hit !== null) {
      for (const ref of hit) this.ui?.showVerse(ref, Bible.lookup(ref));
    }
    if (this.triggers.isFired('tree')) this.beginWitness();
  }

  private beginWitness(): void {
    this.witnessed = true;
    this.ui?.setLocked(true);
    const overlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0).setDepth(8);
    this.tweens.add({ targets: overlay, alpha: 0.6, duration: 2500 });
    this.ui?.showVerse('Genesis 3:6-8', Bible.lookup('Genesis 3:6-8'));
    this.time.delayedCall(5000, () => {
      const verses = this.sceneData?.witness.verses ?? [];
      for (const ref of verses) this.ui?.showVerse(ref, Bible.lookup(ref));
    });
    this.time.delayedCall(10000, () => {
      this.finishScene();
    });
  }

  private finishScene(): void {
    if (this.sceneData === null) {
      this.scene.start('HubScene');
      return;
    }
    completeScene('eden', this.sceneData.scrollPage.id);
    const verseRef = this.sceneData.scrollPage.verse;
    const packet = {
      sceneId: 'eden',
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
