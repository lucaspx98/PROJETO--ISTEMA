import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config.js';
import { Ads } from './ads.js';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { ShopScene } from './scenes/ShopScene.js';

Ads.init();

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b0820',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 2400 }, debug: false } },
  input: { activePointers: 2 },
  render: { antialias: true },
  scene: [BootScene, MenuScene, GameScene, GameOverScene, ShopScene],
});
