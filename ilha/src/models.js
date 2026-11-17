// Modelos 3D em estilo low-poly, todos feitos por código.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { addWind } from './gfx.js';

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...o });
const M = {
  skin: mat(0xf2c29b),
  shirt: mat(0x3a86c8),
  pants: mat(0x4a3b2a),
  hair: mat(0x3b2416),
  wood: mat(0x8a5a33),
  woodDark: mat(0x5e3b20),
  leaf: mat(0x4fa83d),
  pine: mat(0x2f7a4a),
  rock: mat(0x8d9199),
  rockDark: mat(0x6b6f78),
  berry: mat(0xd62f4b, { roughness: 0.35 }),
  bush: mat(0x3f8f3a),
  crystal: mat(0x6ff2ff, { emissive: 0x2ad4f0, emissiveIntensity: 1.6, roughness: 0.15, metalness: 0.2 }),
  gold: mat(0xf2c230, { metalness: 0.6, roughness: 0.35, emissive: 0x7a5a00, emissiveIntensity: 0.6 }),
  metal: mat(0xb9c0c9, { metalness: 0.7, roughness: 0.4 }),
  slime: mat(0x6fdc5a, { transparent: true, opacity: 0.88, roughness: 0.3 }),
  wolf: mat(0x6c7078),
  wolfDark: mat(0x45484e),
  eye: mat(0x111111),
  white: mat(0xffffff),
  golem: mat(0x777b82),
  golemDark: mat(0x52555b),
  core: mat(0xffa033, { emissive: 0xff7a00, emissiveIntensity: 2 }),
  fire: mat(0xffb030, { emissive: 0xff6a00, emissiveIntensity: 2.5 }),
  cloth: mat(0xf4ead2),
  red: mat(0xc0392b),
  navy: mat(0x1f3a5f),
};
export { M as MATS };

function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
const box = (w, h, d, m, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z);

// ---------- vegetação e pedras (formas orgânicas com sombra pintada nos vértices) ----------

const vmat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, vertexColors: true, roughness: 0.9, ...o });
const NM = {
  bark: vmat(0x7a5232),
  leaf: addWind(vmat(0x5fae3e, { roughness: 0.8 }), 0.06, 2.0),
  pine: addWind(vmat(0x2f7346, { flatShading: true }), 0.04, 1.8),
  rock: vmat(0xffffff, { flatShading: true, roughness: 0.95 }),
  bush: addWind(vmat(0x4c9a3a, { roughness: 0.8 }), 0.05, 0.3),
};
NM.leaf.userData.vary = NM.pine.userData.vary = NM.bush.userData.vary = true;
const PLANK = mat(0x9a6a40);
const THATCH = mat(0xc9a35a, { roughness: 1 });
const THATCH_DARK = mat(0xa9843f, { roughness: 1 });
const CHIMNEY = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, flatShading: true, roughness: 0.95 });
const FIRE_STONE = CHIMNEY;
const ANVIL = mat(0x3a3d42, { metalness: 0.6, roughness: 0.45 });
const WINDOW = mat(0xffc477, { emissive: 0xff9a3a, emissiveIntensity: 1.1 });
const FLAME_IN = mat(0xfff0a0, { emissive: 0xffd040, emissiveIntensity: 3 });

/** Deforma cada vértice por um "ruído" que só depende da posição (as costuras não abrem). */
function lumpy(geo, amt, freq, seed) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const n =
      Math.sin(x * freq + seed) * Math.cos(z * freq * 1.3 + seed * 2.1) +
      Math.sin(y * freq * 1.7 + seed * 3.3) * 0.5 +
      Math.sin((x + z) * freq * 2.9 + seed) * 0.25;
    const k = 1 + n * amt;
    p.setXYZ(i, x * k, y * k, z * k);
  }
  return geo;
}

/** Bolha suave (normais lisas): base de copas e arbustos. */
function blob(r, detail, amt, seed) {
  let g = new THREE.IcosahedronGeometry(r, detail);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  return lumpy(g, amt, 2.2 / r, seed);
}

/** Pinta cada vértice: fn(x, y, z, nx, ny, nz) → [r, g, b] */
function paint(geo, fn) {
  geo.computeVertexNormals();
  const p = geo.attributes.position;
  const n = geo.attributes.normal;
  const c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) c.set(fn(p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i)), i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}

const clean = (g) => {
  g.deleteAttribute('uv');
  return g.index ? g : mergeVertices(g);
};

function canopy(parts, y0, y1, detail = 2) {
  const g = mergeGeometries(parts.map(([r, x, y, z, seed]) => blob(r, detail, 0.13, seed).translate(x, y, z)));
  // embaixo e por dentro mais escuro (oclusão), em cima mais claro (luz do céu)
  return paint(g, (x, y, z, nx, ny) => {
    const k = Math.min(1, Math.max(0, (y - y0) / (y1 - y0)));
    const v = 0.42 + k * 0.6 + Math.max(0, ny) * 0.15;
    return [v, v, v * 0.95];
  });
}

function trunk(h, r0, r1, bend, radial = 8, rows = 5) {
  let g = new THREE.CylinderGeometry(r1, r0, h, radial, rows);
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) + h / 2;
    const ang = Math.atan2(p.getZ(i), p.getX(i));
    const ridge = 1 + Math.sin(ang * 5 + y * 1.5) * 0.08;
    p.setXYZ(i, p.getX(i) * ridge + bend * (y / h) ** 2, y, p.getZ(i) * ridge);
  }
  return g;
}

