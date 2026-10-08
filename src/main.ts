import Phaser from 'phaser';
import '@fontsource/eb-garamond';
import '@fontsource/pixelify-sans';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { HubScene } from './scenes/HubScene';
import { CreationScene } from './scenes/CreationScene';
import { EdenScene } from './scenes/EdenScene';
import { NoahScene } from './scenes/NoahScene';
import { ScrollScene } from './scenes/ScrollScene';
import { UIScene } from './scenes/UIScene';

export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  pixelArt: true,
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, PreloadScene, HubScene, CreationScene, EdenScene, NoahScene, ScrollScene, UIScene],
});

if (typeof window !== 'undefined') {
  const w = window as unknown as { __game?: Phaser.Game };
  w.__game = game;
}
