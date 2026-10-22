import Phaser from 'phaser';
import { GAME_WIDTH } from '../config.js';
import { Save } from '../storage.js';
import { Ads } from '../ads.js';
import { Sfx } from '../audio.js';
import { VIEWS } from '../views.js';
import { viewKey } from '../textures.js';
import { background, button, coinCounter, text, toast } from '../ui.js';

const FREE_COINS = 50;

/** Loja de vistas: a paisagem que aparece atrás do vidro. */
export class ShopScene extends Phaser.Scene {
  constructor() {
    super('Shop');
  }

  create() {
    background(this);
    Ads.showBanner();

    text(this, GAME_WIDTH / 2, 110, 'VISTAS', 52, '#ffffff');
    this.coinHud = coinCounter(this, 34, 40, Save.get('coins'));
    button(this, GAME_WIDTH - 85, 40, 140, 54, '← Voltar', 0x5a4fcf, () => this.scene.start('Menu'), 22);

    this.cards = this.add.container(0, 0);
    this.drawCards();

    button(this, GAME_WIDTH / 2, 790, 440, 64, `▶  +${FREE_COINS} moedas grátis`, 0xffb703, () => this.freeCoins(), 24);
  }

  drawCards() {
    this.cards.removeAll(true);
    const cw = 240;
    const ch = 270;
    VIEWS.forEach((v, i) => {
      const cx = GAME_WIDTH / 2 + ((i % 2) - 0.5) * (cw + 20);
      const cy = 310 + Math.floor(i / 2) * (ch + 20);
      const owned = Save.owns(v.id);
      const selected = Save.get('theme') === v.id;

      // Miniatura: recorte quadrado da paisagem
      const s = 0.4;
      const thumb = this.add.image(0, 0, viewKey(this, v.id)).setOrigin(0).setScale(s);
      const cropY = 380;
      thumb.setCrop(30, cropY, (cw - 20) / s, 160 / s);
      thumb.setPosition(cx - cw / 2 + 10 - 30 * s, cy - ch / 2 + 10 - cropY * s);

      const g = this.add.graphics();
      g.lineStyle(4, selected ? 0x06d6a0 : 0xffffff, selected ? 1 : 0.6);
      g.strokeRoundedRect(cx - cw / 2, cy - ch / 2, cw, ch, 22);
      g.fillStyle(0x141b3a, 0.85);
      g.fillRoundedRect(cx - cw / 2, cy - ch / 2 + 170, cw, ch - 170, { tl: 0, tr: 0, bl: 22, br: 22 });
      this.cards.add([thumb, g, text(this, cx, cy + 58, v.name, 26)]);

      let label;
      let color;
      if (selected) [label, color] = ['Em uso', 0x2a9d8f];
      else if (owned) [label, color] = ['Usar', 0x3a86ff];
      else [label, color] = [`${v.price} moedas`, Save.get('coins') >= v.price ? 0xffb703 : 0x6c6c80];
      this.cards.add(button(this, cx, cy + 102, 180, 46, label, color, () => this.select(v), 20));
    });
  }

  select(v) {
    if (Save.owns(v.id)) {
      Save.set('theme', v.id);
    } else if (Save.buyTheme(v.id, v.price)) {
      Sfx.buy();
      this.cameras.main.flash(180, 255, 255, 255);
    } else {
      toast(this, `Faltam ${v.price - Save.get('coins')} moedas`, 700);
      return;
    }
    this.scene.restart();
  }

  async freeCoins() {
    if (this.busy) return;
    this.busy = true;
    const ok = await Ads.showRewarded();
    this.busy = false;
    if (!ok) {
      toast(this, 'Anúncio indisponível, tente daqui a pouco', 700);
      return;
    }
    Save.addCoins(FREE_COINS);
    Sfx.coin();
    this.coinHud.set(Save.get('coins'));
    this.coinHud.pulse();
    this.drawCards();
  }
}