function branch(len, r, ang, tilt, y) {
  const g = new THREE.CylinderGeometry(r * 0.5, r, len, 6, 1).translate(0, len / 2, 0);
  g.rotateZ(tilt).rotateY(ang).translate(0, y, 0);
  return clean(g);
}

function treeGeo(low) {
  const wood = low ? trunk(3.0, 0.34, 0.19, 0.25, 5, 2) : mergeGeometries([trunk(3.0, 0.34, 0.19, 0.25), branch(1.1, 0.12, 0.6, 0.9, 1.9), branch(0.9, 0.1, 3.4, 0.8, 2.3)]);
  paint(wood, (x, y) => {
    const v = 0.55 + Math.min(1, y / 3) * 0.45;
    return [v, v * 0.95, v * 0.9];
  });
  const leaves = canopy(
    [
      [1.55, 0.2, 3.9, 0, 1],
      [1.15, 1.05, 3.3, 0.35, 2],
      [1.1, -0.95, 3.4, -0.25, 3],
      [1.0, 0.1, 4.75, -0.55, 4],
      [0.95, -0.3, 3.5, 1.0, 5],
      [0.9, 0.45, 3.2, -1.0, 6],
    ].slice(0, low ? 4 : 6),
    2.3,
    5.6,
    low ? 0 : 2,
  );
  return [
    [wood, NM.bark],
    [leaves, NM.leaf],
  ];
}

function pineGeo(low) {
  const wood = paint(trunk(2.4, 0.26, 0.14, 0, low ? 5 : 8, low ? 1 : 5), (x, y) => [0.5 + y * 0.15, 0.48 + y * 0.14, 0.45 + y * 0.12]);
  wood.translate(0, 0, 0);
  const tiers = [];
  const T = [
    [1.9, 2.2, 1.6],
    [1.55, 2.0, 2.75],
    [1.2, 1.8, 3.8],
    [0.8, 1.5, 4.75],
  ];
  (low ? [T[0], T[1], [1.0, 2.2, 4.3]] : T).forEach(([r, h, y], i) => {
    let g = new THREE.ConeGeometry(r, h, low ? 7 : 11, low ? 1 : 2);
    g.deleteAttribute('uv');
    g = mergeVertices(g);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k);
      const z = p.getZ(k);
      const yy = p.getY(k);
      const a = Math.atan2(z, x);
      const rim = yy < -h / 2 + 0.01 ? 1 : 0;
      const j = 1 + Math.sin(a * 7 + i * 2) * 0.1;
      p.setXYZ(k, x * j, yy - rim * (0.25 + Math.sin(a * 11 + i) * 0.12), z * j);
    }
    g.translate(0, y, 0);
    tiers.push(
      paint(g, (x, yy, z, nx, ny) => {
        const local = Math.min(1, Math.max(0, (yy - (y - h / 2)) / h));
        const v = 0.45 + local * 0.45 + i * 0.07 + Math.max(0, ny) * 0.1;
        return [v, v, v];
      }),
    );
  });
  return [
    [wood, NM.bark],
    [mergeGeometries(tiers), NM.pine],
  ];
}

function rockGeo(low) {
  let g = new THREE.IcosahedronGeometry(1, low ? 1 : 2);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  lumpy(g, 0.22, 2.4, 7);
  lumpy(g, 0.07, 7.0, 3);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) < -0.2) p.setY(i, -0.2 + (p.getY(i) + 0.2) * 0.25);
  g.scale(1.3, 0.85, 1.1).translate(0, 0.4, 0);
  paint(g, (x, y, z, nx, ny) => {
    const n = Math.sin(x * 5.1 + z * 3.7) * 0.5 + 0.5;
    const base = 0.16 + n * 0.07 + y * 0.06;
    const moss = Math.min(1, Math.max(0, (ny - 0.55) * 3)) * (0.6 + n * 0.4);
    return [base * (1 - moss) + 0.09 * moss, base * (1 - moss) + 0.2 * moss, base * 1.05 * (1 - moss) + 0.04 * moss];
  });
  return [[g, NM.rock]];
}

function bushGeo(low) {
  const g = canopy(
    [
      [0.75, 0, 0.55, 0, 11],
      [0.6, 0.55, 0.45, 0.2, 12],
      [0.6, -0.5, 0.45, -0.25, 13],
      [0.55, 0.05, 0.85, -0.45, 14],
    ].slice(0, low ? 3 : 4),
    0,
    1.35,
    low ? 0 : 1,
  );
  return [[g, NM.bush]];
}

/**
 * Geometrias dos recursos, já posicionadas (base no chão), por tipo: [geometria, material][].
 * low = versão leve, usada de longe e para desenhar as sombras.
 */
export function nodeParts(low = false) {
  return {
    tree: treeGeo(low),
    pine: pineGeo(low),
    rock: rockGeo(low),
    bush: bushGeo(low),
    berries: [[berriesGeo(), M.berry]],
    crystal: [
      [new THREE.OctahedronGeometry(0.6, 0).scale(0.8, 2, 0.8).translate(0, 1.0, 0), M.crystal],
      [new THREE.OctahedronGeometry(0.4, 0).scale(0.8, 1.7, 0.8).translate(0.55, 0.6, 0.2), M.crystal],
    ],
    chest: [
      [new THREE.BoxGeometry(1.2, 0.7, 0.8).translate(0, 0.35, 0), M.wood],
      [new THREE.BoxGeometry(1.26, 0.28, 0.86).translate(0, 0.84, 0), M.gold],
    ],
    relic: [
      [new THREE.CylinderGeometry(0.6, 0.75, 0.5, 8).translate(0, 0.25, 0), M.rockDark],
      [new THREE.OctahedronGeometry(0.42, 0).translate(0, 1.25, 0), M.gold],
    ],
  };
}

