// Robô de testes: desenha o traço da dica em cada fase e simula a física.
// Mostra se o Bolota sobrevive com a dica (a dica precisa funcionar!) e se perde sem traço nenhum.
import { Level, hintPath } from '../src/game.js';
import { LEVELS, levelAt } from '../src/levels.js';

function play(def, draw) {
  const lv = new Level(def);
  if (draw) {
    const pts = hintPath(def);
    lv.beginStroke(pts[0].x, pts[0].y);
    pts.slice(1).forEach((p) => lv.extendStroke(p.x, p.y));
    if (!lv.endStroke()) return { result: 'traço inválido', ink: 0 };
  } else {
    lv.state = 'run';
  }
  for (let t = 0; t < lv.timeTotal + 1 && lv.state === 'run'; t += 1 / 60) lv.update(1 / 60);
  return { result: lv.state === 'win' ? 'ganhou' : `perdeu (${lv.loseReason})`, ink: Math.round((lv.inkUsed / lv.inkMax) * 100), stars: lv.stars, blocked: lv.blocked };
}

const N = Number(process.argv[2] ?? LEVELS.length + 3);
let bad = 0;
for (let i = 0; i < N; i++) {
  const def = levelAt(i);
  const runs = 8;
  let wins = 0;
  let info;
  for (let k = 0; k < runs; k++) {
    info = play(levelAt(i), true);
    if (info.result === 'ganhou') wins++;
  }
  const none = play(levelAt(i), false);
  const ok = wins >= 6 && none.result !== 'ganhou';
  if (!ok) bad++;
  console.log(`${ok ? '✓' : '✗'} ${String(i + 1).padStart(2)} ${def.name.padEnd(18)} dica: ${wins}/${runs} vitórias, tinta ${info.ink}%${info.blocked ? ' (traço cortado)' : ''} · sem traço: ${none.result} ${ok ? '' : `<- ${info.result}`}`);
}
console.log(bad ? `\n${bad} fase(s) precisam de ajuste` : '\nTodas as fases ok');
