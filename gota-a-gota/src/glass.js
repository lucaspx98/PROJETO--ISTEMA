// Desenha uma simulação (sim.js): paisagem, névoa, prateleiras, moldura e gotas.
import Phaser from 'phaser';
import { CELL, COLS, GLASS_BOTTOM, GLASS_TOP, ROWS } from './sim.js';
import { pigmentToRgb } from './colors.js';
import { DROP_TEX_R, viewKey } from './textures.js';
import { GAME_WIDTH } from './config.js';

const FOG_UP = 3;
const WOOD = 0xf1e6d6;
const WOOD_DARK = 0xc9b79f;

export class Glass {
  constructor(scene, sim, viewId) {
    this.scene = scene;
    this.sim = sim;
    scene.add.image(0, 0, viewKey(scene, viewId)).setOrigin(0);

    // Névoa: 1 pixel por célula num canvas pequeno, desenhado ampliado e desfocado = borda macia.
    this.small = document.createElement('canvas');
    this.small.width = COLS;
    this.small.height = ROWS;
    this.smallCtx = this.small.getContext('2d');
    this.img = this.smallCtx.createImageData(COLS, ROWS);
    const key = `fog-${Math.random().toString(36).slice(2)}`;
    this.fogTex = scene.textures.createCanvas(key, COLS * FOG_UP, ROWS * FOG_UP);
    this.fogCtx = this.fogTex.getContext();
    // Granulado fixo deixa a névoa com cara de vapor de verdade
    this.grain = new Float32Array(COLS * ROWS).map(() => Math.random() * 16 - 8);
    this.fogImage = scene.add.image(0, GLASS_TOP, key).setOrigin(0).setScale(CELL / FOG_UP).setDepth(2);
    scene.events.once('shutdown', () => scene.textures.remove(key));

    this.drawWalls();
    this.dropSprites = new Map();
    this.t = 0;
    this.update(0);
  }

  drawWalls() {
    const g = this.scene.add.graphics().setDepth(4);
    // Moldura da janela
    g.fillStyle(WOOD_DARK, 1);
    g.fillRect(0, GLASS_TOP - 14, GAME_WIDTH, 14);
    g.fillRect(0, GLASS_TOP, CELL, ROWS * CELL);
    g.fillRect(GAME_WIDTH - CELL, GLASS_TOP, CELL, ROWS * CELL);
    g.fillStyle(WOOD, 1);
    g.fillRect(0, GLASS_TOP - 16, GAME_WIDTH, 10);
    // Prateleiras
    const done = new Set();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!this.sim.isWall(c, r) || done.has(`${c},${r}`)) continue;
        let len = 0;
        while (this.sim.isWall(c + len, r)) done.add(`${c + len++},${r}`);
        for (let k = 0; k < len; k++) done.add(`${c + k},${r + 1}`);
        const x = c * CELL;
        const y = GLASS_TOP + r * CELL;
        g.fillStyle(0x000000, 0.3);
        g.fillRoundedRect(x, y + 5, len * CELL, CELL * 2, 4);
        g.fillStyle(WOOD_DARK, 1);
        g.fillRoundedRect(x, y, len * CELL, CELL * 2, 4);
        g.fillStyle(WOOD, 1);
        g.fillRoundedRect(x, y, len * CELL, CELL, 3);
      }
    }
  }

  dropSprite(d) {
    let s = this.dropSprites.get(d.id);
    if (!s) {
      const body = this.scene.add.image(d.x, d.y, 'drop-body').setDepth(5);
      const shine = this.scene.add.image(d.x, d.y, 'drop-shine').setDepth(6);
      s = { body, shine, units: 0 };
      this.dropSprites.set(d.id, s);
      // Gota aparece com um "plop"
      [body, shine].forEach((o) => o.setScale(0));
    }
    return s;
  }

  update(dt) {
    const { fog } = this.sim;
    const data = this.img.data;
    for (let i = 0; i < fog.length; i++) {
      const p = i * 4;
      if (this.sim.wall[i]) {
        data[p + 3] = 0;
        continue;
      }
      const n = this.grain[i];
      data[p] = 228 + n;
      data[p + 1] = 235 + n;
      data[p + 2] = 242 + n;
      data[p + 3] = fog[i] * 205;
    }
    this.smallCtx.putImageData(this.img, 0, 0);
    const ctx = this.fogCtx;
    ctx.clearRect(0, 0, COLS * FOG_UP, ROWS * FOG_UP);
    ctx.filter = 'blur(2px)';
    ctx.drawImage(this.small, 0, 0, COLS * FOG_UP, ROWS * FOG_UP);
    ctx.filter = 'none';
    this.fogTex.refresh();

    this.t += dt;
    const alive = new Set();
    for (const d of this.sim.drops) {
      alive.add(d.id);
      const s = this.dropSprite(d);
      if (d.golden) {
        // Dourada: brilho pulsando
        const k = 0.5 + 0.5 * Math.sin(this.t * 8 + d.id);
        s.body.setTint(Phaser.Display.Color.GetColor(255, 200 + 40 * k, 40 + 80 * k));
      } else if (d.wild) {
        // Coringa: arco-íris girando
        s.body.setTint(Phaser.Display.Color.HSVToRGB((this.t * 0.6 + d.id * 0.13) % 1, 0.65, 1).color);
      } else if (s.units !== d.units) {
        s.units = d.units;
        s.body.setTint(pigmentToRgb(d.pig));
      }
      const base = d.r / DROP_TEX_R;
      // Esticada quando escorre, redondinha parada
      const stretch = d.moving ? Math.min(d.speed / 900, 0.3) : d.creeping ? 0.08 : 0;
      const pulse = d.golden ? 1 + 0.08 * Math.sin(this.t * 10) : 1;
      s.target = base;
      s.cur = s.cur === undefined ? 0 : s.cur + (base - s.cur) * Math.min(1, dt * 12);
      [s.body, s.shine].forEach((o) => {
        o.setPosition(d.x, d.y - d.r * stretch * 0.5);
        o.setScale(s.cur * pulse * (1 - stretch * 0.4), s.cur * pulse * (1 + stretch));
      });
    }
    for (const [id, s] of this.dropSprites) {
      if (!alive.has(id)) {
        s.body.destroy();
        s.shine.destroy();
        this.dropSprites.delete(id);
      }
    }
  }

  /** "Pulinho" de uma gota (ao se juntar com outra). */
  pop(d) {
    const s = this.dropSprites.get(d.id);
    if (s) s.cur *= 1.35;
  }
}

export { GLASS_BOTTOM, GLASS_TOP };
