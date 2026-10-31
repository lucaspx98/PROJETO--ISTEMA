// Fase 1 — Mesa de escritório: pernas, travessa, tampo, gaveta e parafusos.
import { M } from '../materials.js';
import { box, cyl, group } from '../geo.js';

const H = 0.75;
const LX = 0.56;
const LZ = 0.26;

const leg = (x, z) =>
  group(
    box(0.05, H - 0.03, 0.05, M.metalBlack, x, (H - 0.03) / 2, z, 0.006),
    cyl(0.022, 0.024, 0.012, M.rubber, x, 0.006, z),
  );

export const mesaParts = [
  { id: 'perna-fe', name: 'Perna', build: () => leg(-LX, LZ) },
  { id: 'perna-fd', name: 'Perna', build: () => leg(LX, LZ) },
  { id: 'perna-te', name: 'Perna', build: () => leg(-LX, -LZ) },
  { id: 'perna-td', name: 'Perna', build: () => leg(LX, -LZ) },
  {
    id: 'travessa',
    name: 'Travessa',
    after: ['perna-te', 'perna-td'],
    build: () => box(2 * LX - 0.05, 0.05, 0.02, M.metalBlack, 0, 0.6, -LZ, 0.004),
  },
  {
    id: 'tampo',
    name: 'Tampo',
    after: ['perna-fe', 'perna-fd', 'perna-te', 'perna-td', 'travessa'],
    build: () => box(1.2, 0.03, 0.6, M.oak, 0, H - 0.015, 0, 0.006),
  },
  {
    id: 'gaveta',
    name: 'Gaveta',
    after: ['tampo'],
    build: () =>
      group(
        box(0.4, 0.085, 0.45, M.melamine, 0.3, H - 0.03 - 0.0425, 0.03, 0.004),
        box(0.12, 0.012, 0.012, M.chrome, 0.3, H - 0.03 - 0.0425, 0.262, 0.004),
      ),
  },
];

export const mesa = {
  id: 'mesa',
  name: 'Mesa de escritório',
  icon: '🪵',
  target: [0, 0.42, 0],
  cam: { dist: 2.3, min: 1.1, max: 3.6 },
  snap: 0.11,
  screwSize: 1,
  shadow: 1.6,
  parts: mesaParts,
  screws: [-1, 1].flatMap((sx) =>
    [-1, 1].map((sz) => ({ pos: [sx * LX, H, sz * LZ], normal: [0, 1, 0], after: 'tampo' })),
  ),
};
