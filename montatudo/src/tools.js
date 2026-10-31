// Ferramentas: níveis de melhoria (comprados na Oficina) e modelos 3D.
import * as THREE from 'three';
import { M } from './materials.js';
import { box, cyl, group, rot } from './geo.js';
import { Save } from './storage.js';

/**
 * stat(level) devolve o número que a ferramenta melhora; `costs[i]` é o preço para ir do nível i+1 ao i+2.
 * A parafusadeira começa no nível 0 (não comprada).
 */
export const TOOLS = {
  mao: { name: 'Mão', icon: '🖐️', max: 1, costs: [], desc: () => 'Encaixa memória, placa de vídeo e parafusos de dedo' },
  chave: {
    name: 'Chave de fenda',
    icon: '🪛',
    max: 5,
    costs: [120, 260, 480, 850],
    turns: [4, 3, 2.2, 1.6, 1.1],
    desc: (l) => `${String(TOOLS.chave.turns[l - 1]).replace('.', ',')} voltas por parafuso`,
  },
  martelo: {
    name: 'Martelo',
    icon: '🔨',
    max: 5,
    costs: [120, 260, 480, 850],
    mult: [1, 0.8, 0.6, 0.45, 0.3],
    desc: (l) => `${Math.max(1, Math.round(5 * TOOLS.martelo.mult[l - 1]))} batidas por prego`,
  },
  parafusadeira: {
    name: 'Parafusadeira',
    icon: '⚡',
    max: 4,
    costs: [600, 500, 900, 1400], // o primeiro é a compra
    speed: [1, 1.6, 2.4, 3.6],
    desc: (l) => (l ? `Segure no parafuso: ${String(TOOLS.parafusadeira.speed[l - 1]).replace('.', ',')} voltas/s` : 'Aperta sozinha enquanto você segura'),
  },
};

export const DRILL_TURNS = 3;

export function toolLevel(id) {
  const lv = Save.get('tools') ?? {};
  if (id === 'mao') return 1;
  if (id === 'parafusadeira') return lv[id] ?? 0;
  return lv[id] ?? 1;
}

export function upgradeTool(id) {
  const t = TOOLS[id];
  const l = toolLevel(id);
  if (l >= t.max) return false;
  const price = t.costs[id === 'parafusadeira' ? l : l - 1];
  if (!Save.spend(price)) return false;
  Save.set('tools', { ...(Save.get('tools') ?? {}), [id]: l + 1 });
  return true;
}

export function nextPrice(id) {
  const l = toolLevel(id);
  const t = TOOLS[id];
  if (l >= t.max) return null;
  return t.costs[id === 'parafusadeira' ? l : l - 1];
}

const LEVEL_COLORS = [0xd9480f, 0x1971c2, 0x2b8a3e, 0x6741d9, 0xf2b705];
const plastic = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.35 });

/** Chave de fenda com a ponta na origem, cabo para +Y. */
export function screwdriverModel(level) {
  return group(
    cyl(0.0025, 0.0035, 0.1, M.chrome, 0, 0.05, 0, 12),
    box(0.006, 0.006, 0.0012, M.chrome, 0, 0.002, 0),
    cyl(0.013, 0.011, 0.085, plastic(LEVEL_COLORS[level - 1]), 0, 0.14, 0),
    cyl(0.0135, 0.0135, 0.02, M.rubber, 0, 0.115, 0),
  );
}

/** Parafusadeira com a ponta na origem, corpo para +Y. */
export function drillModel(level) {
  const color = plastic(LEVEL_COLORS[Math.min(4, level)]);
  return group(
    cyl(0.003, 0.003, 0.05, M.chrome, 0, 0.025, 0, 12),
    cyl(0.014, 0.018, 0.04, M.metalBlack, 0, 0.07, 0),
    box(0.05, 0.11, 0.05, color, 0, 0.14, 0, 0.012),
    rot(box(0.035, 0.11, 0.04, M.plasticBlack, 0.05, 0.16, 0, 0.01), 0, 0, -0.3),
    box(0.06, 0.03, 0.055, M.plasticBlack, 0.08, 0.215, 0, 0.008),
  );
}

/** Martelo com a face de bater na origem (bate para -Y), cabo para +X. */
export function hammerModel(level) {
  const head = level >= 5 ? M.gold : M.metalBlack;
  const handle = level >= 3 ? plastic(LEVEL_COLORS[level - 1]) : M.oak;
  return group(
    cyl(0.014, 0.014, 0.03, M.chrome, 0, 0.015, 0),
    cyl(0.012, 0.012, 0.045, head, 0, 0.05, 0),
    rot(box(0.03, 0.012, 0.022, head, 0, 0.08, 0, 0.004), 0, 0, 0),
    rot(cyl(0.011, 0.013, 0.28, handle, 0.15, 0.055, 0), 0, 0, Math.PI / 2),
  );
}

export function toolModel(id, level) {
  if (id === 'martelo') return hammerModel(level);
  if (id === 'parafusadeira') return drillModel(level);
  return screwdriverModel(Math.max(1, level));
}

/** Parafuso (cabeça na origem, rosca para -Y) e prego. */
export function screwModel(s = 1) {
  return group(
    cyl(0.0075 * s, 0.0072 * s, 0.004 * s, M.chrome, 0, 0, 0, 20),
    box(0.011 * s, 0.0015 * s, 0.0016 * s, M.metalBlack, 0, 0.0018 * s, 0),
    box(0.0016 * s, 0.0015 * s, 0.011 * s, M.metalBlack, 0, 0.0018 * s, 0),
    cyl(0.0028 * s, 0.0012 * s, 0.022 * s, M.aluminum, 0, -0.013 * s, 0, 12),
  );
}

export function thumbScrewModel(s = 1) {
  return group(
    cyl(0.009 * s, 0.009 * s, 0.006 * s, M.plasticBlack, 0, 0.001 * s, 0, 16),
    cyl(0.0028 * s, 0.0028 * s, 0.016 * s, M.aluminum, 0, -0.01 * s, 0, 12),
  );
}

export function nailModel(s = 1) {
  return group(
    cyl(0.005 * s, 0.005 * s, 0.0015 * s, M.aluminum, 0, 0, 0, 16),
    cyl(0.0015 * s, 0.0004 * s, 0.03 * s, M.aluminum, 0, -0.015 * s, 0, 8),
  );
}