function berriesGeo() {
  const parts = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    parts.push(new THREE.IcosahedronGeometry(0.13, 0).translate(Math.cos(a) * 0.7, 0.55 + (i % 2) * 0.3, Math.sin(a) * 0.7));
  }
  return mergeGeos(parts);
}

/** Junta geometrias simples (posição + normal) numa só. */
export function mergeGeos(geos) {
  const pos = [];
  const nor = [];
  geos.forEach((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    pos.push(...n.attributes.position.array);
    nor.push(...n.attributes.normal.array);
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}

// Materiais lisos (sem facetas) para os personagens
const smooth = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o });
const P = {
  skin: smooth(0xe8b48c),
  skinDark: smooth(0xc98f68),
  shirt: smooth(0xd9d2c0),
  vest: smooth(0x2f7d8c),
  pants: smooth(0x5a4632),
  boot: smooth(0x2e2218, { roughness: 0.6 }),
  belt: smooth(0x3a2a1c),
  hair: smooth(0x3b2416, { roughness: 0.9 }),
  pack: smooth(0x8a6a3c),
  coat: smooth(0x1f3a5f),
  coatTrim: smooth(0xd9b24c, { metalness: 0.5, roughness: 0.4 }),
  beard: smooth(0xe9e6df, { roughness: 0.95 }),
  white: smooth(0xffffff, { roughness: 0.3 }),
  iris: smooth(0x3a2a1a, { roughness: 0.3 }),
  lip: smooth(0xa8594f),
  peg: smooth(0x7a5230),
  fur: smooth(0x6e7279, { roughness: 0.95 }),
  furDark: smooth(0x474a50, { roughness: 0.95 }),
  furLight: smooth(0xb9bcc2, { roughness: 0.95 }),
  nose: smooth(0x1a1a1a, { roughness: 0.4 }),
};

