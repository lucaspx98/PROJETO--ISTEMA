import Phaser from 'phaser';
import { ADS, GAME_HEIGHT, GAME_WIDTH, WIPE_RADIUS } from '../config.js';
import { Save } from '../storage.js';
import { Sfx, WipeSound } from '../audio.js';
import { Haptic } from '../haptics.js';
import { Ads } from '../ads.js';
import { Music } from '../music.js';
import { GLASS_BOTTOM, GLASS_TOP, Sim, rng } from '../sim.js';
import { RECIPES, pigmentToRgb } from '../colors.js';
import { Glass } from '../glass.js';
import { JAR_H, JAR_TOP, JarRow, layoutJars } from '../jars.js';
import { button, coinCounter, text, toast } from '../ui.js';

// Modo arcade "Chuva sem fim": gotas caindo sem parar, potes trocando de pedido, combo e febre.
const HEARTS = 3;
const COMBO_WINDOW = 5; // segundos entre potes para manter o combo
const FEVER_EVERY = 10; // combo que liga a febre
const FEVER_TIME = 8;
const FILLS_PER_LEVEL = 8;

/** Dificuldade de cada nível do arcade. */
const params = (lvl) => ({
  spawnEvery: Math.max(0.7, 2.1 - 0.15 * (lvl - 1)),
  regrow: Math.min(0.16 + 0.03 * (lvl - 1), 0.45),
  creep: Math.min(7 + 1.6 * (lvl - 1), 20),
  maxDrops: Math.min(6 + lvl, 12),
  jars: lvl >= 5 ? 4 : 3,
});

export class ArcadeScene extends Phaser.Scene {
  constructor() {
    super('Arcade');
  }

  create() {
    Ads.showBanner();
    Music.start();
    this.rand = rng(Date.now() & 0xffffff);
    this.lvl = 1;
    this.p = params(1);
    this.fills = 0;
    this.score = 0;
    this.combo = 0;
    this.lastFill = -99;
    this.hearts = HEARTS;
    this.fever = 0;
    this.coinsRun = 0;
    this.best = Save.get('best');
    this.recordShown = this.best === 0;
    this.continued = false;
    this.over = false;
    this.adBusy = false;
    this.leaving = false;
    this.spawnClock = 0;
    this.clock = 0;

    const jars = [];
    for (let i = 0; i < this.p.jars; i++) jars.push(this.request({}));
    layoutJars(jars);
    this.sim = new Sim({ jars, drops: [], walls: [], regrow: this.p.regrow, endless: true, creep: this.p.creep });
    this.glass = new Glass(this, this.sim, Save.get('theme'));
    this.jars = new JarRow(this, this.sim);
    this.drawHud();

    this.particles = this.add.particles(0, 0, 'dot', {
      speed: { min: 80, max: 320 },
      angle: { min: 200, max: 340 },
      lifespan: 700,
      scale: { start: 0.55, end: 0 },
      gravityY: 600,
      emitting: false,
    }).setDepth(30);
    this.sparkles = this.add.particles(0, 0, 'sparkle', {
      speed: { min: 60, max: 260 },
      lifespan: 900,
      scale: { start: 1, end: 0 },
      rotate: { min: 0, max: 360 },
      emitting: false,
    }).setDepth(31);
    this.feverGlow = this.add.graphics().setDepth(19).setVisible(false);

    this.input.on('pointerdown', (p, over) => !over.length && this.wipeStart(p));
    this.input.on('pointermove', (p) => this.wipeMove(p));
    this.input.on('pointerup', () => this.wipeEnd());
    this.input.on('pointerupoutside', () => this.wipeEnd());
    this.events.once('shutdown', () => WipeSound.stop());

    this.spawn();
    this.spawn();
    const tip = text(this, GAME_WIDTH / 2, GLASS_TOP + 260, 'Abra caminhos com o dedo!\nCada pote certo = combo', 26).setDepth(20);
    this.tweens.add({ targets: tip, alpha: 0, delay: 2600, duration: 600, onComplete: () => tip.destroy() });
  }

