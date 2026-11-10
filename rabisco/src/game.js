// Uma fase: física (Matter.js) do traço desenhado, do Bolota e dos perigos.
// Não depende da tela: o desenho fica em render.js, e o robô de testes roda isto no Node.
import Matter from 'matter-js';

const { Engine, Bodies, Body, Composite, Events, Query } = Matter;

export const W = 540;
export const H = 960;
export const CHAR_R = 34;
export const LINE_W = 12;
const STEP_MS = 1000 / 60;
// Ritmo: < 1 deixa pedras e canhões mais frequentes (fases curtas e intensas)
const PACE = 0.6;
const MIN_GAP = 7; // distância mínima entre pontos do traço
const LETHAL = new Set(['bee', 'rock', 'ball', 'spike']);
// Categorias de colisão: abelhas e pedras/balas passam umas pelas outras
// (uma pedra empurrando uma abelha levíssima a faria atravessar o traço)
const CAT_BEE = 0x0002;
const CAT_DEBRIS = 0x0004;

export class Level {
  /** hooks (opcionais): onLose(motivo), onWin(), onHit(x, y), onSpawn(tipo) */
  constructor(def, hooks = {}) {
    this.def = def;
    this.hooks = hooks;
    // mais iterações = contatos estáveis (o traço apoiado no chão não treme nem escorrega)
    this.engine = Engine.create({ gravity: { x: 0, y: 1, scale: 0.0016 }, positionIterations: 14, velocityIterations: 12 });
    this.world = this.engine.world;
    this.statics = def.ground.map((g) => {
      const b = Bodies.rectangle(g.x, g.y, g.w, g.h, {
        isStatic: true,
        angle: g.angle ?? 0,
        label: g.kind ?? 'ground',
        friction: 0.9,
      });
      b.plugin = { shape: g };
      Composite.add(this.world, b);
      return b;
    });
    this.char = Bodies.circle(def.char.x, def.char.y, CHAR_R, {
      label: 'char',
      density: 0.004,
      friction: 1,
      frictionStatic: 3,
      frictionAir: 0.01,
      restitution: 0,
    });
    Body.setInertia(this.char, Infinity); // não rola, fica em pé
    Composite.add(this.world, this.char);

    this.state = 'draw'; // draw -> run -> win | lose
    this.points = [];
    this.blocked = false;
    this.inkMax = def.ink;
    this.inkUsed = 0;
    this.line = null;
    this.timeTotal = def.time ?? 6;
    this.timeLeft = this.timeTotal;
    this.t = 0;
    this.acc = 0;
    this.bees = [];
    this.hazards = [];
    this.loseReason = null;
    this.spawns = this.planSpawns(def);
    Events.on(this.engine, 'collisionStart', (e) => this.onCollide(e));
  }

  // ---------- desenho do traço ----------

  /** O ponto pode receber tinta? (não pode desenhar dentro de chão, do Bolota ou de perigos) */
  free(x, y) {
    if (x < 0 || x > W || y < 0 || y > H) return false;
    const bodies = [...this.statics, this.char];
    if (Query.point(bodies, { x, y }).length) return false;
    // margem em volta: o traço não pode nascer encostado/enterrado em nada (a física "explodiria")
    const m = LINE_W / 2 + 1;
    for (const [ox, oy] of [[m, 0], [-m, 0], [0, m], [0, -m], [m * 0.7, m * 0.7], [-m * 0.7, m * 0.7], [m * 0.7, -m * 0.7], [-m * 0.7, -m * 0.7]]) {
      if (Query.point(this.statics, { x: x + ox, y: y + oy }).length) return false;
    }
    const dx = x - this.char.position.x;
    const dy = y - this.char.position.y;
    return Math.hypot(dx, dy) > CHAR_R + LINE_W / 2 + 2;
  }

  get inkLeft() {
    return Math.max(0, 1 - this.inkUsed / this.inkMax);
  }

  beginStroke(x, y) {
    if (this.state !== 'draw') return false;
    this.points = [];
    this.inkUsed = 0;
    this.blocked = !this.free(x, y);
    if (!this.blocked) this.points.push({ x, y });
    return !this.blocked;
  }