function part(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
const cap = (r, len, m, x, y, z) => part(new THREE.CapsuleGeometry(r, len, 4, 12), m, x, y, z);
const ball = (r, m, x, y, z) => part(new THREE.SphereGeometry(r, 16, 12), m, x, y, z);

/**
 * Pessoa estilizada com proporções humanas e juntas (ombro, cotovelo, quadril, joelho).
 * captain: casaco, barba, chapéu e perna de pau. Devolve as juntas para animar.
 */
export function humanoid({ captain = false } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const top = captain ? P.coat : P.shirt;
  const skin = captain ? P.skinDark : P.skin;

  // tronco: quadril, cintura afinando, peito e ombros
  const torso = part(new THREE.CylinderGeometry(0.33, 0.24, 0.62, 16), top, 0, 1.34, 0);
  torso.scale.z = 0.62;
  const chest = ball(0.33, top, 0, 1.56, 0);
  chest.scale.set(1.02, 0.5, 0.64);
  const hips = ball(0.27, P.pants, 0, 1.0, 0);
  hips.scale.set(1, 0.7, 0.7);
  const belt = part(new THREE.CylinderGeometry(0.255, 0.255, 0.08, 16), P.belt, 0, 1.06, 0);
  belt.scale.z = 0.66;
  const buckle = part(new THREE.BoxGeometry(0.09, 0.07, 0.03), P.coatTrim, 0, 1.06, 0.17);
  const neck = part(new THREE.CylinderGeometry(0.085, 0.1, 0.14, 10), skin, 0, 1.73, 0);
  body.add(torso, chest, hips, belt, buckle, neck);
  if (!captain) {
    // colete do náufrago e mochila
    const vest = part(new THREE.CylinderGeometry(0.345, 0.27, 0.5, 16, 1, true, Math.PI * 0.62, Math.PI * 1.76), P.vest, 0, 1.38, 0);
    vest.scale.z = 0.66;
    vest.material.side = THREE.DoubleSide;
    const pack = part(new THREE.SphereGeometry(0.24, 12, 10), P.pack, 0, 1.36, -0.25);
    pack.scale.set(1, 1.25, 0.6);
    body.add(vest, pack, part(new THREE.CylinderGeometry(0.07, 0.07, 0.42, 8).rotateZ(Math.PI / 2), P.shirt, 0, 1.66, -0.27));
  } else {
    // casaco comprido com botões
    const skirt = part(new THREE.CylinderGeometry(0.26, 0.36, 0.5, 16, 1, true), P.coat, 0, 0.84, 0);
    skirt.scale.z = 0.7;
    skirt.material.side = THREE.DoubleSide;
    body.add(skirt);
    for (let i = 0; i < 3; i++) body.add(ball(0.03, P.coatTrim, 0.07, 1.2 + i * 0.14, 0.2));
    [-1, 1].forEach((sd) => body.add(part(new THREE.BoxGeometry(0.2, 0.05, 0.16), P.coatTrim, sd * 0.36, 1.66, 0)));
  }

  // cabeça e rosto
  const head = new THREE.Group();
  head.position.set(0, 1.96, 0);
  body.add(head);
  const skull = ball(0.24, skin, 0, 0, 0);
  skull.scale.set(0.94, 1.08, 0.98);
  const jaw = ball(0.17, skin, 0, -0.12, 0.03);
  jaw.scale.set(0.95, 0.8, 0.95);
  head.add(skull, jaw, ball(0.04, skin, 0, -0.03, 0.235));
  [-1, 1].forEach((sd) => {
    const white = ball(0.046, P.white, sd * 0.088, 0.035, 0.196);
    white.scale.set(1.15, 0.85, 0.6);
    head.add(white, ball(0.026, P.iris, sd * 0.088, 0.035, 0.222));
    const brow = part(new THREE.BoxGeometry(0.085, 0.018, 0.02), captain ? P.beard : P.hair, sd * 0.09, 0.098, 0.212);
    brow.rotation.z = -sd * 0.12;
    const ear = ball(0.05, skin, sd * 0.222, 0.0, 0);
    ear.scale.set(0.45, 1, 0.75);
    head.add(brow, ear);
  });
  const mouth = part(new THREE.BoxGeometry(0.09, 0.016, 0.02), P.lip, 0, -0.105, 0.2);
  head.add(mouth);
  if (captain) {
    const beard = ball(0.19, P.beard, 0, -0.17, 0.06);
    beard.scale.set(1, 1.05, 0.8);
    const stache = part(new THREE.CapsuleGeometry(0.03, 0.12, 3, 8).rotateZ(Math.PI / 2), P.beard, 0, -0.075, 0.215);
    head.add(beard, stache);
    // quepe de capitão
    const brim = part(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 16, 1, false, -0.9, 1.8), P.belt, 0, 0.17, 0.12);
    const band = part(new THREE.CylinderGeometry(0.255, 0.25, 0.1, 18), P.coat, 0, 0.22, 0);
    const crown = part(new THREE.CylinderGeometry(0.31, 0.26, 0.1, 18), P.white, 0, 0.32, 0);
    head.add(brim, band, crown, ball(0.04, P.coatTrim, 0, 0.23, 0.25));
  } else {
    // cabelo: calota + franja desarrumada
    const cap0 = part(new THREE.SphereGeometry(0.255, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), P.hair, 0, 0.03, -0.01);
    cap0.scale.set(1.0, 1.1, 1.04);
    cap0.rotation.x = -0.55; // puxado para trás: mostra a testa
    head.add(cap0);
    [[-0.11, 0.21, 0.12, 0.5], [0.02, 0.24, 0.11, -0.2], [0.12, 0.2, 0.1, -0.6], [0, 0.05, -0.2, 0], [-0.15, 0.06, -0.14, 0], [0.15, 0.06, -0.14, 0]].forEach(([x, y, z, r]) => {
      const tuft = ball(0.1, P.hair, x, y, z);
      tuft.scale.set(1.1, 0.7, 1);
      tuft.rotation.z = r;
      head.add(tuft);
    });
  }

  // braços: ombro → cotovelo → mão
  const arm = (sd) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(sd * 0.39, 1.58, 0);
    shoulder.add(ball(0.105, top, 0, 0, 0), cap(0.075, 0.24, top, 0, -0.2, 0));
    const elbow = new THREE.Group();
    elbow.position.y = -0.4;
    elbow.add(ball(0.07, captain ? top : skin, 0, 0, 0), cap(0.062, 0.24, captain ? top : skin, 0, -0.19, 0));
    const hand = new THREE.Group();
    hand.position.y = -0.4;
    const fist = ball(0.075, skin, 0, 0, 0);
    fist.scale.set(0.85, 1.05, 1);
    hand.add(fist);
    elbow.add(hand);
    shoulder.add(elbow);
    body.add(shoulder);
    return { shoulder, elbow, hand };
  };
  // pernas: quadril → joelho → bota (o Capitão tem perna de pau na direita)
  const leg = (sd, peg) => {
    const hip = new THREE.Group();
    hip.position.set(sd * 0.14, 0.95, 0);
    hip.add(cap(0.1, 0.26, P.pants, 0, -0.22, 0));
    const knee = new THREE.Group();
    knee.position.y = -0.45;
    if (peg) {
      knee.add(part(new THREE.CylinderGeometry(0.05, 0.035, 0.5, 8), P.peg, 0, -0.25, 0), part(new THREE.CylinderGeometry(0.1, 0.085, 0.08, 10), P.belt, 0, 0, 0));
    } else {
      knee.add(ball(0.09, P.pants, 0, 0, 0), cap(0.08, 0.24, P.pants, 0, -0.2, 0));
      const boot = part(new THREE.CapsuleGeometry(0.085, 0.16, 4, 10).rotateX(Math.PI / 2), P.boot, 0, -0.44, 0.05);
      boot.scale.y = 0.8;
      knee.add(boot, part(new THREE.CylinderGeometry(0.095, 0.09, 0.12, 10), P.boot, 0, -0.34, 0));
    }
    hip.add(knee);
    body.add(hip);
    return { hip, knee };
  };
  const aL = arm(-1);
  const aR = arm(1);
  const lL = leg(-1, false);
  const lR = leg(1, captain);
  return {
    root, body, head, torso,
    armL: aL.shoulder, armR: aR.shoulder, elbowL: aL.elbow, elbowR: aR.elbow, handR: aR.hand,
    legL: lL.hip, legR: lR.hip, kneeL: lL.knee, kneeR: lR.knee,
  };
}

