import Phaser from 'phaser';
import { GAME_WIDTH } from '../config.js';
import { Save } from '../storage.js';
import { Ads } from '../ads.js';
import { Sfx } from '../audio.js';
import { SKINS } from '../skins.js';
import { background, button, coinCounter, text } from '../ui.js';

const FREE_COINS = 50;

export class ShopScene extends Phaser.Scene {
  constructor() {
    super('Shop');
  }

  create() {
    background(this);
    Ads.showBanner();
    this.add.rectangle(0, 0, GAME_WIDTH, 540, 0x0b0820, 0.55).setOrigin(0);

    text(this, GAME_WIDTH / 2, 40, 'LOJA', 48, '#37e2d5');
    this.coinHud = coinCounter(this, 30, 40, Save.get('coins'));
    button(this, GAME_WIDTH - 90, 40, 150, 54, '← Voltar', 0x7209b7, () => this.scene.start('Menu'), 22);

    this.cards = this.add.container(0, 0);
    this.drawCards();

    this.freeBtn = button(this, GAME_WIDTH / 2, 430, 380, 56, `+${FREE_COINS} moedas grátis (anúncio)`, 0xffb703, () => this.freeCoins(), 22);
  }

  drawCards() {
    this.cards.removeAll(true);
    const cols = 3;
    const cw = 250;
    const ch = 150;
    SKINS.forEach((s, i) => {
      const cx = GAME_WIDTH / 2 + ((i % cols) - 1) * (cw + 20);
      const cy = 145 + Math.floor(i / cols) * (ch + 16);
      const owned = Save.owns(s.id);
      const selected = Save.get('skin') === s.id;

      const g = this.add.graphics();
      g.fillStyle(0x1a0f3a, 0.95);
      g.fillRoundedRect(cx - cw / 2, cy - ch / 2, cw, ch, 16);
      g.lineStyle(4, selected ? 0x06d6a0 : 0x3a2a6a, 1);
      g.strokeRoundedRect(cx - cw / 2, cy - ch / 2, cw, ch, 16);

      const img = this.add.image(cx - 70, cy - 10, `player-${s.id}`).setScale(1.4);
      const name = text(this, cx + 35, cy - 40, s.name, 24);
      let label;
      let color;
      if (selected) [label, color] = ['Em uso', 0x2a9d8f];
      else if (owned) [label, color] = ['Usar', 0x3a86ff];
      else [label, color] = [`${s.price}`, Save.get('coins') >= s.price ? 0xffb703 : 0x555555];

      const btn = button(this, cx + 35, cy + 25, 130, 50, owned || selected ? label : `   ${label}`, color, () => this.select(s), 20);
      this.cards.add([g, img, name, btn]);
      if (!owned) this.cards.add(this.add.image(cx + 35 - (label.length * 6 + 4), cy + 25, 'coin').setScale(0.8));
    });
  }

  select(s) {
    if (Save.owns(s.id)) {
      Save.set('skin', s.id);
    } else if (Save.buySkin(s.id, s.price)) {
      Sfx.buy();
      this.cameras.main.flash(150, 255, 210, 63);
    } else {
      const t = text(this, GAME_WIDTH / 2, 490, `Faltam ${s.price - Save.get('coins')} moedas`, 22);
      this.tweens.add({ targets: t, alpha: 0, delay: 1200, duration: 400, onComplete: () => t.destroy() });
      return;
    }
    this.coinHud.set(Save.get('coins'));
    this.drawCards();
  }

  async freeCoins() {
    if (this.busy) return;
    this.busy = true;
    const ok = await Ads.showRewarded();
    this.busy = false;
    if (!ok) return;
    Save.addCoins(FREE_COINS);
    Sfx.coin();
    this.coinHud.set(Save.get('coins'));
    this.drawCards();
  }
}
