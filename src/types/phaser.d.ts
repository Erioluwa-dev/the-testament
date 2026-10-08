/**
 * @fileoverview Phaser 4 type-surface note.
 *
 * The installed `phaser` package (v4.x) already ships current declarations
 * in `node_modules/phaser/types/phaser.d.ts`, including the GameObjectFactory
 * methods the game uses (`container`, `text`, `graphics`, `image`, `circle`,
 * `sprite`) and `LoaderPlugin.font`. No ambient augmentation is needed, so
 * this file intentionally declares nothing. It is kept so existing imports
 * of `../types/phaser` (if any) keep resolving.
 */

export {};
