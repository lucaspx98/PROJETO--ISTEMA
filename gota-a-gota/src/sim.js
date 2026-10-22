// Simulação do vidro embaçado: névoa em grade, gotas que escorrem só pelo vidro limpo,
// se juntam misturando as cores e caem nos potes. Sem Phaser, para poder ser testada com Node.
import { RECIPES, proportions, sameColor } from './colors.js';

export const CELL = 6;
export const COLS = 90;
export const ROWS = 100;
export const GLASS_TOP = 120;
export const GLASS_BOTTOM = GLASS_TOP + ROWS * CELL;
export const GLASS_LEFT = 0;

const GRAVITY = 700;
const MAX_SPEED = 330;
// Até quantas células para o lado uma gota procura um caminho que desça (inclinação mínima).
const SLIDE_REACH = 6;
const CLEAR_BELOW = 0.35;

export const dropRadius = (units) => 17 * units ** 0.4;

/** Gerador pseudoaleatório com semente: o mesmo nível sempre gera o mesmo vidro. */
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Descreve o nível: potes (cor e volume), gotas iniciais, prateleiras e velocidade da névoa. */
export function generateLevel(level) {
  const rand = rng(level * 7919 + 101);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const jarCount = level <= 1 ? 1 : level <= 3 ? 2 : level <= 8 ? 3 : 4;
  const pool = ['vermelho', 'amarelo', 'azul'];
  if (level >= 3) pool.push('laranja', 'verde', 'roxo');
  if (level >= 12) pool.push('marrom');

  const jars = [];
  for (let i = 0; i < jarCount; i++) {
    let name = pick(pool);
    // A partir do nível 3, sempre pelo menos uma mistura.
    if (level >= 3 && i === 0) name = pick(['laranja', 'verde', 'roxo']);
    const pig = RECIPES[name];
    const parts = pig[0] + pig[1] + pig[2];
    const mult = parts === 1 && level >= 6 && rand() < 0.5 ? 2 : 1;
    jars.push({ name, pig: pig.map((v) => v * mult), units: parts * mult });
  }
  // Embaralha a ordem dos potes para os caminhos se cruzarem
  for (let i = jars.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [jars[i], jars[j]] = [jars[j], jars[i]];
  }
  const jarW = Math.min(110, 480 / jarCount - 14);
  jars.forEach((j, i) => {
    j.x = 270 + (i - (jarCount - 1) / 2) * (480 / jarCount);
    j.w = jarW;
  });

  // Uma gota de 1 unidade para cada pigmento necessário, mais uma de sobra nos primeiros níveis.
  const pigs = [];
  jars.forEach((j) => j.pig.forEach((n, c) => {
    for (let k = 0; k < n; k++) pigs.push(c);
  }));
  if (level <= 5) pigs.push(pick(pigs));

  const drops = [];
  const maxY = GLASS_TOP + 300 + Math.min(level * 12, 140);
  for (const c of pigs) {
    for (let attempt = 0; attempt < 500; attempt++) {
      const x = 40 + rand() * 460;
      const y = GLASS_TOP + 50 + rand() * (maxY - GLASS_TOP - 50);
      if (drops.every((d) => Math.hypot(d.x - x, d.y - y) > 70)) {
        const pig = [0, 0, 0];
        pig[c] = 1;
        drops.push({ x, y, pig });
        break;
      }
    }
  }

  // Prateleiras de madeira (não dá para desembaçar): o caminho tem que contorná-las.
  const walls = [];
  const ledgeCount = level < 3 ? 0 : Math.min(1 + Math.floor((level - 3) / 2), 5);
  const lowest = Math.max(...drops.map((d) => d.y));
  for (let i = 0; i < ledgeCount; i++) {
    for (let attempt = 0; attempt < 200; attempt++) {
      const len = 16 + Math.floor(rand() * 26);
      const c0 = 2 + Math.floor(rand() * (COLS - len - 4));
      const top = Math.max(lowest + 50, GLASS_TOP + 150);
      const y = top + rand() * (GLASS_BOTTOM - 70 - top);
      const row = Math.floor((y - GLASS_TOP) / CELL);
      if (row >= ROWS - 6) continue;
      // Longe das gotas e das outras prateleiras
      const nearDrop = drops.some((d) => Math.abs(d.y - y) < 40 && d.x > c0 * CELL - 30 && d.x < (c0 + len) * CELL + 30);
      const nearWall = walls.some((w) => Math.abs(w.row - row) < 8 && c0 < w.c0 + w.len + 6 && w.c0 < c0 + len + 6);
      if (!nearDrop && !nearWall) {
        walls.push({ c0, len, row });
        break;
      }
    }
  }
  const regrow = level < 4 ? 0 : Math.min(0.06 + (level - 4) * 0.015, 0.22);
  return { jars, drops, walls, regrow };
}

