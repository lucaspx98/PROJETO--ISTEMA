// Uma partida (uma fase): encaixar peças, martelar/pressionar o que precisa,
// colocar parafusos e pregos nos furos e apertar com a ferramenta certa.
import * as THREE from 'three';
import { M } from './materials.js';
import { ease } from './engine.js';
import { Sfx } from './audio.js';
import { thumbnail } from './thumbs.js';
import { tr } from './i18n.js';
import { DRILL_TURNS, TOOLS, nailModel, screwModel, thumbScrewModel, toolLevel, toolModel } from './tools.js';

const UP = new THREE.Vector3(0, 1, 0);
const TOUCH_LIFT_PX = 70; // a peça fica acima do dedo para não ficar escondida
const PICK_RADIUS_PX = 56;
const NAIL_BASE_HITS = 5;

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
  return { def, group: g, target: center.clone(), placed: false, seated: false, spinners };
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

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

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
   * hooks: onTray(items, play), onProgress(done, total), onToast(msg), onHighlight(id),
   *        onRing(state|null), getTool(), onComplete(result)
   */
  constructor(engine, level, hooks) {
    this.e = engine;
    this.level = level;
    this.hooks = hooks;
    this.s = level.screwSize;
    this.root = new THREE.Group();
    engine.scene.add(this.root);
    if (level.base) this.root.add(level.base());

    this.parts = level.parts.map(buildPart);
    this.parts.forEach((p) => (p.thumb = thumbnail(p.group)));
    this.fasteners = [];
    this.fastenerThumbs = {
      screw: thumbnail(screwModel(1)),
      thumb: thumbnail(thumbScrewModel(1)),
      nail: thumbnail(nailModel(1)),
    };
    this.mistakes = 0;
    this.time = 0;
    this.started = false;
    this.done = false;
    this.held = null;
    this.action = null; // { kind: 'turn' | 'drill', f, ... }
    this.told = new Set();
    this.raycaster = new THREE.Raycaster();
    this.toolMesh = null;
    this.toolHideAt = 0;

    engine.setBottomInset(150);
    engine.frameView(level, level.view?.az, level.view?.polar);
    this.ticker = (dt) => this.tick(dt);
    engine.tickers.add(this.ticker);

    // Toques na cena passam primeiro por aqui (fase de captura), antes da câmera orbital:
    // se o toque for numa peça/parafuso/prego, a ferramenta age e a câmera não gira.
    this.onDown = (ev) => this.pointerDown(ev);
    this.onMove = (ev) => this.pointerMove(ev);
    this.onUp = () => this.pointerUp();
    window.addEventListener('pointerdown', this.onDown, true);
    window.addEventListener('pointermove', this.onMove, true);
    window.addEventListener('pointerup', this.onUp, true);
    window.addEventListener('pointercancel', this.onUp, true);

    this.refresh();
  }

  // ---------- estado ----------

  get total() {
    const presses = this.parts.filter((p) => p.def.press).length;
    return this.parts.length + presses + this.level.screws.length;
  }

  get progress() {
    return (
      this.parts.filter((p) => p.placed).length +
      this.parts.filter((p) => p.def.press && p.seated).length +
      this.fasteners.filter((f) => f.state === 'done').length
    );
  }

  /** Itens da bandeja: peças ainda não colocadas + parafusos/pregos para os furos abertos. */
  trayItems() {
    const items = this.parts
      .filter((p) => !p.placed)
      .map((p) => ({ kind: 'part', id: p.def.id, name: p.def.name, thumb: p.thumb, blocked: this.missing(p).length > 0 }));
    const holes = { screw: 0, thumb: 0, nail: 0 };
    this.fasteners.forEach((f) => f.state === 'hole' && (holes[f.kind] += 1));
    const names = { screw: 'Parafuso', thumb: 'Parafuso de dedo', nail: 'Prego' };
    Object.entries(holes).forEach(([kind, n]) => {
      if (n) items.unshift({ kind, id: kind, name: names[kind], thumb: this.fastenerThumbs[kind], count: n });
    });
    return items;
  }

  refresh() {
    this.hooks.onTray(this.trayItems(), this);
    this.hooks.onProgress(this.progress, this.total);
  }

  part(id) {
    return this.parts.find((p) => p.def.id === id);
  }

  missing(p) {
    return (p.def.after ?? []).map((id) => this.part(id)).filter((q) => !q.seated);
  }

  mistake(msg) {
    this.mistakes += 1;
    Sfx.wrong();
    this.hooks.onToast(msg);
  }

  tellOnce(key, msg) {
    if (this.told.has(key)) return;
    this.told.add(key);
    this.hooks.onToast(msg);
  }

  // ---------- arrastar peças ----------

  /** Começa a arrastar. Retorna false se a peça ainda não pode ser colocada. */
  beginDrag(id, x, y, touch) {
    if (this.done || this.held) return false;
    const p = this.part(id);
    const miss = this.missing(p);
    if (miss.length) {
      const names = [...new Set(miss.map((q) => tr(q.def.name)))].join(', ');
      this.mistake(tr(miss.some((q) => q.placed) ? 'Termine de prender: {x}' : 'Antes, coloque: {x}', { x: names }));
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

  /** Toque simples num item da bandeja: explica o que fazer. */
  peek(id) {
    if (id === 'screw' || id === 'thumb') return this.hooks.onToast('Arraste o parafuso até um furo laranja');
    if (id === 'nail') return this.hooks.onToast('Arraste o prego até um furo laranja');
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
    const press = p.def.press;
    if (press) {
      // A peça fica "solta", um pouco fora do lugar, até ser martelada/pressionada
      p.pressDir = new THREE.Vector3(...(press.dir ?? [0, -1, 0])).normalize();
      p.pressDist = press.dist ?? 0.03 * this.s;
      p.hitsTotal =
        press.tool === 'martelo' ? Math.max(1, Math.round(press.hits * TOOLS.martelo.mult[toolLevel('martelo') - 1])) : press.hits;
      p.hitsLeft = p.hitsTotal;
      p.group.position.addScaledVector(p.pressDir, -p.pressDist);
      this.hooks.onToast(
        press.tool === 'martelo'
          ? tr('Pegue o martelo 🔨 e bata: {x}', { x: tr(p.def.name) })
          : tr('Pressione com a mão 🖐️ até encaixar: {x}', { x: tr(p.def.name) }),
      );
    } else {
      this.seat(p);
    }
    this.refresh();
  }

  seat(p) {
    p.seated = true;
    p.group.position.copy(p.target);
    this.level.screws.forEach((f) => f.after === p.def.id && this.spawnHole(f));
    if (this.fasteners.some((f) => f.state === 'hole')) this.tellOnce('holes', 'Arraste um parafuso da bandeja até o furo laranja');
    this.refresh();
    this.checkDone();
  }

  // ---------- parafusos e pregos ----------

  spawnHole(def) {
    const kind = def.type === 'nail' ? 'nail' : def.thumb ? 'thumb' : 'screw';
    const n = new THREE.Vector3(...def.normal).normalize();
    const pos = new THREE.Vector3(...def.pos);
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 1, 32),
      new THREE.MeshBasicMaterial({ color: 0xff922b, transparent: true, opacity: 0.95, depthTest: false, side: THREE.DoubleSide }),
    );
    halo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    halo.position.copy(pos).addScaledVector(n, 0.001);
    halo.renderOrder = 10;
    this.root.add(halo);
    const len = kind === 'nail' ? 0.03 : kind === 'thumb' ? 0.016 : 0.022;
    this.fasteners.push({
      def,
      kind,
      n,
      pos,
      halo,
      baseQ: new THREE.Quaternion().setFromUnitVectors(UP, n),
      from: pos.clone().addScaledVector(n, len * 0.8 * this.s),
      to: pos.clone().addScaledVector(n, 0.002 * this.s),
      state: 'hole',
      progress: 0,
      hits: 0,
    });
  }

  screenOf(v) {
    const p = v.clone().project(this.e.camera);
    return { x: ((p.x + 1) / 2) * window.innerWidth, y: ((1 - p.y) / 2) * window.innerHeight, behind: p.z > 1 };
  }

  nearestFastener(x, y, states, kinds) {
    let best = null;
    let bestD = PICK_RADIUS_PX;
    for (const f of this.fasteners) {
      if (!states.includes(f.state) || (kinds && !kinds.includes(f.kind))) continue;
      const s = this.screenOf(f.g ? f.g.position : f.pos);
      const d = Math.hypot(s.x - x, s.y - y);
      if (!s.behind && d < bestD) {
        bestD = d;
        best = f;
      }
    }
    return best;
  }

  /** Solta um parafuso/prego arrastado da bandeja: encaixa no furo livre mais perto. */
  insertAt(kind, x, y) {
    const f = this.nearestFastener(x, y, ['hole'], [kind]);
    if (!f) {
      const other = this.nearestFastener(x, y, ['hole']);
      if (other) return this.mistake(other.kind === 'nail' ? 'Esse furo é de prego' : 'Esse furo é de parafuso');
      return this.hooks.onToast('Solte em cima de um furo laranja');
    }
    this.started = true;
    const model = kind === 'nail' ? nailModel(this.s) : kind === 'thumb' ? thumbScrewModel(this.s) : screwModel(this.s);
    model.position.copy(f.from);
    model.quaternion.copy(f.baseQ);
    this.root.add(model);
    f.g = model;
    f.state = 'in';
    Sfx.pick();
    this.tellOnce(
      `in-${kind}`,
      kind === 'nail'
        ? 'Agora pegue o martelo 🔨 e bata no prego'
        : kind === 'thumb'
          ? 'Gire com o dedo 🖐️ em círculos, no sentido horário ↻'
          : 'Pegue a chave 🪛 e gire o dedo em círculos sobre o parafuso, sentido horário ↻',
    );
    this.refresh();
  }

  applyFastener(f) {
    f.g.position.lerpVectors(f.from, f.to, f.progress);
    if (f.kind !== 'nail') f.g.quaternion.copy(f.baseQ).multiply(new THREE.Quaternion().setFromAxisAngle(UP, -f.progress * Math.PI * 8));
  }

  finishFastener(f) {
    f.state = 'done';
    f.progress = 1;
    this.applyFastener(f);
    this.root.remove(f.halo);
    Sfx.snap();
    this.action = null;
    this.e.controls.enabled = true;
    this.hooks.onRing(null);
    this.refresh();
    this.checkDone();
  }

  // ---------- ferramentas na cena ----------

  hitPartAt(x, y) {
    const ndc = new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.e.camera);
    const placed = this.parts.filter((p) => p.placed).map((p) => p.group);
    const hit = this.raycaster.intersectObjects(placed, true)[0];
    if (!hit) return null;
    return this.parts.find((p) => {
      let o = hit.object;
      while (o && o !== p.group) o = o.parent;
      return o === p.group;
    });
  }

  /** Peça esperando martelo/mão: aceita o toque mesmo se outra peça estiver na frente. */
  looseAt(x, y) {
    const loose = this.parts.filter((p) => p.placed && !p.seated);
    if (!loose.length) return null;
    const ndc = new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.e.camera);
    const hit = this.raycaster.intersectObjects(loose.map((p) => p.group), true)[0];
    if (hit) return loose.find((p) => p.group.getObjectById(hit.object.id));
    return loose.find((p) => {
      const s = this.screenOf(this.partTop(p));
      return Math.hypot(s.x - x, s.y - y) < PICK_RADIUS_PX;
    });
  }

  pointerDown(ev) {
    if (this.done || this.held || ev.target !== this.e.canvas) return;
    const x = ev.clientX;
    const y = ev.clientY;
    // Parafuso/prego já colocado tem prioridade sobre furo vazio ao lado (o dedo começa o giro fora do centro)
    const f = this.nearestFastener(x, y, ['in']) ?? this.nearestFastener(x, y, ['hole']);
    const loose = f ? null : this.looseAt(x, y);
    const part = f || loose ? loose : this.hitPartAt(x, y);
    if (this.useTool(this.hooks.getTool(), f, loose, part, x, y)) {
      ev.stopPropagation();
      ev.preventDefault();
    }
  }

  /** Decide o que a ferramenta faz. Retorna true se o toque foi usado (a câmera não gira). */
  useTool(tool, f, loose, part, x, y) {
    if (f && f.state === 'hole') {
      this.hooks.onToast(f.kind === 'nail' ? 'Primeiro arraste um prego até esse furo' : 'Primeiro arraste um parafuso até esse furo');
      return true;
    }
    if (tool === 'martelo') {
      if (f) {
        if (f.kind === 'nail') this.hammerNail(f);
        else this.mistake('Parafuso não se martela! Use a chave 🪛');
        return true;
      }
      if (loose && loose.def.press.tool === 'martelo') {
        this.hammerPart(loose);
        return true;
      }
      if (part && this.level.fragile) {
        this.swingAt(new THREE.Box3().setFromObject(part.group).getCenter(new THREE.Vector3()), UP);
        this.mistake('Cuidado! Martelo em peça de computador estraga 💥');
        return true;
      }
      if (loose) {
        this.hooks.onToast('Essa peça se encaixa com a mão 🖐️');
        return true;
      }
      return false;
    }
    if (tool === 'chave' || tool === 'parafusadeira') {
      if (f) {
        if (f.kind === 'nail') {
          this.mistake('Prego se bate com o martelo 🔨');
          return true;
        }
        if (tool === 'parafusadeira') {
          this.action = { kind: 'drill', f };
          this.e.controls.enabled = false;
        } else {
          this.startTurn(f, x, y, TOOLS.chave.turns[toolLevel('chave') - 1]);
        }
        this.showTool(tool, f);
        return true;
      }
      if (loose) {
        this.hooks.onToast(loose.def.press.tool === 'martelo' ? 'Essa peça precisa do martelo 🔨' : 'Essa peça se encaixa com a mão 🖐️');
        return true;
      }
      return false;
    }
    // Mão
    if (f) {
      if (f.kind === 'thumb') this.startTurn(f, x, y, 2);
      else this.hooks.onToast(f.kind === 'nail' ? 'Use o martelo 🔨' : 'Esse parafuso precisa da chave 🪛');
      return true;
    }
    if (loose) {
      if (loose.def.press.tool === 'mao') this.pressPart(loose);
      else this.hooks.onToast('Essa peça precisa do martelo 🔨');
      return true;
    }
    return false;
  }

  startTurn(f, x, y, turns) {
    const c = this.screenOf(f.g.position);
    this.action = { kind: 'turn', f, turns, last: Math.atan2(y - c.y, x - c.x), notch: Math.floor(f.progress * turns * 4) };
    this.e.controls.enabled = false;
  }

  pointerMove(ev) {
    const a = this.action;
    if (!a || a.kind !== 'turn') return;
    const c = this.screenOf(a.f.g.position);
    const ang = Math.atan2(ev.clientY - c.y, ev.clientX - c.x);
    const d = wrap(ang - a.last);
    a.last = ang;
    // Tela com Y para baixo: ângulo crescente = sentido horário = apertar; anti-horário afrouxa
    a.f.progress = Math.min(1, Math.max(0, a.f.progress + d / (Math.PI * 2) / a.turns));
    this.applyFastener(a.f);
    const notch = Math.floor(a.f.progress * a.turns * 4);
    if (notch !== a.notch) {
      Sfx.ratchet(notch > a.notch);
      a.notch = notch;
    }
    if (a.f.progress >= 1) this.finishFastener(a.f);
  }

  pointerUp() {
    if (!this.action) return;
    this.action = null;
    this.e.controls.enabled = true;
    this.hooks.onRing(null);
  }

  showTool(id, f) {
    if (this.toolMesh) this.root.remove(this.toolMesh);
    this.toolMesh = toolModel(id, toolLevel(id));
    // Ferramenta quase em tamanho real, mesmo quando o parafuso é pequeno (PC)
    this.toolMesh.scale.setScalar(Math.max(this.s, 0.75));
    this.toolMesh.userData.f = f;
    this.root.add(this.toolMesh);
    this.toolHideAt = Infinity;
  }

  swingAt(point, normal) {
    if (this.toolMesh) this.root.remove(this.toolMesh);
    const h = toolModel('martelo', toolLevel('martelo'));
    h.scale.setScalar(this.s);
    h.quaternion.setFromUnitVectors(UP, normal);
    h.position.copy(point).addScaledVector(normal, 0.07 * this.s);
    this.root.add(h);
    this.toolMesh = h;
    this.toolHideAt = performance.now() + 700;
    const lift = 0.07 * this.s;
    this.e.tween(170, (k) => {
      const t = k < 0.6 ? 1 - k / 0.6 : ((k - 0.6) / 0.4) * 0.5;
      h.position.copy(point).addScaledVector(normal, lift * t);
    });
  }

  hammerNail(f) {
    this.started = true;
    const total = Math.max(1, Math.round(NAIL_BASE_HITS * TOOLS.martelo.mult[toolLevel('martelo') - 1]));
    f.hits += 1;
    f.progress = Math.min(1, f.hits / total);
    this.swingAt(f.g.position.clone(), f.n);
    Sfx.hammer();
    setTimeout(() => {
      if (f.state !== 'in') return;
      this.applyFastener(f);
      this.hooks.onRing({ pos: f.g.position, progress: f.progress, hold: 600 });
      if (f.progress >= 1) this.finishFastener(f);
    }, 100);
  }

  partTop(p) {
    const box = new THREE.Box3().setFromObject(p.group);
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const up = p.pressDir.clone().negate();
    return c.addScaledVector(up, Math.abs(up.dot(size)) / 2);
  }

  hammerPart(p) {
    this.started = true;
    this.swingAt(this.partTop(p), p.pressDir.clone().negate());
    Sfx.hammer();
    setTimeout(() => this.advancePress(p), 100);
  }

  pressPart(p) {
    this.started = true;
    Sfx.click();
    this.advancePress(p);
  }

  advancePress(p) {
    if (p.seated) return;
    p.hitsLeft -= 1;
    const k = 1 - p.hitsLeft / p.hitsTotal;
    p.group.position.copy(p.target).addScaledVector(p.pressDir, -p.pressDist * (1 - k));
    this.hooks.onRing({ pos: this.partTop(p), progress: k, hold: 600 });
    if (p.hitsLeft <= 0) {
      this.seat(p);
      Sfx.snap();
    }
  }

  // ---------- dica / fim ----------

  hint() {
    const loose = this.parts.find((p) => p.placed && !p.seated);
    if (loose) {
      this.flashGhost(loose);
      return this.hooks.onToast(
        tr(loose.def.press.tool === 'martelo' ? 'Martelo 🔨 + toques: {x}' : 'Mão 🖐️ + toques: {x}', { x: tr(loose.def.name) }),
      );
    }
    const inF = this.fasteners.find((f) => f.state === 'in');
    if (inF) {
      return this.hooks.onToast(
        inF.kind === 'nail' ? 'Martelo 🔨 + toques no prego' : inF.kind === 'thumb' ? 'Mão 🖐️ + gire em círculos ↻' : 'Chave 🪛 + gire o dedo em círculos ↻',
      );
    }
    const hole = this.fasteners.find((f) => f.state === 'hole');
    if (hole) {
      this.hooks.onHighlight(hole.kind);
      return this.hooks.onToast('Arraste da bandeja até o furo laranja');
    }
    const next = this.parts.find((p) => !p.placed && !this.missing(p).length);
    if (next) {
      this.hooks.onHighlight(next.def.id);
      this.flashGhost(next);
      this.hooks.onToast(tr('Próxima peça: {x}', { x: tr(next.def.name) }));
    }
  }

  checkDone() {
    if (this.done) return;
    if (this.parts.some((p) => !p.seated)) return;
    if (this.fasteners.length < this.level.screws.length || this.fasteners.some((f) => f.state !== 'done')) return;
    this.done = true;
    if (this.toolMesh) this.root.remove(this.toolMesh);
    this.toolMesh = null;
    Sfx.done();
    this.e.controls.autoRotate = true;
    const stars = this.mistakes <= 1 ? 3 : this.mistakes <= 4 ? 2 : 1;
    setTimeout(() => this.hooks.onComplete({ stars, time: this.time, mistakes: this.mistakes }), 900);
  }

  tick(dt) {
    if (this.started && !this.done) this.time += dt;
    // Anel dos furos com tamanho constante na tela, para ser fácil de achar e tocar
    const pulse = 1 + 0.15 * Math.sin(performance.now() / 160);
    const cam = this.e.camera.position;
    this.fasteners.forEach((f) => {
      if (f.state === 'done') return;
      f.halo.scale.setScalar(cam.distanceTo(f.pos) * 0.024 * (f.state === 'hole' ? pulse : 1));
      f.halo.material.color.set(f.state === 'hole' ? 0xff922b : 0x51cf66);
    });

    const a = this.action;
    if (a?.kind === 'drill') {
      a.f.progress = Math.min(1, a.f.progress + (dt * TOOLS.parafusadeira.speed[toolLevel('parafusadeira') - 1]) / DRILL_TURNS);
      this.applyFastener(a.f);
      a.buzz = (a.buzz ?? 0) - dt;
      if (a.buzz <= 0) {
        Sfx.drill();
        a.buzz = 0.12;
      }
      if (a.f.progress >= 1) this.finishFastener(a.f);
    }
    if (this.action && this.action.f.state === 'in') this.hooks.onRing({ pos: this.action.f.g.position, progress: this.action.f.progress });

    // A chave/parafusadeira acompanha o parafuso enquanto gira
    const tm = this.toolMesh;
    if (tm && tm.userData.f) {
      const f = tm.userData.f;
      tm.position.copy(f.g.position);
      tm.quaternion.copy(f.g.quaternion);
      if (!this.action && this.toolHideAt === Infinity) this.toolHideAt = performance.now() + 300;
    }
    if (tm && performance.now() > this.toolHideAt) {
      this.root.remove(tm);
      this.toolMesh = null;
    }

    this.parts.forEach((p) => p.seated && p.spinners.forEach((o) => (o.rotation.z += o.userData.spin * dt)));
  }

  dispose() {
    this.e.tickers.delete(this.ticker);
    window.removeEventListener('pointerdown', this.onDown, true);
    window.removeEventListener('pointermove', this.onMove, true);
    window.removeEventListener('pointerup', this.onUp, true);
    window.removeEventListener('pointercancel', this.onUp, true);
    this.hooks.onRing(null);
    this.e.setBottomInset(0);
    this.e.scene.remove(this.root);
    this.e.controls.autoRotate = false;
    this.e.controls.enabled = true;
    this.root.traverse((o) => o.geometry?.dispose());
  }
}