  /** Acrescenta pontos até (x, y), parando onde bater em algo ou acabar a tinta. */
  extendStroke(x, y) {
    if (this.state !== 'draw' || !this.points.length) return;
    const last = this.points[this.points.length - 1];
    const d = Math.hypot(x - last.x, y - last.y);
    if (d < MIN_GAP) return;
    const n = Math.ceil(d / MIN_GAP);
    let prev = last;
    for (let i = 1; i <= n; i++) {
      const p = { x: last.x + ((x - last.x) * i) / n, y: last.y + ((y - last.y) * i) / n };
      const seg = Math.hypot(p.x - prev.x, p.y - prev.y);
      if (this.inkUsed + seg > this.inkMax) {
        this.blocked = true;
        return;
      }
      if (!this.free(p.x, p.y)) {
        this.blocked = true;
        return;
      }
      this.blocked = false;
      this.inkUsed += seg;
      this.points.push(p);
      prev = p;
    }
  }

  /** Solta o dedo: o traço vira um objeto físico e o perigo começa. */
  endStroke() {
    if (this.state !== 'draw') return false;
    if (this.points.length < 3 || this.inkUsed < 25) {
      this.points = [];
      this.inkUsed = 0;
      return false;
    }
    // Traço alisado (sem "dentes" de dedo rápido). Na tela vai a forma lisa; na física, a mesma
    // forma com menos pedaços (no máximo 3 px de diferença): poucos pedaços = contato firme, sem tremer.
    let looks = simplify(smooth(this.points, 2), 0.8);
    if (!looks.every((p) => this.free(p.x, p.y))) looks = simplify(this.points, 0.8); // alisar encostou em algo
    const shape = simplify(looks, 3);
    const parts = [];
    const last = shape.length - 1;
    for (let i = 1; i <= last; i++) {
      let a = shape[i - 1];
      let b = shape[i];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const ux = (b.x - a.x) / len;
      const uy = (b.y - a.y) / len;
      // pontas retas (meia espessura a mais): apoiam firme no chão em vez de rolar como bolinha
      if (i === 1) a = { x: a.x - ux * LINE_W * 0.5, y: a.y - uy * LINE_W * 0.5 };
      if (i === last) b = { x: b.x + ux * LINE_W * 0.5, y: b.y + uy * LINE_W * 0.5 };
      const l2 = Math.hypot(b.x - a.x, b.y - a.y);
      parts.push(Bodies.rectangle((a.x + b.x) / 2, (a.y + b.y) / 2, l2, LINE_W, { angle: Math.atan2(uy, ux) }));
    }
    // juntas do meio redondas: sem frestas nas dobras
    shape.slice(1, -1).forEach((p) => parts.push(Bodies.circle(p.x, p.y, LINE_W / 2)));
    const line = Body.create({ parts, label: 'line', friction: 1, frictionStatic: 10, restitution: 0, frictionAir: 0.015, slop: 0.01 });
    Body.setDensity(line, 0.0065);
    const c = line.position;
    line.plugin = { local: looks.map((p) => ({ x: p.x - c.x, y: p.y - c.y })) };
    Composite.add(this.world, line);
    this.line = line;
    this.state = 'run';
    return true;
  }

  /** Pontos do traço já transformados pela posição/rotação atual do corpo. */
  linePoints() {
    if (!this.line) return this.points;
    const { position: p, angle } = this.line;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return this.line.plugin.local.map((q) => ({ x: p.x + q.x * cos - q.y * sin, y: p.y + q.x * sin + q.y * cos }));
  }

  // ---------- perigos ----------

  planSpawns(def) {
    const list = [];
    (def.hives ?? []).forEach((h) => {
      for (let i = 0; i < h.count; i++) list.push({ at: 0.1 + i * 0.03, kind: 'bee', x: h.x, y: h.y });
    });
    if (def.rocks) {
      const r = def.rocks;
      for (let i = 0; i < r.count; i++) list.push({ at: 0.2 + i * r.every * PACE, kind: 'rock', x: r.x0 + Math.random() * (r.x1 - r.x0), y: -40 });
    }
    (def.cannons ?? []).forEach((cn) => {
      for (let t = 0.4; t < this.timeTotal; t += cn.every * PACE) list.push({ at: t, kind: 'ball', cannon: cn });
    });
    return list.sort((a, b) => a.at - b.at);
  }