export class Sim {
  /**
   * `def.endless`: modo arcade, sem fim de nível (a cena troca os pedidos dos potes).
   * `def.creep`: velocidade (px/s) com que gotas paradas escorregam sozinhas pela névoa.
   */
  constructor(def) {
    this.endless = !!def.endless;
    this.creep = def.creep || 0;
    this.fog = new Float32Array(COLS * ROWS).fill(1);
    this.wall = new Uint8Array(COLS * ROWS);
    def.walls.forEach(({ c0, len, row }) => {
      for (let c = c0; c < c0 + len; c++) for (let r = row; r < row + 2; r++) this.wall[r * COLS + c] = 1;
    });
    this.regrow = def.regrow;
    this.frozen = false;
    this.jars = def.jars.map((j) => ({ ...j, filled: 0, have: [0, 0, 0] }));
    this.drops = [];
    this.nextId = 1;
    def.drops.forEach((d) => this.addDrop(d.x, d.y, d.pig.slice(), [{ x: d.x, y: d.y, pig: d.pig.slice() }]));
    this.lostParts = [];
    this.events = [];
    this.state = 'playing';
  }

  addDrop(x, y, pig, parts, extra = {}) {
    const units = pig[0] + pig[1] + pig[2];
    const d = { id: this.nextId++, x, y, pig, units, r: dropRadius(units), moving: false, speed: 0, dir: x < 270 ? 1 : -1, parts, ...extra };
    this.drops.push(d);
    return d;
  }

  idx(c, r) {
    return r * COLS + c;
  }

  clear(c, r) {
    if (c < 1 || c >= COLS - 1 || r < 0) return false;
    if (r >= ROWS) return true;
    const i = this.idx(c, r);
    return !this.wall[i] && this.fog[i] < CLEAR_BELOW;
  }

  isWall(c, r) {
    return c >= 0 && c < COLS && r >= 0 && r < ROWS && this.wall[this.idx(c, r)] === 1;
  }

