// Uma partida (uma fase): peças na bandeja, arrastar até o contorno, encaixar e parafusar.
import * as THREE from 'three';
import { M } from './materials.js';
import { box, cyl, group } from './geo.js';
import { ease } from './engine.js';
import { Sfx } from './audio.js';
import { thumbnail } from './thumbs.js';

const UP = new THREE.Vector3(0, 1, 0);
const TOUCH_LIFT_PX = 70; // a peça fica acima do dedo para não ficar escondida
const TAP_RADIUS_PX = 52;

/** Monta a peça e centraliza: a origem do grupo vira o centro da peça; o alvo é onde ela encaixa. */
function buildPart(def) {
  const g = new THREE.Group();
  g.add(def.build());
  g.updateMatrixWorld(true);
  const center = new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3());
  g.children.forEach((c) => c.position.sub(center));
  g.position.copy(center);
  const spinners = [];
  g.traverse((o) => o.userData.spin && spinners.push(o));
  return { def, group: g, target: center.clone(), placed: false, spinners };
}

function ghostOf(obj) {
  const g = obj.clone(true);
  g.traverse((o) => {
    if (o.isMesh) {
      o.material = M.ghost;
      o.castShadow = false;
      o.receiveShadow = false;
      o.renderOrder = 1;
    }
  });
  return g;
}

function setGhostMat(g, mat) {
  g.traverse((o) => o.isMesh && (o.material = mat));
}

/** Monta um objeto já pronto (vitrine do menu). */
export function showcase(engine, level) {
  const root = new THREE.Group();
  if (level.base) root.add(level.base());
  const spinners = [];
  level.parts.forEach((d) => {
    const p = buildPart(d);
    root.add(p.group);
    spinners.push(...p.spinners);
  });
  engine.scene.add(root);
  // Vitrine: objeto um pouco abaixo do centro, para o título caber em cima
  engine.frameView({ ...level, target: [level.target[0], level.target[1] + level.cam.dist * 0.12, level.target[2]] }, level.view?.az ?? 0.7, 1.12);
  engine.controls.autoRotate = true;
  const tick = (dt) => spinners.forEach((s) => (s.rotation.z += s.userData.spin * dt));
  engine.tickers.add(tick);
  return () => {
    engine.tickers.delete(tick);
    engine.scene.remove(root);
    engine.controls.autoRotate = false;
  };
}

export class Play {
  /**
   * hooks: onTray(parts), onProgress(done, total), onToast(msg), onHighlight(id), onComplete(result)
   */
  constructor(engine, level, hooks) {
    this.e = engine;
    this.level = level;
    this.hooks = hooks;
    this.root = new THREE.Group();
    engine.scene.add(this.root);
    if (level.base) this.root.add(level.base());

    this.parts = level.parts.map(buildPart);
    this.parts.forEach((p) => (p.thumb = thumbnail(p.group)));
    this.screws = [];
    this.mistakes = 0;
    this.time = 0;
    this.started = false;
    this.done = false;
    this.held = null;
    this.raycaster = new THREE.Raycaster();

    engine.frameView(level, level.view?.az, level.view?.polar);
    this.ticker = (dt) => this.tick(dt);
    engine.tickers.add(this.ticker);

    // Toque rápido na tela (sem arrastar) = tentar apertar um parafuso
    this.down = null;
    this.onDown = (ev) => (this.down = { x: ev.clientX, y: ev.clientY, t: performance.now() });
    this.onUp = (ev) => {
      const d = this.down;
      this.down = null;
      if (!d || performance.now() - d.t > 400 || Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > 12) return;
      this.tapScrew(ev.clientX, ev.clientY);
    };
    engine.canvas.addEventListener('pointerdown', this.onDown);
    engine.canvas.addEventListener('pointerup', this.onUp);

    this.refresh();
  }

  get total() {
    return this.parts.length + this.level.screws.length;
  }

  get progress() {
    return this.parts.filter((p) => p.placed).length + this.screws.filter((s) => s.done).length;
  }

