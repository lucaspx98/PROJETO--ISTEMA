import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config.js';
import { Ads } from './ads.js';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { ArcadeScene } from './scenes/ArcadeScene.js';
import { ShopScene } from './scenes/ShopScene.js';

Ads.init();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#141b3a',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 1 },
  render: { antialias: true },
  scene: [BootScene, MenuScene, ArcadeScene, GameScene, ShopScene],
});

// Acesso pelo console do navegador durante o desenvolvimento (testes automáticos usam isso).
if (import.meta.env.DEV) window.game = game;