/** Arma presa à mão direita (aponta para a frente); muda com o nível. */
export function weapon(level) {
  const g = new THREE.Group();
  if (level <= 2) {
    g.add(part(new THREE.CylinderGeometry(0.03, 0.035, 0.9, 8).rotateX(Math.PI / 2), P.peg, 0, 0, 0.3));
    const head = part(new THREE.BoxGeometry(0.07, 0.34, 0.26), level === 1 ? M.metal : M.rock, 0, 0.1, 0.68);
    g.add(head, part(new THREE.BoxGeometry(0.09, 0.12, 0.12), M.rockDark, 0, -0.03, 0.68));
  } else {
    g.add(part(new THREE.CylinderGeometry(0.03, 0.03, 0.24, 8).rotateX(Math.PI / 2), P.belt, 0, 0, 0.02));
    g.add(part(new THREE.BoxGeometry(0.26, 0.05, 0.05), M.gold, 0, 0, 0.16));
    const blade = part(new THREE.BoxGeometry(0.08, 0.025, 1.05), level === 3 ? M.crystal : M.core, 0, 0, 0.7);
    g.add(blade, part(new THREE.ConeGeometry(0.045, 0.16, 4).rotateX(Math.PI / 2), level === 3 ? M.crystal : M.core, 0, 0, 1.3));
  }
  return g;
}

export function slime() {
  const root = new THREE.Group();
  // gelatina: brilhante, meio transparente, com um "miolo" mais escuro dentro
  const g = new THREE.SphereGeometry(0.78, 28, 20);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y < -0.2) p.setY(i, -0.2 + (y + 0.2) * 0.3);
    else p.setY(i, y * 1.05); // topo um pouco mais alto
  }
  g.computeVertexNormals();
  const jelly = new THREE.MeshStandardMaterial({ color: 0x6fdc5a, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.8, emissive: 0x1d6a12, emissiveIntensity: 0.6 });
  const body = new THREE.Mesh(g, jelly);
  body.position.y = 0.62;
  body.castShadow = true;
  root.add(body);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10), new THREE.MeshStandardMaterial({ color: 0x2f8a26, roughness: 0.5 }));
  core.position.set(0, -0.08, -0.05);
  body.add(core);
  // carinha: olhos grandes com brilho e boquinha
  [-0.24, 0.24].forEach((x) => {
    body.add(mesh(new THREE.SphereGeometry(0.15, 12, 10), M.white, x, 0.2, 0.62));
    body.add(mesh(new THREE.SphereGeometry(0.085, 10, 8), M.eye, x, 0.2, 0.74));
    body.add(mesh(new THREE.SphereGeometry(0.03, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff }), x + 0.03, 0.25, 0.81));
  });
  const mouth = mesh(new THREE.TorusGeometry(0.09, 0.022, 6, 12, Math.PI), M.eye, 0, 0.02, 0.73);
  mouth.rotation.z = Math.PI;
  body.add(mouth);
  return { root, body };
}

// ---------- otimização: junta as peças de cada articulação numa malha só ----------

const RIG = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72 });

/**
 * Em cada grupo (articulação), junta as peças opacas numa malha com a cor nos vértices.
 * O herói cai de ~50 desenhos por quadro para ~13 (e o mesmo nas sombras).
 * Peças que brilham, transparentes ou listadas em keep ficam separadas.
 */
export function bakeRig(root, { keep = [], material = RIG } = {}) {
  const mats = new Map();
  const matFor = (src) => {
    const key = `${src.side}|${!!src.flatShading}`;
    if (!mats.has(key)) {
      const m = material.clone();
      m.side = src.side;
      m.flatShading = !!src.flatShading;
      mats.set(key, m);
    }
    return mats.get(key);
  };
  const groups = [];
  root.traverse((o) => {
    if (!o.isMesh) groups.push(o);
  });
  for (const g of groups) {
    const buckets = new Map();
    for (const c of g.children) {
      if (!c.isMesh || keep.includes(c) || c.material.transparent) continue;
      if (c.material.emissive && c.material.emissive.getHex() !== 0) continue;
      const m = matFor(c.material);
      if (!buckets.has(m)) buckets.set(m, []);
      buckets.get(m).push(c);
    }
    for (const [m, meshes] of buckets) {
      if (meshes.length < 2) continue;
      const geos = meshes.map((c) => {
        c.updateMatrix();
        let geo = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone();
        const painted = c.material.vertexColors && geo.attributes.color; // pedra já pintada nos vértices
        for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') geo.deleteAttribute(k);
        geo.applyMatrix4(c.matrix);
        const n = geo.attributes.position.count;
        const col = new Float32Array(n * 3);
        const cc = c.material.color;
        for (let i = 0; i < n; i++) {
          const k = painted ? [geo.attributes.color.getX(i), geo.attributes.color.getY(i), geo.attributes.color.getZ(i)] : [1, 1, 1];
          col.set([cc.r * k[0], cc.g * k[1], cc.b * k[2]], i * 3);
        }
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        return geo;
      });
      const merged = new THREE.Mesh(mergeGeometries(geos), m);
      merged.castShadow = true;
      merged.receiveShadow = true;
      meshes.forEach((c) => g.remove(c));
      g.add(merged);
    }
  }
  return [...mats.values()];
}

