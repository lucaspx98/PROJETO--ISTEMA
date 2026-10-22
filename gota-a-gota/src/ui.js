import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config.js';
import { Sfx } from './audio.js';
import { Haptic } from './haptics.js';
import { Save } from './storage.js';
import { viewKey } from './textures.js';

export const FONT = '"Trebuchet MS", "Arial Rounded MT Bold", "Arial Black", sans-serif';

export function text(scene, x, y, str, size = 28, color = '#ffffff') {
  return scene.add
    .text(x, y, str, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      fontStyle: 'bold',
      color,
      stroke: '#1b2440',
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
    bg.fillStyle(0x000000, 0.3);
    bg.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, h / 2.6);
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-w / 2, -h / 2 + (pressed ? 4 : 0), w, h, h / 2.6);
    bg.fillStyle(0xffffff, 0.22);
    bg.fillRoundedRect(-w / 2 + 8, -h / 2 + 5 + (pressed ? 4 : 0), w - 16, h / 3, h / 6);
  };
  draw(false);
  const t = text(scene, 0, 0, label, size);
  c.add([bg, t]);
  c.setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  c.setDepth(20);
  c.on('pointerdown', () => {
    draw(true);
    t.y = 4;
  });
  c.on('pointerout', () => {
    draw(false);
    t.y = 0;
  });
  c.on('pointerup', () => {
    draw(false);
    t.y = 0;
    Sfx.tap();
    Haptic.light();
    onClick();
  });
  c.label = t;
  return c;
}

/** Paisagem da vista atual coberta de névoa (menu e loja). */
export function background(scene) {
  scene.add.image(0, 0, viewKey(scene, Save.get('theme'))).setOrigin(0);
  scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xdde6ee, 0.72).setOrigin(0);
}

export function coinCounter(scene, x, y, value) {
  const icon = scene.add.image(x, y, 'coin').setDepth(20);
  const t = text(scene, x + 22, y, String(value), 26, '#ffd23f').setOrigin(0, 0.5).setDepth(20);
  return {
    set: (v) => t.setText(String(v)),
    pulse: () => scene.tweens.add({ targets: [icon, t], scale: 1.25, duration: 90, yoyo: true }),
    objects: [icon, t],
    icon,
  };
}

/** Mensagem rápida que aparece e some. */
export function toast(scene, str, y = GAME_HEIGHT / 2) {
  const t = text(scene, GAME_WIDTH / 2, y, str, 24).setDepth(50).setWordWrapWidth(GAME_WIDTH - 60);
  scene.tweens.add({ targets: t, y: y - 30, alpha: 0, delay: 1300, duration: 500, onComplete: () => t.destroy() });
}

export const rand = Phaser.Math.Between;
