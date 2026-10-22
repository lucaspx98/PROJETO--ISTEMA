import Phaser from 'phaser';
import { ADS, GAME_HEIGHT, GAME_WIDTH, WIPE_RADIUS } from '../config.js';
import { Save } from '../storage.js';
import { Sfx, WipeSound } from '../audio.js';
import { Haptic } from '../haptics.js';
import { Ads } from '../ads.js';
import { Music } from '../music.js';
import { GLASS_BOTTOM, GLASS_TOP, Sim, generateLevel } from '../sim.js';
import { pigmentToRgb } from '../colors.js';
import { Glass } from '../glass.js';
import { button, coinCounter, text, toast } from '../ui.js';
import { JAR_H, JAR_TOP, JarRow, PRIMARY } from '../jars.js';

const TIPS = {
  1: 'Passe o dedo no vidro para abrir um\ncaminho da gota até o pote',
  3: 'Junte gotas para misturar as cores!\nAs bolinhas no pote mostram a receita',
  4: 'Cuidado: a névoa volta aos poucos',
  5: 'Contorne as prateleiras de madeira',
};

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    Ads.showBanner();
    Music.start();
    this.level = Save.get('level');
    this.def = generateLevel(this.level);
    this.sim = new Sim(this.def);
    this.glass = new Glass(this, this.sim, Save.get('theme'));
    this.ended = false;
    this.leaving = false;
    this.adBusy = false;
    this.doubled = false;
    this.wiping = false;
    this.wipedSinceTick = 0;

    this.drawHud();
    this.jars = new JarRow(this, this.sim);

    this.particles = this.add.particles(0, 0, 'dot', {
      speed: { min: 60, max: 220 },
      angle: { min: 200, max: 340 },
      lifespan: 600,
      scale: { start: 0.45, end: 0 },
      gravityY: 600,
      emitting: false,
    }).setDepth(30);
    this.sparkles = this.add.particles(0, 0, 'sparkle', {
      speed: { min: 30, max: 140 },
      lifespan: 900,
      scale: { start: 0.9, end: 0 },
      rotate: { min: 0, max: 180 },
      emitting: false,
    }).setDepth(31);

    this.input.on('pointerdown', (p) => this.wipeStart(p));
    this.input.on('pointermove', (p) => this.wipeMove(p));
    this.input.on('pointerup', () => this.wipeEnd());
    this.input.on('pointerupoutside', () => this.wipeEnd());
    this.events.once('shutdown', () => WipeSound.stop());

    if (TIPS[this.level]) {
      this.tip = text(this, GAME_WIDTH / 2, GLASS_TOP + 30, TIPS[this.level], 22, '#ffffff').setDepth(20);
      this.tweens.add({ targets: this.tip, alpha: 0.5, duration: 900, yoyo: true, repeat: -1 });
    }
    if (this.level === 1) this.showFingerHint();
  }

  drawHud() {
    this.add.rectangle(0, 0, GAME_WIDTH, GLASS_TOP - 16, 0x141b3a, 0.85).setOrigin(0).setDepth(9);
    button(this, 46, 38, 64, 52, '⌂', 0x5a4fcf, () => this.scene.start('Menu'), 28);
    button(this, GAME_WIDTH - 46, 38, 64, 52, '↻', 0x3a86ff, () => this.retry(), 28);
    text(this, GAME_WIDTH / 2, 34, `Nível ${this.level}`, 34).setDepth(20);
    this.coinHud = coinCounter(this, GAME_WIDTH / 2 - 26, 76, Save.get('coins'));
    if (this.sim.regrow > 0) {
      this.freezeBtn = button(this, GAME_WIDTH - 100, 86, 150, 34, '▶ Parar névoa', 0x4cc9f0, () => this.freezeFog(), 17);
    }
  }

  /** Mão fantasma mostrando o gesto no primeiro nível. */
  showFingerHint() {
    const d = this.sim.drops[0];
    const jar = this.sim.jars[0];
    const finger = this.add.circle(d.x, d.y, 16, 0xffffff, 0.6).setDepth(25).setStrokeStyle(3, 0xffffff, 1);
    this.fingerHint = finger;
    this.tweens.add({
      targets: finger,
      x: { from: d.x, to: jar.x },
      y: { from: d.y + 10, to: GLASS_BOTTOM - 10 },
      duration: 1600,
      ease: 'Sine.inOut',
      repeat: -1,
      repeatDelay: 500,
    });
  }

  inGlass(p) {
    return p.y > GLASS_TOP && p.y < GLASS_BOTTOM;
  }

  wipeStart(p) {
    if (this.ended || !this.inGlass(p)) return;
    this.wiping = true;
    this.last = { x: p.x, y: p.y };
    WipeSound.start();
    this.clearTips();
    this.wipe(p);
  }

  wipeMove(p) {
    if (!this.wiping || !p.isDown || this.ended) return;
    this.wipe(p);
  }

  wipe(p) {
    const y = Phaser.Math.Clamp(p.y, GLASS_TOP, GLASS_BOTTOM);
    const removed = this.sim.wipe(this.last.x, this.last.y, p.x, y, WIPE_RADIUS);
    const dist = Math.hypot(p.x - this.last.x, y - this.last.y);
    this.last = { x: p.x, y };
    WipeSound.set(removed > 0.5 ? Math.min(1, dist / 30) : 0);
    // Tiquinho de vibração enquanto desembaça, como se o dedo "rangesse" no vidro
    this.wipedSinceTick += removed;
    if (this.wipedSinceTick > 30) {
      this.wipedSinceTick = 0;
      Haptic.light();
    }
  }

  wipeEnd() {
    if (!this.wiping) return;
    this.wiping = false;
    WipeSound.stop();
  }

  clearTips() {
    if (this.fingerHint) {
      this.fingerHint.destroy();
      this.fingerHint = null;
    }
    if (this.tip) {
      const t = this.tip;
      this.tip = null;
      this.tweens.killTweensOf(t);
      this.tweens.add({ targets: t, alpha: 0, delay: 1500, duration: 600, onComplete: () => t.destroy() });
    }
  }

  update(_, dtMs) {
    const dt = dtMs / 1000;
    this.sim.step(dt);
    this.glass.update(dt);
    for (const e of this.sim.events) this.onEvent(e);
    this.sim.events.length = 0;
  }

  onEvent(e) {
    switch (e.type) {
      case 'release':
        Sfx.release();
        break;
      case 'merge':
        Sfx.merge(e.drop.units);
        Haptic.light();
        this.glass.pop(e.drop);
        this.particles.setParticleTint(pigmentToRgb(e.drop.pig));
        this.particles.explode(6, e.drop.x, e.drop.y);
        break;
      case 'fill':
        this.dropIntoJar(e.drop, e.jar);
        break;
      case 'reject':
      case 'splash':
        this.splash(e.drop, e.jar);
        break;
      case 'win':
        this.time.delayedCall(700, () => this.win());
        break;
      case 'fail':
        this.time.delayedCall(700, () => this.fail());
        break;
      default:
    }
  }

  /** Gota sai do vidro e cai no pote: o líquido sobe. */
  dropIntoJar(d, jar) {
    this.jars.dropInto(d, jar, pigmentToRgb(d.pig), () => {
      Sfx.fill(Math.round(jar.filled * 2));
      Haptic.medium();
      this.particles.setParticleTint(pigmentToRgb(d.pig));
      this.particles.explode(8, jar.x, JAR_TOP + JAR_H * (1 - jar.filled / jar.units));
      if (jar.filled >= jar.units) this.time.delayedCall(350, () => this.jarFull(jar));
    });
  }

  jarFull(jar) {
    Sfx.jarFull(this.sim.jars.indexOf(jar));
    Haptic.medium();
    this.sparkles.explode(10, jar.x, JAR_TOP + JAR_H / 2);
    this.jars.bounce(jar);
  }

  splash(d, jar) {
    Sfx.splash();
    Haptic.heavy();
    this.particles.setParticleTint(pigmentToRgb(d.pig));
    this.particles.explode(14, d.x, GLASS_BOTTOM);
    if (jar) {
      Sfx.nope();
      this.jars.shake(jar);
      toast(this, jar.filled >= jar.units ? 'Esse pote já está cheio!' : 'Cor errada para esse pote!', GLASS_BOTTOM - 60);
    } else {
      toast(this, 'A gota caiu fora do pote!', GLASS_BOTTOM - 60);
    }
  }

  async freezeFog() {
    if (this.sim.frozen || this.adBusy || this.ended) return;
    this.adBusy = true;
    const ok = await Ads.showRewarded();
    this.adBusy = false;
    if (!ok) return toast(this, 'Anúncio indisponível, tente daqui a pouco', GLASS_TOP + 60);
    this.sim.frozen = true;
    this.freezeBtn.setAlpha(0.4);
    this.freezeBtn.label.setText('Névoa parada');
    toast(this, 'A névoa não volta mais neste nível', GLASS_TOP + 60);
  }

  win() {
    if (this.ended) return;
    this.ended = true;
    this.wipeEnd();
    const reward = 10 + Math.min(this.level, 30);
    Save.set('level', this.level + 1);
    Save.addCoins(reward);
    Sfx.win();
    Haptic.heavy();
    // Vidro desembaça inteiro de uma vez: o "ahh" do fim de nível
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 900,
      onUpdate: (tw) => {
        const v = 1 - tw.getValue();
        for (let i = 0; i < this.sim.fog.length; i++) this.sim.fog[i] = Math.min(this.sim.fog[i], v);
        this.glass.update(0);
      },
    });
    this.add.particles(0, -20, 'confetti', {
      x: { min: 0, max: GAME_WIDTH },
      speedY: { min: 180, max: 420 },
      speedX: { min: -80, max: 80 },
      rotate: { start: 0, end: 540 },
      lifespan: 3200,
      quantity: 4,
      frequency: 30,
      duration: 1200,
      tint: this.sim.jars.map((j) => pigmentToRgb(j.pig)).concat(PRIMARY),
    }).setDepth(35.5);
    this.time.delayedCall(1000, () => this.showWinPanel(reward));
  }

  panel(title, sub, titleColor) {
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.4).setOrigin(0).setDepth(35).setInteractive();
    shade.setAlpha(0);
    this.tweens.add({ targets: shade, alpha: 1, duration: 300 });
    const panel = this.add.container(GAME_WIDTH / 2, 430).setDepth(36);
    const g = this.add.graphics();
    g.fillStyle(0x141b3a, 0.95);
    g.fillRoundedRect(-220, -190, 440, 380, 30);
    g.lineStyle(4, 0xffffff, 0.3);
    g.strokeRoundedRect(-220, -190, 440, 380, 30);
    panel.add([g, text(this, 0, -130, title, 48, titleColor), text(this, 0, -78, sub, 22, '#d6e2ff')]);
    panel.setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 380, ease: 'Back.out' });
    return panel;
  }

  showWinPanel(reward) {
    const panel = this.panel('Que lindo!', `Nível ${this.level} completo`, '#7ff0e0');
    const coin = this.add.image(-50, -20, 'coin').setScale(1.3);
    const amount = text(this, 0, -20, '+0', 40, '#ffd23f').setOrigin(0, 0.5);
    panel.add([coin, amount]);
    const counter = { v: 0 };
    this.tweens.add({
      targets: counter,
      v: reward,
      duration: 700,
      delay: 350,
      onUpdate: () => {
        const v = Math.round(counter.v);
        if (amount.text !== `+${v}`) {
          amount.setText(`+${v}`);
          if (v % 4 === 0) Sfx.coin();
        }
      },
      onComplete: () => {
        this.coinHud.set(Save.get('coins'));
        this.coinHud.pulse();
      },
    });
    const next = button(this, 0, 60, 300, 76, 'Próximo ▶', 0x06d6a0, () => this.next(), 32);
    const double = button(this, 0, 145, 300, 60, '▶ Dobrar moedas', 0xffb703, async () => {
      if (this.doubled || this.adBusy) return;
      this.adBusy = true;
      const ok = await Ads.showRewarded();
      this.adBusy = false;
      if (!ok) return toast(this, 'Anúncio indisponível, tente daqui a pouco', 140);
      this.doubled = true;
      Save.addCoins(reward);
      amount.setText(`+${reward * 2}`);
      this.coinHud.set(Save.get('coins'));
      this.coinHud.pulse();
      Sfx.buy();
      double.setAlpha(0.4);
    }, 24);
    panel.add([next, double]);
  }

  fail() {
    if (this.ended) return;
    this.ended = true;
    this.wipeEnd();
    Sfx.nope();
    const panel = this.panel('Ops!', 'Faltaram gotas para encher os potes', '#ffb3c1');
    const cont = button(this, 0, 10, 330, 76, '▶ Continuar', 0x06d6a0, () => this.continueAfterAd(), 30);
    const sub = text(this, 0, 62, 'devolve as gotas perdidas', 18, '#d6e2ff');
    const retry = button(this, 0, 130, 300, 60, '↻ Tentar de novo', 0x3a86ff, () => this.retry(), 24);
    panel.add([cont, sub, retry]);
    this.failPanel = panel;
  }

  async continueAfterAd() {
    if (this.adBusy) return;
    this.adBusy = true;
    const ok = await Ads.showRewarded();
    this.adBusy = false;
    if (!ok) return toast(this, 'Anúncio indisponível, tente daqui a pouco', 140);
    this.sim.restoreLost();
    this.children.list.filter((o) => o.depth >= 35 && o.depth < 40).forEach((o) => o.destroy());
    this.ended = false;
  }

  async retry() {
    if (this.leaving || this.adBusy) return;
    this.leaving = true;
    if (this.ended && this.level >= ADS.interstitialFromLevel) await Ads.maybeShowInterstitial();
    this.scene.restart();
  }

  async next() {
    if (this.leaving || this.adBusy) return;
    this.leaving = true;
    if (this.level + 1 >= ADS.interstitialFromLevel) await Ads.maybeShowInterstitial();
    this.scene.restart();
  }
}
