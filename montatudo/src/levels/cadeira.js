// Fase 2 — Cadeira de escritório com rodinhas, pistão a gás, assento, encosto e braços.
import { M } from '../materials.js';
import { box, cyl, group, rot } from '../geo.js';

const arms = (fn) => Array.from({ length: 5 }, (_, i) => fn((i / 5) * Math.PI * 2 + Math.PI / 2));

const armrest = (s) =>
  group(
    box(0.03, 0.2, 0.04, M.plasticBlack, s * 0.27, 0.58, -0.02, 0.006),
    box(0.07, 0.03, 0.26, M.plasticDark, s * 0.27, 0.695, 0.0, 0.012),
  );

export const cadeiraParts = [
  {
    id: 'rodinhas',
    name: 'Rodinhas',
    build: () =>
      group(
        arms((a) =>
          group(
            rot(cyl(0.026, 0.026, 0.024, M.plasticBlack, Math.cos(a) * 0.3, 0.027, Math.sin(a) * 0.3), 0, a, Math.PI / 2),
            box(0.03, 0.03, 0.035, M.plasticDark, Math.cos(a) * 0.3, 0.06, Math.sin(a) * 0.3, 0.006),
          ),
        ),
      ),
  },
  {
    id: 'base',
    name: 'Base estrela',
    after: ['rodinhas'],
    press: { tool: 'martelo', hits: 4 }, // rodinhas entram sob pressão
    build: () =>
      group(
        cyl(0.045, 0.055, 0.07, M.chrome, 0, 0.1, 0),
        arms((a) => rot(box(0.29, 0.03, 0.05, M.chrome, Math.cos(a) * 0.155, 0.085, Math.sin(a) * 0.155, 0.01), 0, -a, 0)),
      ),
  },
  {
    id: 'pistao',
    name: 'Pistão a gás',
    after: ['base'],
    press: { tool: 'martelo', hits: 3 },
    build: () =>
      group(cyl(0.028, 0.028, 0.18, M.plasticBlack, 0, 0.215, 0), cyl(0.016, 0.016, 0.1, M.chrome, 0, 0.35, 0)),
  },
  {
    id: 'mecanismo',
    name: 'Mecanismo',
    after: ['pistao'],
    build: () =>
      group(
        box(0.22, 0.035, 0.24, M.metalBlack, 0, 0.415, 0, 0.006),
        rot(cyl(0.006, 0.006, 0.14, M.chrome, 0.15, 0.41, 0.06), 0, 0, Math.PI / 2),
        cyl(0.015, 0.015, 0.02, M.plasticBlack, 0.22, 0.41, 0.06),
      ),
  },
  {
    id: 'assento',
    name: 'Assento',
    after: ['mecanismo'],
    build: () =>
      group(
        box(0.48, 0.02, 0.46, M.plasticBlack, 0, 0.443, 0, 0.008),
        box(0.5, 0.075, 0.48, M.fabric, 0, 0.49, 0, 0.034),
      ),
  },
  {
    id: 'encosto',
    name: 'Encosto',
    after: ['assento'],
    build: () =>
      group(
        box(0.06, 0.04, 0.2, M.metalBlack, 0, 0.44, -0.18, 0.006),
        rot(box(0.06, 0.32, 0.025, M.metalBlack, 0, 0.6, -0.285, 0.006), -0.08, 0, 0),
        rot(box(0.46, 0.56, 0.075, M.fabric, 0, 0.88, -0.31, 0.035), -0.1, 0, 0),
        rot(box(0.42, 0.5, 0.02, M.plasticBlack, 0, 0.88, -0.355, 0.008), -0.1, 0, 0),
      ),
  },
  { id: 'braco-e', name: 'Braço', after: ['assento'], build: () => armrest(-1) },
  { id: 'braco-d', name: 'Braço', after: ['assento'], build: () => armrest(1) },
];

export const cadeira = {
  id: 'cadeira',
  name: 'Cadeira de escritório',
  icon: '🪑',
  target: [0, 0.55, 0],
  cam: { dist: 2.0, min: 1.0, max: 3.2 },
  snap: 0.09,
  screwSize: 0.6,
  shadow: 1.2,
  parts: cadeiraParts,
  screws: [
    // mecanismo preso por baixo do assento: 2 parafusos visíveis na frente
    { pos: [-0.07, 0.415, 0.12], normal: [0, 0, 1], after: 'mecanismo' },
    { pos: [0.07, 0.415, 0.12], normal: [0, 0, 1], after: 'mecanismo' },
    { pos: [-0.285, 0.55, -0.02], normal: [-1, 0, 0], after: 'braco-e' },
    { pos: [-0.285, 0.62, -0.02], normal: [-1, 0, 0], after: 'braco-e' },
    { pos: [0.285, 0.55, -0.02], normal: [1, 0, 0], after: 'braco-d' },
    { pos: [0.285, 0.62, -0.02], normal: [1, 0, 0], after: 'braco-d' },
  ],
};