  /** Sorteia um novo pedido de cor para o pote. */
  request(jar) {
    const r = this.rand();
    let name;
    // Muitas vezes o pote pede a cor de uma gota que já está no vidro: nada fica sobrando.
    const waiting = this.sim?.drops.filter((d) => !d.wild && d.units === 1) || [];
    if (waiting.length && this.rand() < 0.6) {
      const d = waiting[Math.floor(this.rand() * waiting.length)];
      name = ['vermelho', 'amarelo', 'azul'][d.pig.indexOf(1)];
    } else if (this.lvl >= 7 && r < 0.12) name = 'marrom';
    else if (this.lvl >= 3 && r < 0.45) name = ['laranja', 'verde', 'roxo'][Math.floor(this.rand() * 3)];
    else name = ['vermelho', 'amarelo', 'azul'][Math.floor(this.rand() * 3)];
    const pig = RECIPES[name].slice();
    return Object.assign(jar, { name, pig, units: pig[0] + pig[1] + pig[2], filled: 0, have: [0, 0, 0] });
  }

  drawHud() {
    this.add.rectangle(0, 0, GAME_WIDTH, GLASS_TOP - 16, 0x141b3a, 0.9).setOrigin(0).setDepth(9);
    button(this, 40, 36, 56, 48, '⌂', 0x5a4fcf, () => this.quit(), 26);
    this.scoreText = text(this, GAME_WIDTH / 2, 32, '0', 44, '#ffffff').setDepth(20);
    this.bestText = text(this, GAME_WIDTH / 2, 70, `Recorde ${this.best}`, 18, '#aab8ff').setDepth(20);
    this.heartIcons = [];
    for (let i = 0; i < HEARTS; i++) {
      const h = this.add.image(GAME_WIDTH - 110 + i * 36, 32, 'drop-body').setScale(0.42).setTint(0x4cc9f0).setDepth(20);
      this.heartIcons.push(h);
    }
    this.coinHud = coinCounter(this, GAME_WIDTH - 104, 72, Save.get('coins'));
    this.coinHud.objects.forEach((o) => o.setScale(0.8));
    this.levelText = text(this, 64, 76, 'Nv 1', 18, '#ffd23f').setDepth(20);
    this.bar = this.add.graphics().setDepth(20);
    this.comboText = text(this, GAME_WIDTH / 2, GLASS_TOP + 44, '', 40, '#ffd23f').setDepth(21).setVisible(false);
    this.comboBar = this.add.graphics().setDepth(21);
    this.drawBar();
  }

  drawBar() {
    const w = GAME_WIDTH - 40;
    const k = (this.fills % FILLS_PER_LEVEL) / FILLS_PER_LEVEL;
    this.bar.clear();
    this.bar.fillStyle(0xffffff, 0.15);
    this.bar.fillRoundedRect(20, 94, w, 8, 4);
    this.bar.fillStyle(0xffd23f, 1);
    if (k > 0) this.bar.fillRoundedRect(20, 94, w * k, 8, 4);
  }

  spawn() {
    const { drops } = this.sim;
    if (drops.length >= this.p.maxDrops) return;
    // A maioria das gotas é da cor que os potes estão pedindo, para sempre ter jogada.
    const need = this.sim.needed();
    const total = need[0] + need[1] + need[2];
    let c = Math.floor(this.rand() * 3);
    if (total > 0 && this.rand() < 0.8) {
      let r = this.rand() * total;
      c = need.findIndex((v) => (r -= v) < 0);
      if (c < 0) c = 2;
    }
    const pig = [0, 0, 0];
    pig[c] = 1;
    const golden = this.lvl >= 2 && this.rand() < 0.06;
    for (let t = 0; t < 12; t++) {
      const x = 40 + this.rand() * 460;
      const y = GLASS_TOP + 30 + this.rand() * 150;
      if (drops.every((d) => Math.hypot(d.x - x, d.y - y) > 60)) {
        const d = this.sim.addDrop(x, y, pig, [{ x, y, pig }], { wild: golden || this.fever > 0, golden });
        Sfx.release();
        if (golden) this.sparkles.explode(6, x, y);
        return d;
      }
    }
    return null;
  }

  wipeStart(p) {
    if (this.over || p.y < GLASS_TOP || p.y > GLASS_BOTTOM) return;
    this.wiping = true;
    this.last = { x: p.x, y: p.y };
    WipeSound.start();
    this.wipe(p);
  }

  wipeMove(p) {
    if (this.wiping && p.isDown && !this.over) this.wipe(p);
  }

  wipe(p) {
    const y = Phaser.Math.Clamp(p.y, GLASS_TOP, GLASS_BOTTOM);
    const radius = this.fever > 0 ? WIPE_RADIUS * 1.6 : WIPE_RADIUS;
    const removed = this.sim.wipe(this.last.x, this.last.y, p.x, y, radius);
    WipeSound.set(removed > 0.5 ? Math.min(1, Math.hypot(p.x - this.last.x, y - this.last.y) / 30) : 0);
    this.last = { x: p.x, y };
    this.wiped = (this.wiped || 0) + removed;
    if (this.wiped > 30) {
      this.wiped = 0;
      Haptic.light();
    }
  }

