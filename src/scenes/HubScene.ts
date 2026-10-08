import Phaser from 'phaser';
import { Audio } from '../systems/Audio';
import { Bible } from '../systems/Bible';
import { currentSave, resetSave, storeSave } from '../systems/Save';
import type { TextSpeed } from '../systems/pacing';
import { isSceneData, type SceneData, type SceneId } from '../types/sceneData';
import creationJson from '../data/scenes/creation.json';
import edenJson from '../data/scenes/eden.json';
import noahJson from '../data/scenes/noah.json';

const SCENE_KEY: Record<SceneId, string> = {
  creation: 'CreationScene',
  eden: 'EdenScene',
  noah: 'NoahScene',
};

interface DoorDef {
  id: SceneId | null;
  label: string;
  sub: string;
}

const DOORS: DoorDef[] = [
  { id: 'creation', label: 'Creation', sub: 'Genesis 1–2' },
  { id: 'eden', label: 'Eden', sub: 'Genesis 2–3' },
  { id: 'noah', label: 'The Flood', sub: 'Genesis 6–9' },
  { id: null, label: 'Babel', sub: 'Coming soon' },
  { id: null, label: 'Abraham', sub: 'Coming soon' },
];

function validScenes(): SceneData[] {
  const out: SceneData[] = [];
  for (const raw of [creationJson, edenJson, noahJson]) {
    if (isSceneData(raw)) out.push(raw);
  }
  return out;
}

export class HubScene extends Phaser.Scene {
  private audio: Audio | null = null;
  private resetArmed = false;

  constructor() {
    super('HubScene');
  }

  create(): void {
    const save = currentSave();
    this.resetArmed = false;
    this.audio = new Audio(this);
    this.cameras.main.setBackgroundColor('#0b0d12');
    this.cameras.main.fadeIn(400);
    this.input.once('pointerdown', () => {
      this.audio?.unlock();
      this.audio?.playMusic('hub');
    });

    this.add
      .text(640, 60, 'THE TIMELINE HALL', {
        fontFamily: 'Pixelify Sans, Courier New, monospace',
        fontSize: '36px',
        color: '#e8dcc0',
      })
      .setOrigin(0.5);

    this.drawShelf(save.pages.length);
    this.drawDoors(save.completedScenes);
    this.drawSettings(save.settings.textSpeed);
    if (save.completedScenes.length >= 3) this.drawClosing();
  }

  private drawShelf(collected: number): void {
    this.add
      .text(640, 130, `Scrolls  ${collected}/3`, {
        fontFamily: 'Pixelify Sans, Courier New, monospace',
        fontSize: '20px',
        color: '#c9a86d',
      })
      .setOrigin(0.5);
    const scenes = validScenes();
    for (let i = 0; i < 3; i += 1) {
      const x = 540 + i * 100;
      const owned = i < collected && scenes[i] !== undefined;
      const slot = this.add.rectangle(x, 180, 64, 80, owned ? 0x2a2418 : 0x14161f, 1);
      slot.setStrokeStyle(2, owned ? 0xc9a86d : 0x3a3f52, 1);
      if (owned) {
        const pageId = scenes[i]?.scrollPage.id;
        this.add
          .text(x, 180, `${i + 1}`, {
            fontFamily: 'EB Garamond, Georgia, serif',
            fontSize: '30px',
            color: '#e8dcc0',
          })
          .setOrigin(0.5);
        const zone = this.add.zone(x, 180, 72, 88).setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => {
          if (pageId !== undefined) this.reread(pageId);
        });
      }
    }
  }

  private drawDoors(completed: SceneId[]): void {
    const open = (id: SceneId): boolean => {
      if (id === 'creation') return true;
      if (id === 'eden') return completed.includes('creation');
      return completed.includes('eden');
    };
    DOORS.forEach((def, i) => {
      const x = 140 + i * 250;
      const y = 420;
      const unlocked = def.id !== null && open(def.id);
      const g = this.add.graphics();
      g.fillStyle(unlocked ? 0x1a1d27 : 0x101218, 1);
      g.fillRoundedRect(x - 80, y - 110, 160, 220, 10);
      g.lineStyle(2, unlocked ? 0xc9a86d : 0x3a3f52, 1);
      g.strokeRoundedRect(x - 80, y - 110, 160, 220, 10);
      this.add
        .text(x, y - 40, def.label, {
          fontFamily: 'Pixelify Sans, Courier New, monospace',
          fontSize: '24px',
          color: unlocked ? '#e8dcc0' : '#5a4a6a',
        })
        .setOrigin(0.5);
      this.add
        .text(x, y + 60, unlocked ? def.sub : def.id === null ? 'Coming soon' : 'Locked', {
          fontFamily: 'Pixelify Sans, Courier New, monospace',
          fontSize: '16px',
          color: '#8a7a5a',
        })
        .setOrigin(0.5);
      if (unlocked && def.id !== null) {
        const id = def.id;
        const zone = this.add.zone(x, y, 170, 230).setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => {
          this.enterScene(id);
        });
      }
    });
  }

  private drawSettings(speed: TextSpeed): void {
    this.add
      .text(
        640,
        660,
        `Text speed [1/2/3]: ${speed}    [M] sound    [R] reset progress${this.resetArmed ? '  —  press R again to confirm' : ''}`,
        {
          fontFamily: 'Pixelify Sans, Courier New, monospace',
          fontSize: '16px',
          color: '#8a7a5a',
        },
      )
      .setOrigin(0.5);
    const kb = this.input.keyboard;
    kb?.on('keydown-ONE', () => {
      this.setSpeed('slow');
    });
    kb?.on('keydown-TWO', () => {
      this.setSpeed('normal');
    });
    kb?.on('keydown-THREE', () => {
      this.setSpeed('fast');
    });
    kb?.on('keydown-M', () => {
      const muted = this.audio?.toggleMute() ?? false;
      void muted;
      this.scene.restart();
    });
    kb?.on('keydown-R', () => {
      if (this.resetArmed) {
        resetSave();
        this.scene.restart();
      } else {
        this.resetArmed = true;
        this.scene.restart();
      }
    });
  }

  private drawClosing(): void {
    this.add
      .text(640, 250, '“More chapters are coming.”', {
        fontFamily: 'EB Garamond, Georgia, serif',
        fontSize: '26px',
        color: '#c9a86d',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);
  }

  private setSpeed(speed: TextSpeed): void {
    const save = currentSave();
    save.settings.textSpeed = speed;
    storeSave(save);
    this.scene.restart();
  }

  private enterScene(id: SceneId): void {
    const data = validScenes().find((s) => s.id === id);
    if (data === undefined) return;
    this.scene.start(SCENE_KEY[id], { data });
  }

  private reread(pageId: string): void {
    for (const s of validScenes()) {
      if (s.scrollPage.id === pageId) {
        this.scene.start('ScrollScene', {
          sceneId: s.id,
          page: s.scrollPage.id,
          verseRef: s.scrollPage.verse,
          verseText: Bible.lookup(s.scrollPage.verse),
          title: s.title,
          reread: true,
        });
        return;
      }
    }
  }
}
