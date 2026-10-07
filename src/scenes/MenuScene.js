import Phaser from 'phaser';
import { GAME_WIDTH, GROUND_Y } from '../config.js';
import { Save } from '../storage.js';
import { Sfx } from '../audio.js';
import { Ads } from '../ads.js';
import { background, button, coinCounter, text } from '../ui.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    this.bg = background(this);
    Ads.showBanner();

    this.runner = this.add.image(200, GROUND_Y - 24, `player-${Save.get('skin')}`);
    this.time.addEvent({
      delay: 1100,
      loop: true,
      callback: () => {
        this.tweens.add({ targets: this.runner, y: GROUND_Y - 130, duration: 300, yoyo: true, ease: 'Quad.out' });
        this.tweens.add({ targets: this.runner, angle: this.runner.angle + 90, duration: 600 });
      },
    });

    const title = text(this, GAME_WIDTH / 2, 95, 'CORRE CORRE', 84, '#37e2d5');
    title.setStroke('#f72585', 14);
    this.tweens.add({ targets: title, scale: 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    text(this, GAME_WIDTH / 2, 165, `Recorde: ${Save.get('best')}`, 30, '#ffd23f');

    button(this, GAME_WIDTH / 2, 255, 300, 84, '▶  JOGAR', 0x06d6a0, () => this.play(), 40);
    button(this, GAME_WIDTH / 2 - 85, 355, 160, 64, 'Loja', 0x7209b7, () => this.scene.start('Shop'));
    const mute = button(this, GAME_WIDTH / 2 + 85, 355, 160, 64, Save.get('muted') ? 'Som: não' : 'Som: sim', 0x3a86ff, () => {
      Save.set('muted', !Save.get('muted'));
      mute.label.setText(Save.get('muted') ? 'Som: não' : 'Som: sim');
    }, 22);

    const cc = coinCounter(this, 30, 32, Save.get('coins'));
    cc.objects.forEach((o) => o.setDepth(5));

    this.input.keyboard?.once('keydown-SPACE', () => this.play());
  }

  play() {
    Sfx.unlock();
    this.scene.start('Game');
  }

  update(_, dtMs) {
    this.bg.scroll(dtMs * 0.25);
  }
}
