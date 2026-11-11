// Robô de testes: joga a história inteira da Ilha Brava sem tela (anda, colhe, luta, constrói, enfrenta o Golem).
// Uso: node tools/bot.js [semente] [minutos máximos]
import { CELL, GRID, HALF, World, cellOf, centerOf } from '../src/world.js';
import { QUESTS } from '../src/quests.js';

const seed = Number(process.argv[2] ?? 7);
const maxMin = Number(process.argv[3] ?? 90);
const w = new World(seed);
const DT = 1 / 30;

/** Caminho em células (BFS) do jogador até a célula alcançável mais perto do alvo. */
function path(tx, tz) {
  const start = cellOf(w.player.z) * GRID + cellOf(w.player.x);
  let goal = cellOf(tz) * GRID + cellOf(tx);
  if (!w.reach[goal]) {
    let bd = Infinity;
    for (let k = 0; k < GRID * GRID; k++) {
      if (!w.reach[k]) continue;
      const d = Math.hypot(centerOf(k % GRID) - tx, centerOf(Math.floor(k / GRID)) - tz);
      if (d < bd) {
        bd = d;
        goal = k;
      }
    }
  }
  const prev = new Int32Array(GRID * GRID).fill(-1);
  const q = [start];
  prev[start] = start;
  for (let h = 0; h < q.length; h++) {
    const k = q[h];
    if (k === goal) break;
    const i = k % GRID;
    const j = (k - i) / GRID;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const a = i + di;
      const b = j + dj;
      if (a < 0 || b < 0 || a >= GRID || b >= GRID) continue;
      const kk = b * GRID + a;
      if (!w.reach[kk] || prev[kk] !== -1) continue;
      if (di && dj && (!w.reach[j * GRID + a] || !w.reach[b * GRID + i])) continue;
      prev[kk] = k;
      q.push(kk);
    }
  }
  if (prev[goal] === -1) return null;
  const out = [];
  for (let k = goal; k !== start; k = prev[k]) out.push({ x: centerOf(k % GRID), z: centerOf(Math.floor(k / GRID)) });
  return out.reverse();
}

let route = null;
let routeFor = null;
let routeAge = 0;
let stuckT = 0;
let last = { x: w.player.x, z: w.player.z };
let jitter = 0;
let jitterDir = { x: 1, z: 0 };
const log = [];
let questSeen = 0;

function moveTo(tx, tz, input) {
  const p = w.player;
  const key = `${Math.round(tx / CELL)},${Math.round(tz / CELL)}`;
  routeAge += DT;
  if (!route || routeFor !== key || routeAge > 4) {
    route = path(tx, tz);
    routeFor = key;
    routeAge = 0;
  }
  let gx = tx;
  let gz = tz;
  if (route?.length) {
    while (route.length > 1 && Math.hypot(route[0].x - p.x, route[0].z - p.z) < 3) route.shift();
    if (Math.hypot(tx - p.x, tz - p.z) > 6) {
      gx = route[0].x;
      gz = route[0].z;
    }
  }
  const d = Math.hypot(gx - p.x, gz - p.z) || 1;
  input.mx = (gx - p.x) / d;
  input.mz = (gz - p.z) / d;
}

function think() {
  const p = w.player;
  const input = { mx: 0, mz: 0 };
  if (p.dead) {
    w.respawn();
    route = null;
    return input;
  }
  if (p.hp < p.maxHp * 0.5 && (p.inv.berry > 0 || p.inv.potion > 0)) input.eat = true;
  if (jitter > 0) {
    jitter -= DT;
    input.mx = jitterDir.x;
    input.mz = jitterDir.z;
    return input;
  }
  // perigo: pedra do Golem vindo → sai de baixo
  const shot = w.shots.find((s) => Math.hypot(s.tx - p.x, s.tz - p.z) < 3.4);
  if (shot) {
    const d = Math.hypot(p.x - shot.tx, p.z - shot.tz) || 1;
    input.mx = (p.x - shot.tx) / d || 1;
    input.mz = (p.z - shot.tz) / d;
    input.roll = true;
    return input;
  }
  // combate
  let foe = null;
  let fd = 9;
  for (const e of w.enemies) {
    const d = Math.hypot(e.x - p.x, e.z - p.z);
    if (d < fd && (e.state !== 'idle' || d < 5 || e.type === 'golem')) {
      fd = d;
      foe = e;
    }
  }
  const q = QUESTS[w.quest];
  const huntBoss = q && q.title.startsWith('Derrote o Golem');
  const boss = w.enemies.find((e) => e.type === 'golem');
  if (huntBoss && boss && fd > 9) {
    foe = boss;
    fd = Math.hypot(boss.x - p.x, boss.z - p.z);
  }
  if (foe && (foe.type !== 'golem' || huntBoss)) {
    const dx = foe.x - p.x;
    const dz = foe.z - p.z;
    const d = fd || 1;
    const danger = foe.type === 'golem' ? 6.2 : 2.6;
    if (foe.state === 'windup' && d < danger) {
      input.mx = -dx / d;
      input.mz = -dz / d;
      input.roll = true;
    } else if (d > (foe.type === 'golem' ? 3.6 : 2.2)) {
      input.mx = dx / d;
      input.mz = dz / d;
    } else {
      input.attack = true;
    }
    // se a vida está baixa contra o chefão, recua para comer
    if (foe.type === 'golem' && p.hp < p.maxHp * 0.35 && p.inv.berry + p.inv.potion === 0) {
      input.mx = -dx / d;
      input.mz = -dz / d;
    }
    return input;
  }
  // antes do chefão: junta frutinhas
  if (huntBoss && p.inv.berry < 10 && !boss) {
    const bush = w.nearestNode(['bush']);
    if (bush) return goUse(bush, input, true);
  }
  // missão
  const obj = w.objective();
  if (!obj) return input;
  return goUse(obj, input, !!obj.label);
}

