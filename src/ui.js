import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, GROUND_Y } from './config.js';
import { Sfx } from './audio.js';

export const FONT = '"Trebuchet MS", "Arial Black", sans-serif';

export function text(scene, x, y, str, size = 28, color = '#ffffff') {
  return scene.add
    .text(x, y, str, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      fontStyle: 'bold',
      color,
      stroke: '#0b0820',
      strokeThickness: Math.max(3, size / 7),
      align: 'center',
    })
    .setOrigin(0.5);
}

/** Botão arredondado com efeito de toque. */
export function button(scene, x, y, w, h, label, color, onClick, size = 26) {
  const c = scene.add.container(x, y);
  const bg = scene.add.graphics();
  const draw = (pressed) => {
    bg.clear();
    bg.fillStyle(0x000000, 0.35);
    bg.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, 16);
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-w / 2, -h / 2 + (pressed ? 4 : 0), w, h, 16);
    bg.fillStyle(0xffffff, 0.18);
    bg.fillRoundedRect(-w / 2 + 6, -h / 2 + 4 + (pressed ? 4 : 0), w - 12, h / 3, 10);
  };
  draw(false);
  const t = text(scene, 0, 0, label, size);
  c.add([bg, t]);
  c.setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerdown', (p, lx, ly, e) => {
    e?.stopPropagation();
    draw(true);
    t.y = 4;
  });
  c.on('pointerout', () => {
    draw(false);
    t.y = 0;
  });
  c.on('pointerup', (p, lx, ly, e) => {
    e?.stopPropagation();
    draw(false);
    t.y = 0;
    Sfx.click();
    onClick();
  });
  c.label = t;
  return c;
}

/** Fundo com parallax compartilhado entre as cenas. */
export function background(scene) {
  scene.add.image(0, 0, 'sky').setOrigin(0);
  const stars = scene.add.tileSprite(0, 0, GAME_WIDTH, 300, 'stars').setOrigin(0);
  const mountains = scene.add.tileSprite(0, GROUND_Y - 200, GAME_WIDTH, 200, 'mountains').setOrigin(0);
  const city = scene.add.tileSprite(0, GROUND_Y - 160, GAME_WIDTH, 160, 'city').setOrigin(0);
  const ground = scene.add.tileSprite(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y, 'ground').setOrigin(0);
  return {
    ground,
    scroll(dx) {
      stars.tilePositionX += dx * 0.05;
      mountains.tilePositionX += dx * 0.15;
      city.tilePositionX += dx * 0.4;
      ground.tilePositionX += dx;
    },
  };
}

export function coinCounter(scene, x, y, value) {
  const icon = scene.add.image(x, y, 'coin');
  const t = text(scene, x + 20, y, String(value), 26, '#ffd23f').setOrigin(0, 0.5);
  return {
    set: (v) => t.setText(String(v)),
    objects: [icon, t],
  };
}

export const rand = Phaser.Math.Between;
