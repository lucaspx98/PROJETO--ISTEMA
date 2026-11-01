// Um atendimento: a cliente passa por todas as etapas (rosto, unhas, cabelo).
// Aqui ficam o toque na cena, a ferramenta que segue o dedo, o som ASMR e o progresso.
import * as THREE from 'three';
import { NEON, PALETTES, buildClient, randomClient } from './characters.js';
import { buildSteps } from './steps.js';
import { Particles, makeTool } from './tools3d.js';
import { Sfx, loop } from './audio.js';
import { valueOf } from './shop.js';

const TOUCH_LIFT_PX = 45; // ao arrastar, a ferramenta fica um pouco acima do dedo
const MEASURE_EVERY = 0.2;

export class Session {
  /**
   * hooks: onStep(step, index, total, palette), onProgress(p), onStepDone(step),
   *        onToast(msg), onComplete(result)
   */
  constructor(engine, n, hooks) {
    this.e = engine;
    this.hooks = hooks;
    this.client = randomClient(n);
    this.c = buildClient(this.client);
    engine.scene.add(this.c.root, this.c.hand.root);
    this.fx = new Particles(engine.scene);
    this.ctx = {
      c: this.c,
      fx: this.fx,
      scene: engine.scene,
      tween: (ms, fn, done) => engine.tween(ms, fn, done),
      brush: valueOf('pincel'),
      speed: valueOf('eletrico'),
      deco: valueOf('strass') > 0,
    };
    this.steps = buildSteps(this.ctx);
    this.quality = [];
    this.chosen = {};
    this.i = -1;
    this.raycaster = new THREE.Raycaster();
    this.measureT = 0;
    this.blinkT = 2;

    engine.setBottomInset(190);
    this.ticker = (dt) => this.tick(dt);
    engine.tickers.add(this.ticker);
    // Toques passam primeiro por aqui (captura): se acertar a cliente, a ferramenta age e a câmera não gira
    this.onDown = (ev) => this.pointerDown(ev);
    this.onMove = (ev) => this.pointerMove(ev);
    this.onUp = () => this.pointerUp();
    window.addEventListener('pointerdown', this.onDown, true);
    window.addEventListener('pointermove', this.onMove, true);
    window.addEventListener('pointerup', this.onUp, true);
    window.addEventListener('pointercancel', this.onUp, true);
    this.next();
  }

  get step() {
    return this.steps[this.i];
  }

  palette(step) {
    if (!step.colors) return null;
    return [...PALETTES[step.colors], ...(valueOf('neon') ? NEON : [])];
  }

  // ---------- etapas ----------

  next() {
    this.i += 1;
    const s = this.step;
    if (!s) return this.finishAll();
    this.progress = 0;
    this.completed = false;
    s.setup?.call(s);
    const pal = this.palette(s);
    if (pal) this.chooseColor(pal[0], true);
    this.e.view(s.view);
    this.setTool(s.tool, s.toolTint ?? s.color);
    this.hooks.onStep(s, this.i, this.steps.length, pal);
  }

  chooseColor(c, silent = false) {
    const s = this.step;
    s.color = c.hex;
    s.colorName = c.name;
    this.chosen[s.colors] = c.name;
    if (!silent) s.onColor?.call(s);
    this.tool?.tint(c.hex);
    if (!silent) Sfx.click();
  }

  completeStep(quality = 1) {
    if (this.completed) return;
    this.completed = true;
    this.quality[this.i] = quality;
    this.endStroke();
    this.step.finish?.call(this.step);
    Sfx.stepDone();
    const at = this.e.controls.target.clone();
    this.fx.spawn('brilho', at, new THREE.Vector3(0, 0.05, 0.02), 14, 0.12);
    this.hooks.onStepDone(this.step);
    setTimeout(() => this.next(), 900);
  }

  /** Botão "Pronto": aceita a etapa quase terminada (a nota leva em conta o quanto faltou). */
  finishEarly() {
    if (this.progress >= 0.75) this.completeStep(this.progress);
  }

  skip() {
    this.completeStep(0.5);
  }

