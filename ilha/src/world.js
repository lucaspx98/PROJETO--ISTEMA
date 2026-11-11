// O mundo da Ilha Brava como simulação pura (sem tela): terreno, recursos, jogador, inimigos,
// chefão, construções e missões. O desenho fica em render.js; o robô de testes roda isto no Node.
import { makeNoise, rng, smoothstep } from './noise.js';
import { QUESTS } from './quests.js';

export const HALF = 200; // o mapa vai de -200 a 200 em x e z
export const CELL = 4; // célula da grade de caminhada
export const GRID = (HALF * 2) / CELL;
export const CAMP = { x: 25, z: 125 };
export const BOSS = { x: -50, z: -70, r: 20 };
export const BOAT = { x: 40, z: 160 };
export const DAY_LEN = 240; // segundos de dia
export const NIGHT_LEN = 110;

const WEAPON_DMG = [14, 21, 30, 42];
export const WEAPON_NAMES = ['Machado gasto', 'Machado de pedra', 'Lâmina de cristal', 'Lâmina do Golem'];
export const UPGRADES = [
  null,
  { wood: 6, stone: 8 },
  { stone: 12, crystal: 6 },
  { crystal: 12, relic: 3 },
];
export const BUILDS = {
  fogueira: { name: 'Fogueira', x: CAMP.x - 3, z: CAMP.z - 2, cost: { wood: 5, stone: 3 }, r: 1.2 },
  bancada: { name: 'Bancada', x: CAMP.x + 6, z: CAMP.z - 5, cost: { wood: 10, stone: 6 }, r: 1.6 },
  cabana: { name: 'Cabana', x: CAMP.x - 9, z: CAMP.z - 8, cost: { wood: 20, stone: 12 }, r: 3 },
  barco: { name: 'Barco', x: BOAT.x, z: BOAT.z, cost: { wood: 30, crystal: 8, core: 1 }, r: 3 },
};
export const NPC = { x: CAMP.x + 2, z: CAMP.z + 4, name: 'Capitão Bento' };
export const ITEM_NAMES = { wood: 'madeira', stone: 'pedra', berry: 'frutinha', crystal: 'cristal', coin: 'moeda', relic: 'relíquia', core: 'coração do Golem', potion: 'poção' };

const ENEMY = {
  slime: { hp: 30, speed: 3.4, aggro: 13, range: 1.7, dmg: 10, windup: 0.45, cool: 1.1, xp: 8, coin: [2, 4], r: 0.8 },
  wolf: { hp: 50, speed: 6.6, aggro: 17, range: 1.9, dmg: 15, windup: 0.35, cool: 1.0, xp: 15, coin: [4, 7], r: 0.8 },
  golem: { hp: 1100, speed: 2.7, aggro: 30, range: 4.2, dmg: 30, windup: 1.0, cool: 1.6, xp: 200, coin: [60, 60], r: 2.4 },
};

export class Terrain {
  constructor(seed) {
    this.n = makeNoise(seed);
    // zonas aplainadas: acampamento, arena do chefão, cais do barco
    this.flats = [
      { x: CAMP.x, z: CAMP.z, r0: 14, r1: 42, h: 2.4 },
      { x: BOSS.x, z: BOSS.z, r0: BOSS.r, r1: BOSS.r + 16, h: 44 },
      { x: BOAT.x, z: BOAT.z - 6, r0: 6, r1: 18, h: 1.2 },
    ];
  }

  height(x, z) {
    const r = Math.hypot(x, z);
    const f = smoothstep(190, 85, r);
    const base = this.n.fbm(x * 0.011 + 40, z * 0.011 + 40, 4);
    const dm = Math.hypot(x - BOSS.x, z - BOSS.z);
    const mountain = 40 * Math.exp(-(dm * dm) / (2 * 48 * 48));
    let h = (2.5 + base * 20 + mountain) * f - 6 * (1 - f);
    for (const fl of this.flats) {
      const d = Math.hypot(x - fl.x, z - fl.z);
      if (d < fl.r1) h += (fl.h - h) * smoothstep(fl.r1, fl.r0, d);
    }
    return h;
  }

  /** 0..1: quão "floresta" é o lugar */
  forest(x, z) {
    return this.n.fbm(x * 0.02 + 300, z * 0.02 - 120, 3);
  }

  slope(x, z) {
    const dx = this.height(x + 1, z) - this.height(x - 1, z);
    const dz = this.height(x, z + 1) - this.height(x, z - 1);
    return Math.hypot(dx, dz) / 2;
  }