  /** Desembaça um traço do dedo. Devolve quanto de névoa foi tirado (para som e vibração). */
  wipe(x0, y0, x1, y1, radius = 22) {
    let removed = 0;
    const len = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(len / 4));
    const rc = Math.ceil(radius / CELL);
    for (let s = 0; s <= steps; s++) {
      const x = x0 + ((x1 - x0) * s) / steps;
      const y = y0 + ((y1 - y0) * s) / steps;
      const cc = Math.floor(x / CELL);
      const cr = Math.floor((y - GLASS_TOP) / CELL);
      for (let r = cr - rc; r <= cr + rc; r++) {
        for (let c = cc - rc; c <= cc + rc; c++) {
          if (c < 0 || c >= COLS || r < 0 || r >= ROWS) continue;
          const i = this.idx(c, r);
          if (this.wall[i]) continue;
          const d = Math.hypot((c + 0.5) * CELL - x, (r + 0.5) * CELL + GLASS_TOP - y);
          if (d > radius) continue;
          // Borda macia: o centro do dedo limpa tudo, a borda só um pouco.
          const target = d < radius * 0.65 ? 0 : (d - radius * 0.65) / (radius * 0.35);
          if (this.fog[i] > target) {
            removed += this.fog[i] - target;
            this.fog[i] = target;
          }
        }
      }
    }
    return removed;
  }

  /** Para que lado a gota consegue escorrer a partir da célula (c, r); 0 = nenhum. */
  slideDir(d, c, r) {
    for (const dir of [d.dir, -d.dir]) {
      for (let k = 1; k <= SLIDE_REACH; k++) {
        if (!this.clear(c + dir * k, r)) break;
        if (this.clear(c + dir * k, r + 1)) return dir;
      }
    }
    return 0;
  }

  canMove(d) {
    const c = Math.floor(d.x / CELL);
    const r = Math.floor((d.y - GLASS_TOP) / CELL);
    return this.clear(c, r + 1) || this.slideDir(d, c, r) !== 0;
  }

  step(dt) {
    if (this.state !== 'playing') return;
    dt = Math.min(dt, 0.05);
    if (this.regrow && !this.frozen) {
      const add = this.regrow * dt;
      for (let i = 0; i < this.fog.length; i++) if (this.fog[i] < 1) this.fog[i] = Math.min(1, this.fog[i] + add);
    }

    for (const d of this.drops) {
      if (!d.moving) {
        if (this.canMove(d)) {
          d.moving = true;
          d.speed = 40;
          this.events.push({ type: 'release', drop: d });
        } else if (this.creep) {
          // Gota pesada escorrega devagarinho mesmo na névoa (mas não atravessa madeira)
          const c = Math.floor(d.x / CELL);
          const r = Math.floor((d.y - GLASS_TOP) / CELL);
          if (r >= ROWS - 1) this.reachBottom(d);
          else if (!this.isWall(c, r + 1)) {
            d.y += this.creep * dt * (0.8 + 0.2 * d.units);
            d.creeping = true;
          }
        }
        continue;
      }
      d.speed = Math.min(d.speed + GRAVITY * dt, MAX_SPEED * (0.85 + 0.15 * d.units));
      let dist = d.speed * dt;
      while (dist > 0 && d.moving) {
        const s = Math.min(dist, 2);
        dist -= s;
        const c = Math.floor(d.x / CELL);
        const r = Math.floor((d.y - GLASS_TOP) / CELL);
        if (r >= ROWS - 1) {
          this.reachBottom(d);
          break;
        }
        if (this.clear(c, r + 1)) {
          d.y += s;
          // Centraliza devagar no canal
          const center = (c + 0.5) * CELL;
          d.x += (center - d.x) * 0.05;
        } else {
          const dir = this.slideDir(d, c, r);
          if (dir) {
            d.x += dir * s;
            d.dir = dir;
            d.speed *= 0.99;
          } else {
            d.moving = false;
            d.speed = 0;
            this.events.push({ type: 'stop', drop: d });
          }
        }
      }
      // A gota que escorre deixa um rastro limpo no vidro, como na vida real.
      if (d.moving) this.keepClear(d);
    }
    this.drops = this.drops.filter((d) => !d.gone);
    this.mergeDrops();
    this.checkEnd();
  }

  keepClear(d) {
    const c = Math.floor(d.x / CELL);
    const r = Math.floor((d.y - GLASS_TOP) / CELL);
    const rc = Math.max(1, Math.floor((d.r * 0.6) / CELL));
    for (let rr = r - rc - 1; rr <= r; rr++) {
      for (let cc = c - rc; cc <= c + rc; cc++) {
        if (cc < 0 || cc >= COLS || rr < 0 || rr >= ROWS) continue;
        const i = this.idx(cc, rr);
        if (!this.wall[i]) this.fog[i] = Math.min(this.fog[i], 0.1);
      }
    }
  }

  mergeDrops() {
    for (let i = 0; i < this.drops.length; i++) {
      for (let j = i + 1; j < this.drops.length; j++) {
        const a = this.drops[i];
        const b = this.drops[j];
        if (a.gone || b.gone) continue;
        if (Math.hypot(a.x - b.x, a.y - b.y) > (a.r + b.r) * 0.8) continue;
        // A gota de baixo absorve a de cima e mantém o movimento.
        const [keep, eat] = a.y >= b.y ? [a, b] : [b, a];
        keep.pig = keep.pig.map((v, k) => v + eat.pig[k]);
        keep.units += eat.units;
        keep.r = dropRadius(keep.units);
        keep.parts = keep.parts.concat(eat.parts);
        keep.moving = keep.moving || eat.moving;
        keep.wild = keep.wild || eat.wild;
        keep.golden = keep.golden || eat.golden;
        keep.speed = Math.max(keep.speed, eat.speed * 0.6);
        eat.gone = true;
        this.events.push({ type: 'merge', drop: keep, eaten: eat });
      }
    }
    this.drops = this.drops.filter((d) => !d.gone);
  }

  jarAt(x) {
    return this.jars.find((j) => Math.abs(x - j.x) < j.w / 2 - 4);
  }

  reachBottom(d) {
    d.gone = true;
    const jar = this.jarAt(d.x);
    if (jar && jar.filled < jar.units && (d.wild || sameColor(d.pig, jar.pig))) {
      const room = jar.units - jar.filled;
      const used = Math.min(room, d.units);
      jar.filled += used;
      jar.have = jar.have.map((v, k) => v + (d.pig[k] * used) / d.units);
      this.events.push({ type: 'fill', drop: d, jar, overflow: d.units - used });
      if (jar.filled >= jar.units) this.events.push({ type: 'jarFull', jar });
    } else {
      this.lostParts.push(...d.parts);
      this.events.push({ type: jar ? 'reject' : 'splash', drop: d, jar });
    }
  }

  /** Pigmento que ainda falta em cada pote, somado. */
  needed() {
    const need = [0, 0, 0];
    this.jars.forEach((j) => {
      if (j.filled >= j.units) return;
      const p = proportions(j.pig);
      p.forEach((v, k) => (need[k] += v * (j.units - j.filled)));
    });
    return need;
  }

  checkEnd() {
    if (!this.jars.length || this.endless) return; // menu e modo arcade: não tem fim de nível
    if (this.jars.every((j) => j.filled >= j.units)) {
      this.state = 'won';
      this.events.push({ type: 'win' });
      return;
    }
    const have = [0, 0, 0];
    this.drops.forEach((d) => d.pig.forEach((v, k) => (have[k] += v)));
    const need = this.needed();
    if (need.some((v, k) => have[k] < v - 0.01)) {
      this.state = 'lost';
      this.events.push({ type: 'fail' });
    }
  }

  /** Continuar (anúncio recompensado): devolve as gotas perdidas para onde começaram. */
  restoreLost() {
    const back = this.lostParts.map((p) => this.addDrop(p.x, p.y, p.pig.slice(), [p]));
    this.lostParts = [];
    // Névoa volta no lugar das gotas devolvidas, para elas não caírem sozinhas
    back.forEach((d) => {
      const c = Math.floor(d.x / CELL);
      const r = Math.floor((d.y - GLASS_TOP) / CELL);
      for (let rr = r; rr <= r + 3 && rr < ROWS; rr++) for (let cc = c - 3; cc <= c + 3; cc++) {
        if (cc >= 0 && cc < COLS && !this.wall[this.idx(cc, rr)]) this.fog[this.idx(cc, rr)] = 1;
      }
    });
    this.state = 'playing';
  }
}
