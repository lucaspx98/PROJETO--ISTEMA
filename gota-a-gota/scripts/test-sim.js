// Testes da simulação: `npm test`.
// Um "jogador robô" desembaça caminhos retos e resolve os níveis sem prateleiras e sem névoa voltando.
import { CELL, GLASS_BOTTOM, GLASS_TOP, Sim, generateLevel } from '../src/sim.js';
import { pigmentToRgb, sameColor, RECIPES } from '../src/colors.js';

let fail = 0;
const check = (cond, msg) => cond || (fail++, console.error('falhou:', msg));

// Cores
check(pigmentToRgb([1, 0, 0]) === 0xed2938, 'vermelho');
check(sameColor([2, 2, 0], RECIPES.laranja), 'proporção igual = mesma cor');
check(!sameColor([1, 0, 0], RECIPES.laranja), 'vermelho não é laranja');

const run = (sim, seconds) => {
  for (let t = 0; t < seconds && sim.state === 'playing'; t += 1 / 60) sim.step(1 / 60);
};
const wipePath = (sim, pts) => {
  for (let i = 1; i < pts.length; i++) sim.wipe(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 14);
};

// Gota parada no vidro embaçado; desembaçar embaixo dela faz escorrer até o pote certo.
{
  const sim = new Sim({ jars: [{ name: 'vermelho', pig: [1, 0, 0], units: 1, x: 270, w: 100 }], drops: [{ x: 270, y: 300, pig: [1, 0, 0] }], walls: [], regrow: 0 });
  run(sim, 1);
  check(sim.drops[0].y === 300, 'gota fica parada na névoa');
  wipePath(sim, [[270, 300], [270, GLASS_BOTTOM]]);
  run(sim, 4);
  check(sim.state === 'won', 'gota escorre e enche o pote');
}

// Canal inclinado: a gota desce na diagonal
{
  const sim = new Sim({ jars: [{ name: 'azul', pig: [0, 0, 1], units: 1, x: 400, w: 100 }], drops: [{ x: 120, y: 200, pig: [0, 0, 1] }], walls: [], regrow: 0 });
  wipePath(sim, [[120, 200], [400, 600], [400, GLASS_BOTTOM]]);
  run(sim, 6);
  check(sim.state === 'won', 'gota segue canal inclinado');
}

// Canal horizontal demais: a gota não sobe nem anda reto para sempre
{
  const sim = new Sim({ jars: [{ name: 'azul', pig: [0, 0, 1], units: 1, x: 450, w: 100 }], drops: [{ x: 60, y: 300, pig: [0, 0, 1] }], walls: [], regrow: 0 });
  wipePath(sim, [[60, 300], [450, 300]]);
  run(sim, 3);
  check(sim.state === 'playing' && sim.drops[0].x < 120, 'canal horizontal não leva a gota');
}

// Gota caindo fora do pote = perdida = fim de jogo; continuar devolve a gota
{
  const sim = new Sim({ jars: [{ name: 'azul', pig: [0, 0, 1], units: 1, x: 450, w: 80 }], drops: [{ x: 100, y: 300, pig: [0, 0, 1] }], walls: [], regrow: 0 });
  wipePath(sim, [[100, 300], [100, GLASS_BOTTOM]]);
  run(sim, 4);
  check(sim.state === 'lost', 'perder a gota encerra o nível');
  sim.restoreLost();
  check(sim.state === 'playing' && sim.drops.length === 1 && sim.drops[0].y === 300, 'continuar devolve a gota');
}

// Prateleira bloqueia a descida
{
  const sim = new Sim({ jars: [{ name: 'azul', pig: [0, 0, 1], units: 1, x: 270, w: 100 }], drops: [{ x: 270, y: 200, pig: [0, 0, 1] }], walls: [{ c0: 30, len: 30, row: 50 }], regrow: 0 });
  wipePath(sim, [[270, 200], [270, GLASS_BOTTOM]]);
  run(sim, 4);
  check(sim.state === 'playing' && Math.abs(sim.drops[0].y - (GLASS_TOP + 50 * CELL)) < 10, 'prateleira segura a gota');
}