  spawn(s) {
    if (s.kind === 'bee') {
      const b = Bodies.circle(s.x + (Math.random() - 0.5) * 20, s.y + 10, 9, {
        label: 'bee',
        density: 0.00003, // levíssima: pica, mas não arrasta o traço
        frictionAir: 0.02,
        restitution: 0.6,
        collisionFilter: { group: -1, category: CAT_BEE, mask: 0xffff & ~CAT_DEBRIS }, // nem umas nas outras
      });
      b.plugin = { side: Math.random() < 0.5 ? -1 : 1, flank: this.bees.length % 3 === 2 ? { x: (s.x < W / 2 ? 1 : -1) * 170, y: -60 } : null, speed: 6 + Math.random() * 2, phase: Math.random() * 6.28, wob: 0.5 + Math.random() * 0.6 };
      this.bees.push(b);
      Composite.add(this.world, b);
    } else if (s.kind === 'rock') {
      const r = 16 + Math.random() * 12;
      const b = Bodies.polygon(s.x, s.y, 7, r, { label: 'rock', density: 0.002, restitution: 0.1, friction: 0.6, frictionAir: 0.03, collisionFilter: { category: CAT_DEBRIS, mask: 0xffff & ~CAT_BEE } });
      Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.2);
      this.hazards.push(b);
      Composite.add(this.world, b);
    } else if (s.kind === 'ball') {
      // o canhão mira no Bolota, compensando a queda da bala pela gravidade
      const cn = s.cannon;
      const c = this.char.position;
      const a = Math.atan2(c.y - cn.y, c.x - cn.x);
      cn.aim = a;
      const sp = (cn.speed ?? 12) * 1.25;
      const ox = cn.x + Math.cos(a) * 40;
      const oy = cn.y + Math.sin(a) * 40;
      const steps = Math.hypot(c.x - ox, c.y - oy) / sp;
      const g = this.engine.gravity.y * this.engine.gravity.scale * STEP_MS * STEP_MS;
      const b = Bodies.circle(ox, oy, 13, { label: 'ball', density: 0.004, restitution: 0.4, frictionAir: 0, collisionFilter: { category: CAT_DEBRIS, mask: 0xffff & ~CAT_BEE } });
      Body.setVelocity(b, { x: Math.cos(a) * sp, y: Math.sin(a) * sp - 0.5 * g * steps });
      this.hazards.push(b);
      Composite.add(this.world, b);
      cn.flash = 0.15;
    }
    this.hooks.onSpawn?.(s.kind);
  }

  /**
   * Abelhas inteligentes:
   * - parte do enxame dá a volta e ataca pelo outro lado (flanco);
   * - "antenas" (raios) enxergam o traço e o chão: se o caminho está fechado, contornam
   *   sempre pelo mesmo lado escolhido e assim acham brechas;
   * - presa sem avançar, troca de lado; vendo o Bolota livre e perto, dá uma investida;
   * - se afastam umas das outras para o enxame se espalhar.
   */
  steerBees() {
    const c = this.char.position;
    const g = this.engine.gravity;
    const walls = this.line ? [...this.statics, this.line] : this.statics;
    const clear = (from, ang, len) =>
      Query.ray(walls, from, { x: from.x + Math.cos(ang) * len, y: from.y + Math.sin(ang) * len }, 14).length === 0;
    const frame = Math.round(this.t * 60);

    this.bees.forEach((b, i) => {
      const P = b.plugin;
      const pos = b.position;
      let heading;
      let speed = P.speed;
      if (this.state === 'win') {
        heading = Math.atan2(-1, pos.x < W / 2 ? -0.6 : 0.6); // vitória: vão embora
      } else {
        const dist = Math.hypot(c.x - pos.x, c.y - pos.y);
        // alvo: flanco (dar a volta) até chegar perto; depois, o Bolota
        const flank = dist > 150 && P.flank;
        const tx = flank ? c.x + P.flank.x : c.x;
        const ty = flank ? c.y + P.flank.y : c.y;
        const direct = Math.atan2(ty - pos.y, tx - pos.x);
        // as antenas são caras: cada abelha pensa a cada 3 quadros
        if ((frame + i) % 3 === 0 || P.heading === undefined) {
          const look = Math.min(90, Math.hypot(tx - pos.x, ty - pos.y));
          if (clear(pos, direct, look)) {
            P.heading = direct;
            P.detour = false;
          } else {
            P.detour = true;
            P.heading = direct + P.side * 2.4;
            for (const off of [0.5, 0.9, 1.3, 1.7, 2.1]) {
              if (clear(pos, direct + P.side * off, 60)) {
                P.heading = direct + P.side * off;
                break;
              }
            }
          }
          // presa: anda pouco por um tempo → troca o lado do contorno
          P.stuckT = (P.stuckT ?? 0) + 3 / 60;
          if (P.stuckT > 0.8) {
            const moved = Math.hypot(pos.x - (P.lastX ?? pos.x), pos.y - (P.lastY ?? pos.y));
            if (moved < 25) P.side *= -1;
            P.lastX = pos.x;
            P.lastY = pos.y;
            P.stuckT = 0;
          }
        }
        heading = P.heading + (P.detour ? 0 : Math.sin(this.t * 8 + P.phase) * 0.35);
        if (!P.detour && dist < 150) speed *= 1.3; // investida
      }
      // separação: abelhas próximas se afastam um pouco
      let sx = 0;
      let sy = 0;
      for (let k = 0; k < this.bees.length; k += 1) {
        const o = this.bees[k];
        if (o === b) continue;
        const dx = pos.x - o.position.x;
        const dy = pos.y - o.position.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 400 && d2 > 0.01) {
          sx += dx / d2;
          sy += dy / d2;
        }
      }
      // separação limitada (sem limite, duas abelhas coladas eram arremessadas através do traço)
      const sm = Math.hypot(sx, sy) * 18;
      const sk = sm > 2.5 ? 2.5 / sm : 1;
      let vx = Math.cos(heading) * speed + sx * 18 * sk;
      let vy = Math.sin(heading) * speed + sy * 18 * sk;
      vx = b.velocity.x + (vx - b.velocity.x) * 0.14;
      vy = b.velocity.y + (vy - b.velocity.y) * 0.14;
      // velocidade máxima: nunca rápida o bastante para atravessar o traço num passo
      const v = Math.hypot(vx, vy);
      const MAXV = LINE_W * 0.85;
      if (v > MAXV) {
        vx *= MAXV / v;
        vy *= MAXV / v;
      }
      Body.setVelocity(b, { x: vx, y: vy });
      // abelha voa: anula a gravidade que o motor aplica nela
      Body.applyForce(b, b.position, { x: 0, y: -b.mass * g.y * g.scale });
    });
  }

  onCollide(e) {
    if (this.state !== 'run') return;
    for (const { bodyA, bodyB } of e.pairs) {
      const a = bodyA.parent;
      const b = bodyB.parent;
      const other = a === this.char ? b : b === this.char ? a : null;
      if (other && LETHAL.has(other.label)) {
        const m = { bee: 'Ferroada!', rock: 'Pedrada!', ball: 'Bala de canhão!', spike: 'Espinhos!' };
        return this.lose(m[other.label], other.position);
      }
    }
  }

  lose(reason, at) {
    if (this.state !== 'run') return;
    this.state = 'lose';
    this.loseReason = reason;
    this.hooks.onHit?.(at?.x ?? this.char.position.x, at?.y ?? this.char.position.y);
    this.hooks.onLose?.(reason);
  }

  get stars() {
    const used = this.inkUsed / this.inkMax;
    return used <= 0.4 ? 3 : used <= 0.7 ? 2 : 1;
  }

  // ---------- passo da simulação ----------

  update(dt) {
    if (this.state === 'draw') return;
    this.acc += Math.min(dt, 0.1) * 1000;
    while (this.acc >= STEP_MS) {
      this.acc -= STEP_MS;
      this.fixedStep(STEP_MS / 1000);
    }
  }

  fixedStep(dt) {
    this.t += dt;
    while (this.spawns.length && this.spawns[0].at <= this.t && this.state === 'run') this.spawn(this.spawns.shift());
    (this.def.cannons ?? []).forEach((cn) => (cn.flash = Math.max(0, (cn.flash ?? 0) - dt)));

    this.steerBees();

    Engine.update(this.engine, STEP_MS);

    if (this.state === 'run') {
      const p = this.char.position;
      if (p.y > H + 60 || p.x < -60 || p.x > W + 60) this.lose('Caiu!', p);
      this.timeLeft -= dt;
      if (this.state === 'run' && this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.state = 'win';
        this.hooks.onWin?.();
      }
    }
    // limpa o que saiu da tela
    this.hazards = this.hazards.filter((h) => {
      if (h.position.y > H + 200 || h.position.x < -200 || h.position.x > W + 200) {
        Composite.remove(this.world, h);
        return false;
      }
      return true;
    });
  }

  /** Perigo mais perto do Bolota (para os olhos dele acompanharem). */
  nearestThreat() {
    let best = null;
    let bd = Infinity;
    for (const h of [...this.bees, ...this.hazards]) {
      const d = Math.hypot(h.position.x - this.char.position.x, h.position.y - this.char.position.y);
      if (d < bd) {
        bd = d;
        best = h;
      }
    }
    return best ? { x: best.position.x, y: best.position.y, d: bd } : null;
  }
}

