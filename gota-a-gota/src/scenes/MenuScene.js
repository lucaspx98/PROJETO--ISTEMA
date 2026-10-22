import Phaser from 'phaser';
import { GAME_WIDTH, WIPE_RADIUS } from '../config.js';
import { Save } from '../storage.js';
import { Sfx, WipeSound } from '../audio.js';
import { Ads } from '../ads.js';
import { Music } from '../music.js';
import { GLASS_BOTTOM, GLASS_TOP, Sim } from '../sim.js';
import { Glass } from '../glass.js';
import { button, coinCounter, text } from '../ui.js';

const COLORS = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [0, 1, 1], [1, 0, 1]];

/** Menu em cima de um vidro embaçado de verdade: dá para desembaçar e ver gotas escorrendo. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    Ads.showBanner();
    this.sim = new Sim({ jars: [], drops: [], walls: [], regrow: 0.12 });
    this.glass = new Glass(this, this.sim, Save.get('theme'));
    for (let i = 0; i < 6; i++) this.spawnDrop();
    this.time.addEvent({ delay: 1400, loop: true, callback: () => this.autoTrail() });
    this.time.addEvent({ delay: 2500, loop: true, callback: () => this.sim.drops.length < 8 && this.spawnDrop() });

    const title = text(this, GAME_WIDTH / 2, 200, 'GOTA', 84, '#ffffff').setDepth(20);
    title.setStroke('#3a86ff', 14);
    const sub = text(this, GAME_WIDTH / 2, 285, 'A GOTA', 64, '#ffd23f').setDepth(20);
    sub.setStroke('#ef476f', 12);
    this.tweens.add({ targets: [title, sub], y: '+=6', duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    text(this, GAME_WIDTH / 2, 352, 'passe o dedo no vidro', 22, '#ffffff').setDepth(20).setAlpha(0.85);

    button(this, GAME_WIDTH / 2, 470, 360, 104, '▶  JOGAR', 0x06d6a0, () => this.play('Arcade'), 46);
    if (Save.get('best') > 0) text(this, GAME_WIDTH / 2, 545, `Recorde: ${Save.get('best')}`, 24, '#ffd23f').setDepth(20);
    button(this, GAME_WIDTH / 2 - 88, 625, 166, 64, `Fases (${Save.get('level')})`, 0x3a86ff, () => this.play('Game'), 22);
    button(this, GAME_WIDTH / 2 + 88, 625, 166, 64, 'Vistas', 0x5a4fcf, () => this.scene.start('Shop'), 22);
    const opts = [
      ['muted', 'Sons', () => Save.toggle('muted')],
      ['musicOff', 'Música', () => Music.toggle()],
      ['vibrationOff', 'Vibrar', () => Save.toggle('vibrationOff')],
    ];
    opts.forEach(([key, name, fn], i) => {
      const label = () => `${name}: ${Save.get(key) ? 'não' : 'sim'}`;
      const b = button(this, GAME_WIDTH / 2 + (i - 1) * 172, 725, 160, 58, label(), 0x3a86ff, () => {
        fn();
        b.label.setText(label());
      }, 20);
    });
    const cc = coinCounter(this, 34, 40, Save.get('coins'));
    cc.objects.forEach((o) => o.setDepth(20));

    Music.start();
    // Desembaçar por diversão no menu
    this.input.on('pointerdown', (p, over) => {
      if (over.length) return;
      this.last = { x: p.x, y: p.y };
      WipeSound.start();
    });
    this.input.on('pointermove', (p) => {
      if (!p.isDown || !this.last) return;
      const removed = this.sim.wipe(this.last.x, this.last.y, p.x, p.y, WIPE_RADIUS);
      WipeSound.set(removed > 0.5 ? Math.min(1, Math.hypot(p.x - this.last.x, p.y - this.last.y) / 30) : 0);
      this.last = { x: p.x, y: p.y };
    });
    const stop = () => {
      this.last = null;
      WipeSound.stop();
    };
    this.input.on('pointerup', stop);
    this.events.once('shutdown', stop);
    this.input.keyboard?.once('keydown-SPACE', () => this.play('Arcade'));
  }

  spawnDrop() {
    const x = 30 + Math.random() * 480;
    const y = GLASS_TOP + 20 + Math.random() * 300;
    const pig = COLORS[Math.floor(Math.random() * COLORS.length)].slice();
    this.sim.addDrop(x, y, pig, []);
  }

  /** De vez em quando uma gota abre caminho sozinha, como na chuva de verdade. */
  autoTrail() {
    const still = this.sim.drops.filter((d) => !d.moving);
    if (!still.length) return;
    const d = still[Math.floor(Math.random() * still.length)];
    let x = d.x;
    let y = d.y;
    while (y < GLASS_BOTTOM) {
      const nx = Phaser.Math.Clamp(x + (Math.random() - 0.5) * 40, 20, 520);
      this.sim.wipe(x, y, nx, y + 30, 9);
      x = nx;
      y += 30;
    }
  }

  update(_, dtMs) {
    this.sim.step(dtMs / 1000);
    this.glass.update(dtMs / 1000);
    this.sim.events.length = 0;
  }

  play(mode) {
    Sfx.unlock();
    this.scene.start(mode);
  }
}