export function wolf() {
  const root = new THREE.Group();
  const fur = P.fur.clone();
  // corpo: peito largo afinando para o quadril
  const chest = ball(0.36, fur, 0, 0.95, 0.35);
  chest.scale.set(0.9, 1, 1.2);
  const belly = part(new THREE.CapsuleGeometry(0.27, 0.6, 4, 12).rotateX(Math.PI / 2), fur, 0, 0.92, -0.15);
  const rump = ball(0.3, fur, 0, 0.93, -0.55);
  const neck = part(new THREE.CapsuleGeometry(0.19, 0.25, 4, 10).rotateX(1.0), fur, 0, 1.15, 0.68);
  const ruff = ball(0.25, P.furLight, 0, 0.95, 0.62);
  ruff.scale.set(0.9, 1, 0.8);
  // cabeça: crânio, focinho, nariz, orelhas e olhos
  const head = new THREE.Group();
  head.position.set(0, 1.32, 0.95);
  const skull = ball(0.23, fur, 0, 0, 0);
  skull.scale.set(1, 0.9, 1.05);
  const snout = part(new THREE.CylinderGeometry(0.08, 0.15, 0.36, 10).rotateX(Math.PI / 2), P.furLight, 0, -0.06, 0.3);
  head.add(skull, snout, ball(0.055, P.nose, 0, -0.03, 0.49));
  [-1, 1].forEach((sd) => {
    const ear = part(new THREE.ConeGeometry(0.085, 0.24, 6), P.furDark, sd * 0.13, 0.25, -0.02);
    ear.rotation.z = -sd * 0.2;
    head.add(ear, ball(0.04, M.fire, sd * 0.11, 0.05, 0.19));
  });
  root.add(chest, belly, rump, neck, ruff, head);
  const legs = [[-0.2, 0.42, 0.62], [0.2, 0.42, 0.62], [-0.19, -0.55, 0.6], [0.19, -0.55, 0.6]].map(([x, z, len]) => {
    const g = new THREE.Group();
    g.position.set(x, 0.78, z);
    g.add(cap(0.075, len - 0.2, P.furDark, 0, -len / 2 + 0.05, 0), ball(0.085, P.furDark, 0, -len - 0.08, 0.04));
    root.add(g);
    return g;
  });
  const tail = new THREE.Group();
  tail.position.set(0, 1.02, -0.8);
  tail.add(part(new THREE.ConeGeometry(0.14, 0.75, 8).rotateX(-Math.PI / 2), P.furDark, 0, 0, -0.36), ball(0.07, P.furLight, 0, 0, -0.7));
  tail.rotation.x = 0.6;
  root.add(tail);
  // cada lobo tem seu material (para piscar ao levar golpe)
  const mats = bakeRig(root, { material: RIG.clone() });
  return { root, mats, legs, tail, head };
}

/** Pedra orgânica com musgo em cima e frestas escuras (usada no Golem). */
function stone(r, seed, sx = 1, sy = 1, sz = 1, moss = 1) {
  let g = new THREE.IcosahedronGeometry(r, 1);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  lumpy(g, 0.2, 2.2 / r, seed);
  lumpy(g, 0.06, 6.0 / r, seed + 1);
  g.scale(sx, sy, sz);
  return paint(g, (x, y, z, nx, ny) => {
    const n = Math.sin(x * 4.1 + z * 3.3 + seed) * 0.5 + 0.5;
    const base = 0.12 + n * 0.06;
    const m = Math.min(1, Math.max(0, (ny - 0.5) * 2.5)) * moss * (0.5 + n * 0.5);
    return [base * (1 - m) + 0.1 * m, base * (1 - m) + 0.2 * m, base * 1.06 * (1 - m) + 0.05 * m];
  });
}

/** O Golem: rochas com musgo, cristais nas costas e o coração de fogo no peito rachado. */
export function golem() {
  const root = new THREE.Group();
  const rock = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, flatShading: true, roughness: 0.92 });
  const glow = M.core.clone();
  const R = (geo, x, y, z) => mesh(geo, rock, x, y, z);
  // tronco: peito largo + barriga, ombros de pedra
  const body = R(stone(1.7, 1, 1.25, 1.05, 0.85), 0, 3.3, 0);
  root.add(body, R(stone(1.2, 2, 1.1, 0.8, 0.9), 0, 1.9, 0.05));
  [-1, 1].forEach((sd) => root.add(R(stone(0.95, 3 + sd, 1.1, 0.9, 1), sd * 1.75, 4.35, -0.1)));
  // coração e rachaduras brilhando ao redor
  const core = mesh(new THREE.IcosahedronGeometry(0.5, 1), glow, 0, 3.4, 1.38);
  root.add(core);
  [[0.55, 0.25, 0.6], [-0.5, 0.35, -0.7], [0.3, -0.55, 1.9], [-0.4, -0.45, -2.1]].forEach(([x, y, rz]) => {
    const c = mesh(new THREE.BoxGeometry(0.75, 0.07, 0.08), glow, x * 0.9, 3.4 + y, 1.3);
    c.rotation.z = rz;
    root.add(c);
  });
  // cristais nas costas
  [[-0.7, 4.7, -0.9, -0.4, 1.0], [0.2, 5.0, -1.0, 0.2, 1.3], [0.9, 4.5, -0.8, 0.5, 0.9], [-0.1, 4.0, -1.3, -0.1, 0.8]].forEach(([x, y, z, rz, k]) => {
    const c = mesh(new THREE.OctahedronGeometry(0.35 * k, 0).scale(0.7, 2.2, 0.7), M.crystal, x, y, z);
    c.rotation.set(-0.5, 0, rz);
    root.add(c);
  });
  // cabeça afundada nos ombros, com testa e olhos de brasa
  const head = new THREE.Group();
  head.position.set(0, 5.05, 0.35);
  head.add(mesh(stone(0.7, 9, 1.1, 0.85, 1), rock, 0, 0, 0));
  head.add(mesh(new THREE.BoxGeometry(1.1, 0.2, 0.35), rock, 0, 0.2, 0.5));
  [-0.27, 0.27].forEach((x) => head.add(mesh(new THREE.SphereGeometry(0.11, 8, 6), glow, x, 0.02, 0.62)));
  root.add(head);
  const arm = (sd) => {
    const g = new THREE.Group();
    g.position.set(sd * 2.25, 4.1, 0);
    g.add(R(stone(0.75, 10 + sd, 1, 1.25, 1), 0, -0.7, 0));
    g.add(R(stone(1.0, 12 + sd, 1.05, 1.1, 1.05, 0.4), 0, -2.3, 0.2));
    // dedos de pedra
    [-0.35, 0, 0.35].forEach((x, i) => g.add(R(stone(0.28, 14 + i, 1, 1.3, 1, 0), x, -3.25, 0.45)));
    root.add(g);
    return g;
  };
  [-1, 1].forEach((sd) => root.add(R(stone(0.85, 20 + sd, 1, 1.45, 1.05, 0.3), sd * 0.9, 0.95, 0)));
  return { root, body, core, head, mats: [rock], armL: arm(-1), armR: arm(1) };
}

