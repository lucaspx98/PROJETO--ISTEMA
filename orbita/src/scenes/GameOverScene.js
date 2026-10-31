import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config.js';
import { Save } from '../storage.js';
import { Ads } from '../ads.js';
import { Sfx } from '../audio.js';
import { button, text, toast } from '../ui.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data) {
    this.busy = false;
    Ads.showBanner();

    const cx = GAME_WIDTH / 2;
    const top = GAME_HEIGHT * 0.16;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x070b1f, 0.75).setOrigin(0).setInteractive();
    const panel = this.add.graphics();
    panel.fillStyle(0x161b4a, 0.96);
    panel.fillRoundedRect(cx - 240, top, 480, 620, 28);
    panel.lineStyle(4, 0x66d9e8, 1);
    panel.strokeRoundedRect(cx - 240, top, 480, 620, 28);

    text(this, cx, top + 50, data.reason, 34, '#ff6b6b');
    text(this, cx, top + 135, String(data.score), 104);
    if (data.isRecord) {
      const rec = text(this, cx, top + 215, 'NOVO RECORDE!', 32, '#ffd43b');
      this.tweens.add({ targets: rec, scale: 1.15, duration: 400, yoyo: true, repeat: -1 });
    } else {
      text(this, cx, top + 215, `Recorde: ${Save.get('best')}`, 28, '#b197fc');
    }
    this.gemsText = text(this, cx, top + 262, `+${data.gems} cristais  (total ${Save.get('gems')})`, 24, '#99e9f2');

    let y = top + 345;
    if (data.canContinue) {
      button(this, cx, y, 400, 76, '▶ Continuar (anúncio)', 0x0ca678, () => this.continueRun(), 28);
      y += 92;
    }
    if (data.canDouble) {
      this.doubleBtn = button(this, cx, y, 400, 62, `Dobrar cristais (anúncio)`, 0xf08c00, () => this.double(data), 24);
    }
    const yb = top + 560;
    button(this, cx - 105, yb, 190, 66, 'De novo', 0x1c7ed6, () => this.leave('Game'), 28);
    button(this, cx + 105, yb, 190, 66, 'Menu', 0x7048e8, () => this.leave('Menu'), 28);
  }

  async continueRun() {
    if (this.busy) return;
    this.busy = true;
    const ok = await Ads.showRewarded();
    this.busy = false;
    if (!ok) return toast(this, 'Anúncio indisponível agora');
    Ads.hideBanner();
    this.scene.get('Game').revive();
    this.scene.stop();
  }

  async double(data) {
    if (this.busy) return;
    this.busy = true;
    const ok = await Ads.showRewarded();
    this.busy = false;
    if (!ok) return toast(this, 'Anúncio indisponível agora');
    this.scene.get('Game').doubleGems();
    Sfx.buy();
    this.doubleBtn.destroy();
    this.gemsText.setText(`+${data.gems * 2} cristais  (total ${Save.get('gems')})`);
  }

  async leave(target) {
    if (this.busy) return;
    this.busy = true;
    // Intervalo natural entre partidas: momento certo para um intersticial.
    await Ads.maybeShowInterstitial();
    this.scene.stop('Game');
    this.scene.start(target);
  }
}