function goUse(obj, input, harvest) {
  const p = w.player;
  const d = Math.hypot(obj.x - p.x, obj.z - p.z);
  const ctx = w.context();
  const q = QUESTS[w.quest];
  const wantCtx = ctx && (['build', 'upgrade', 'relic', 'chest', 'leave'].includes(ctx.kind) || (ctx.kind === 'npc' && q?.talk));
  if (wantCtx && (ctx.kind !== 'build' && ctx.kind !== 'upgrade' ? true : w.has(ctx.cost))) {
    if (d < 5 || ctx.kind === 'chest') {
      input.interact = true;
      return input;
    }
  }
  if (harvest && d < 2.4) {
    // vira para o recurso e bate
    p.yaw = Math.atan2(obj.x - p.x, obj.z - p.z);
    input.attack = true;
    return input;
  }
  if (d > 1.6) moveTo(obj.x, obj.z, input);
  return input;
}

const steps = Math.round((maxMin * 60) / DT);
for (let s = 0; s < steps && !w.finished; s++) {
  const input = think();
  w.update(DT, input);
  for (const ev of w.events) {
    if (ev.type === 'questDone') log.push(`${(w.stats.time / 60).toFixed(1).padStart(5)} min  ✓ ${ev.title}  (nível ${w.player.level}, vida ${Math.round(w.player.hp)}/${w.player.maxHp}, mortes ${w.stats.deaths})`);
    if (ev.type === 'death') log.push(`${(w.stats.time / 60).toFixed(1).padStart(5)} min  ✗ morreu (missão: ${QUESTS[w.quest]?.title})`);
  }
  w.events.length = 0;
  if (process.env.DEBUG && s % 300 === 0 && w.stats.time > Number(process.env.DEBUG) * 60) {
    const o = w.objective();
    const n = w.enemies.map((e) => `${e.type}:${e.state}@${Math.hypot(e.x - w.player.x, e.z - w.player.z).toFixed(0)}`).join(' ');
    console.log(`t=${(w.stats.time / 60).toFixed(2)} pos=(${w.player.x.toFixed(1)},${w.player.z.toFixed(1)}) h=${w.player.y.toFixed(1)} hp=${Math.round(w.player.hp)} alvo=${o && `${o.label ?? ''}(${o.x.toFixed(1)},${o.z.toFixed(1)})`} in=${JSON.stringify(input)} cris=${w.player.inv.crystal} | ${n}`);
  }
  // preso?
  if (s % 30 === 0) {
    const moved = Math.hypot(w.player.x - last.x, w.player.z - last.z);
    const busy = input.attack || input.interact || w.player.dead;
    stuckT = moved < 0.3 && !busy ? stuckT + 1 : 0;
    last = { x: w.player.x, z: w.player.z };
    if (stuckT >= 4) {
      const a = Math.random() * 6.28;
      jitterDir = { x: Math.cos(a), z: Math.sin(a) };
      jitter = 1.2;
      route = null;
      stuckT = 0;
    }
  }
  if (w.quest !== questSeen) questSeen = w.quest;
}
console.log(log.join('\n'));
const p = w.player;
console.log(`\n${w.finished ? 'ZEROU O JOGO' : `PAROU na missão ${w.quest + 1}/${QUESTS.length}: ${QUESTS[w.quest]?.title}`} em ${(w.stats.time / 60).toFixed(1)} min de jogo`);
console.log(`nível ${p.level}, arma ${p.weapon}, mortes ${w.stats.deaths}, inventário ${JSON.stringify(p.inv)}`);
console.log(`posição (${p.x.toFixed(0)}, ${p.z.toFixed(0)}), alvo ${JSON.stringify(w.objective() && { x: Math.round(w.objective().x), z: Math.round(w.objective().z) })}, células alcançáveis ${w.reach.reduce((a, b) => a + b, 0)}/${GRID * GRID}, HALF ${HALF}`);
process.exit(w.finished ? 0 : 1);
