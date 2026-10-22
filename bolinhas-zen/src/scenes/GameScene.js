import Phaser from 'phaser';
import { ADS, BANNER_SPACE, CAPACITY, FREE_UNDOS, GAME_HEIGHT, GAME_WIDTH, UNDOS_PER_AD } from '../config.js';
import { Save } from '../storage.js';
import { Sfx } from '../audio.js';
import { Haptic } from '../haptics.js';
import { Ads } from '../ads.js';
import { themeById } from '../themes.js';
import { applyMove, generateLevel, isComplete, isSolved, moveCount, solve, topRun } from '../logic.js';
import { BALL, ballKey, colorInt } from '../textures.js';
import { background, button, coinCounter, text, toast } from '../ui.js';

const SLOT = 50;
const TUBE_W = BALL + 16;
const TUBE_H = CAPACITY * SLOT + 14;
const FIELD_TOP = 190;
const FIELD_BOTTOM = GAME_HEIGHT - BANNER_SPACE - 120;
// Nos primeiros níveis a dica é grátis; depois custa um anúncio recompensado.
const FREE_HINT_LEVELS = 3;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    background(this);
    Ads.showBanner();
    this.level = Save.get('level');
    this.theme = themeById(Save.get('theme'));
    this.tubes = generateLevel(this.level, CAPACITY);
    this.history = [];
    this.undoLeft = FREE_UNDOS;
    this.extraUsed = false;
    this.selected = null;
    this.busy = 0;
    this.won = false;
    this.moves = 0;
    this.tip = null;
    this.doubled = false;
    this.adBusy = false;
    this.leaving = false;
    this.hintArrow = null;
    this.pendingTap = null;

    // HUD superior
    button(this, 52, 44, 72, 56, '⌂', 0x8338ec, () => this.scene.start('Menu'), 30);
    button(this, GAME_WIDTH - 52, 44, 72, 56, '↻', 0x3a5aff, () => this.scene.restart(), 30);
    text(this, GAME_WIDTH / 2, 40, `Nível ${this.level}`, 38);
    this.movesText = text(this, GAME_WIDTH / 2, 82, 'Jogadas: 0', 20, '#d9d0ff');
    this.coinHud = coinCounter(this, GAME_WIDTH / 2 - 30, 124, Save.get('coins'));

    // HUD inferior
    const by = GAME_HEIGHT - BANNER_SPACE - 52;
    this.undoBtn = button(this, GAME_WIDTH / 2 - 178, by, 166, 70, '', 0xff9f1c, () => this.undo(), 21);
    const hintLabel = this.level <= FREE_HINT_LEVELS ? '? Dica' : '▶ Dica';
    button(this, GAME_WIDTH / 2, by, 166, 70, hintLabel, 0x4cc9f0, () => this.hint(), 21);
    this.tubeBtn = button(this, GAME_WIDTH / 2 + 178, by, 166, 70, '▶ +1 Tubo', 0x06d6a0, () => this.addTube(), 21);
    this.refreshButtons();

    this.particles = this.add.particles(0, 0, 'dot', {
      speed: { min: 90, max: 300 },
      lifespan: 750,
      scale: { start: 0.7, end: 0 },
      alpha: { start: 1, end: 0 },
      gravityY: 300,
      blendMode: 'ADD',
      emitting: false,
    }).setDepth(30);
    this.sparkles = this.add.particles(0, 0, 'sparkle', {
      speed: { min: 20, max: 120 },
      lifespan: 900,
      scale: { start: 0.9, end: 0 },
      rotate: { min: 0, max: 180 },
      emitting: false,
    }).setDepth(31);

    this.tubeLayer = this.add.container(0, 0);
    this.balls = this.tubes.map(() => []);
    this.lids = [];
    this.buildTubes(false);

    if (this.level === 1) {
      const tip = text(this, GAME_WIDTH / 2, FIELD_TOP - 20, 'Toque num tubo para pegar a bolinha\ne depois onde quer colocar', 22, '#ffffff');
      this.tweens.add({ targets: tip, alpha: 0.4, duration: 900, yoyo: true, repeat: -1 });
      this.tip = tip;
    }
  }

  /** Calcula a posição de cada tubo: 1 fileira até 5 tubos, senão 2 fileiras. */
  layout(n) {
    const rows = n <= 5 ? 1 : 2;
    const perRow = Math.ceil(n / rows);
    const gap = Math.min(100, (GAME_WIDTH - 30) / perRow);
    const rowTops =
      rows === 1
        ? [(FIELD_TOP + FIELD_BOTTOM) / 2 - TUBE_H / 2 + 20]
        : [FIELD_TOP + 50, FIELD_BOTTOM - TUBE_H];
    const pos = [];
    for (let r = 0; r < rows; r++) {
      const count = Math.min(perRow, n - r * perRow);
      for (let k = 0; k < count; k++) {
        pos.push({ x: GAME_WIDTH / 2 + (k - (count - 1) / 2) * gap, top: rowTops[r], gap });
      }
    }
    return pos;
  }

  slotY(i, k) {
    return this.pos[i].top + TUBE_H - 7 - SLOT / 2 - k * SLOT;
  }

  liftY(i) {
    return this.pos[i].top - 34;
  }

  /** (Re)desenha os tubos; bolinhas existentes deslizam para as posições novas. */
  buildTubes(animate) {
    this.tubeLayer.removeAll(true);
    this.lids.forEach((l) => l?.destroy());
    this.lids = [];
    this.pos = this.layout(this.tubes.length);
    this.glows = [];

    this.tubes.forEach((tube, i) => {
      const { x, top, gap } = this.pos[i];
      const glow = this.add.graphics();
      glow.fillStyle(0xffffff, 0.18);
      glow.fillRoundedRect(x - TUBE_W / 2 - 8, top - 8, TUBE_W + 16, TUBE_H + 16, TUBE_W / 2 + 6);
      glow.setVisible(false);
      this.glows[i] = glow;

      const g = this.add.graphics();
      g.fillStyle(0xffffff, 0.08);
      g.fillRoundedRect(x - TUBE_W / 2, top, TUBE_W, TUBE_H, { tl: 6, tr: 6, bl: TUBE_W / 2, br: TUBE_W / 2 });
      g.lineStyle(3, 0xffffff, 0.55);
      g.strokeRoundedRect(x - TUBE_W / 2, top, TUBE_W, TUBE_H, { tl: 6, tr: 6, bl: TUBE_W / 2, br: TUBE_W / 2 });
      // Reflexo do vidro
      g.fillStyle(0xffffff, 0.14);
      g.fillRoundedRect(x - TUBE_W / 2 + 6, top + 10, 7, TUBE_H - 40, 4);
      // Borda da boca do tubo
      g.fillStyle(0xffffff, 0.6);
      g.fillRoundedRect(x - TUBE_W / 2 - 5, top - 4, TUBE_W + 10, 8, 4);

      const zone = this.add.zone(x, top + TUBE_H / 2 - 30, gap, TUBE_H + 110).setInteractive();
      zone.on('pointerdown', () => this.onTube(i));
      this.tubeLayer.add([glow, g, zone]);

      if (animate) {
        g.setAlpha(0);
        this.tweens.add({ targets: g, alpha: 1, duration: 300 });
      }

      tube.forEach((c, k) => {
        let b = this.balls[i][k];
        if (!b) {
          b = this.add.image(x, this.slotY(i, k), ballKey(this.theme.id, c)).setDepth(10);
          this.balls[i][k] = b;
          // Entrada: bolinhas caem nos tubos em cascata
          if (!animate) {
            b.y -= 400;
            b.setAlpha(0);
            this.tweens.add({ targets: b, y: this.slotY(i, k), alpha: 1, duration: 550, ease: 'Bounce.out', delay: i * 45 + (CAPACITY - k) * 25 });
          }
        } else {
          this.tweens.add({ targets: b, x, y: this.slotY(i, k), duration: 300, ease: 'Sine.inOut' });
        }
      });
      if (isComplete(tube, CAPACITY)) this.showLid(i, false);
    });
  }

  onTube(i) {
    if (this.won) return;
    // Toque durante uma animação: guarda e executa assim que as bolinhas pousarem.
    if (this.busy) {
      this.pendingTap = i;
      return;
    }
    if (this.tip) {
      this.tip.destroy();
      this.tip = null;
    }
    this.clearHint();
    const tube = this.tubes[i];
    if (this.selected === null) {
      if (tube.length && !isComplete(tube, CAPACITY)) this.select(i);
      else this.shake(i);
      return;
    }
    if (this.selected === i) {
      this.deselect();
      return;
    }
    const n = moveCount(this.tubes, this.selected, i, CAPACITY);
    if (n) {
      this.transfer(this.selected, i, n, true);
    } else if (tube.length && !isComplete(tube, CAPACITY)) {
      // Jogada inválida num tubo que pode ser pego: troca a seleção
      this.deselect(true);
      this.select(i);
    } else {
      this.shake(i);
    }
  }

  /** Levanta o bloco do topo (todas as bolinhas seguidas da mesma cor). */
  select(i) {
    this.selected = i;
    const run = topRun(this.tubes[i]);
    const tube = this.balls[i];
    const offset = this.liftY(i) - this.slotY(i, tube.length - 1);
    for (let k = tube.length - run; k < tube.length; k++) {
      this.tweens.killTweensOf(tube[k]);
      this.tweens.add({ targets: tube[k], y: this.slotY(i, k) + offset, duration: 150, ease: 'Back.out' });
    }
    this.glows[i].setVisible(true);
    Sfx.lift();
    Haptic.light();
  }

  deselect(silent = false) {
    const i = this.selected;
    if (i === null) return;
    this.selected = null;
    this.glows[i].setVisible(false);
    this.balls[i].forEach((b, k) => {
      this.tweens.killTweensOf(b);
      this.tweens.add({ targets: b, y: this.slotY(i, k), duration: 260, ease: 'Bounce.out' });
    });
    if (!silent) Sfx.putBack();
  }

  shake(i) {
    Sfx.nope();
    Haptic.medium();
    const objs = this.balls[i];
    const x = this.pos[i].x;
    this.tweens.add({
      targets: objs.length ? objs : [this.glows[i]],
      x: x + 6,
      duration: 45,
      yoyo: true,
      repeat: 2,
      onComplete: () => objs.forEach((b) => (b.x = x)),
    });
  }

  /** Move `n` bolinhas de `from` para `to` com animação em arco e quique. */
  transfer(from, to, n, record) {
    if (this.selected !== null) this.glows[this.selected].setVisible(false);
    this.selected = null;
    const wasComplete = isComplete(this.tubes[to], CAPACITY);
    const base = this.tubes[to].length;
    const color = this.tubes[from][this.tubes[from].length - 1];
    applyMove(this.tubes, from, to, n);
    if (record) {
      this.history.push({ from, to, n });
      this.moves++;
      this.movesText.setText(`Jogadas: ${this.moves}`);
    }
    this.hideLid(from);
    if (wasComplete && !isComplete(this.tubes[to], CAPACITY)) this.hideLid(to);

    const tx = this.pos[to].x;
    for (let j = 0; j < n; j++) {
      const b = this.balls[from].pop();
      const slot = base + j;
      this.balls[to][slot] = b;
      this.busy++;
      this.tweens.killTweensOf(b);
      b.setDepth(15);
      this.tweens.chain({
        targets: b,
        tweens: [
          { y: Math.min(b.y, this.liftY(from)), duration: 80, ease: 'Sine.out', delay: j * 70 },
          { x: tx, y: this.liftY(to), duration: 160, ease: 'Sine.inOut' },
          {
            y: this.slotY(to, slot),
            duration: 300,
            ease: 'Bounce.out',
            onStart: () => this.time.delayedCall(125, () => this.land(b, slot)),
          },
        ],
        onComplete: () => {
          b.setDepth(10);
          this.busy--;
          if (j === n - 1) this.afterMove(to, color, record);
          if (!this.busy && this.pendingTap !== null) {
            const tap = this.pendingTap;
            this.pendingTap = null;
            this.onTube(tap);
          }
        },
      });
    }
  }

  /** Momento em que a bolinha bate no fundo: som, vibração e "achatada". */
  land(b, slot) {
    Sfx.drop(slot, Math.min(this.history.length % 3, 2));
    Haptic.light();
    this.tweens.add({ targets: b, scaleY: 0.82, scaleX: 1.12, duration: 70, yoyo: true, ease: 'Quad.out' });
  }

  afterMove(to, color, record) {
    this.refreshButtons();
    if (!record || !isComplete(this.tubes[to], CAPACITY)) return;
    this.celebrateTube(to, color);
    if (isSolved(this.tubes, CAPACITY)) this.time.delayedCall(450, () => this.win());
  }

  celebrateTube(i, color) {
    const { x, top } = this.pos[i];
    const tint = colorInt(this.theme.colors[color]);
    this.particles.setParticleTint(tint);
    this.particles.explode(28, x, top + 10);
    this.sparkles.explode(8, x, top + TUBE_H / 2);
    // Bolinhas pulam em sequência de baixo para cima
    this.balls[i].forEach((b, k) => {
      this.tweens.add({ targets: b, y: this.slotY(i, k) - 14, duration: 110, yoyo: true, delay: k * 50, ease: 'Quad.out' });
    });
    this.showLid(i, true);
    Sfx.complete(color);
    Haptic.medium();
  }

  showLid(i, animate) {
    const { x, top } = this.pos[i];
    const color = colorInt(this.theme.colors[this.tubes[i][0]]);
    const lid = this.add.graphics().setDepth(12);
    lid.fillStyle(0x000000, 0.25);
    lid.fillRoundedRect(-TUBE_W / 2 - 6, -6, TUBE_W + 12, 16, 7);
    lid.fillStyle(color, 1);
    lid.fillRoundedRect(-TUBE_W / 2 - 6, -10, TUBE_W + 12, 16, 7);
    lid.fillStyle(0xffffff, 0.4);
    lid.fillRoundedRect(-TUBE_W / 2, -8, TUBE_W, 5, 3);
    lid.setPosition(x, top - 2);
    this.lids[i] = lid;
    if (animate) {
      lid.y -= 80;
      lid.setAlpha(0);
      this.tweens.add({ targets: lid, y: top - 2, alpha: 1, duration: 450, ease: 'Bounce.out', delay: 150 });
    }
  }

  hideLid(i) {
    this.lids[i]?.destroy();
    this.lids[i] = null;
  }

  refreshButtons() {
    this.undoBtn.label.setText(this.undoLeft > 0 ? `↶ Desfazer ${this.undoLeft}` : `▶ +${UNDOS_PER_AD} Desfazer`);
    this.undoBtn.setAlpha(this.history.length || this.undoLeft <= 0 ? 1 : 0.55);
    this.tubeBtn.setAlpha(this.extraUsed ? 0.45 : 1);
  }

  async undo() {
    if (this.busy || this.won) return;
    if (this.undoLeft <= 0) {
      if (!(await this.rewarded())) return;
      this.undoLeft += UNDOS_PER_AD;
      this.refreshButtons();
      return;
    }
    this.clearHint();
    const last = this.history.pop();
    if (!last) {
      toast(this, 'Nada para desfazer', FIELD_TOP);
      return;
    }
    this.deselect(true);
    this.undoLeft--;
    this.moves = Math.max(0, this.moves - 1);
    this.movesText.setText(`Jogadas: ${this.moves}`);
    Sfx.undo();
    this.transfer(last.to, last.from, last.n, false);
  }

  /** Mostra a próxima jogada boa com uma seta pontilhada piscando. */
  async hint() {
    if (this.busy || this.won) return;
    this.clearHint();
    const path = solve(this.tubes, CAPACITY, 40000);
    if (!path) {
      toast(this, 'Sem saída! Desfaça jogadas ou use +1 Tubo', FIELD_TOP);
      return;
    }
    if (this.level > FREE_HINT_LEVELS && !(await this.rewarded())) return;
    this.deselect(true);
    const [a, b] = path[0];
    const from = new Phaser.Math.Vector2(this.pos[a].x, this.liftY(a));
    const to = new Phaser.Math.Vector2(this.pos[b].x, this.liftY(b));
    const ctrl = new Phaser.Math.Vector2((from.x + to.x) / 2, Math.min(from.y, to.y) - 90);
    const g = this.add.graphics().setDepth(25);
    const pts = new Phaser.Curves.QuadraticBezier(from, ctrl, to).getPoints(14);
    pts.forEach((p, k) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(p.x, p.y, k === pts.length - 1 ? 9 : 4 + k * 0.2);
    });
    this.tweens.add({ targets: g, alpha: 0.25, duration: 450, yoyo: true, repeat: -1 });
    this.hintArrow = g;
    this.glows[a].setVisible(true);
    this.glows[b].setVisible(true);
    this.hintTubes = [a, b];
  }

  clearHint() {
    if (!this.hintArrow) return;
    this.hintArrow.destroy();
    this.hintArrow = null;
    this.hintTubes.forEach((i) => this.glows[i]?.setVisible(false));
  }

  async addTube() {
    if (this.busy || this.won) return;
    if (this.extraUsed) {
      toast(this, 'Só 1 tubo extra por nível', FIELD_TOP);
      return;
    }
    if (!(await this.rewarded())) return;
    this.deselect(true);
    this.clearHint();
    this.extraUsed = true;
    this.tubes.push([]);
    this.balls.push([]);
    this.buildTubes(true);
    this.refreshButtons();
    Sfx.buy();
  }

  /** Anúncio recompensado; resolve true se o jogador ganhou a recompensa. */
  async rewarded() {
    this.busy++;
    const ok = await Ads.showRewarded();
    this.busy--;
    if (!ok) toast(this, 'Anúncio indisponível, tente daqui a pouco', FIELD_TOP);
    return ok;
  }

  win() {
    if (this.won) return;
    this.won = true;
    const reward = 10 + Math.min(this.level, 30);
    Save.set('level', this.level + 1);
    Save.addCoins(reward);

    Sfx.win();
    Haptic.heavy();
    // Onda de comemoração em todas as bolinhas
    this.balls.forEach((tube, i) =>
      tube.forEach((b, k) =>
        this.tweens.add({ targets: b, y: this.slotY(i, k) - 26, duration: 160, yoyo: true, delay: i * 60 + k * 30, ease: 'Quad.out' }),
      ),
    );
    this.add.particles(0, -20, 'confetti', {
      x: { min: 0, max: GAME_WIDTH },
      speedY: { min: 180, max: 420 },
      speedX: { min: -80, max: 80 },
      rotate: { start: 0, end: 540 },
      lifespan: 3200,
      quantity: 4,
      frequency: 30,
      duration: 1200,
      tint: this.theme.colors.map(colorInt),
    }).setDepth(35.5); // entre o escurecimento e o painel

    this.time.delayedCall(900, () => this.showWinPanel(reward));
  }

  showWinPanel(reward) {
    const cx = GAME_WIDTH / 2;
    const cy = 440;
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.45).setOrigin(0).setDepth(35).setInteractive();
    shade.setAlpha(0);
    this.tweens.add({ targets: shade, alpha: 1, duration: 300 });

    const panel = this.add.container(cx, cy).setDepth(36);
    const g = this.add.graphics();
    g.fillStyle(0x1b1033, 0.95);
    g.fillRoundedRect(-220, -190, 440, 380, 30);
    g.lineStyle(4, 0xffffff, 0.3);
    g.strokeRoundedRect(-220, -190, 440, 380, 30);
    const title = text(this, 0, -130, 'Perfeito!', 52, '#7ff0e0');
    const sub = text(this, 0, -75, `Nível ${this.level} em ${this.moves} jogadas`, 22, '#d9d0ff');
    const coin = this.add.image(-50, -15, 'coin').setScale(1.3);
    const amount = text(this, 0, -15, '+0', 40, '#ffd23f').setOrigin(0, 0.5);
    panel.add([g, title, sub, coin, amount]);
    panel.setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 380, ease: 'Back.out' });

    // Contagem das moedas subindo, com "plim" a cada passo
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

  async next() {
    if (this.leaving || this.adBusy) return;
    this.leaving = true;
    if (this.level + 1 >= ADS.interstitialFromLevel) await Ads.maybeShowInterstitial();
    this.scene.restart();
  }
}