// Névoa volta sozinha quando o nível tem regrow
{
  const sim = new Sim({ jars: [{ name: 'azul', pig: [0, 0, 1], units: 1, x: 270, w: 100 }], drops: [{ x: 100, y: 200, pig: [0, 0, 1] }], walls: [], regrow: 0.2 });
  sim.wipe(400, 500, 400, 500, 20);
  run(sim, 6);
  check(sim.fog[Math.floor((500 - GLASS_TOP) / CELL) * 90 + Math.floor(400 / CELL)] > 0.9, 'névoa volta');
}

/**
 * Robô: para cada pote, desembaça um caminho de cada gota certa até um ponto acima do pote
 * (desviando das outras gotas), espera elas se juntarem e depois abre o caminho até o pote.
 */
function botSolve(def) {
  const sim = new Sim({ ...def, walls: [], regrow: 0 });
  for (const jar of sim.jars) {
    const want = jar.pig.slice();
    const chosen = [];
    for (const d of [...sim.drops].sort((a, b) => b.y - a.y)) {
      const c = d.pig.findIndex((v) => v > 0);
      if (d.units === 1 && want[c] > 0) {
        want[c]--;
        chosen.push(d);
      }
    }
    if (!chosen.length) return 'sem gotas';
    const others = sim.drops.filter((d) => !chosen.includes(d));
    const meetY = Math.min(GLASS_BOTTOM - 40, Math.max(...chosen.map((d) => d.y + Math.abs(d.x - jar.x) / 2)) + 40);
    const route = (x0, y0, x1, y1) => {
      const pts = [];
      for (let k = 0; k <= 30; k++) {
        let x = x0 + ((x1 - x0) * k) / 30;
        const y = y0 + ((y1 - y0) * k) / 30;
        for (const o of others) if (Math.abs(o.y - y) < 40 && Math.abs(o.x - x) < 38) x = o.x + (x >= o.x ? 38 : -38);
        pts.push([x, y]);
      }
      return pts;
    };
    chosen.forEach((d) => wipePath(sim, [[d.x, d.y], ...route(d.x, d.y + 12, jar.x, meetY)]));
    run(sim, 6);
    wipePath(sim, route(jar.x, meetY - 5, jar.x, GLASS_BOTTOM));
    run(sim, 6);
    sim.fog.fill(1); // cada pote começa com o vidro embaçado de novo, para os canais não se cruzarem
  }
  return sim.state;
}

let solved = 0;
const t0 = Date.now();
for (let level = 1; level <= 120; level++) {
  const tl = Date.now();
  const def = generateLevel(level);
  const have = [0, 0, 0];
  def.drops.forEach((d) => d.pig.forEach((v, k) => (have[k] += v)));
  const need = [0, 0, 0];
  def.jars.forEach((j) => j.pig.forEach((v, k) => (need[k] += v)));
  check(need.every((v, k) => have[k] >= v), `nível ${level}: gotas suficientes`);
  check(def.drops.every((d) => d.x > 20 && d.x < 520 && d.y > GLASS_TOP && d.y < GLASS_BOTTOM - 100), `nível ${level}: gotas dentro do vidro`);
  check(JSON.stringify(def) === JSON.stringify(generateLevel(level)), `nível ${level}: sempre igual`);
  const sim = new Sim(def);
  check(def.drops.every((d) => !def.walls.some((w) => Math.abs(GLASS_TOP + w.row * CELL - d.y) < 30 && d.x > w.c0 * CELL - 20 && d.x < (w.c0 + w.len) * CELL + 20)), `nível ${level}: gota longe das prateleiras`);
  check(sim.drops.length === def.drops.length, `nível ${level}: gotas não começam grudadas`);
  const res = botSolve(def);
  if (process.env.DEBUG) console.log(level, Date.now() - tl, res);
  if (res === 'won') solved++;
  else if (process.env.DEBUG) console.error('robô não resolveu o nível', level);

}
// O robô é simples (anda em linha reta e não planeja), então não resolve tudo; serve de alarme se a física quebrar.
check(solved >= 96, `robô resolve pelo menos 80% dos níveis (${solved}/120)`);
console.log(fail ? `${fail} falha(s)` : `OK: mecânicas + ${solved}/120 níveis resolvidos pelo robô (${Date.now() - t0} ms)`);
process.exit(fail ? 1 : 0);
