// Confere que os níveis gerados são válidos e têm solução: `npm test`.
import { CAPACITY } from '../src/config.js';
import { colorsForLevel, generateLevel, isSolved, moveCount, solvable, solve, applyMove } from '../src/logic.js';

let fail = 0;
const t0 = Date.now();
for (let level = 1; level <= 300; level++) {
  const tubes = generateLevel(level, CAPACITY);
  const colors = colorsForLevel(level);
  const counts = {};
  tubes.flat().forEach((c) => (counts[c] = (counts[c] || 0) + 1));
  const ok =
    tubes.length === colors + 2 &&
    Object.keys(counts).length === colors &&
    Object.values(counts).every((n) => n === CAPACITY) &&
    !isSolved(tubes, CAPACITY) &&
    solvable(tubes, CAPACITY);
  if (!ok) {
    fail++;
    console.error('nível inválido', level, JSON.stringify(tubes));
  }
}
// A solução devolvida é feita só de jogadas válidas e termina o nível.
for (const level of [1, 7, 25]) {
  const tubes = generateLevel(level, CAPACITY);
  for (const [a, b, n] of solve(tubes, CAPACITY)) {
    if (moveCount(tubes, a, b, CAPACITY) !== n) fail++;
    applyMove(tubes, a, b, n);
  }
  if (!isSolved(tubes, CAPACITY)) (fail++, console.error('solução não resolve o nível', level));
}

// Mesmo nível = mesmo tabuleiro (reiniciar não troca o desafio).
if (JSON.stringify(generateLevel(42, CAPACITY)) !== JSON.stringify(generateLevel(42, CAPACITY))) fail++;

// Regras de jogada
const t = [[0, 1, 1], [1], [], [2, 2, 2, 2]];
const check = (cond, msg) => cond || (fail++, console.error('falhou:', msg));
check(moveCount(t, 0, 1, 4) === 2, 'move o bloco inteiro da mesma cor');
check(moveCount(t, 0, 2, 4) === 2, 'pode ir para tubo vazio');
check(moveCount(t, 1, 3, 4) === 0, 'não entra em tubo cheio');
check(moveCount(t, 3, 2, 4) === 0, 'tubo completo não sai');
check(moveCount(t, 2, 0, 4) === 0, 'tubo vazio não tem o que mover');
applyMove(t, 0, 1, 2);
check(JSON.stringify(t[1]) === '[1,1,1]' && JSON.stringify(t[0]) === '[0]', 'applyMove');

console.log(fail ? `${fail} falha(s)` : `OK: 300 níveis válidos e com solução (${Date.now() - t0} ms)`);
process.exit(fail ? 1 : 0);