  finishAll() {
    this.setTool(null);
    this.c.towel.visible = false;
    this.c.hairGroup.visible = true;
    this.e.setBottomInset(0);
    this.e.view({ target: [0, -0.02, 0], dist: 0.55, az: 0, polar: 1.45, free: true }, 900);
    setTimeout(() => (this.e.controls.autoRotate = true), 950);
    this.e.controls.autoRotateSpeed = 2.5;
    const want = this.client.want;
    const keys = ['blush', 'lips', 'nails', 'hair'];
    const matches = keys.filter((k) => this.chosen[k] === want[k].name).length;
    const quality = this.quality.reduce((a, b) => a + b, 0) / this.quality.length;
    const score = 0.65 * (matches / keys.length) + 0.35 * quality;
    const stars = score >= 0.92 ? 3 : score >= 0.65 ? 2 : 1;
    const tip = Math.round((10 + Math.random() * 25 + stars * 15) * valueOf('decoracao'));
    Sfx.done();
    for (let i = 0; i < 4; i++) setTimeout(() => this.fx.spawn('brilho', new THREE.Vector3(0, 0.05, 0.05), new THREE.Vector3(0, 0.08, 0.04), 18, 0.25), i * 250);
    setTimeout(() => this.hooks.onComplete({ stars, matches, quality, tip, client: this.client, chosen: this.chosen }), 1600);
  }

  // ---------- ferramenta ----------

  setTool(id, tint) {
    if (this.tool) this.e.scene.remove(this.tool.group);
    this.tool = id ? makeTool(id) : null;
    if (!this.tool) return;
    if (tint) this.tool.tint(tint);
    this.tool.group.visible = false;
    this.e.scene.add(this.tool.group);
  }

  placeTool(hit) {
    if (!this.tool) return;
    const g = this.tool.group;
    const toCam = this.e.camera.position.clone().sub(hit.point).normalize();
    const up = hit.normal.clone().multiplyScalar(0.55).add(toCam.multiplyScalar(0.45)).normalize();
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    g.position.copy(hit.point).addScaledVector(up, this.tool.offset);
    g.visible = true;
  }

  // ---------- toque ----------

