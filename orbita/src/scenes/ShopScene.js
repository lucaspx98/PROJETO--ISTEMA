import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SAFE_TOP } from '../config.js';
import { Save } from '../storage.js';
import { Ads } from '../ads.js';
import { Sfx } from '../audio.js';
import { SKINS } from '../skins.js';
import { background, button, gemCounter, text, toast } from '../ui.js';

const FREE_GEMS = 40;

export class ShopScene extends Phaser.Scene {
  constructor() {
    super('Shop');
  }

  create() {
    background(this);
    Ads.showBanner();

    text(this, GAME_WIDTH / 2, SAFE_TOP + 70, 'LOJA', 56, '#99e9f2');
    this.gemHud = gemCounter(this, 34, SAFE_TOP - 10, Save.get('gems'));
    button(this, GAME_WIDTH - 85, SAFE_TOP - 10, 140, 54, '← Voltar', 0x7048e8, () => this.scene.start('Menu'), 22);

    this.cards = this.add.container(0, 0);
    this.drawCards();

    button(this, GAME_WIDTH / 2, GAME_HEIGHT - 190, 420, 66, `+${FREE_GEMS} cristais grátis (anúncio)`, 0xf08c00, () => this.freeGems(), 24);
  }

  drawCards() {
    this.cards.removeAll(true);
    const cw = 230;
    const ch = 175;
    const top = SAFE_TOP + 150;
    SKINS.forEach((s, i) => {
      const cx = GAME_WIDTH / 2 + ((i % 2) - 0.5) * (cw + 20);
      const cy = top + ch / 2 + Math.floor(i / 2) * (ch + 16);
      const owned = Save.owns(s.id);
      const selected = Save.get('skin') === s.id;

      const g = this.add.graphics();
      g.fillStyle(0x161b4a, 0.95);
      g.fillRoundedRect(cx - cw / 2, cy - ch / 2, cw, ch, 18);
      g.lineStyle(4, selected ? 0x0ca678 : 0x343a8a, 1);
      g.strokeRoundedRect(cx - cw / 2, cy - ch / 2, cw, ch, 18);

      const img = this.add.image(cx, cy - 42, `comet-${s.id}`).setScale(1.3);
      const name = text(this, cx, cy + 4, s.name, 24);
      let label;
      let color;
      if (selected) [label, color] = ['Em uso', 0x2b8a3e];
      else if (owned) [label, color] = ['Usar', 0x1c7ed6];
      else [label, color] = [`    ${s.price}`, Save.get('gems') >= s.price ? 0xf08c00 : 0x495057];

      const btn = button(this, cx, cy + 52, 160, 50, label, color, () => this.select(s), 22);
      this.cards.add([g, img, name, btn]);
      if (!owned) this.cards.add(this.add.image(cx - 12 - String(s.price).length * 7, cy + 52, 'gem').setScale(0.65));
    });
  }

  select(s) {
    if (Save.owns(s.id)) {
      Save.set('skin', s.id);
    } else if (Save.buySkin(s.id, s.price)) {
      Sfx.buy();
      this.cameras.main.flash(150, 102, 217, 232);
    } else {
      return toast(this, `Faltam ${s.price - Save.get('gems')} cristais`);
    }
    this.gemHud.set(Save.get('gems'));
    this.drawCards();
  }

  async freeGems() {
    if (this.busy) return;
    this.busy = true;
    const ok = await Ads.showRewarded();
    this.busy = false;
    if (!ok) return toast(this, 'Anúncio indisponível agora');
    Save.addGems(FREE_GEMS);
    Sfx.gem();
    this.gemHud.set(Save.get('gems'));
    this.drawCards();
  }
}