  walkable(x, z) {
    if (Math.abs(x) > HALF - 2 || Math.abs(z) > HALF - 2) return false;
    return this.height(x, z) > -0.7 && this.slope(x, z) < 1.25;
  }
}

const cellOf = (v) => Math.max(0, Math.min(GRID - 1, Math.floor((v + HALF) / CELL)));
const centerOf = (c) => -HALF + (c + 0.5) * CELL;

export class World {
  constructor(seed = 7, save = null) {
    this.seed = seed;
    this.t = new Terrain(seed);
    this.rand = rng(seed * 9973 + 1);
    this.events = [];
    this.buildReach();
    this.genNodes();
    this.enemies = [];
    this.shots = [];
    this.nextId = 1;
    this.clock = 30; // segundos desde o amanhecer
    this.spawnT = 0;
    this.saveT = 0;
    this.player = {
      x: CAMP.x + 6,
      z: CAMP.z + 8,
      y: 0,
      yaw: Math.PI,
      hp: 100,
      maxHp: 100,
      level: 1,
      xp: 0,
      weapon: 1,
      inv: { wood: 0, stone: 0, berry: 0, crystal: 0, coin: 0, relic: 0, core: 0, potion: 1 },
      atkCd: 0,
      attackT: 0,
      rollT: 0,
      rollCd: 0,
      rollDir: { x: 0, z: 1 },
      hurtT: 0,
      eatCd: 0,
      dead: false,
      moving: false,
    };
    this.builds = { fogueira: false, bancada: false, cabana: false, barco: false };
    this.quest = 0;
    this.counters = { slimes: 0, kills: 0 };
    this.bossDead = false;
    this.finished = false;
    this.stats = { deaths: 0, time: 0 };
    if (save) this.load(save);
    this.player.y = this.t.height(this.player.x, this.player.z);
  }

  // ---------- geração ----------