  raycast(x, y) {
    const ndc = new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.e.camera);
    const targets = this.step.targets().filter((o) => o.visible !== false);
    const h = this.raycaster.intersectObjects(targets, false)[0];
    if (!h) return null;
    const normal = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : toCamera(this.e.camera, h.point);
    return { object: h.object, point: h.point, uv: h.uv?.clone(), normal };
  }

  pointerDown(ev) {
    const s = this.step;
    if (!s || this.completed || ev.target !== this.e.canvas) return;
    const lift = ev.pointerType === 'mouse' || s.kind === 'tap' ? 0 : TOUCH_LIFT_PX;
    const hit = this.raycast(ev.clientX, ev.clientY - lift);
    if (!hit) return; // fora da cliente: deixa a câmera girar
    ev.stopPropagation();
    ev.preventDefault();
    this.e.controls.enabled = false;
    if (s.kind === 'tap') {
      this.placeTool(hit);
      const g = this.tool?.group;
      if (g) {
        const base = g.position.clone();
        this.e.tween(160, (k) => g.position.copy(base).addScaledVector(hit.normal, 0.004 * Math.sin(k * Math.PI)));
      }
      if (!s.tap.call(s, hit)) Sfx.click();
      this.e.controls.enabled = true;
      this.measureT = 0;
      return;
    }
    this.stroke = { prev: null, x: ev.clientX, y: ev.clientY, t: performance.now(), lift, intensity: 0 };
    this.sound = loop(s.sound);
    this.brush(hit, 0, 0.016);
  }

  pointerMove(ev) {
    const st = this.stroke;
    if (!st || this.completed) return;
    const now = performance.now();
    const dt = Math.max(0.001, (now - st.t) / 1000);
    const speed = Math.hypot(ev.clientX - st.x, ev.clientY - st.y) / dt;
    st.intensity = Math.min(1, speed / 900);
    st.x = ev.clientX;
    st.y = ev.clientY;
    st.t = now;
    const hit = this.raycast(ev.clientX, ev.clientY - st.lift);
    if (!hit) {
      st.prev = null;
      return;
    }
    this.brush(hit, st.intensity, dt);
  }

  brush(hit, intensity, dt) {
    const s = this.step;
    s.brush.call(s, hit, this.stroke.prev, Math.max(0.15, intensity), dt);
    this.stroke.prev = hit;
    this.placeTool(hit);
  }

  endStroke() {
    if (this.stroke) this.stroke = null;
    this.sound?.stop();
    this.sound = null;
    if (this.tool) this.tool.group.visible = false;
    this.e.controls.enabled = true;
  }

  pointerUp() {
    if (!this.stroke) return;
    this.endStroke();
    this.measureT = 0;
  }

  // ---------- loop ----------

  tick(dt) {
    this.fx.update(dt);
    const c = this.c;
    c.face.update();
    c.lips.update();
    c.hand.nails.forEach((n) => n.surface.update());
    c.hair.forEach((h) => h.surface.update());

    if (this.stroke) {
      // som segue a velocidade do dedo; parado, vai sumindo
      this.stroke.intensity *= 0.9;
      this.sound?.set(this.stroke.intensity);
    }

    // piscar
    this.blinkT -= dt;
    if (this.blinkT <= 0) {
      this.blinkT = 2.5 + Math.random() * 3;
      this.e.tween(180, (k) => c.eyes.forEach((eye) => (eye.scale.y = Math.max(0.1, Math.abs(1 - 2 * k)))));
    }

    const s = this.step;
    if (!s || this.completed) return;
    this.measureT -= dt;
    if (this.measureT <= 0) {
      this.measureT = MEASURE_EVERY;
      this.progress = Math.max(0, Math.min(1, s.measure.call(s)));
      this.hooks.onProgress(this.progress);
      if (this.progress >= 1) this.completeStep(1);
    }
  }

  dispose() {
    this.endStroke();
    this.e.tickers.delete(this.ticker);
    window.removeEventListener('pointerdown', this.onDown, true);
    window.removeEventListener('pointermove', this.onMove, true);
    window.removeEventListener('pointerup', this.onUp, true);
    window.removeEventListener('pointercancel', this.onUp, true);
    this.setTool(null);
    this.fx.clear();
    this.c.gems.forEach((g) => this.e.scene.remove(g));
    this.steps.forEach((s) => s.foam?.forEach((b) => this.e.scene.remove(b)));
    this.e.scene.remove(this.c.root, this.c.hand.root);
    this.e.controls.autoRotate = false;
    this.e.controls.enabled = true;
    this.e.setBottomInset(0);
  }
}

function toCamera(camera, p) {
  return camera.position.clone().sub(p).normalize();
}

/** Cliente de vitrine para o menu (pronta, sem etapas). */
export function showcaseClient(engine) {
  const client = randomClient(0);
  client.blackheads = 0;
  client.pimples = 0;
  client.strays = 0;
  const c = buildClient(client);
  c.face.clear('dirt');
  c.towel.visible = false;
  c.hairGroup.visible = true;
  c.hair.forEach((h) => {
    h.surface.clear('wet');
    h.surface.dab('dye', 0.5, 0.5, 2, '255,95,162', 1);
    h.surface.update();
  });
  c.lips.add('lipstick', 'source-over', 0.9);
  c.lips.dab('lipstick', 0.5, 0.5, 2, '231,93,143', 1);
  c.lips.update();
  c.face.update();
  engine.scene.add(c.root);
  engine.view({ target: [0, 0.035, 0], dist: 0.62, az: 0.35, polar: 1.42, free: true }, 0);
  engine.controls.autoRotate = true;
  engine.controls.autoRotateSpeed = 1.2;
  let t = 0;
  const tick = (dt) => {
    t -= dt;
    if (t <= 0) {
      t = 3 + Math.random() * 2;
      engine.tween(180, (k) => c.eyes.forEach((eye) => (eye.scale.y = Math.max(0.1, Math.abs(1 - 2 * k)))));
    }
  };
  engine.tickers.add(tick);
  return () => {
    engine.tickers.delete(tick);
    engine.scene.remove(c.root);
    engine.controls.autoRotate = false;
  };
}