/** Alisa a linha (Chaikin): corta os cantos `n` vezes, mantendo as pontas. */
function smooth(pts, n) {
  let out = pts;
  for (let k = 0; k < n; k++) {
    if (out.length < 3) return out;
    const next = [out[0]];
    for (let i = 0; i < out.length - 1; i++) {
      const a = out[i];
      const b = out[i + 1];
      next.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 }, { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    next.push(out[out.length - 1]);
    out = next;
  }
  return out;
}

/** Simplifica uma linha (Ramer–Douglas–Peucker) mantendo a forma com tolerância `eps` px. */
function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  const a = pts[0];
  const b = pts[pts.length - 1];
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  let best = 0;
  let idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    const d = Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / len;
    if (d > best) {
      best = d;
      idx = i;
    }
  }
  if (best <= eps) return [a, b];
  return [...simplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplify(pts.slice(idx), eps)];
}

/** Traço sugerido pela dica (formas simples em volta do Bolota). */
export function hintPath(def) {
  if (def.hintPts) {
    // pontos exatos, ligados por segmentos curtos
    const out = [];
    for (let i = 1; i < def.hintPts.length; i++) {
      const a = def.hintPts[i - 1];
      const b = def.hintPts[i];
      const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 10);
      for (let k = i === 1 ? 0 : 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
    }
    return out;
  }
  const { x, y } = def.char;
  const pts = [];
  const kind = def.hint ?? 'dome';
  if (kind === 'dome' || kind === 'roof') {
    const R = def.hintR ?? (kind === 'roof' ? 92 : 80);
    for (let a = Math.PI; a <= Math.PI * 2 + 1e-6; a += Math.PI / 24) pts.push({ x: x + Math.cos(a) * R, y: y + 18 + Math.sin(a) * R });
  } else if (kind === 'wallL' || kind === 'wallR') {
    const sx = kind === 'wallL' ? -1 : 1;
    for (let t = 0; t <= 1.0001; t += 1 / 20) pts.push({ x: x + sx * 72, y: y - 150 + t * 175 });
  } else if (kind === 'cup') {
    // "copo" virado: telhado e duas paredes
    const R = 78;
    for (let t = 0; t <= 1; t += 1 / 8) pts.push({ x: x - R, y: y + 25 - t * 120 });
    for (let t = 0; t <= 1; t += 1 / 16) pts.push({ x: x - R + t * 2 * R, y: y - 95 });
    for (let t = 0; t <= 1; t += 1 / 8) pts.push({ x: x + R, y: y - 95 + t * 120 });
  }
  return pts;
}
