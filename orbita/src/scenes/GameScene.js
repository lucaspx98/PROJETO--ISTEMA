import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SAFE_TOP } from '../config.js';
import { Save } from '../storage.js';
import { Ads } from '../ads.js';
import { Sfx } from '../audio.js';
import { Music } from '../music.js';
import { getSkin } from '../skins.js';
import { PLANET_COLORS, PLANET_TEX_R } from '../textures.js';
import { background, button, gemCounter, rand, randf, text } from '../ui.js';

// O planeta atual fica nesta fração da altura da tela; o próximo aparece acima.
const CAM_ANCHOR = 0.66;
const ORBIT_GAP = 36; // distância da superfície do planeta até a órbita
const QUICK_LAUNCH_S = 1.0; // soltar antes disso conta para o combo
const MAX_FLY_S = 3;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    Ads.hideBanner();
    Music.start();
    Music.duck(false);
    this.bg = background(this);
    this.skin = getSkin(Save.get('skin'));

    this.score = 0;
    this.gemsRun = 0;
    this.gemsBanked = 0;
    this.combo = 0;
    this.elapsed = 0;
    this.dead = false;
    this.isPaused = false;
    this.usedContinue = false;
    this.doubled = false;
    this.state = 'orbit';
    this.planets = [];
    this.gems = [];

    this.orbitGfx = this.add.graphics().setDepth(4);
    const first = this.makePlanet(GAME_WIDTH / 2, GAME_HEIGHT * CAM_ANCHOR, 0, { r: 58 });
    while (this.planets.length < 6) this.spawnNext();

    this.player = this.add.image(0, 0, `comet-${this.skin.id}`).setDepth(10);
    this.trail = this.add
      .particles(0, 0, 'dot', {
        follow: this.player,
        lifespan: 450,
        speed: 0,
        scale: { start: 0.9, end: 0 },
        alpha: { start: 0.7, end: 0 },
        frequency: 14,
        tint: this.skin.trail,
        blendMode: 'ADD',
      })
      .setDepth(9);
    this.burst = this.add
      .particles(0, 0, 'dot', {
        lifespan: 500,
        speed: { min: 80, max: 260 },
        scale: { start: 0.7, end: 0 },
        alpha: { start: 1, end: 0 },
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(11);

    this.player.setPosition(first.x, first.y - first.orbitR);
    this.enterOrbit(first, -Math.PI / 2, 1);
    this.cameras.main.scrollY = 0;

    this.scoreText = text(this, GAME_WIDTH / 2, SAFE_TOP + 20, '0', 72).setScrollFactor(0).setDepth(20);
    this.gemHud = gemCounter(this, 34, SAFE_TOP + 20, Save.get('gems'));
    this.gemHud.objects.forEach((o) => o.setDepth(20));
    this.comboText = text(this, GAME_WIDTH / 2, SAFE_TOP + 80, '', 30, '#ffd43b').setScrollFactor(0).setDepth(20).setAlpha(0);
    button(this, GAME_WIDTH - 50, SAFE_TOP + 20, 64, 64, 'II', 0x364fc7, () => this.pause(), 26)
      .setScrollFactor(0)
      .setDepth(20);

    this.hint = text(this, GAME_WIDTH / 2, GAME_HEIGHT * 0.86, 'Toque para soltar o cometa', 30, '#c5f6fa')
      .setScrollFactor(0)
      .setDepth(20);
    this.tweens.add({ targets: this.hint, alpha: 0.35, duration: 650, yoyo: true, repeat: -1 });

    this.input.on('pointerdown', () => this.launch());
    this.input.keyboard?.on('keydown-SPACE', () => this.launch());
  }

  // ---------- mundo ----------

  makePlanet(x, y, index, opts = {}) {
    const r = opts.r ?? 46;
    const orbitR = r + ORBIT_GAP;
    const tex = `planet-${(index * 3 + rand(0, 1)) % PLANET_COLORS.length}`;
    const img = this.add.image(x, y, tex).setScale(r / PLANET_TEX_R).setDepth(5).setRotation(randf(0, 6.28));
    const orbitSpeed = 170 + Math.min(index, 60) * 2; // px/s ao longo da órbita
    const p = { index, x, y, baseX: x, r, orbitR, omega: orbitSpeed / orbitR, img, moon: null, move: null };

    if (opts.moon) {
      p.moon = {
        angle: randf(0, Math.PI * 2),
        omega: (Math.random() < 0.5 ? -1 : 1) * randf(1.1, 1.6 + Math.min(index, 60) * 0.01),
        img: this.add.image(x, y, 'moon').setDepth(8),
      };
    }
    if (opts.move) {
      const amp = Math.min(randf(50, 120), x - orbitR - 10, GAME_WIDTH - x - orbitR - 10);
      if (amp > 25) p.move = { amp, speed: randf(0.8, 1.4), phase: randf(0, 6.28) };
    }
    this.planets.push(p);
    return p;
  }

  spawnNext() {
    const last = this.planets[this.planets.length - 1];
    const n = last.index + 1;
    const d = Math.min(n, 60);
    const r = Phaser.Math.Clamp(randf(38, 56) - d * 0.3, 24, 60);
    const orbitR = r + ORBIT_GAP;
    const gap = Math.max(randf(230, 270) + d * 1.6, orbitR + last.orbitR + 60);
    const margin = orbitR + 12;
    let x = randf(margin, GAME_WIDTH - margin);
    for (let tries = 0; tries < 8 && Math.abs(x - last.baseX) < 80; tries++) x = randf(margin, GAME_WIDTH - margin);
    if (n <= 2) x = last.baseX + randf(-60, 60); // primeiros saltos fáceis para aprender
    const y = last.y - gap;

    const p = this.makePlanet(x, y, n, {
      r,
      moon: n >= 6 && Math.random() < Math.min(0.5, 0.15 + n * 0.01),
      move: n >= 12 && Math.random() < Math.min(0.45, 0.1 + n * 0.01),
    });

    // Cristais no caminho entre os dois planetas
    const count = rand(1, 3);
    for (let k = 1; k <= count; k++) {
      const t = k / (count + 1);
      const gx = Phaser.Math.Linear(last.baseX, p.baseX, t) + randf(-30, 30);
      const gy = Phaser.Math.Linear(last.y, p.y, t);
      const gem = this.add.image(gx, gy, 'gem').setDepth(6);
      this.tweens.add({ targets: gem, scale: 1.15, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.gems.push(gem);
    }
  }

  enterOrbit(p, angle, dir) {
    this.cur = p;
    this.angle = angle;
    this.dir = dir;
    this.orbitR = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y) || p.orbitR;
    this.capturedAt = this.elapsed;
    this.state = 'orbit';
    // Não deixa o jogador entrar em órbita já em cima da lua
    if (p.moon && Math.abs(Phaser.Math.Angle.Wrap(p.moon.angle - angle)) < 1.3) p.moon.angle = angle + Math.PI;
  }

  // ---------- controle ----------

  launch() {
    if (this.state !== 'orbit' || this.dead || this.isPaused) return;
    if (this.hint) {
      this.hint.destroy();
      this.hint = null;
    }
    this.quick = this.elapsed - this.capturedAt < QUICK_LAUNCH_S && this.score > 0;
    const speed = 540 + Math.min(this.score, 60) * 3;
    this.vx = -Math.sin(this.angle) * this.dir * speed;
    this.vy = Math.cos(this.angle) * this.dir * speed;
    this.from = this.cur;
    this.flyT = 0;
    this.state = 'fly';
    Sfx.launch();
  }

  capture(p) {
    const rx = this.player.x - p.x;
    const ry = this.player.y - p.y;
    // Sentido da órbita segue o sentido em que o cometa chegou (produto vetorial)
    const dir = rx * this.vy - ry * this.vx >= 0 ? 1 : -1;
    const forward = p.index > this.cur.index;
    if (forward) {
      this.score += p.index - this.cur.index;
      this.combo = this.quick ? this.combo + 1 : 0;
      this.scoreText.setText(String(this.score));
      this.tweens.add({ targets: this.scoreText, scale: { from: 1.3, to: 1 }, duration: 200 });
      if (this.combo >= 2) {
        this.addGems(1);
        this.comboText.setText(`RÁPIDO x${this.combo}  +1`).setAlpha(1).setScale(1.2);
        this.tweens.killTweensOf(this.comboText);
        this.tweens.add({ targets: this.comboText, scale: 1, duration: 150 });
        this.tweens.add({ targets: this.comboText, alpha: 0, delay: 700, duration: 300 });
      }
    } else {
      this.combo = 0;
    }
    Sfx.capture(this.combo);
    this.tweens.add({ targets: p.img, scale: { from: p.img.scale * 1.12, to: p.img.scale }, duration: 220, ease: 'Back.out' });
    this.burst.setParticleTint(this.skin.trail[0]);
    this.burst.explode(10, this.player.x, this.player.y);
    this.enterOrbit(p, Math.atan2(ry, rx), dir);
  }

  addGems(n) {
    this.gemsRun += n;
    this.gemHud.set(Save.get('gems') + this.gemsRun - this.gemsBanked);
  }

  // ---------- loop ----------

  update(_, dtMs) {
    if (this.dead || this.isPaused) return;
    const dt = Math.min(dtMs, 50) / 1000;
    this.elapsed += dt;
    const cam = this.cameras.main;

    for (const p of this.planets) {
      if (p.move) {
        p.x = p.baseX + Math.sin(this.elapsed * p.move.speed + p.move.phase) * p.move.amp;
        p.img.x = p.x;
      }
      p.img.rotation += dt * 0.15;
      if (p.moon) {
        p.moon.angle += p.moon.omega * dt;
        p.moon.img.setPosition(p.x + Math.cos(p.moon.angle) * p.orbitR, p.y + Math.sin(p.moon.angle) * p.orbitR);
        p.moon.img.rotation += dt;
      }
    }

    if (this.state === 'orbit') {
      const p = this.cur;
      this.angle += this.dir * p.omega * dt;
      this.orbitR += (p.orbitR - this.orbitR) * Math.min(1, dt * 8);
      this.player.setPosition(p.x + Math.cos(this.angle) * this.orbitR, p.y + Math.sin(this.angle) * this.orbitR);
      this.player.rotation = this.angle + (this.dir * Math.PI) / 2;
    } else if (this.state === 'fly') {
      this.flyT += dt;
      this.player.x += this.vx * dt;
      this.player.y += this.vy * dt;
      this.player.rotation = Math.atan2(this.vy, this.vx);
      for (const p of this.planets) {
        if (p === this.from) continue;
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y) <= p.orbitR) {
          this.capture(p);
          break;
        }
      }
      if (this.state === 'fly') {
        const out =
          this.player.x < -30 ||
          this.player.x > GAME_WIDTH + 30 ||
          this.player.y > cam.scrollY + GAME_HEIGHT + 30 ||
          this.player.y < cam.scrollY - 250 ||
          this.flyT > MAX_FLY_S;
        if (out) return this.die('Perdido no espaço!');
      }
    }

    // Luas: colisão
    for (const p of this.planets) {
      if (p.moon && Phaser.Math.Distance.Between(this.player.x, this.player.y, p.moon.img.x, p.moon.img.y) < 22) {
        return this.die('Bateu numa lua!');
      }
    }

    // Cristais
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, g.x, g.y) < 30) {
        this.gems.splice(i, 1);
        this.addGems(1);
        Sfx.gem();
        this.tweens.killTweensOf(g);
        this.tweens.add({ targets: g, scale: 2, alpha: 0, y: g.y - 30, duration: 250, onComplete: () => g.destroy() });
      } else if (g.y > cam.scrollY + GAME_HEIGHT + 100) {
        this.gems.splice(i, 1);
        g.destroy();
      }
    }

    // Câmera acompanha o planeta atual
    const target = this.cur.y - GAME_HEIGHT * CAM_ANCHOR;
    cam.scrollY += (target - cam.scrollY) * Math.min(1, dt * 4);
    this.bg.scroll(cam.scrollY);

    // Remove planetas que ficaram para trás e gera novos acima
    while (this.planets[0] !== this.cur && this.planets[0].y > cam.scrollY + GAME_HEIGHT + 150) {
      const old = this.planets.shift();
      old.img.destroy();
      old.moon?.img.destroy();
    }
    while (this.planets[this.planets.length - 1].index < this.cur.index + 5) this.spawnNext();

    this.drawOrbits(cam);
  }

  drawOrbits(cam) {
    const g = this.orbitGfx;
    g.clear();
    for (const p of this.planets) {
      if (p.y < cam.scrollY - 150 || p.y > cam.scrollY + GAME_HEIGHT + 150) continue;
      const active = p === this.cur && this.state === 'orbit';
      g.lineStyle(active ? 3 : 2, active ? this.skin.glow : 0xffffff, active ? 0.45 : 0.16);
      // Órbita tracejada
      const segs = 36;
      for (let s = 0; s < segs; s += 2) {
        const a0 = (s / segs) * Math.PI * 2 + this.elapsed * 0.2;
        const a1 = ((s + 1) / segs) * Math.PI * 2 + this.elapsed * 0.2;
        g.beginPath();
        g.arc(p.x, p.y, p.orbitR, a0, a1);
        g.strokePath();
      }
    }
  }

  // ---------- fim / continuar ----------

  die(reason) {
    if (this.dead) return;
    this.dead = true;
    this.state = 'dead';
    Sfx.die();
    this.cameras.main.shake(250, 0.012);
    this.trail.stop();
    this.burst.setParticleTint(0xff6b6b);
    this.burst.explode(24, this.player.x, this.player.y);
    this.player.setVisible(false);
    Music.duck(true);

    Save.addGems(this.gemsRun - this.gemsBanked);
    this.gemsBanked = this.gemsRun;
    const isRecord = Save.submitScore(this.score);

    this.time.delayedCall(700, () => {
      this.scene.launch('GameOver', {
        reason,
        score: this.score,
        gems: this.gemsRun,
        isRecord,
        canContinue: !this.usedContinue,
        canDouble: this.gemsRun > 0 && !this.doubled,
      });
      this.scene.pause();
    });
  }

  revive() {
    this.usedContinue = true;
    const p = this.cur;
    // Volta para a órbita do último planeta, do lado oposto à lua
    const angle = p.moon ? p.moon.angle + Math.PI : -Math.PI / 2;
    this.player.setPosition(p.x + Math.cos(angle) * p.orbitR, p.y + Math.sin(angle) * p.orbitR).setVisible(true);
    this.enterOrbit(p, angle, this.dir);
    this.combo = 0;
    this.trail.start();
    Music.duck(false);
    this.dead = false;
    this.scene.resume();
  }

  doubleGems() {
    this.doubled = true;
    Save.addGems(this.gemsRun);
  }

  pause() {
    if (this.dead || this.isPaused) return;
    this.isPaused = true;
    this.tweens.pauseAll();
    Music.pause(true);
    const overlay = this.add.container(0, 0).setDepth(30).setScrollFactor(0);
    overlay.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65).setOrigin(0).setInteractive());
    overlay.add(text(this, GAME_WIDTH / 2, GAME_HEIGHT * 0.35, 'PAUSA', 64, '#99e9f2'));
    overlay.add(
      button(this, GAME_WIDTH / 2, GAME_HEIGHT * 0.5, 300, 80, '▶  Continuar', 0x0ca678, () => {
        overlay.destroy();
        this.tweens.resumeAll();
        Music.pause(false);
        // Espera o toque terminar para não soltar o cometa sem querer
        this.time.delayedCall(100, () => (this.isPaused = false));
      }, 30),
    );
    overlay.add(
      button(this, GAME_WIDTH / 2, GAME_HEIGHT * 0.5 + 105, 300, 70, 'Menu', 0x7048e8, () => {
        Music.pause(false);
        // Cristais da partida não se perdem ao sair pelo menu
        Save.addGems(this.gemsRun - this.gemsBanked);
        this.scene.start('Menu');
      }, 28),
    );
  }
}
