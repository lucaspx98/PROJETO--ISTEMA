// Fase 3 — Estante de livros: laterais, base, topo, fundo, prateleiras e livros.
import { M, bookMaterials } from '../materials.js';
import { box, group } from '../geo.js';

const W = 0.8;
const H = 1.6;
const D = 0.3;
const T = 0.018;
const IN = W - 2 * T;
const SHELVES = [0.56, 1.06];

function books(y) {
  const out = [];
  let x = -IN / 2 + 0.02;
  let i = Math.round(y * 10);
  while (x < IN / 2 - 0.12) {
    const w = 0.022 + ((i * 7) % 5) * 0.006;
    const h = 0.2 + ((i * 13) % 7) * 0.018;
    const d = 0.17 + ((i * 3) % 4) * 0.015;
    out.push(box(w, h, d, bookMaterials[i % bookMaterials.length], x + w / 2, y + T / 2 + h / 2, -0.02, 0.003));
    x += w + 0.002;
    i += 1;
  }
  return out;
}

export const estanteParts = [
  { id: 'lateral-e', name: 'Lateral', build: () => box(T, H, D, M.walnut, -W / 2 + T / 2, H / 2, 0, 0.003) },
  { id: 'lateral-d', name: 'Lateral', build: () => box(T, H, D, M.walnut, W / 2 - T / 2, H / 2, 0, 0.003) },
  {
    id: 'base',
    name: 'Base',
    after: ['lateral-e', 'lateral-d'],
    build: () =>
      group(box(IN, T, D, M.walnut, 0, 0.07, 0, 0.002), box(IN, 0.06, T, M.walnut, 0, 0.032, D / 2 - T / 2 - 0.01, 0.002)),
  },
  { id: 'topo', name: 'Topo', after: ['lateral-e', 'lateral-d'], build: () => box(IN, T, D, M.walnut, 0, H - T / 2, 0, 0.002) },
  {
    id: 'fundo',
    name: 'Fundo',
    after: ['base', 'topo'],
    build: () => box(IN, H - 0.09, 0.004, M.hardboard, 0, (H + 0.07) / 2 - 0.005, -D / 2 + 0.004),
  },
  ...SHELVES.map((y, k) => ({
    id: `prateleira-${k + 1}`,
    name: 'Prateleira',
    after: ['fundo'],
    build: () => box(IN, T, D - 0.02, M.walnut, 0, y, 0.008, 0.002),
  })),
  {
    id: 'livros',
    name: 'Livros',
    after: ['prateleira-1', 'prateleira-2'],
    build: () => group(books(0.07), ...SHELVES.map((y) => books(y))),
  },
];

export const estante = {
  id: 'estante',
  name: 'Estante de livros',
  icon: '📚',
  target: [0, 0.8, 0],
  cam: { dist: 2.8, min: 1.4, max: 4.2 },
  snap: 0.12,
  screwSize: 0.8,
  shadow: 1.6,
  parts: estanteParts,
  screws: [
    { pos: [-W / 2, 0.07, 0.08], normal: [-1, 0, 0], after: 'base' },
    { pos: [W / 2, 0.07, 0.08], normal: [1, 0, 0], after: 'base' },
    { pos: [-W / 2, H - T / 2, 0.08], normal: [-1, 0, 0], after: 'topo' },
    { pos: [W / 2, H - T / 2, 0.08], normal: [1, 0, 0], after: 'topo' },
  ],
};