  refresh() {
    this.hooks.onTray(this.parts.filter((p) => !p.placed));
    this.hooks.onProgress(this.progress, this.total);
  }

  part(id) {
    return this.parts.find((p) => p.def.id === id);
  }

  missing(p) {
    return (p.def.after ?? []).map((id) => this.part(id)).filter((q) => !q.placed);
  }

  // ---------- arrastar peças ----------

  /** Começa a arrastar. Retorna false se a peça ainda não pode ser colocada. */
  beginDrag(id, x, y, touch) {
    if (this.done || this.held) return false;
    const p = this.part(id);
    const miss = this.missing(p);
    if (miss.length) {
      this.mistakes += 1;
      Sfx.wrong();
      const names = [...new Set(miss.map((q) => q.def.name))].join(', ');
      this.hooks.onToast(`Antes, coloque: ${names}`);
      return false;
    }
    this.started = true;
    this.held = p;
    this.lift = touch ? TOUCH_LIFT_PX : 0;
    this.e.controls.enabled = false;
    this.ghost = ghostOf(p.group);
    this.ghost.position.copy(p.target);
    this.root.add(this.ghost, p.group);
    const n = new THREE.Vector3();
    this.e.camera.getWorldDirection(n);
    this.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n.negate(), p.target);
    this.snapping = false;
    this.moveDrag(x, y);
    Sfx.pick();
    return true;
  }

  moveDrag(x, y) {
    const p = this.held;
    if (!p) return;
    const ndc = new THREE.Vector2((x / window.innerWidth) * 2 - 1, -((y - this.lift) / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.e.camera);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.plane, hit)) return;
    const near = hit.distanceTo(p.target) < this.level.snap;
    if (near !== this.snapping) setGhostMat(this.ghost, near ? M.ghostOk : M.ghost);
    this.snapping = near;
    p.group.position.copy(near ? p.target : hit);
  }

  endDrag() {
    const p = this.held;
    if (!p) return;
    this.held = null;
    this.root.remove(this.ghost);
    this.e.controls.enabled = true;
    if (this.snapping) {
      this.place(p);
    } else {
      this.root.remove(p.group);
      this.hooks.onToast('Solte a peça em cima do contorno');
    }
  }

  /** Toque simples numa peça da bandeja: mostra onde ela vai. */
  peek(id) {
    const p = this.part(id);
    if (this.missing(p).length) return this.beginDrag(id, 0, 0, false);
    this.flashGhost(p);
    this.hooks.onToast('Arraste a peça para cima, até o contorno');
    return false;
  }

  flashGhost(p) {
    const g = ghostOf(p.group);
    g.position.copy(p.target);
    this.root.add(g);
    this.e.tween(2200, (k) => g.traverse((o) => o.isMesh && (o.visible = Math.floor(k * 9) % 2 === 0)), () => this.root.remove(g));
  }

  place(p) {
    p.placed = true;
    p.group.position.copy(p.target);
    Sfx.snap();
    this.e.tween(260, (k) => p.group.scale.setScalar(1 + 0.05 * (1 - ease.outCubic(k))));
    this.level.screws.forEach((s, i) => s.after === p.def.id && this.spawnScrew(s, i));
    this.refresh();
    this.checkDone();
  }

  // ---------- parafusos ----------

  spawnScrew(def) {
    const s = this.level.screwSize;
    const head = cyl(0.0075 * s, 0.0072 * s, 0.004 * s, M.chrome, 0, 0, 0, 20);
    const slotA = box(0.011 * s, 0.0015 * s, 0.0016 * s, M.metalBlack, 0, 0.0018 * s, 0);
    const slotB = box(0.0016 * s, 0.0015 * s, 0.011 * s, M.metalBlack, 0, 0.0018 * s, 0);
    const shaft = cyl(0.0028 * s, 0.002 * s, 0.022 * s, M.aluminum, 0, -0.013 * s, 0, 12);
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.012 * s, 0.017 * s, 32),
      new THREE.MeshBasicMaterial({ color: 0xffa94d, transparent: true, opacity: 0.95, depthTest: false, side: THREE.DoubleSide }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.003 * s;
    halo.renderOrder = 10;
    const g = group(head, slotA, slotB, shaft, halo);
    const n = new THREE.Vector3(...def.normal).normalize();
    const pos = new THREE.Vector3(...def.pos);
    const baseQ = new THREE.Quaternion().setFromUnitVectors(UP, n);
    g.quaternion.copy(baseQ);
    const from = pos.clone().addScaledVector(n, 0.02 * s);
    const to = pos.clone().addScaledVector(n, 0.002 * s);
    g.position.copy(from);
    g.scale.setScalar(0.01);
    this.root.add(g);
    this.e.tween(300, (k) => g.scale.setScalar(Math.max(0.01, ease.outBack(k))));
    this.screws.push({ g, halo, baseQ, from, to, done: false, busy: false });
  }

  tapScrew(x, y) {
    if (this.done) return;
    let best = null;
    let bestD = TAP_RADIUS_PX;
    for (const s of this.screws) {
      if (s.done || s.busy) continue;
      const v = s.g.position.clone().project(this.e.camera);
      const sx = ((v.x + 1) / 2) * window.innerWidth;
      const sy = ((1 - v.y) / 2) * window.innerHeight;
      const d = Math.hypot(sx - x, sy - y);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    if (!best) return;
    this.started = true;
    best.busy = true;
    best.g.remove(best.halo);
    Sfx.screw();
    const spin = new THREE.Quaternion();
    this.e.tween(
      650,
      (k) => {
        const e = ease.inOut(k);
        best.g.position.lerpVectors(best.from, best.to, e);
        best.g.quaternion.copy(best.baseQ).multiply(spin.setFromAxisAngle(UP, e * Math.PI * 8));
      },
      () => {
        best.done = true;
        this.refresh();
        this.checkDone();
      },
    );
  }

  // ---------- dica / fim ----------

  hint() {
    const next = this.parts.find((p) => !p.placed && !this.missing(p).length);
    if (next) {
      this.hooks.onHighlight(next.def.id);
      this.flashGhost(next);
      this.hooks.onToast(`Próxima peça: ${next.def.name}`);
    } else if (this.screws.some((s) => !s.done)) {
      this.hooks.onToast('Toque nos parafusos laranja para apertar');
    }
  }

  checkDone() {
    if (this.done) return;
    if (this.parts.some((p) => !p.placed)) return;
    if (this.screws.length < this.level.screws.length || this.screws.some((s) => !s.done)) return;
    this.done = true;
    Sfx.done();
    this.e.controls.autoRotate = true;
    const stars = this.mistakes <= 1 ? 3 : this.mistakes <= 4 ? 2 : 1;
    setTimeout(() => this.hooks.onComplete({ stars, time: this.time, mistakes: this.mistakes }), 900);
  }

  tick(dt) {
    if (this.started && !this.done) this.time += dt;
    // Anel do parafuso com tamanho constante na tela, para ser fácil de achar e tocar
    const pulse = 1 + 0.2 * Math.sin(performance.now() / 160);
    const cam = this.e.camera.position;
    this.screws.forEach((s) => {
      if (!s.busy) s.halo.scale.setScalar((cam.distanceTo(s.g.position) * 0.026 * pulse) / (0.017 * this.level.screwSize));
    });
    this.parts.forEach((p) => p.placed && p.spinners.forEach((o) => (o.rotation.z += o.userData.spin * dt)));
  }

  dispose() {
    this.e.tickers.delete(this.ticker);
    this.e.canvas.removeEventListener('pointerdown', this.onDown);
    this.e.canvas.removeEventListener('pointerup', this.onUp);
    this.e.scene.remove(this.root);
    this.e.controls.autoRotate = false;
    this.e.controls.enabled = true;
    this.root.traverse((o) => o.geometry?.dispose());
  }
}