// ---------- construções ----------

export function buildSiteMarker() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.08, 6, 24), new THREE.MeshBasicMaterial({ color: 0x4dd0ff, transparent: true, opacity: 0.8 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.15;
  const icon = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), new THREE.MeshBasicMaterial({ color: 0x4dd0ff, transparent: true, opacity: 0.9 }));
  icon.position.y = 1.8;
  g.add(ring, icon);
  g.userData.icon = icon;
  return g;
}

export function fogueira() {
  const g = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const st = mesh(stone(0.3, 40 + i, 1.1, 0.8, 1, 0.2), FIRE_STONE, Math.cos(a) * 0.9, 0.14, Math.sin(a) * 0.9);
    st.rotation.y = a;
    g.add(st);
  }
  for (let i = 0; i < 4; i++) {
    const log = mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.3, 7), M.woodDark, 0, 0.32, 0);
    log.rotation.set(Math.PI / 2 - 0.55, (i / 4) * Math.PI * 2 + 0.3, 0, 'YXZ');
    g.add(log);
  }
  // brasas na base + chama em duas camadas (laranja por fora, amarela por dentro)
  g.add(mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.12, 10), M.core, 0, 0.08, 0));
  const flame = new THREE.Group();
  const outer = mesh(new THREE.ConeGeometry(0.42, 1.25, 8, 3, true), M.fire, 0, 0.85, 0);
  const inner = mesh(new THREE.ConeGeometry(0.24, 0.85, 8), FLAME_IN, 0, 0.7, 0);
  outer.castShadow = inner.castShadow = false;
  flame.add(outer, inner);
  const light = new THREE.PointLight(0xff8a3a, 30, 22, 1.6);
  light.position.y = 1.6;
  g.add(flame, light);
  bakeRig(g);
  g.userData = { flame, light };
  return g;
}

export function bancada() {
  const g = new THREE.Group();
  // tampo de tábuas grossas, pernas com travessas
  for (let i = 0; i < 4; i++) g.add(box(2.5, 0.14, 0.27, i % 2 ? M.wood : PLANK, 0, 1.0, -0.42 + i * 0.28));
  [[-1.05, -0.4], [1.05, -0.4], [-1.05, 0.4], [1.05, 0.4]].forEach(([x, z]) => g.add(box(0.16, 1, 0.16, M.woodDark, x, 0.5, z)));
  g.add(box(2.1, 0.1, 0.1, M.woodDark, 0, 0.3, -0.4), box(2.1, 0.1, 0.1, M.woodDark, 0, 0.3, 0.4));
  // morsa, martelo, serrote e bigorna
  g.add(box(0.3, 0.25, 0.35, M.metal, -0.85, 1.2, 0.25), box(0.1, 0.1, 0.5, M.metal, -0.85, 1.15, 0.5));
  const handle = mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.6, 6), M.wood, 0.2, 1.1, 0.15);
  handle.rotation.z = Math.PI / 2;
  g.add(handle, box(0.12, 0.13, 0.26, M.metal, 0.5, 1.13, 0.15));
  const saw = box(0.75, 0.22, 0.02, M.metal, -0.1, 1.09, -0.25);
  saw.rotation.x = -Math.PI / 2;
  g.add(saw, box(0.22, 0.12, 0.05, M.woodDark, 0.32, 1.1, -0.25));
  g.add(box(0.7, 0.28, 0.32, ANVIL, 1.75, 0.75, 0.1), box(0.38, 0.5, 0.28, ANVIL, 1.75, 0.35, 0.1), box(0.6, 0.12, 0.45, ANVIL, 1.75, 0.06, 0.1));
  // lenha empilhada
  for (let i = 0; i < 5; i++) {
    const l = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.9, 7), i % 2 ? M.wood : M.woodDark, -1.75 + (i % 3) * 0.27 - (i > 2 ? -0.13 : 0), 0.14 + (i > 2 ? 0.24 : 0), 0);
    l.rotation.x = Math.PI / 2;
    g.add(l);
  }
  bakeRig(g);
  return g;
}

