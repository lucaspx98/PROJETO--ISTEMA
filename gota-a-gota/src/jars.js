// Parapeito da janela com os potes embaixo do vidro (usado nas fases e no arcade).
import { BANNER_SPACE, GAME_HEIGHT, GAME_WIDTH } from './config.js';
import { GLASS_BOTTOM } from './sim.js';
import { pigmentToRgb } from './colors.js';
import { text } from './ui.js';

const SILL_H = 18;
export const JAR_TOP = GLASS_BOTTOM + SILL_H + 2;
export const JAR_H = GAME_HEIGHT - BANNER_SPACE - JAR_TOP - 4;
export const PRIMARY = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map(pigmentToRgb);

/** Posiciona `n` potes lado a lado. */
export function layoutJars(jars) {
  const n = jars.length;
  jars.forEach((j, i) => {
    j.x = 270 + (i - (n - 1) / 2) * (480 / n);
    j.w = Math.min(110, 480 / n - 14);
  });
}

export class JarRow {
  constructor(scene, sim) {
    this.scene = scene;
    this.sim = sim;
    this.views = [];
    this.build();
  }

  build() {
    const { scene } = this;
    this.sill?.destroy();
    this.floor?.destroy();
    this.views.forEach((v) => v.c.destroy());
    const g = scene.add.graphics().setDepth(8);
    g.fillStyle(0xc9b79f, 1);
    g.fillRect(0, GLASS_BOTTOM, GAME_WIDTH, SILL_H);
    g.fillStyle(0xf1e6d6, 1);
    g.fillRect(0, GLASS_BOTTOM, GAME_WIDTH, 7);
    // Aberturas da moldura em cima de cada pote
    this.sim.jars.forEach((j) => {
      g.fillStyle(0x3b3024, 1);
      g.fillRoundedRect(j.x - j.w / 2 + 6, GLASS_BOTTOM, j.w - 12, SILL_H - 4, 4);
    });
    this.sill = g;
    this.floor = scene.add.rectangle(0, GLASS_BOTTOM + SILL_H, GAME_WIDTH, GAME_HEIGHT - GLASS_BOTTOM - SILL_H, 0x141b3a, 1).setOrigin(0).setDepth(7);
    this.views = this.sim.jars.map((j) => this.makeView(j));
  }

  makeView(j) {
    const { scene } = this;
    const c = scene.add.container(j.x, JAR_TOP).setDepth(9);
    const w = j.w - 10;
    const color = pigmentToRgb(j.pig);
    const ghost = scene.add.graphics();
    ghost.fillStyle(color, 0.22);
    ghost.fillRoundedRect(-w / 2, 0, w, JAR_H, 12);
    const liquid = scene.add.graphics();
    const glass = scene.add.graphics();
    glass.lineStyle(3, 0xffffff, 0.7);
    glass.strokeRoundedRect(-w / 2, 0, w, JAR_H, 12);
    glass.fillStyle(0xffffff, 0.25);
    glass.fillRoundedRect(-w / 2 + 6, 6, 6, JAR_H - 16, 3);
    // Receita: bolinhas das cores primárias que formam a cor do pote
    const dots = [];
    j.pig.forEach((n, k) => {
      for (let i = 0; i < n; i++) dots.push(PRIMARY[k]);
    });
    const recipe = scene.add.container(0, JAR_H / 2);
    dots.forEach((col, i) => {
      const dx = (i - (dots.length - 1) / 2) * 24;
      if (i > 0) recipe.add(text(scene, dx - 12, 0, '+', 16));
      recipe.add(scene.add.circle(dx, 0, 9, col).setStrokeStyle(2, 0xffffff, 0.9));
    });
    c.add([ghost, liquid, glass, recipe]);
    const view = { c, liquid, recipe, w, color, shown: 0 };
    if (j.filled) {
      view.shown = j.filled / j.units;
      this.drawLiquid(view);
    }
    return view;
  }

  viewOf(jar) {
    return this.views[this.sim.jars.indexOf(jar)];
  }

  /** Troca o pedido de um pote (arcade): o pote antigo some e o novo aparece com um pulo. */
  replace(jar) {
    const i = this.sim.jars.indexOf(jar);
    const old = this.views[i];
    this.scene.tweens.add({ targets: old.c, y: JAR_TOP + 40, alpha: 0, duration: 160, onComplete: () => old.c.destroy() });
    const view = this.makeView(jar);
    view.c.setScale(0.3).setAlpha(0);
    this.scene.tweens.add({ targets: view.c, scale: 1, alpha: 1, duration: 320, delay: 140, ease: 'Back.out' });
    this.views[i] = view;
  }

  /**
   * Gota sai do vidro e cai no pote; `onLanded` roda quando ela chega no líquido.
   * `level` é quanto o pote fica cheio (0..1); por padrão vem do próprio pote.
   */
  dropInto(d, jar, color, onLanded, level = Math.min(1, jar.filled / jar.units)) {
    const { scene } = this;
    const view = this.viewOf(jar);
    const body = scene.add.image(d.x, GLASS_BOTTOM, 'drop-body').setTint(color).setScale(d.r / 32).setDepth(10);
    scene.tweens.add({
      targets: body,
      x: jar.x,
      y: JAR_TOP + JAR_H * 0.6,
      scaleY: (d.r / 32) * 1.3,
      duration: 200,
      ease: 'Quad.in',
      onComplete: () => {
        body.destroy();
        view.recipe.setVisible(false);
        scene.tweens.add({ targets: view, shown: level, duration: 400, ease: 'Sine.out', onUpdate: () => this.drawLiquid(view) });
        onLanded(view);
      },
    });
  }

  drawLiquid(view) {
    if (!view.liquid.active) return; // pote redesenhado no meio da animação
    const h = (JAR_H - 6) * view.shown;
    view.liquid.clear();
    view.liquid.fillStyle(view.color, 1);
    view.liquid.fillRoundedRect(-view.w / 2 + 3, JAR_H - 3 - h, view.w - 6, h, Math.min(10, h / 2));
    view.liquid.fillStyle(0xffffff, 0.3);
    view.liquid.fillRect(-view.w / 2 + 8, JAR_H - 3 - h + 2, view.w - 16, Math.min(3, h));
  }

  shake(jar) {
    const view = this.viewOf(jar);
    this.scene.tweens.add({ targets: view.c, x: jar.x + 6, duration: 45, yoyo: true, repeat: 3, onComplete: () => (view.c.x = jar.x) });
  }

  bounce(jar) {
    this.scene.tweens.add({ targets: this.viewOf(jar).c, scale: 1.15, duration: 110, yoyo: true, ease: 'Quad.out' });
  }
}
