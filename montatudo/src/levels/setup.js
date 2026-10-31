// Fase 5 — Setup completo: em cima da mesa da fase 1, com a cadeira e o PC das outras fases.
import * as THREE from 'three';
import { M } from '../materials.js';
import { box, cyl, group, rot, sphere } from '../geo.js';
import { mesaParts } from './mesa.js';
import { cadeiraParts } from './cadeira.js';
import { computadorParts } from './computador.js';

const TOP = 0.75;

function keyboard() {
  const keys = new THREE.InstancedMesh(new THREE.BoxGeometry(0.0165, 0.008, 0.0165), M.plasticDark, 15 * 5);
  const m = new THREE.Matrix4();
  let i = 0;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 15; c++) {
      m.makeTranslation(-0.05 - 0.154 + c * 0.0205 + (r % 2) * 0.004, TOP + 0.0195, 0.12 - 0.042 + r * 0.021);
      keys.setMatrixAt(i++, m);
    }
  }
  keys.castShadow = true;
  return group(
    box(0.34, 0.016, 0.125, M.plasticBlack, -0.05, TOP + 0.011, 0.12, 0.004),
    box(0.33, 0.002, 0.115, M.rgbPurple, -0.05, TOP + 0.0045, 0.12),
    keys,
  );
}

const speaker = (x) =>
  group(
    box(0.1, 0.17, 0.11, M.plasticBlack, x, TOP + 0.085, -0.17, 0.01),
    rot(cyl(0.032, 0.032, 0.006, M.plasticDark, x, TOP + 0.06, -0.114), Math.PI / 2, 0, 0),
    rot(cyl(0.014, 0.014, 0.006, M.aluminum, x, TOP + 0.13, -0.114), Math.PI / 2, 0, 0),
  );

export const setup = {
  id: 'setup',
  name: 'Setup gamer completo',
  icon: '🎮',
  target: [0.15, 0.8, 0],
  cam: { dist: 2.1, min: 1.0, max: 3.4 },
  snap: 0.09,
  screwSize: 0.5,
  shadow: 1.6,
  base: () => {
    const desk = group(mesaParts.map((p) => p.build()));
    const chair = group(cadeiraParts.map((p) => p.build()));
    chair.position.set(-0.05, 0, 0.62);
    chair.rotation.y = Math.PI + 0.25;
    return group(desk, chair);
  },
  parts: [
    {
      id: 'mousepad',
      name: 'Mousepad',
      build: () => box(0.8, 0.003, 0.3, M.deskMat, 0.05, TOP + 0.0015, 0.12, 0.001),
    },
    {
      id: 'suporte',
      name: 'Suporte',
      build: () =>
        group(
          box(0.24, 0.012, 0.17, M.aluminum, 0, TOP + 0.006, -0.17, 0.005),
          box(0.04, 0.33, 0.025, M.aluminum, 0, TOP + 0.17, -0.225, 0.006),
        ),
    },
    {
      id: 'monitor',
      name: 'Monitor',
      after: ['suporte'],
      build: () =>
        group(
          box(0.62, 0.37, 0.025, M.plasticBlack, 0, TOP + 0.33, -0.2, 0.008),
          box(0.6, 0.34, 0.002, M.screen, 0, TOP + 0.335, -0.187),
          box(0.12, 0.1, 0.02, M.plasticBlack, 0, TOP + 0.31, -0.22, 0.008),
        ),
    },
    { id: 'teclado', name: 'Teclado', after: ['mousepad'], build: keyboard },
    {
      id: 'mouse',
      name: 'Mouse',
      after: ['mousepad'],
      build: () => {
        const m = sphere(0.03, M.plasticBlack, 0.27, TOP + 0.016, 0.13);
        m.scale.set(0.7, 0.55, 1.15);
        const led = box(0.004, 0.002, 0.02, M.rgbPurple, 0.27, TOP + 0.033, 0.11);
        return group(m, led);
      },
    },
    { id: 'caixa-e', name: 'Caixa de som', build: () => speaker(-0.45) },
    { id: 'caixa-d', name: 'Caixa de som', build: () => speaker(0.45) },
    {
      id: 'computador',
      name: 'Computador',
      build: () => {
        const pc = group(computadorParts.map((p) => p.build()));
        pc.position.set(0.9, 0, -0.05);
        return group(pc);
      },
    },
    {
      id: 'luminaria',
      name: 'Luminária',
      build: () =>
        group(
          cyl(0.06, 0.065, 0.015, M.metalBlack, -0.5, TOP + 0.0075, 0.05),
          rot(cyl(0.007, 0.007, 0.3, M.metalBlack, -0.5, TOP + 0.15, 0.03), 0.15, 0, 0),
          rot(cyl(0.007, 0.007, 0.22, M.metalBlack, -0.5, TOP + 0.33, 0.1), 1.0, 0, 0),
          rot(cyl(0.02, 0.06, 0.07, M.metalBlack, -0.5, TOP + 0.37, 0.2), 0.4, 0, 0),
          sphere(0.018, M.ledWhite, -0.5, TOP + 0.345, 0.21),
        ),
    },
  ],
  screws: [],
};
