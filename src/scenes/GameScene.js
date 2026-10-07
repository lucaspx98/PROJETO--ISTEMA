import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, GROUND_Y } from '../config.js';
import { Save } from '../storage.js';
import { Sfx } from '../audio.js';
import { Ads } from '../ads.js';
import { getSkin } from '../skins.js';
import { background, button, coinCounter, text } from '../ui.js';

const PLAYER_X = 200;
const JUMP_VELOCITY = 860;
const DOUBLE_JUMP_VELOCITY = 760;
const START_SPEED = 380;
const MAX_SPEED = 950;
const ACCELERATION = 7; // px/s ganhos por segundo de partida

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    Ads.hideBanner();
    this.bg = background(this);

    this.speed = START_SPEED;
    this.elapsed = 0;
    this.distance = 0;
    this.coinsRun = 0;
    this.coinsBanked = 0;
    this.usedContinue = false;
    this.doubled = false;
    this.dead = false;
    this.paused = false;
    this.invulnerable = false;
    this.airJumps = 0;
    this.sinceSpawn = 0;
    this.nextGap = 700;

    const skin = getSkin(Save.get('skin'));

    const ground = this.add.rectangle(GAME_WIDTH / 2, GROUND_Y + 50, GAME_WIDTH * 2, 100);
    this.physics.add.existing(ground, true);

    this.trail = this.add.particles(0, 0, 'dot', {
      speedX: { min: -260, max: -140 },
      speedY: { min: -20, max: 20 },
      lifespan: 280,
      scale: { start: 0.9, end: 0 },
      alpha: { start: 0.6, end: 0 },
      tint: skin.body,
      frequency: 25,
    });

    this.player = this.physics.add.sprite(PLAYER_X, GROUND_Y - 30, `player-${skin.id}`);
    this.player.body.setSize(38, 38).setOffset(5, 5);
    this.player.setDepth(3);
    this.trail.startFollow(this.player, -18, 6);

    this.burst = this.add.particles(0, 0, 'dot', {
      speed: { min: 120, max: 420 },
      lifespan: 600,
      scale: { start: 1.2, end: 0 },
      tint: [skin.body, skin.accent, 0xffffff],
      emitting: false,
    });
    this.burst.setDepth(4);

    this.obstacles = this.physics.add.group({ allowGravity: false, immovable: true });
    // Blocos são plataformas: dá para pousar em cima, mas bater de lado é fatal.
    this.platforms = this.physics.add.group({ allowGravity: false, immovable: true });
    this.coins = this.physics.add.group({ allowGravity: false });

    this.physics.add.collider(this.player, ground);
    this.physics.add.overlap(this.player, this.obstacles, () => this.hit());
    this.physics.add.collider(this.player, this.platforms, () => {
      if (this.player.body.touching.right) this.hit();
    });
    this.physics.add.overlap(this.player, this.coins, (_p, c) => this.collect(c));

    // HUD
    this.scoreText = text(this, 20, 30, '0', 40).setOrigin(0, 0.5).setDepth(10);
    this.coinHud = coinCounter(this, 34, 76, 0);
    this.coinHud.objects.forEach((o) => o.setDepth(10));
    button(this, GAME_WIDTH - 50, 42, 64, 56, 'II', 0x3a86ff, () => this.pauseGame(), 26).setDepth(10);

    const hint = text(this, GAME_WIDTH / 2, 200, 'Toque para pular\nToque no ar para pulo duplo', 30);
    this.tweens.add({ targets: hint, alpha: 0, delay: 2500, duration: 600, onComplete: () => hint.destroy() });

    // Controles: toque/clique em qualquer lugar, ou espaço/seta para cima
    this.input.on('pointerdown', () => this.jump());
    this.input.on('pointerup', () => this.releaseJump());
    this.input.keyboard?.on('keydown-SPACE', () => this.jump());
    this.input.keyboard?.on('keydown-UP', () => this.jump());
    this.input.keyboard?.on('keyup-SPACE', () => this.releaseJump());
    this.input.keyboard?.on('keyup-UP', () => this.releaseJump());

    // Pausa automática quando o app vai para segundo plano
    this.game.events.on('hidden', this.onHidden, this);
    this.events.once('shutdown', () => this.game.events.off('hidden', this.onHidden, this));
  }

  onHidden() {
    if (!this.dead && !this.paused) this.pauseGame();
  }

  jump() {
    if (this.dead || this.paused) return;
    const body = this.player.body;
    if (body.blocked.down || body.touching.down) {
      body.setVelocityY(-JUMP_VELOCITY);
      this.airJumps = 1;
      Sfx.jump();
    } else if (this.airJumps > 0) {
      this.airJumps -= 1;
      body.setVelocityY(-DOUBLE_JUMP_VELOCITY);
      this.burst.explode(10, this.player.x, this.player.y + 20);
      Sfx.doubleJump();
    }
  }

  /** Soltar cedo dá um pulo mais baixo. */
  releaseJump() {
    if (this.dead || this.paused) return;
    const body = this.player.body;
    if (body.velocity.y < -300) body.setVelocityY(body.velocity.y * 0.55);
  }

  update(_, dtMs) {
    if (this.dead || this.paused) return;
    const dt = Math.min(dtMs, 50) / 1000;

    this.elapsed += dt;
    this.speed = Math.min(MAX_SPEED, START_SPEED + this.elapsed * ACCELERATION);
    const dx = this.speed * dt;
    this.distance += dx;
    this.sinceSpawn += dx;
    this.bg.scroll(dx);
    this.scoreText.setText(String(this.score));

    // Gira no ar, alinha ao tocar o chão
    const body = this.player.body;
    if (body.blocked.down || body.touching.down) {
      this.player.angle = Phaser.Math.Snap.To(this.player.angle, 90);
    } else {
      this.player.angle += 420 * dt;
    }

    this.player.x = PLAYER_X;
    for (const group of [this.obstacles, this.platforms, this.coins]) {
      for (const obj of group.getChildren().slice()) {
        obj.body.setVelocityX(-this.speed);
        if (obj.x < -120) obj.destroy();
      }
    }
    this.obstacles.getChildren().forEach((o) => {
      if (o.texture.key === 'saw') o.angle -= 600 * dt;
    });
    this.coins.getChildren().forEach((c) => {
      c.scaleX = Math.cos(this.elapsed * 6 + c.y);
    });

    if (this.sinceSpawn >= this.nextGap) this.spawnPattern();
  }

  get score() {
    return Math.floor(this.distance / 10);
  }

  // ---------- Geração de obstáculos ----------

  spawnPattern() {
    const d = Math.min(1, this.elapsed / 90); // dificuldade 0..1
    const x = GAME_WIDTH + 60;
    const patterns = [
      [3, () => this.spikes(x, 1)],
      [2, () => this.spikes(x, 2)],
      [1 + d * 2, () => this.spikes(x, 3)],
      [2, () => this.block(x, 'block')],
      [1 + d * 2, () => this.block(x, 'tall')],
      [d * 3, () => this.blockAndSpikes(x)],
      [1 + d, () => this.saw(x, GROUND_Y - 125)],
      [1 + d, () => this.saw(x, GROUND_Y - 28)],
      [d * 3, () => this.movingSaw(x)],
      [1.5, () => this.coinLine(x)],
    ];
    const total = patterns.reduce((s, [w]) => s + w, 0);
    let r = Math.random() * total;
    let width = 0;
    for (const [w, fn] of patterns) {
      r -= w;
      if (r <= 0) {
        width = fn();
        break;
      }
    }
    const gapTime = Phaser.Math.FloatBetween(0.85, 1.5) - d * 0.2;
    this.nextGap = width + this.speed * gapTime;
    this.sinceSpawn = 0;
  }

  addObstacle(x, y, key, hitbox) {
    const o = this.obstacles.create(x, y, key);
    o.setOrigin(0.5, 1);
    o.y = y;
    if (hitbox) o.body.setSize(hitbox[0], hitbox[1]).setOffset(hitbox[2], hitbox[3]);
    return o;
  }

  spikes(x, n) {
    for (let i = 0; i < n; i++) this.addObstacle(x + i * 40, GROUND_Y, 'spike', [22, 26, 9, 14]);
    if (n >= 2 || Math.random() < 0.5) this.coinArc(x + (n - 1) * 20, 5, 120);
    return n * 40;
  }

  block(x, key) {
    const o = this.platforms.create(x, GROUND_Y, key).setOrigin(0.5, 1);
    o.body.setSize(44, o.height).setOffset(1, 0);
    o.body.setFriction(0, 0);
    if (Math.random() < 0.6) this.coinArc(x, 5, key === 'tall' ? 200 : 150);
    return 46;
  }

  blockAndSpikes(x) {
    this.block(x, 'block');
    this.spikes(x + 46, 2);
    return 126;
  }

  saw(x, y) {
    const s = this.obstacles.create(x, y, 'saw');
    s.body.setCircle(18, 6, 6);
    // Serra alta: passe por baixo e pegue as moedas. Serra baixa: pule.
    if (y < GROUND_Y - 60) this.coinLine(x - 60, 4, GROUND_Y - 24);
    return 48;
  }

  movingSaw(x) {
    const s = this.obstacles.create(x, GROUND_Y - 40, 'saw');
    s.body.setCircle(18, 6, 6);
    this.tweens.add({ targets: s, y: GROUND_Y - 170, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return 48;
  }

  coinArc(cx, n, height) {
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const x = cx - 80 + t * 160;
      const y = GROUND_Y - 30 - Math.sin(t * Math.PI) * height;
      this.addCoin(x, y);
    }
  }

  coinLine(x, n = 6, y = GROUND_Y - 24 - (Math.random() < 0.5 ? 0 : 110)) {
    for (let i = 0; i < n; i++) this.addCoin(x + i * 40, y);
    return n * 40;
  }

  addCoin(x, y) {
    const c = this.coins.create(x, y, 'coin');
    c.body.setCircle(13);
  }

  collect(coin) {
    if (!coin.active) return;
    this.burst.explode(6, coin.x, coin.y);
    coin.destroy();
    this.coinsRun += 1;
    this.coinHud.set(this.coinsRun);
    Sfx.coin();
  }

  // ---------- Morte, continuação e pausa ----------

  hit() {
    if (this.dead || this.invulnerable) return;
    this.dead = true;
    Sfx.hit();
    this.cameras.main.shake(250, 0.012);
    this.cameras.main.flash(120, 255, 60, 90);
    this.burst.explode(40, this.player.x, this.player.y);
    this.player.setVisible(false);
    this.trail.stop();
    this.physics.pause();

    Save.addCoins(this.coinsRun - this.coinsBanked);
    this.coinsBanked = this.coinsRun;
    const isRecord = Save.submitScore(this.score);

    this.time.delayedCall(800, () => {
      this.scene.launch('GameOver', {
        score: this.score,
        coins: this.coinsRun,
        isRecord,
        canContinue: !this.usedContinue,
        canDouble: !this.doubled && this.coinsRun > 0,
      });
      this.scene.pause();
    });
  }

  /** Volta à partida depois de um anúncio recompensado. */
  revive() {
    this.usedContinue = true;
    [...this.obstacles.getChildren(), ...this.platforms.getChildren()].forEach((o) => {
      if (o.x < GAME_WIDTH + 200) o.destroy();
    });
    this.sinceSpawn = 0;
    this.nextGap = this.speed * 1.2;
    this.player.setVisible(true).setPosition(PLAYER_X, GROUND_Y - 30).setAngle(0);
    this.player.body.setVelocity(0, 0);
    this.invulnerable = true;
    this.tweens.add({
      targets: this.player,
      alpha: 0.3,
      duration: 150,
      yoyo: true,
      repeat: 7,
      onComplete: () => {
        this.player.alpha = 1;
        this.invulnerable = false;
      },
    });
    this.trail.start();
    this.physics.resume();
    this.dead = false;
    this.scene.resume();
  }

  doubleCoins() {
    this.doubled = true;
    Save.addCoins(this.coinsRun);
  }

  pauseGame() {
    if (this.paused || this.dead) return;
    this.paused = true;
    this.physics.pause();
    this.tweens.pauseAll();
    this.trail.pause();

    const overlay = this.add.container(0, 0).setDepth(20);
    overlay.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setOrigin(0).setInteractive());
    overlay.add(text(this, GAME_WIDTH / 2, 150, 'PAUSADO', 64));
    overlay.add(
      button(this, GAME_WIDTH / 2, 270, 280, 74, '▶  Continuar', 0x06d6a0, () => {
        overlay.destroy();
        this.paused = false;
        this.physics.resume();
        this.tweens.resumeAll();
        this.trail.resume();
      }, 30),
    );
    overlay.add(button(this, GAME_WIDTH / 2, 370, 280, 64, 'Menu', 0x7209b7, () => this.scene.start('Menu')));
  }
}
