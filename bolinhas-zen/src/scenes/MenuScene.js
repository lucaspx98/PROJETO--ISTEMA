import Phaser from 'phaser';
import { GAME_WIDTH } from '../config.js';
import { Save } from '../storage.js';
import { Sfx } from '../audio.js';
import { Ads } from '../ads.js';
import { Music } from '../music.js';
import { themeById } from '../themes.js';
import { ballKey } from '../textures.js';
import { background, button, coinCounter, text } from '../ui.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    background(this);
    Ads.showBanner();
    const theme = themeById(Save.get('theme'));

    const title = text(this, GAME_WIDTH / 2, 190, 'BOLINHAS', 76, '#ffffff');
    title.setStroke('#ff70c8', 14);
    const sub = text(this, GAME_WIDTH / 2, 268, 'ZEN', 64, '#7ff0e0');
    sub.setStroke('#3a5aff', 12);
    this.tweens.add({ targets: [title, sub], scale: 1.04, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // Onda de bolinhas pulando em sequência
    const n = 7;
    for (let i = 0; i < n; i++) {
      const b = this.add.image(GAME_WIDTH / 2 + (i - (n - 1) / 2) * 62, 385, ballKey(theme.id, i % theme.colors.length));
      this.tweens.add({ targets: b, y: 340, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: i * 110, repeatDelay: 500 });
    }

    button(this, GAME_WIDTH / 2, 510, 340, 96, `▶  NÍVEL ${Save.get('level')}`, 0x06d6a0, () => this.play(), 40);
    button(this, GAME_WIDTH / 2, 625, 340, 70, '🎨  Temas', 0x8338ec, () => this.scene.start('Shop'), 28);

    const opts = [
      ['muted', 'Sons', () => Save.toggle('muted')],
      ['musicOff', 'Música', () => Music.toggle()],
      ['vibrationOff', 'Vibrar', () => Save.toggle('vibrationOff')],
    ];
    opts.forEach(([key, name, fn], i) => {
      const label = () => `${name}: ${Save.get(key) ? 'não' : 'sim'}`;
      const b = button(this, GAME_WIDTH / 2 + (i - 1) * 172, 735, 160, 58, label(), 0x3a5aff, () => {
        fn();
        b.label.setText(label());
      }, 20);
    });

    Music.start();
    coinCounter(this, 34, 40, Save.get('coins'));
    this.input.keyboard?.once('keydown-SPACE', () => this.play());
  }

  play() {
    Sfx.unlock();
    this.scene.start('Game');
  }
}
