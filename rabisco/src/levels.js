// Fases. Tela lógica 540×960 (em pé). Retângulos são dados pelo centro (x, y), largura e altura.
// O Bolota (raio 34) parado no chão fica com y = topo do chão - 34.
//   hives:   colmeias  { x, y, count }          → abelhas que perseguem o Bolota
//   rocks:   chuva de pedras { x0, x1, count, every }
//   cannons: canhões  { x, y, dir (lado para onde aponta), every, speed? } — miram sozinhos no Bolota
//   kind 'spike' = espinhos (encostar perde)
//   hint:    forma do traço da dica: dome | roof | wallL | wallR | cup (hintR = raio da cúpula);
//            ou hintPts com os pontos exatos
//   ink:     comprimento máximo do traço (px)

import { Level, hintPath } from './game.js';

const floor = (top = 840) => ({ x: 270, y: top + 60, w: 600, h: 120 });
const plat = (x, top, w, angle = 0) => ({ x, y: top + 15, w, h: 30, angle });
const wall = (x, top, h) => ({ x, y: top + h / 2, w: 30, h });
const spikes = (x, top, w) => ({ x, y: top + 20, w, h: 40, kind: 'spike' });
const on = (x, top) => ({ x, y: top - 34 });

export const LEVELS = [
  { name: 'Primeiro enxame', ground: [floor()], char: on(270, 840), hives: [{ x: 110, y: 260, count: 18 }], ink: 1100, hint: 'dome' },
  { name: 'Do outro lado', ground: [floor()], char: on(400, 840), hives: [{ x: 90, y: 300, count: 22 }], ink: 1000, hint: 'dome' },
  { name: 'Na plataforma', ground: [floor(), plat(270, 625, 230)], char: on(270, 625), hives: [{ x: 460, y: 220, count: 22 }], ink: 950, hint: 'dome' },
  { name: 'Chuva de pedras', ground: [floor()], char: on(270, 840), rocks: { x0: 150, x1: 390, count: 20, every: 0.42 }, ink: 900, hint: 'roof' },
  { name: 'Canhão!', ground: [floor()], char: on(400, 840), cannons: [{ x: 45, y: 790, dir: 1, every: 1.2 }], ink: 700, hint: 'dome' },
  { name: 'No buraco', ground: [floor(), wall(150, 700, 160), wall(390, 700, 160)], char: on(270, 840), hives: [{ x: 270, y: 170, count: 26 }], ink: 800, hint: 'dome' },
  { name: 'Pedestal', ground: [spikes(270, 900, 600), { x: 270, y: 790, w: 160, h: 220 }], char: on(270, 680), hives: [{ x: 460, y: 300, count: 24 }], ink: 900, hint: 'dome', hintR: 68 },
  { name: 'Tudo junto', ground: [floor()], char: on(270, 840), hives: [{ x: 100, y: 250, count: 18 }], rocks: { x0: 200, x1: 340, count: 10, every: 0.7 }, ink: 1000, hint: 'roof' },
  { name: 'Duas colmeias', ground: [floor()], char: on(270, 840), hives: [{ x: 90, y: 220, count: 16 }, { x: 450, y: 220, count: 16 }], ink: 1050, hint: 'dome' },
  { name: 'Fogo cruzado', ground: [floor()], char: on(270, 840), cannons: [{ x: 45, y: 790, dir: 1, every: 1.5 }, { x: 495, y: 790, dir: -1, every: 1.5 }], ink: 1000, hint: 'dome' },
  { name: 'Na beirada', ground: [floor(), plat(400, 600, 200)], char: on(400, 600), hives: [{ x: 80, y: 250, count: 24 }], ink: 1000, hint: 'dome' },
  { name: 'Coluna', ground: [spikes(270, 900, 600), { x: 270, y: 790, w: 220, h: 220 }], char: on(270, 680), rocks: { x0: 200, x1: 340, count: 12, every: 0.6 }, ink: 900, hint: 'roof', hintR: 86 },
  { name: 'Pela lateral', ground: [floor(), plat(330, 560, 210)], char: on(330, 560), hives: [{ x: 60, y: 470, count: 18 }], ink: 950, hint: 'dome', hintR: 76 },
  { name: 'Do alto', ground: [floor()], char: on(200, 840), cannons: [{ x: 495, y: 420, dir: -1, every: 1.3, speed: 11 }], ink: 800, hint: 'roof' },
  { name: 'Três colmeias', ground: [floor()], char: on(270, 840), hives: [{ x: 70, y: 260, count: 13 }, { x: 270, y: 150, count: 13 }, { x: 470, y: 260, count: 13 }], ink: 1100, hint: 'dome' },
  { name: 'Tempestade', ground: [floor()], char: on(270, 840), hives: [{ x: 460, y: 240, count: 16 }], rocks: { x0: 120, x1: 420, count: 18, every: 0.45 }, ink: 1000, hint: 'roof' },
  { name: 'Encurralado', ground: [floor(), wall(525, 540, 300)], char: on(470, 840), hives: [{ x: 70, y: 300, count: 26 }], ink: 650, hintPts: [{ x: 500, y: 548 }, { x: 392, y: 828 }] },
  { name: 'Buraco e canhões', ground: [floor(), wall(160, 720, 120), wall(380, 720, 120)], char: on(270, 840), cannons: [{ x: 45, y: 640, dir: 1, every: 1.4 }, { x: 495, y: 640, dir: -1, every: 1.7 }], hives: [{ x: 270, y: 160, count: 14 }], ink: 900, hint: 'dome', hintR: 76 },
  { name: 'Ilha', ground: [spikes(270, 900, 600), plat(270, 640, 150)], char: on(270, 640), hives: [{ x: 80, y: 260, count: 20 }, { x: 460, y: 260, count: 20 }], ink: 1000, hint: 'dome', hintR: 68 },
  { name: 'Chefão', ground: [floor()], char: on(270, 840), hives: [{ x: 70, y: 230, count: 14 }, { x: 470, y: 230, count: 14 }], rocks: { x0: 200, x1: 340, count: 8, every: 1 }, cannons: [{ x: 45, y: 790, dir: 1, every: 2.4 }], ink: 1300, time: 8, hint: 'dome' },
];

