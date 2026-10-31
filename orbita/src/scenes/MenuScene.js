import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SAFE_TOP } from '../config.js';
import { Save } from '../storage.js';
import { Sfx } from '../audio.js';
import { Ads } from '../ads.js';
import { Music } from '../music.js';
import { getSkin } from '../skins.js';
import { PLANET_TEX_R } from '../textures.js';
import { background, button, gemCounter, text, toast } from '../ui.js';

const DAILY_GIFT = 25;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    this.bg = background(this);
    this.scrollY = 0;
    Ads.showBanner();

    // Demonstração: cometa girando em volta de um planeta
    this.demo = { x: GAME_WIDTH / 2, y: GAME_HEIGHT * 0.36, r: 105, a: 0 };
    this.planet = this.add.image(this.demo.x, this.demo.y, 'planet-1').setScale(62 / PLANET_TEX_R);
    const skin = getSkin(Save.get('skin'));
    this.comet = this.add.image(0, 0, `comet-${skin.id}`);
    this.add.particles(0, 0, 'dot', {
      follow: this.comet,
      lifespan: 500,
      speed: 0,
      scale: { start: 0.9, end: 0 },
      alpha: { start: 0.7, end: 0 },
      frequency: 16,
      tint: skin.trail,
      blendMode: 'ADD',
    });
    this.children.bringToTop(this.comet);

    const title = text(this, GAME_WIDTH / 2, SAFE_TOP + 70, 'ÓRBITA', 96, '#99e9f2');
    title.setStroke('#5f3dc4', 14);
    this.tweens.add({ targets: title, scale: 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const y0 = GAME_HEIGHT * 0.58;
    text(this, GAME_WIDTH / 2, y0, `Recorde: ${Save.get('best')}`, 32, '#ffd43b');
    button(this, GAME_WIDTH / 2, y0 + 85, 320, 90, '▶  JOGAR', 0x0ca678, () => this.play(), 42);
    button(this, GAME_WIDTH / 2 - 85, y0 + 190, 155, 66, 'Loja', 0x7048e8, () => this.scene.start('Shop'), 26);

    this.gemHud = gemCounter(this, 34, SAFE_TOP - 10, Save.get('gems'));
    if (Save.giftAvailable()) {
      const gift = button(this, GAME_WIDTH / 2 + 85, y0 + 190, 155, 66, 'Presente', 0xf08c00, () => {
        Save.claimGift(DAILY_GIFT);
        Sfx.buy();
        this.gemHud.set(Save.get('gems'));
        toast(this, `+${DAILY_GIFT} cristais! Volte amanhã`, y0 + 260);
        gift.destroy();
      }, 26);
      this.tweens.add({ targets: gift, angle: { from: -3, to: 3 }, duration: 160, yoyo: true, repeat: -1, repeatDelay: 1200 });
    } else {
      text(this, GAME_WIDTH / 2 + 85, y0 + 190, 'Presente\namanhã', 20, '#868e96');
    }

    const mute = button(this, GAME_WIDTH / 2 - 85, y0 + 275, 155, 56, this.sfxLabel(), 0x1c7ed6, () => {
      Save.set('muted', !Save.get('muted'));
      mute.label.setText(this.sfxLabel());
    }, 20);
    const music = button(this, GAME_WIDTH / 2 + 85, y0 + 275, 155, 56, this.musicLabel(), 0xd6336c, () => {
      Music.toggle();
      music.label.setText(this.musicLabel());
    }, 20);

    Music.start();
    Music.duck(false);
    this.input.keyboard?.once('keydown-SPACE', () => this.play());
  }

  sfxLabel() {
    return Save.get('muted') ? 'Efeitos: não' : 'Efeitos: sim';
  }

  musicLabel() {
    return Save.get('musicOff') ? 'Música: não' : 'Música: sim';
  }

  play() {
    Sfx.unlock();
    this.scene.start('Game');
  }

  update(_, dtMs) {
    const dt = dtMs / 1000;
    this.scrollY -= dt * 20;
    this.bg.scroll(this.scrollY);
    const d = this.demo;
    d.a += dt * 1.8;
    this.comet.setPosition(d.x + Math.cos(d.a) * d.r, d.y + Math.sin(d.a) * d.r);
    this.planet.rotation += dt * 0.15;
  }
}