  wipeEnd() {
    this.wiping = false;
    WipeSound.stop();
  }

  update(_, dtMs) {
    const dt = Math.min(dtMs / 1000, 0.05);
    if (!this.over) {
      this.clock += dt;
      this.spawnClock += dt;
      const every = this.p.spawnEvery * (this.fever > 0 ? 0.55 : 1);
      if (this.spawnClock >= every) {
        this.spawnClock = 0;
        this.spawn();
      }
      this.sim.step(dt);
      for (const e of this.sim.events) this.onEvent(e);
      this.sim.events.length = 0;
      this.updateCombo(dt);
    }
    this.glass.update(dt);
  }

  updateCombo(dt) {
    const left = COMBO_WINDOW - (this.clock - this.lastFill);
    this.comboBar.clear();
    if (this.combo >= 2 && left > 0) {
      const w = 160 * (left / COMBO_WINDOW);
      this.comboBar.fillStyle(0x000000, 0.35);
      this.comboBar.fillRoundedRect(GAME_WIDTH / 2 - 80, GLASS_TOP + 72, 160, 8, 4);
      this.comboBar.fillStyle(left < 1.5 ? 0xff4d6d : 0xffd23f, 1);
      this.comboBar.fillRoundedRect(GAME_WIDTH / 2 - 80, GLASS_TOP + 72, w, 8, 4);
    } else if (this.combo > 0 && left <= 0 && this.fever <= 0) {
      if (this.combo >= 3) toast(this, `Combo de ${this.combo}!`, GLASS_TOP + 60);
      this.combo = 0;
      this.comboText.setVisible(false);
    }
    if (this.fever > 0) {
      this.fever -= dt;
      const hue = (this.clock * 0.4) % 1;
      const col = Phaser.Display.Color.HSVToRGB(hue, 0.8, 1).color;
      this.feverGlow.clear();
      this.feverGlow.lineStyle(14, col, 0.55 + 0.25 * Math.sin(this.clock * 12));
      this.feverGlow.strokeRect(7, GLASS_TOP + 7, GAME_WIDTH - 14, GLASS_BOTTOM - GLASS_TOP - 14);
      if (this.fever <= 0) this.endFever();
    }
  }

  onEvent(e) {
    switch (e.type) {
      case 'merge':
        Sfx.merge(e.drop.units);
        Haptic.light();
        this.glass.pop(e.drop);
        this.particles.setParticleTint(pigmentToRgb(e.drop.pig));
        this.particles.explode(6, e.drop.x, e.drop.y);
        break;
      case 'fill':
        this.onFill(e.drop, e.jar);
        break;
      case 'reject':
      case 'splash':
        this.miss(e.drop, e.jar);
        break;
      default:
    }
  }

  onFill(d, jar) {
    const color = d.wild ? pigmentToRgb(jar.pig) : pigmentToRgb(d.pig);
    if (d.golden) {
      this.coinsRun += 5;
      Save.addCoins(5);
      this.floatText('+5 moedas', jar.x, JAR_TOP - 40, '#ffd23f', 26);
    }
    const level = Math.min(1, jar.filled / jar.units);
    const units = jar.units;
    // O pedido novo vale na hora, para a próxima gota não bater num pote cheio;
    // o desenho do pote só troca quando esta gota terminar de cair.
    if (level >= 1) this.request(jar);
    this.jars.dropInto(d, jar, color, () => {
      Sfx.fill(Math.round(level * 4));
      Haptic.medium();
      this.particles.setParticleTint(color);
      this.particles.explode(10, jar.x, JAR_TOP + 10);
      if (level >= 1) this.jarDone(jar, units);
    }, level);
  }

