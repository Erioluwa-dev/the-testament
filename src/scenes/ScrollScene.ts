import Phaser from 'phaser';
import { completeScene } from '../systems/Save';
import type { PageId, SceneId } from '../types/sceneData';

const SCENE_IDS: readonly string[] = ['creation', 'eden', 'noah'];
const PAGE_IDS: readonly string[] = ['page-creation', 'page-eden', 'page-noah'];

const EMBLEMS: Record<PageId, number> = {
  'page-creation': 0xc9a86d,
  'page-eden': 0x3da34d,
  'page-noah': 0x7aa2f7,
};

interface ScrollPacket {
  sceneId: SceneId;
  page: PageId;
  verseRef: string;
  verseText: string;
  title: string;
  reread: boolean;
}

function isScrollPacket(value: unknown): value is ScrollPacket {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['sceneId'] === 'string' &&
    SCENE_IDS.includes(v['sceneId']) &&
    typeof v['page'] === 'string' &&
    PAGE_IDS.includes(v['page']) &&
    typeof v['verseRef'] === 'string' &&
    typeof v['verseText'] === 'string' &&
    typeof v['title'] === 'string' &&
    typeof v['reread'] === 'boolean'
  );
}

export class ScrollScene extends Phaser.Scene {
  private packet: ScrollPacket | null = null;

  constructor() {
    super('ScrollScene');
  }

  init(packet: unknown): void {
    this.packet = isScrollPacket(packet) ? packet : null;
  }

  create(): void {
    if (this.packet === null) {
      this.scene.start('HubScene');
      return;
    }
    const { sceneId, page, verseRef, verseText, title, reread } = this.packet;
    this.cameras.main.setBackgroundColor('#0b0d12');
    this.cameras.main.fadeIn(400);

    const pageGfx = this.add.graphics();
    pageGfx.fillStyle(0x2a2418, 1);
    pageGfx.fillRoundedRect(360, 90, 560, 540, 12);
    pageGfx.lineStyle(2, 0xc9a86d, 0.6);
    pageGfx.strokeRoundedRect(360, 90, 560, 540, 12);

    this.add.circle(640, 170, 30, EMBLEMS[page] ?? 0xc9a86d, 1);
    this.add
      .text(640, 230, title.toUpperCase(), {
        fontFamily: 'Pixelify Sans, Courier New, monospace',
        fontSize: '20px',
        color: '#c9a86d',
      })
      .setOrigin(0.5);
    this.add
      .text(640, 268, verseRef, {
        fontFamily: 'Pixelify Sans, Courier New, monospace',
        fontSize: '16px',
        color: '#8a7a5a',
      })
      .setOrigin(0.5);
    this.add
      .text(640, 300, verseText, {
        fontFamily: 'EB Garamond, Georgia, serif',
        fontSize: '24px',
        color: '#f3ede0',
        align: 'center',
        lineSpacing: 10,
        wordWrap: { width: 460 },
      })
      .setOrigin(0.5, 0);
    this.add
      .text(640, 664, reread ? 'Tap to return' : 'Tap to keep this page', {
        fontFamily: 'Pixelify Sans, Courier New, monospace',
        fontSize: '18px',
        color: '#e8dcc0',
      })
      .setOrigin(0.5);

    this.input.once('pointerdown', () => {
      if (!reread) completeScene(sceneId, page);
      this.scene.start('HubScene');
    });
  }
}
