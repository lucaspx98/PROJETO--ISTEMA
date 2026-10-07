import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config.js';
import { Save } from '../storage.js';
import { Ads } from '../ads.js';
import { Sfx } from '../audio.js';
import { button, text } from '../ui.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data) {
    this.busy = false;
    Ads.showBanner();

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0820, 0.75).setOrigin(0).setInteractive();
    const panel = this.add.graphics();
    panel.fillStyle(0x1a0f3a, 0.95);
    panel.fillRoundedRect(GAME_WIDTH / 2 - 300, 20, 600, 440, 24);
    panel.lineStyle(4, 0x37e2d5, 1);
    panel.strokeRoundedRect(GAME_WIDTH / 2 - 300, 20, 600, 440, 24);

    text(this, GAME_WIDTH / 2, 62, 'FIM DE JOGO', 46, '#ff3860');
    text(this, GAME_WIDTH / 2, 125, String(data.score), 64);
    if (data.isRecord) {
      const rec = text(this, GAME_WIDTH / 2, 172, 'NOVO RECORDE!', 28, '#ffd23f');
      this.tweens.add({ targets: rec, scale: 1.15, duration: 400, yoyo: true, repeat: -1 });
    } else {
      text(this, GAME_WIDTH / 2, 172, `Recorde: ${Save.get('best')}`, 24, '#bdb2ff');
    }
    this.coinsText = text(this, GAME_WIDTH / 2, 208, `+${data.coins} moedas  (total ${Save.get('coins')})`, 22, '#ffd23f');

    let y = 262;
    if (data.canContinue) {
      this.continueBtn = button(this, GAME_WIDTH / 2, y, 420, 62, '▶ Continuar (ver anúncio)', 0x06d6a0, () => this.continueRun(), 24);
      y += 72;
    }
    if (data.canDouble) {
      this.doubleBtn = button(this, GAME_WIDTH / 2, y, 420, 54, `Dobrar moedas: +${data.coins} (anúncio)`, 0xffb703, () => this.double(data), 22);
      y += 66;
    }
    button(this, GAME_WIDTH / 2 - 105, Math.max(y, 400), 200, 60, 'De novo', 0x3a86ff, () => this.leave('Game'), 26);
    button(this, GAME_WIDTH / 2 + 105, Math.max(y, 400), 200, 60, 'Menu', 0x7209b7, () => this.leave('Menu'), 26);
  }

  async continueRun() {
    if (this.busy) return;
    this.busy = true;
    const ok = await Ads.showRewarded();
    this.busy = false;
    if (!ok) return this.toast('Anúncio indisponível agora');
    Ads.hideBanner();
    this.scene.get('Game').revive();
    this.scene.stop();
  }

  async double(data) {
    if (this.busy) return;
    this.busy = true;
    const ok = await Ads.showRewarded();
    this.busy = false;
    if (!ok) return this.toast('Anúncio indisponível agora');
    this.scene.get('Game').doubleCoins();
    Sfx.buy();
    this.doubleBtn.destroy();
    this.coinsText.setText(`+${data.coins * 2} moedas  (total ${Save.get('coins')})`);
  }

  async leave(target) {
    if (this.busy) return;
    this.busy = true;
    // Intervalo natural entre partidas: momento certo para um intersticial.
    await Ads.maybeShowInterstitial();
    this.scene.stop('Game');
    this.scene.start(target);
  }

  toast(msg) {
    const t = text(this, GAME_WIDTH / 2, GAME_HEIGHT - 30, msg, 22, '#ffffff');
    this.tweens.add({ targets: t, alpha: 0, delay: 1500, duration: 400, onComplete: () => t.destroy() });
  }
}
