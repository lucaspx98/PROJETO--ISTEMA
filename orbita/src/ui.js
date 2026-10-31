import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config.js';
import { Sfx } from './audio.js';

export const FONT = '"Avenir Next", "Trebuchet MS", "Arial Black", sans-serif';
export const BG_COLOR = 0x070b1f;

export function text(scene, x, y, str, size = 28, color = '#ffffff') {
  return scene.add
    .text(x, y, str, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      fontStyle: 'bold',
      color,
      stroke: '#070b1f',
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
    bg.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, h / 2);
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-w / 2, -h / 2 + (pressed ? 4 : 0), w, h, h / 2);
    bg.fillStyle(0xffffff, 0.18);
    bg.fillRoundedRect(-w / 2 + 10, -h / 2 + 5 + (pressed ? 4 : 0), w - 20, h / 3, h / 6);
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

/** Céu com parallax, fixo na tela. `scroll(y)` recebe a posição vertical da câmera. */
export function background(scene) {
  scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, BG_COLOR).setOrigin(0).setScrollFactor(0);
  const nebula = scene.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'nebula').setOrigin(0).setScrollFactor(0);
  const far = scene.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'stars-far').setOrigin(0).setScrollFactor(0);
  const near = scene.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'stars-near').setOrigin(0).setScrollFactor(0);
  return {
    scroll(y) {
      nebula.tilePositionY = y * 0.05;
      far.tilePositionY = y * 0.15;
      near.tilePositionY = y * 0.35;
    },
  };
}

export function gemCounter(scene, x, y, value) {
  const icon = scene.add.image(x, y, 'gem').setScale(0.8).setScrollFactor(0);
  const t = text(scene, x + 20, y, String(value), 28, '#99e9f2').setOrigin(0, 0.5).setScrollFactor(0);
  return {
    set: (v) => t.setText(String(v)),
    objects: [icon, t],
  };
}

export function toast(scene, msg, y = GAME_HEIGHT - 170) {
  const t = text(scene, GAME_WIDTH / 2, y, msg, 24).setScrollFactor(0).setDepth(50);
  scene.tweens.add({ targets: t, alpha: 0, delay: 1400, duration: 400, onComplete: () => t.destroy() });
}

export const rand = Phaser.Math.Between;
export const randf = Phaser.Math.FloatBetween;
