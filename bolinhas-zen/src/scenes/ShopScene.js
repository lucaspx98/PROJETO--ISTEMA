import Phaser from 'phaser';
import { GAME_WIDTH } from '../config.js';
import { Save } from '../storage.js';
import { Ads } from '../ads.js';
import { Sfx } from '../audio.js';
import { THEMES } from '../themes.js';
import { ballKey } from '../textures.js';
import { background, button, coinCounter, text, toast } from '../ui.js';

const FREE_COINS = 50;

export class ShopScene extends Phaser.Scene {
  constructor() {
    super('Shop');
  }

  create() {
    background(this);
    Ads.showBanner();

    text(this, GAME_WIDTH / 2, 110, 'TEMAS', 52, '#ffffff');
    this.coinHud = coinCounter(this, 34, 40, Save.get('coins'));
    button(this, GAME_WIDTH - 85, 40, 140, 54, '← Voltar', 0x8338ec, () => this.scene.start('Menu'), 22);

    this.cards = this.add.container(0, 0);
    this.drawCards();

    button(this, GAME_WIDTH / 2, 790, 440, 64, `▶  +${FREE_COINS} moedas grátis`, 0xffb703, () => this.freeCoins(), 24);
  }

  drawCards() {
    this.cards.removeAll(true);
    const cw = 240;
    const ch = 250;
    THEMES.forEach((t, i) => {
      const cx = GAME_WIDTH / 2 + ((i % 2) - 0.5) * (cw + 20);
      const cy = 300 + Math.floor(i / 2) * (ch + 20);
      const owned = Save.owns(t.id);
      const selected = Save.get('theme') === t.id;

      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.35);
      g.fillRoundedRect(cx - cw / 2, cy - ch / 2, cw, ch, 22);
      g.lineStyle(4, selected ? 0x06d6a0 : 0xffffff, selected ? 1 : 0.25);
      g.strokeRoundedRect(cx - cw / 2, cy - ch / 2, cw, ch, 22);
      this.cards.add(g);
      this.cards.add(text(this, cx, cy - 92, t.name, 28));

      // Prévia: 6 bolinhas do tema em duas fileiras
      for (let k = 0; k < 6; k++) {
        const b = this.add.image(cx + ((k % 3) - 1) * 54, cy - 35 + Math.floor(k / 3) * 52, ballKey(t.id, k * 2 % t.colors.length));
        this.cards.add(b);
      }

      let label;
      let color;
      if (selected) [label, color] = ['Em uso', 0x2a9d8f];
      else if (owned) [label, color] = ['Usar', 0x3a5aff];
      else [label, color] = [`${t.price} moedas`, Save.get('coins') >= t.price ? 0xffb703 : 0x6c6c80];
      this.cards.add(button(this, cx, cy + 82, 170, 54, label, color, () => this.select(t), 22));
    });
  }

  select(t) {
    if (Save.owns(t.id)) {
      Save.set('theme', t.id);
    } else if (Save.buyTheme(t.id, t.price)) {
      Sfx.buy();
      this.cameras.main.flash(180, 255, 255, 255);
    } else {
      toast(this, `Faltam ${t.price - Save.get('coins')} moedas`, 700);
      return;
    }
    // Troca o fundo para o tema novo
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