  /** Grade de células caminháveis alcançáveis a partir do acampamento. */
  buildReach() {
    const walk = new Uint8Array(GRID * GRID);
    for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) walk[j * GRID + i] = this.t.walkable(centerOf(i), centerOf(j)) ? 1 : 0;
    const reach = new Uint8Array(GRID * GRID);
    const q = [cellOf(CAMP.z) * GRID + cellOf(CAMP.x)];
    reach[q[0]] = 1;
    while (q.length) {
      const k = q.pop();
      const i = k % GRID;
      const j = (k - i) / GRID;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = i + di;
        const b = j + dj;
        if (a < 0 || b < 0 || a >= GRID || b >= GRID) continue;
        const kk = b * GRID + a;
        if (walk[kk] && !reach[kk]) {
          reach[kk] = 1;
          q.push(kk);
        }
      }
    }
    this.reach = reach;
  }

  reachable(x, z) {
    return this.reach[cellOf(z) * GRID + cellOf(x)] === 1;
  }

  genNodes() {
    const R = this.rand;
    this.nodes = [];
    this.hash = new Map();
    const far = (x, z, p, d) => Math.hypot(x - p.x, z - p.z) > d;
    const free = (x, z, gap) => {
      for (const n of this.near(x, z, gap + 3)) if (Math.hypot(n.x - x, n.z - z) < gap + n.r) return false;
      return true;
    };
    const add = (type, x, z, o = {}) => {
      const n = { id: this.nodes.length, type, x, z, y: this.t.height(x, z), alive: true, respawn: 0, rot: R() * 6.28, scale: 0.8 + R() * 0.5, hitT: 0, ...o };
      n.hp = n.maxHp;
      this.nodes.push(n);
      const key = `${Math.floor(x / 8)},${Math.floor(z / 8)}`;
      if (!this.hash.has(key)) this.hash.set(key, []);
      this.hash.get(key).push(n);
      return n;
    };
    const scatter = (count, tries, ok, make) => {
      let made = 0;
      for (let k = 0; k < tries && made < count; k++) {
        const x = (R() * 2 - 1) * (HALF - 12);
        const z = (R() * 2 - 1) * (HALF - 12);
        if (!this.reachable(x, z) || !far(x, z, CAMP, 15) || !far(x, z, BOSS, BOSS.r + 2) || !far(x, z, BOAT, 10)) continue;
        const h = this.t.height(x, z);
        if (!ok(x, z, h)) continue;
        make(x, z, h);
        made++;
      }
    };
    scatter(430, 9000, (x, z, h) => h > 1.8 && h < 31 && this.t.forest(x, z) > 0.42 + R() * 0.2 && free(x, z, 2.2), (x, z, h) =>
      add(h > 19 ? 'pine' : 'tree', x, z, { r: 0.7, maxHp: 30, give: 'wood', amount: h > 19 ? 4 : 3 }),
    );
    scatter(140, 4000, (x, z, h) => h > 1.2 && free(x, z, 2.2), (x, z) => add('rock', x, z, { r: 1.0, maxHp: 40, give: 'stone', amount: 3 }));
    scatter(80, 3000, (x, z, h) => h > 1.8 && h < 18 && free(x, z, 1.6), (x, z) => add('bush', x, z, { r: 0.6, maxHp: 1, give: 'berry', amount: 2 }));
    scatter(30, 6000, (x, z, h) => h > 24 && free(x, z, 2), (x, z) => add('crystal', x, z, { r: 0.8, maxHp: 50, give: 'crystal', amount: 2 }));
    scatter(9, 4000, (x, z, h) => h > 1.5 && h < 26 && free(x, z, 14) && far(x, z, CAMP, 45), (x, z) => add('chest', x, z, { r: 0.9, maxHp: 1 }));
    // relíquias em três cantos da ilha (na célula alcançável mais próxima do ponto ideal)
    [[150, 5], [-135, 55], [70, -125]].forEach(([tx, tz]) => {
      let best = null;
      let bd = Infinity;
      for (let j = 0; j < GRID; j++) {
        for (let i = 0; i < GRID; i++) {
          if (!this.reach[j * GRID + i]) continue;
          const x = centerOf(i);
          const z = centerOf(j);
          const d = Math.hypot(x - tx, z - tz);
          if (d < bd && this.t.height(x, z) > 1.5 && free(x, z, 3)) {
            bd = d;
            best = { x, z };
          }
        }
      }
      add('relic', best.x, best.z, { r: 0.8, maxHp: 1 });
    });
  }

  near(x, z, radius) {
    const out = [];
    const a = Math.floor((x - radius) / 8);
    const b = Math.floor((x + radius) / 8);
    const c = Math.floor((z - radius) / 8);
    const d = Math.floor((z + radius) / 8);
    for (let i = a; i <= b; i++) {
      for (let j = c; j <= d; j++) {
        const l = this.hash.get(`${i},${j}`);
        if (l) out.push(...l);
      }
    }
    return out;
  }

  // ---------- utilidades ----------

  emit(type, data = {}) {
    this.events.push({ type, ...data });
  }

  toast(msg) {
    this.emit('toast', { msg });
  }

  get questTalk() {
    return !!QUESTS[this.quest]?.talk;
  }

  get night() {
    return this.clock % (DAY_LEN + NIGHT_LEN) >= DAY_LEN;
  }

  /** 0 = meio-dia claro … 1 = noite fechada (com transição suave) */
  get darkness() {
    const c = this.clock % (DAY_LEN + NIGHT_LEN);
    return smoothstep(DAY_LEN - 25, DAY_LEN + 5, c) * (1 - smoothstep(DAY_LEN + NIGHT_LEN - 25, DAY_LEN + NIGHT_LEN, c));
  }

  get dmg() {
    return WEAPON_DMG[this.player.weapon - 1] + (this.player.level - 1) * 2;
  }

  has(cost) {
    return Object.entries(cost).every(([k, v]) => this.player.inv[k] >= v);
  }

  costText(cost) {
    return Object.entries(cost)
      .map(([k, v]) => `${v} ${ITEM_NAMES[k]}${v > 1 && !ITEM_NAMES[k].includes(' ') ? 's' : ''}`)
      .join(', ');
  }

  missingText(cost) {
    const miss = {};
    Object.entries(cost).forEach(([k, v]) => {
      if (this.player.inv[k] < v) miss[k] = v - this.player.inv[k];
    });
    return this.costText(miss);
  }

  pay(cost) {
    Object.entries(cost).forEach(([k, v]) => (this.player.inv[k] -= v));
  }

  give(item, n) {
    this.player.inv[item] += n;
    this.emit('pickup', { item, n });
  }

  // ---------- passo ----------

  update(dt, input = {}) {
    dt = Math.min(dt, 0.05);
    const p = this.player;
    this.stats.time += dt;
    this.clock += dt;
    if (!p.dead) this.updatePlayer(dt, input);
    this.updateEnemies(dt);
    this.updateShots(dt);
    this.updateNodes(dt);
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = 1.5;
      this.manageSpawns();
    }
    this.checkQuest();
  }

  updatePlayer(dt, input) {
    const p = this.player;
    p.atkCd -= dt;
    p.attackT -= dt;
    p.rollCd -= dt;
    p.hurtT -= dt;
    p.eatCd -= dt;
    let mx = input.mx ?? 0;
    let mz = input.mz ?? 0;
    const len = Math.hypot(mx, mz);
    if (len > 1) {
      mx /= len;
      mz /= len;
    }
    if (input.roll && p.rollCd <= 0 && p.rollT <= 0) {
      p.rollT = 0.34;
      p.rollCd = 0.95;
      const l = len > 0.1 ? len : 1;
      p.rollDir = len > 0.1 ? { x: mx / l, z: mz / l } : { x: Math.sin(p.yaw), z: Math.cos(p.yaw) };
      this.emit('roll');
    }
    let vx;
    let vz;
    if (p.rollT > 0) {
      p.rollT -= dt;
      vx = p.rollDir.x * 13;
      vz = p.rollDir.z * 13;
    } else {
      const slow = p.attackT > 0 ? 0.45 : 1;
      vx = mx * 6.2 * slow;
      vz = mz * 6.2 * slow;
      if (len > 0.1 && p.attackT <= 0) p.yaw = Math.atan2(mx, mz);
    }
    p.moving = Math.hypot(vx, vz) > 0.5;
    this.moveBody(p, vx * dt, vz * dt, 0.5);
    p.y = this.t.height(p.x, p.z);

    if (input.attack && p.atkCd <= 0 && p.rollT <= 0) this.attack();
    if (input.eat && p.eatCd <= 0) this.eat();
    if (input.interact) this.interact();

    // fogueira cura quem fica perto
    if (this.builds.fogueira && p.hp < p.maxHp && Math.hypot(p.x - BUILDS.fogueira.x, p.z - BUILDS.fogueira.z) < 8) p.hp = Math.min(p.maxHp, p.hp + 7 * dt);
  }

  /** Move um corpo respeitando água, encostas íngremes e árvores/pedras. */
  moveBody(b, dx, dz, radius) {
    const tryMove = (nx, nz) => {
      if (!this.t.walkable(nx, nz)) return false;
      b.x = nx;
      b.z = nz;
      return true;
    };
    if (!tryMove(b.x + dx, b.z + dz)) {
      if (!tryMove(b.x + dx, b.z)) tryMove(b.x, b.z + dz);
    }
    for (const n of this.near(b.x, b.z, 3)) {
      if (!n.alive || n.type === 'bush' || n.type === 'relic') continue;
      const d = Math.hypot(b.x - n.x, b.z - n.z);
      const min = n.r + radius;
      if (d < min && d > 0.001) {
        const nx = n.x + ((b.x - n.x) / d) * min;
        const nz = n.z + ((b.z - n.z) / d) * min;
        if (this.t.walkable(nx, nz)) {
          b.x = nx;
          b.z = nz;
        }
      }
    }
  }

  attack() {
    const p = this.player;
    p.atkCd = 0.42;
    p.attackT = 0.24;
    // mira automática no inimigo mais perto
    let target = null;
    let bd = 3.6;
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - p.x, e.z - p.z) - ENEMY[e.type].r;
      if (d < bd) {
        bd = d;
        target = e;
      }
    }
    if (target) p.yaw = Math.atan2(target.x - p.x, target.z - p.z);
    const fx = Math.sin(p.yaw);
    const fz = Math.cos(p.yaw);
    let hit = false;
    for (const e of [...this.enemies]) {
      const dx = e.x - p.x;
      const dz = e.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d - ENEMY[e.type].r > 2.7) continue;
      if (d > 0.5 && (dx * fx + dz * fz) / d < 0.25) continue;
      hit = true;
      this.damageEnemy(e, this.dmg);
    }
    this.emit('swing', { hit });
    if (hit) return;
    // sem inimigo: colhe o recurso na frente
    let node = null;
    bd = 2.9;
    for (const n of this.near(p.x, p.z, 4)) {
      if (!n.alive || n.type === 'chest' || n.type === 'relic') continue;
      const dx = n.x - p.x;
      const dz = n.z - p.z;
      const d = Math.hypot(dx, dz) - n.r;
      if (d < bd - 0.9 && (d < 0.4 || (dx * fx + dz * fz) / (d + n.r) > 0.1)) {
        bd = d + 0.9;
        node = n;
      }
    }
    if (!node) return;
    p.yaw = Math.atan2(node.x - p.x, node.z - p.z);
    if (node.type === 'crystal' && p.weapon < 2) {
      this.toast('Cristal é duro demais. Melhore a arma na bancada!');
      this.emit('clank', { x: node.x, z: node.z });
      return;
    }
    node.hp -= node.type === 'bush' ? 1 : 10 + p.weapon * 4;
    node.hitT = 0.25;
    this.emit('chop', { id: node.id, kind: node.type, x: node.x, z: node.z });
    if (node.hp <= 0) {
      node.alive = false;
      node.respawn = node.type === 'bush' ? 70 : node.type === 'crystal' ? 200 : 130;
      this.give(node.give, node.amount);
      this.emit('nodeDown', { id: node.id, kind: node.type, x: node.x, z: node.z });
    }
  }

  damageEnemy(e, dmg) {
    e.hp -= dmg;
    e.hitT = 0.18;
    // empurrão
    const p = this.player;
    const d = Math.hypot(e.x - p.x, e.z - p.z) || 1;
    if (e.type !== 'golem') this.moveBody(e, ((e.x - p.x) / d) * 0.9, ((e.z - p.z) / d) * 0.9, 0.5);
    if (e.state === 'idle') e.state = 'chase';
    this.emit('hit', { x: e.x, z: e.z, y: e.y, dmg, kind: e.type });
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e) {
    const def = ENEMY[e.type];
    this.enemies.splice(this.enemies.indexOf(e), 1);
    const coins = def.coin[0] + Math.floor(this.rand() * (def.coin[1] - def.coin[0] + 1));
    this.player.inv.coin += coins;
    this.counters.kills += 1;
    if (e.type === 'slime') this.counters.slimes += 1;
    this.emit('enemyDie', { id: e.id, kind: e.type, x: e.x, z: e.z, y: e.y, coins });
    this.addXp(def.xp);
    if (e.type === 'golem') {
      this.bossDead = true;
      this.give('core', 1);
      this.toast('O Golem caiu! Você pegou o coração dele.');
    }
  }

  addXp(n) {
    const p = this.player;
    p.xp += n;
    while (p.xp >= this.xpNeed()) {
      p.xp -= this.xpNeed();
      p.level += 1;
      p.maxHp += 12;
      p.hp = p.maxHp;
      this.emit('levelup', { level: p.level });
      this.toast(`Nível ${p.level}! Vida e dano aumentados.`);
    }
  }

  xpNeed() {
    return Math.round(30 * this.player.level * 1.25);
  }

  eat() {
    const p = this.player;
    if (p.hp >= p.maxHp) return;
    if (p.inv.berry > 0) {
      p.inv.berry -= 1;
      p.hp = Math.min(p.maxHp, p.hp + 18);
    } else if (p.inv.potion > 0) {
      p.inv.potion -= 1;
      p.hp = Math.min(p.maxHp, p.hp + 60);
    } else {
      return this.toast('Sem frutinhas nem poções. Colha nos arbustos!');
    }
    p.eatCd = 0.5;
    this.emit('eat');
  }

  hurtPlayer(dmg, from) {
    const p = this.player;
    if (p.dead || p.hurtT > 0 || p.rollT > 0) return false;
    p.hp -= dmg;
    p.hurtT = 0.55;
    this.emit('hurt', { dmg, x: from?.x, z: from?.z });
    if (p.hp <= 0) {
      p.hp = 0;
      p.dead = true;
      this.stats.deaths += 1;
      this.emit('death');
    }
    return true;
  }

  /** Volta para o acampamento (perde parte das moedas) ou revive no lugar (anúncio). */
  respawn(here = false) {
    const p = this.player;
    p.dead = false;
    p.hp = p.maxHp;
    p.hurtT = 2;
    if (!here) {
      p.inv.coin = Math.floor(p.inv.coin * 0.7);
      p.x = CAMP.x;
      p.z = CAMP.z + 4;
      this.enemies = this.enemies.filter((e) => e.type === 'golem');
      this.enemies.forEach((e) => this.resetBoss(e));
    }
    this.emit('respawn');
  }

  // ---------- interação ----------

  /** O que o botão de interagir faz agora (ou null). */
  context() {
    const p = this.player;
    const dist = (o) => Math.hypot(p.x - o.x, p.z - o.z);
    if (dist(NPC) < 3.2) return { kind: 'npc', label: 'Falar' };
    for (const [id, b] of Object.entries(BUILDS)) {
      if (dist(b) > b.r + 2.4) continue;
      if (!this.builds[id]) {
        if (id === 'barco' && !this.bossDead && this.quest < QUESTS.length - 1) return { kind: 'info', label: 'Barco quebrado', msg: 'O barco precisa de muita coisa. Siga as missões do Capitão.' };
        return { kind: 'build', id, label: `Construir ${b.name}`, cost: b.cost };
      }
      if (id === 'bancada' && p.weapon < 4) return { kind: 'upgrade', label: 'Melhorar arma', cost: UPGRADES[p.weapon] };
      if (id === 'cabana') return { kind: 'sleep', label: 'Dormir' };
      if (id === 'barco') return { kind: 'leave', label: 'Zarpar!' };
    }
    for (const n of this.near(p.x, p.z, 4)) {
      if (!n.alive || dist(n) > n.r + 2) continue;
      if (n.type === 'chest') return { kind: 'chest', node: n, label: 'Abrir baú' };
      if (n.type === 'relic') return { kind: 'relic', node: n, label: 'Pegar relíquia' };
    }
    return null;
  }

  interact() {
    const c = this.context();
    if (!c) return;
    const p = this.player;
    if (c.kind === 'npc') return this.talk();
    if (c.kind === 'info') return this.toast(c.msg);
    if (c.kind === 'build') {
      if (!this.has(c.cost)) return this.toast(`Falta: ${this.missingText(c.cost)}`);
      this.pay(c.cost);
      this.builds[c.id] = true;
      this.emit('build', { id: c.id });
      return this.toast(`${BUILDS[c.id].name}: pronto!`);
    }
    if (c.kind === 'upgrade') {
      if (!this.has(c.cost)) return this.toast(`Falta: ${this.missingText(c.cost)}`);
      this.pay(c.cost);
      p.weapon += 1;
      this.emit('upgrade', { weapon: p.weapon });
      return this.toast(`Nova arma: ${WEAPON_NAMES[p.weapon - 1]}!`);
    }
    if (c.kind === 'sleep') {
      const cyc = DAY_LEN + NIGHT_LEN;
      this.clock = Math.ceil(this.clock / cyc) * cyc + 20;
      p.hp = p.maxHp;
      this.enemies = this.enemies.filter((e) => e.type === 'golem');
      this.emit('sleep');
      return this.toast('Você dormiu até amanhecer. Vida cheia!');
    }
    if (c.kind === 'chest') {
      c.node.alive = false;
      c.node.respawn = Infinity;
      const coins = 18 + Math.floor(this.rand() * 18);
      p.inv.coin += coins;
      p.inv.potion += 1;
      this.emit('nodeDown', { id: c.node.id, kind: 'chest', x: c.node.x, z: c.node.z });
      this.emit('pickup', { item: 'coin', n: coins });
      return this.toast(`Baú: ${coins} moedas e 1 poção!`);
    }
    if (c.kind === 'relic') {
      c.node.alive = false;
      c.node.respawn = Infinity;
      this.give('relic', 1);
      this.emit('nodeDown', { id: c.node.id, kind: 'relic', x: c.node.x, z: c.node.z });
      return this.toast(`Relíquia ${p.inv.relic} de 3!`);
    }
    if (c.kind === 'leave') {
      this.finished = true;
      this.emit('ending');
    }
  }

  talk() {
    const q = QUESTS[this.quest];
    if (q?.talk) {
      this.completeQuest();
      return;
    }
    const p = this.player;
    if (p.inv.coin >= 15) {
      p.inv.coin -= 15;
      p.inv.potion += 1;
      this.emit('pickup', { item: 'potion', n: 1 });
      this.emit('dialog', { who: NPC.name, text: 'Uma poção por 15 moedas. Bom negócio! Volte sempre.' });
    } else {
      this.emit('dialog', { who: NPC.name, text: q ? `${q.hint} Se juntar 15 moedas, eu te vendo uma poção.` : 'A ilha é sua agora. Vendo poções por 15 moedas.' });
    }
  }

  // ---------- missões ----------

  checkQuest() {
    const q = QUESTS[this.quest];
    if (!q || q.talk) return;
    if (q.done(this)) this.completeQuest();
  }

  completeQuest() {
    const q = QUESTS[this.quest];
    this.quest += 1;
    if (q.reward?.coin) this.player.inv.coin += q.reward.coin;
    if (q.reward?.potion) this.player.inv.potion += q.reward.potion;
    this.addXp(q.reward?.xp ?? 0);
    this.counters.slimes = 0;
    this.emit('questDone', { title: q.title });
    const next = QUESTS[this.quest];
    this.emit('dialog', { who: NPC.name, text: q.after + (next ? ` Nova missão: ${next.title}.` : '') });
  }

  /** Para onde a bússola aponta. */
  objective() {
    const q = QUESTS[this.quest];
    return q ? q.where(this) : null;
  }

  nearestNode(types, from = this.player, pred = () => true) {
    let best = null;
    let bd = Infinity;
    for (const n of this.nodes) {
      if (!n.alive || !types.includes(n.type) || !pred(n)) continue;
      const d = Math.hypot(n.x - from.x, n.z - from.z);
      if (d < bd) {
        bd = d;
        best = n;
      }
    }
    return best;
  }

  // ---------- inimigos ----------

  spawnEnemy(type, x, z) {
    const def = ENEMY[type];
    const e = { id: this.nextId++, type, x, z, y: this.t.height(x, z), yaw: 0, hp: def.hp, maxHp: def.hp, state: 'idle', t: this.rand() * 2, hitT: 0, home: { x, z }, wander: null };
    this.enemies.push(e);
    return e;
  }

  manageSpawns() {
    const p = this.player;
    // chefão: aparece quando o jogador sobe à arena
    if (!this.bossDead && !this.enemies.some((e) => e.type === 'golem') && Math.hypot(p.x - BOSS.x, p.z - BOSS.z) < BOSS.r + 30) {
      this.spawnEnemy('golem', BOSS.x, BOSS.z);
    }
    this.enemies = this.enemies.filter((e) => e.type === 'golem' || Math.hypot(e.x - p.x, e.z - p.z) < 85);
    const inCamp = Math.hypot(p.x - CAMP.x, p.z - CAMP.z) < 30;
    const want = inCamp ? 2 : this.night ? 8 : 5;
    const count = this.enemies.filter((e) => e.type !== 'golem').length;
    if (count >= want) return;
    for (let k = 0; k < 8; k++) {
      const a = this.rand() * 6.28;
      const d = 26 + this.rand() * 22;
      const x = p.x + Math.cos(a) * d;
      const z = p.z + Math.sin(a) * d;
      if (!this.reachable(x, z) || Math.hypot(x - CAMP.x, z - CAMP.z) < 34 || Math.hypot(x - BOSS.x, z - BOSS.z) < BOSS.r + 6) continue;
      const h = this.t.height(x, z);
      if (h < 1) continue;
      const wolfy = (this.night ? 0.55 : 0.12) + (this.t.forest(x, z) > 0.55 ? 0.15 : 0) + (h > 22 ? 0.15 : 0);
      this.spawnEnemy(this.rand() < wolfy ? 'wolf' : 'slime', x, z);
      return;
    }
  }

  resetBoss(e) {
    e.x = BOSS.x;
    e.z = BOSS.z;
    e.hp = e.maxHp;
    e.state = 'idle';
  }

  updateEnemies(dt) {
    const p = this.player;
    for (const e of [...this.enemies]) {
      const def = ENEMY[e.type];
      e.hitT -= dt;
      e.t -= dt;
      const dx = p.x - e.x;
      const dz = p.z - e.z;
      const d = Math.hypot(dx, dz);
      const boss = e.type === 'golem';
      const enraged = boss && e.hp < e.maxHp * 0.4;
      const safe = !boss && this.builds.fogueira && Math.hypot(p.x - CAMP.x, p.z - CAMP.z) < 16; // inimigos têm medo da fogueira
      if (e.state === 'idle') {
        if (!p.dead && d < def.aggro && !safe) e.state = 'chase';
        else if (!boss) {
          if (!e.wander || e.t <= 0) {
            const a = this.rand() * 6.28;
            e.wander = { x: Math.cos(a), z: Math.sin(a) };
            e.t = 1.5 + this.rand() * 3;
            e.pause = this.rand() < 0.4;
          }
          if (!e.pause) {
            this.moveBody(e, e.wander.x * def.speed * 0.3 * dt, e.wander.z * def.speed * 0.3 * dt, 0.5);
            e.yaw = Math.atan2(e.wander.x, e.wander.z);
          }
        }
      } else if (e.state === 'chase') {
        if (p.dead || d > def.aggro * 2.2 || safe || (boss && Math.hypot(p.x - BOSS.x, p.z - BOSS.z) > BOSS.r + 26)) {
          e.state = 'idle';
          if (boss) this.resetBoss(e);
          continue;
        }
        e.yaw = Math.atan2(dx, dz);
        if (boss && d > 8 && e.t <= 0) {
          e.state = 'throw';
          e.t = 0.8;
          this.emit('windup', { id: e.id, kind: 'throw' });
        } else if (d < def.range) {
          e.state = 'windup';
          e.t = def.windup * (enraged ? 0.7 : 1);
          this.emit('windup', { id: e.id, kind: boss ? 'slam' : 'bite', x: e.x, z: e.z, r: boss ? 5.5 : 0, time: e.t });
        } else {
          const sp = def.speed * (enraged ? 1.5 : 1);
          this.moveBody(e, (dx / d) * sp * dt, (dz / d) * sp * dt, 0.5);
        }
      } else if (e.state === 'windup') {
        if (e.t <= 0) {
          const reach = boss ? 5.5 : def.range + 0.5;
          if (d < reach) this.hurtPlayer(def.dmg, e);
          this.emit('strike', { id: e.id, kind: boss ? 'slam' : 'bite', x: e.x, z: e.z });
          e.state = 'cool';
          e.t = def.cool * (enraged ? 0.6 : 1);
        }
      } else if (e.state === 'throw') {
        e.yaw = Math.atan2(dx, dz);
        if (e.t <= 0) {
          const time = Math.max(0.6, d / 17);
          this.shots.push({ id: this.nextId++, x: e.x, z: e.z, y: e.y + 4, tx: p.x, tz: p.z, t: 0, time, sx: e.x, sz: e.z });
          this.emit('throw', { x: e.x, z: e.z });
          e.state = 'cool';
          e.t = enraged ? 0.9 : 1.6;
        }
      } else if (e.state === 'cool') {
        if (e.t <= 0) {
          e.state = 'chase';
          e.t = boss ? 2.2 : 0;
        }
      }
      e.y = this.t.height(e.x, e.z);
    }
  }

  updateShots(dt) {
    const p = this.player;
    for (const s of [...this.shots]) {
      s.t += dt;
      const k = Math.min(1, s.t / s.time);
      s.x = s.sx + (s.tx - s.sx) * k;
      s.z = s.sz + (s.tz - s.sz) * k;
      s.y = this.t.height(s.x, s.z) + 4 * (1 - k) + Math.sin(k * Math.PI) * 6;
      if (k >= 1) {
        this.shots.splice(this.shots.indexOf(s), 1);
        if (Math.hypot(p.x - s.tx, p.z - s.tz) < 2.6) this.hurtPlayer(20, s);
        this.emit('boom', { x: s.tx, z: s.tz });
      }
    }
  }

  updateNodes(dt) {
    for (const n of this.nodes) {
      if (n.hitT > 0) n.hitT -= dt;
      if (!n.alive && n.respawn !== Infinity) {
        n.respawn -= dt;
        if (n.respawn <= 0 && Math.hypot(n.x - this.player.x, n.z - this.player.z) > 14) {
          n.alive = true;
          n.hp = n.maxHp;
          this.emit('nodeUp', { id: n.id, kind: n.type });
        }
      }
    }
  }

  // ---------- salvar ----------

  serialize() {
    const p = this.player;
    return {
      v: 1,
      seed: this.seed,
      p: { x: p.x, z: p.z, hp: p.hp, maxHp: p.maxHp, level: p.level, xp: p.xp, weapon: p.weapon, inv: p.inv },
      builds: this.builds,
      quest: this.quest,
      counters: this.counters,
      bossDead: this.bossDead,
      finished: this.finished,
      clock: this.clock,
      taken: this.nodes.filter((n) => !n.alive && n.respawn === Infinity).map((n) => n.id),
      stats: this.stats,
    };
  }

  load(s) {
    Object.assign(this.player, s.p, { inv: { ...this.player.inv, ...s.p.inv } });
    if (this.player.hp <= 0) this.player.hp = this.player.maxHp;
    Object.assign(this.builds, s.builds);
    this.quest = s.quest;
    Object.assign(this.counters, s.counters);
    this.bossDead = s.bossDead;
    this.finished = s.finished;
    this.clock = s.clock;
    Object.assign(this.stats, s.stats);
    (s.taken ?? []).forEach((id) => {
      const n = this.nodes[id];
      if (n) {
        n.alive = false;
        n.respawn = Infinity;
      }
    });
    if (!this.t.walkable(this.player.x, this.player.z)) {
      this.player.x = CAMP.x;
      this.player.z = CAMP.z + 4;
    }
  }
}

export { cellOf, centerOf };