// Depois da última fase: fases geradas, sempre um pouco mais difíceis.
// Cada fase gerada é testada com a dica numa simulação rápida; se a dica não salvar, tenta outra.
export function levelAt(i) {
  if (i < LEVELS.length) return structuredClone(LEVELS[i]);
  for (let attempt = 0; attempt < 12; attempt++) {
    const def = generate(i, attempt);
    if (solvable(def)) return def;
  }
  return structuredClone(LEVELS[i % LEVELS.length]);
}

function solvable(def) {
  for (let k = 0; k < 3; k++) {
    const lv = new Level(structuredClone(def));
    const pts = hintPath(def);
    lv.beginStroke(pts[0].x, pts[0].y);
    pts.slice(1).forEach((p) => lv.extendStroke(p.x, p.y));
    if (lv.blocked || !lv.endStroke()) return false;
    for (let t = 0; t < lv.timeTotal + 0.5 && lv.state === 'run'; t += 1 / 30) lv.update(1 / 30);
    if (lv.state !== 'win') return false;
  }
  return true;
}

function generate(i, attempt) {
  let seed = i * 7919 + attempt * 104729;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const n = i - LEVELS.length;
  const x = 150 + rnd() * 240;
  const onPlat = rnd() < 0.4;
  const ground = [floor()];
  let top = 840;
  if (onPlat) {
    top = 560 + rnd() * 120;
    ground.push(plat(x, top, 170 + rnd() * 70));
  }
  const def = { name: `Desafio ${n + 1}`, ground, char: on(x, top), ink: Math.max(750, 1100 - n * 15), hint: 'dome', hives: [] };
  if (onPlat) def.hintR = Math.min(80, ground[1].w / 2 - 6);
  const hives = 1 + Math.floor(rnd() * 2.5);
  for (let k = 0; k < hives; k++) def.hives.push({ x: 60 + rnd() * 420, y: 150 + rnd() * 200, count: Math.min(24, 12 + Math.floor(n / 2)) });
  if (rnd() < 0.4) def.rocks = { x0: x - 140, x1: x + 140, count: 10 + Math.floor(n / 3), every: 0.6 };
  if (rnd() < 0.3) def.cannons = [{ x: x > 270 ? 45 : 495, y: top - 50, dir: x > 270 ? 1 : -1, every: 1.6 }];
  return def;
}