  /** Pote completo: pontos, combo, nível e novo pedido. */
  jarDone(jar, units) {
    if (this.over) return;
    this.combo = this.clock - this.lastFill <= COMBO_WINDOW || this.fever > 0 ? this.combo + 1 : 1;
    this.lastFill = this.clock;
    const mult = Math.min(8, 1 + Math.floor((this.combo - 1) / 3)) * (this.fever > 0 ? 2 : 1);
    const points = 10 * units * mult;
    this.score += points;
    this.fills++;
    this.coinsRun++;
    Save.addCoins(1);
    this.coinHud.set(Save.get('coins'));
    this.coinHud.pulse();

    Sfx.combo(this.combo);
    Haptic.medium();
    this.jars.bounce(jar);
    this.sparkles.explode(6 + Math.min(this.combo, 14), jar.x, JAR_TOP + JAR_H / 2);
    this.floatText(`+${points}`, jar.x, JAR_TOP - 20, mult > 1 ? '#ffd23f' : '#ffffff', 30 + Math.min(this.combo, 10) * 2);
    this.scoreText.setText(String(this.score));
    this.tweens.add({ targets: this.scoreText, scale: 1.25, duration: 80, yoyo: true });

    if (this.combo >= 2) {
      this.comboText.setText(mult > 1 ? `COMBO ${this.combo}  x${mult}` : `COMBO ${this.combo}`).setVisible(true);
      this.comboText.setColor(this.fever > 0 ? '#ff70c8' : '#ffd23f');
      this.tweens.killTweensOf(this.comboText);
      this.comboText.setScale(1.5);
      this.tweens.add({ targets: this.comboText, scale: 1, duration: 260, ease: 'Back.out' });
      if (this.combo % 5 === 0) this.cameras.main.shake(160, 0.006);
    }
    if (this.combo > 0 && this.combo % FEVER_EVERY === 0 && this.fever <= 0) this.startFever();

    if (!this.recordShown && this.score > this.best) {
      this.recordShown = true;
      Sfx.record();
      this.bigText('NOVO RECORDE!', '#7ff0e0');
      this.confetti(1);
    }
    if (this.fills % FILLS_PER_LEVEL === 0) this.levelUp();
    this.drawBar();
    this.time.delayedCall(250, () => !this.over && this.jars.replace(jar));
  }

  levelUp() {
    this.lvl++;
    this.p = params(this.lvl);
    this.sim.regrow = this.p.regrow;
    this.sim.creep = this.p.creep;
    this.levelText.setText(`Nv ${this.lvl}`);
    Sfx.levelUp();
    Haptic.heavy();
    this.bigText(`NÍVEL ${this.lvl}!`, '#ffd23f');
    this.cameras.main.flash(200, 255, 230, 150);
    // Bônus de vida a cada 3 níveis
    if (this.lvl % 3 === 0 && this.hearts < HEARTS) {
      this.hearts++;
      this.drawHearts();
      toast(this, '+1 vida!', GLASS_TOP + 340);
    }
    if (this.sim.jars.length < this.p.jars) {
      this.time.delayedCall(300, () => {
        if (this.over) return;
        this.sim.jars.push(this.request({}));
        layoutJars(this.sim.jars);
        this.jars.build();
        toast(this, 'Pote novo!', GLASS_TOP + 380);
      });
    }
  }

  startFever() {
    this.fever = FEVER_TIME;
    Sfx.fever();
    Haptic.heavy();
    this.bigText('FEBRE!', '#ff70c8');
    this.cameras.main.flash(250, 255, 120, 200);
    this.feverGlow.setVisible(true);
    this.sim.drops.forEach((d) => (d.wild = true));
    toast(this, 'Qualquer gota vale em qualquer pote!\nPontos em dobro', GLASS_TOP + 330);
  }

  endFever() {
    this.fever = 0;
    this.feverGlow.setVisible(false);
    this.sim.drops.forEach((d) => {
      if (!d.golden) d.wild = false;
    });
  }

  miss(d, jar) {
    Sfx.splash();
    this.particles.setParticleTint(pigmentToRgb(d.pig));
    this.particles.explode(14, d.x, GLASS_BOTTOM);
    if (jar) this.jars.shake(jar);
    if (this.fever > 0) return; // na febre não perde vida
    this.combo = 0;
    this.comboText.setVisible(false);
    this.hearts--;
    this.drawHearts();
    Sfx.hurt();
    Haptic.heavy();
    this.cameras.main.shake(200, 0.01);
    this.cameras.main.flash(150, 255, 60, 60);
    toast(this, jar ? 'Cor errada!' : 'Caiu fora!', GLASS_BOTTOM - 70);
    if (this.hearts <= 0) this.time.delayedCall(500, () => this.gameOver());
  }

  drawHearts() {
    this.heartIcons.forEach((h, i) => {
      const on = i < this.hearts;
      h.setTint(on ? 0x4cc9f0 : 0x444466).setAlpha(on ? 1 : 0.5);
      if (!on) this.tweens.add({ targets: h, scale: 0.3, duration: 120, yoyo: true });
    });
  }