export function cabana() {
  const g = new THREE.Group();
  const W = 5;
  const D = 4.2;
  const r = 0.19;
  // paredes de toras: frente/trás e laterais intercaladas, com pontas sobrando nos cantos
  for (let row = 0; row < 7; row++) {
    const y = 0.2 + row * r * 1.9;
    const side = row % 2;
    const mat = row % 3 === 0 ? M.woodDark : M.wood;
    [-1, 1].forEach((sd) => {
      if (side === 0) {
        const lg = mesh(new THREE.CylinderGeometry(r, r, W + 0.6, 8), mat, 0, y, sd * D / 2);
        lg.rotation.z = Math.PI / 2;
        g.add(lg);
      } else {
        const lg = mesh(new THREE.CylinderGeometry(r, r, D + 0.6, 8), mat, sd * W / 2, y + r * 0.95, 0);
        lg.rotation.x = Math.PI / 2;
        g.add(lg);
      }
    });
  }
  // empenas (triângulos de tábua) na frente e atrás
  const tri = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(0, 1.7)]);
  [-1, 1].forEach((sd) => {
    const gable = mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.2, bevelEnabled: false }), PLANK, 0, 2.75, sd * (D / 2) - 0.1);
    g.add(gable);
  });
  // telhado de palha em 3 fileiras de cada lado + cumeeira
  const ang = Math.atan2(1.7, W / 2);
  const len = Math.hypot(1.7, W / 2) + 0.5;
  [-1, 1].forEach((sd) => {
    for (let k = 0; k < 3; k++) {
      const t = (k + 0.5) / 3;
      const strip = box(len / 3 + 0.25, 0.22, D + 1.0, k % 2 ? THATCH : THATCH_DARK, sd * (W / 2 + 0.25) * (1 - t), 2.72 + 1.75 * t, 0);
      strip.rotation.z = -sd * ang;
      g.add(strip);
    }
  });
  const ridge = mesh(new THREE.CylinderGeometry(0.17, 0.17, D + 1.1, 8), M.woodDark, 0, 4.5, 0);
  ridge.rotation.x = Math.PI / 2;
  g.add(ridge);
  // porta com moldura, janela acesa, chaminé de pedra e varanda
  g.add(box(1.0, 1.8, 0.1, PLANK, 0, 0.95, D / 2 + 0.17), box(1.2, 0.12, 0.16, M.woodDark, 0, 1.9, D / 2 + 0.18));
  g.add(box(0.06, 0.06, 0.06, M.gold, 0.32, 0.95, D / 2 + 0.24));
  g.add(box(0.9, 0.7, 0.06, WINDOW, 1.55, 1.5, D / 2 + 0.17), box(1.05, 0.1, 0.12, M.woodDark, 1.55, 1.9, D / 2 + 0.2), box(1.05, 0.1, 0.14, M.woodDark, 1.55, 1.12, D / 2 + 0.22));
  for (let i = 0; i < 4; i++) g.add(mesh(stone(0.42 - i * 0.04, 60 + i, 1.1, 0.75, 1.1, 0.1), CHIMNEY, -W / 2 + 0.6, 0.4 + i * 0.95, -D / 2 + 0.7));
  g.add(mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.9, 8), M.rockDark, -W / 2 + 0.6, 4.3, -D / 2 + 0.7));
  for (let i = 0; i < 6; i++) g.add(box(0.36, 0.08, 1.2, i % 2 ? PLANK : M.wood, -1.0 + i * 0.4, 0.06, D / 2 + 0.8));
  bakeRig(g);
  return g;
}

/** Barco: quebrado (sem mastro, inclinado) ou consertado (com vela). */
export function barco(fixed) {
  const g = new THREE.Group();
  // casco: meia esfera alongada, aberta em cima, com borda e bancos
  const hg = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  hg.scale(1.3, 0.95, 3.2);
  const hull = new THREE.Mesh(hg, new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: 0.85, side: THREE.DoubleSide }));
  hull.position.y = 1.0;
  hull.castShadow = true;
  g.add(hull);
  const rim = mesh(new THREE.TorusGeometry(1, 0.08, 6, 28), M.woodDark, 0, 1.0, 0);
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(1.3, 3.2, 1);
  g.add(rim);
  for (let k = -1; k <= 1; k++) g.add(box(2.3, 0.1, 0.4, PLANK, 0, 0.75, k * 1.3));
  if (fixed) {
    g.add(mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.2, 8), M.woodDark, 0, 3.3, 0.4));
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6).rotateZ(Math.PI / 2), M.woodDark, 0, 2.0, 0.55));
    // vela curva (bojuda com o vento)
    const sg = new THREE.PlaneGeometry(2.6, 3.0, 8, 8);
    const sp = sg.attributes.position;
    for (let i = 0; i < sp.count; i++) {
      const x = sp.getX(i);
      const y = sp.getY(i);
      sp.setZ(i, (1 - (x / 1.3) ** 2) * (1 - ((y - 0.2) / 1.7) ** 2) * 0.45);
    }
    sg.computeVertexNormals();
    const sail = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ color: 0xf1e6cc, side: THREE.DoubleSide, roughness: 0.9 }));
    sail.position.set(0, 3.55, 0.55);
    sail.castShadow = true;
    g.add(sail, mesh(new THREE.IcosahedronGeometry(0.3, 1), M.core, 0, 1.2, -1.9));
  } else {
    g.rotation.z = 0.28;
    g.position.y = -0.2;
  }
  return g;
}
