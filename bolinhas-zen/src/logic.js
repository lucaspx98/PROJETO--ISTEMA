// Regras do jogo e gerador de níveis. Sem dependência do Phaser, para poder ser testado com Node.
// Um tubo é um array de cores (números), do fundo para o topo.

/** Quantas bolinhas da mesma cor estão juntas no topo do tubo. */
export function topRun(tube) {
  let n = 0;
  const top = tube[tube.length - 1];
  for (let i = tube.length - 1; i >= 0 && tube[i] === top; i--) n++;
  return n;
}

export const isComplete = (tube, cap) => tube.length === cap && topRun(tube) === cap;

export const isSolved = (tubes, cap) => tubes.every((t) => t.length === 0 || isComplete(t, cap));

/** Quantas bolinhas sairiam de `from` para `to` (0 = jogada inválida). Move todo o bloco da mesma cor que couber. */
export function moveCount(tubes, from, to, cap) {
  const a = tubes[from];
  const b = tubes[to];
  if (from === to || a.length === 0 || b.length >= cap || isComplete(a, cap)) return 0;
  if (b.length > 0 && b[b.length - 1] !== a[a.length - 1]) return 0;
  return Math.min(topRun(a), cap - b.length);
}

export function applyMove(tubes, from, to, count) {
  for (let i = 0; i < count; i++) tubes[to].push(tubes[from].pop());
}

/**
 * Busca em profundidade: devolve uma sequência de jogadas [de, para, n] que resolve a posição,
 * ou null se não achar dentro do limite de estados.
 */
export function solve(start, cap, limit = 60000) {
  const seen = new Set();
  let nodes = 0;
  const key = (ts) => ts.map((t) => t.join(',')).sort().join('|');

  const path = [];
  const dfs = (ts) => {
    if (isSolved(ts, cap)) return true;
    if (++nodes > limit) return false;
    const k = key(ts);
    if (seen.has(k)) return false;
    seen.add(k);

    const moves = [];
    for (let i = 0; i < ts.length; i++) {
      for (let j = 0; j < ts.length; j++) {
        const n = moveCount(ts, i, j, cap);
        if (!n) continue;
        // Mover um tubo de uma cor só para um tubo vazio não muda nada.
        if (ts[j].length === 0 && topRun(ts[i]) === ts[i].length) continue;
        // Prioriza empilhar sobre a mesma cor e completar tubos.
        const score = (ts[j].length > 0 ? 10 : 0) + ts[j].length + n;
        moves.push([score, i, j, n]);
      }
    }
    moves.sort((x, y) => y[0] - x[0]);
    for (const [, i, j, n] of moves) {
      const next = ts.map((t) => t.slice());
      applyMove(next, i, j, n);
      path.push([i, j, n]);
      if (dfs(next)) return true;
      path.pop();
    }
    return false;
  };
  return dfs(start.map((t) => t.slice())) ? path : null;
}

export const solvable = (tubes, cap, limit) => solve(tubes, cap, limit) !== null;

/** Gerador pseudoaleatório com semente: o mesmo nível sempre gera o mesmo tabuleiro. */
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

export const MAX_COLORS = 11;

/** Número de cores do nível: começa com 3 e ganha uma cor a cada 2 níveis. */
export const colorsForLevel = (level) => Math.min(3 + Math.floor((level - 1) / 2), MAX_COLORS);

/** Gera um nível com solução garantida: `cores` tubos cheios embaralhados + 2 tubos vazios. */
export function generateLevel(level, cap) {
  const colors = colorsForLevel(level);
  const rand = rng(level * 7919 + 17);
  for (let attempt = 0; attempt < 200; attempt++) {
    const balls = [];
    for (let c = 0; c < colors; c++) for (let i = 0; i < cap; i++) balls.push(c);
    for (let i = balls.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [balls[i], balls[j]] = [balls[j], balls[i]];
    }
    const tubes = [];
    for (let c = 0; c < colors; c++) tubes.push(balls.slice(c * cap, c * cap + cap));
    tubes.push([], []);
    // Evita tubos que já começam prontos, que deixam o nível sem graça.
    if (tubes.some((t) => isComplete(t, cap))) continue;
    if (solvable(tubes, cap)) return tubes;
  }
  throw new Error(`Não foi possível gerar o nível ${level}`);
}