  floatText(str, x, y, color, size) {
    const t = text(this, x, y, str, size, color).setDepth(40);
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 900, ease: 'Quad.out', onComplete: () => t.destroy() });
  }

  bigText(str, color) {
    const t = text(this, GAME_WIDTH / 2, GLASS_TOP + 200, str, 58, color).setDepth(41).setScale(0.2);
    this.tweens.add({ targets: t, scale: 1, duration: 300, ease: 'Back.out' });
    this.tweens.add({ targets: t, alpha: 0, y: GLASS_TOP + 160, delay: 900, duration: 400, onComplete: () => t.destroy() });
  }

  confetti(seconds) {
    this.add.particles(0, -20, 'confetti', {
      x: { min: 0, max: GAME_WIDTH },
      speedY: { min: 180, max: 420 },
      speedX: { min: -80, max: 80 },
      rotate: { start: 0, end: 540 },
      lifespan: 3000,
      quantity: 3,
      frequency: 30,
      duration: seconds * 1000,
      tint: [0xff4d6d, 0xffd23f, 0x4cc9f0, 0x06d6a0, 0xc38bff],
    }).setDepth(42);
  }

  gameOver() {
    if (this.over) return;
    this.over = true;
    this.wipeEnd();
    this.endFever();
    const isRecord = this.score > this.best;
    if (isRecord) Save.set('best', this.score);
    Save.set('runs', Save.get('runs') + 1);

    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.45).setOrigin(0).setDepth(45).setInteractive();
    const panel = this.add.container(GAME_WIDTH / 2, 440).setDepth(46);
    const g = this.add.graphics();
    g.fillStyle(0x141b3a, 0.96);
    g.fillRoundedRect(-225, -235, 450, 470, 30);
    g.lineStyle(4, 0xffffff, 0.3);
    g.strokeRoundedRect(-225, -235, 450, 470, 30);
    const title = text(this, 0, -190, isRecord ? 'NOVO RECORDE!' : 'Fim da chuva', 40, isRecord ? '#7ff0e0' : '#ffffff');
    const score = text(this, 0, -120, '0', 72, '#ffd23f');
    const gap = this.best - this.score;
    const sub = isRecord
      ? `Antes: ${this.best}`
      : gap <= Math.max(30, this.best * 0.25)
        ? `Faltaram só ${gap} pontos para o recorde!`
        : `Recorde: ${this.best}`;
    const subText = text(this, 0, -60, sub, 20, '#d6e2ff');
    const coins = text(this, 0, -24, `+${this.coinsRun} moedas  ·  nível ${this.lvl}`, 20, '#ffd23f');
    panel.add([g, title, score, subText, coins]);
    const counter = { v: 0 };
    this.tweens.add({ targets: counter, v: this.score, duration: 900, ease: 'Quad.out', onUpdate: () => score.setText(String(Math.round(counter.v))) });
    if (isRecord) {
      Sfx.record();
      this.confetti(1.5);
    }

    if (!this.continued) {
      panel.add(button(this, 0, 50, 340, 74, '▶ Continuar (+3 vidas)', 0x06d6a0, () => this.continueRun(shade, panel), 26));
    }
    panel.add(button(this, 0, this.continued ? 60 : 135, 300, 64, '↻ Jogar de novo', 0x3a86ff, () => this.again(), 26));
    panel.add(button(this, 0, this.continued ? 140 : 200, 200, 48, 'Menu', 0x5a4fcf, () => this.quit(), 20));
    panel.setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 380, ease: 'Back.out' });
  }

  async continueRun(shade, panel) {
    if (this.adBusy) return;
    this.adBusy = true;
    const ok = await Ads.showRewarded();
    this.adBusy = false;
    if (!ok) return toast(this, 'Anúncio indisponível, tente daqui a pouco', 140);
    this.continued = true;
    shade.destroy();
    panel.destroy();
    // Limpa as gotas perto do fundo para não perder vida logo de cara
    this.sim.drops = this.sim.drops.filter((d) => d.y < GLASS_BOTTOM - 200);
    this.sim.fog.fill(1);
    this.hearts = HEARTS;
    this.drawHearts();
    this.over = false;
    if (this.score > this.best) this.best = this.score;
  }

  async again() {
    if (this.leaving || this.adBusy) return;
    this.leaving = true;
    if (Save.get('runs') >= ADS.interstitialFromLevel) await Ads.maybeShowInterstitial();
    this.scene.restart();
  }

  quit() {
    if (!this.over && this.score > this.best) Save.set('best', this.score);
    this.scene.start('Menu');
  }
}
