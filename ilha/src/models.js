// Modelos 3D em estilo low-poly, todos feitos por código.
import * as THREE from 'three';

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
  berry: mat(0xd62f4b),
  bush: mat(0x3f8f3a),
  crystal: mat(0x6ff2ff, { emissive: 0x2ad4f0, emissiveIntensity: 0.9, roughness: 0.2 }),
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

/** Geometrias dos recursos, já posicionadas (base no chão), por tipo: [geometria, material][] */
export function nodeParts() {
  const g = (geo, y) => geo.translate(0, y, 0);
  return {
    tree: [
      [g(new THREE.CylinderGeometry(0.22, 0.32, 2.4, 6), 1.2), M.wood],
      [g(new THREE.IcosahedronGeometry(1.75, 0), 3.5), M.leaf],
      [new THREE.IcosahedronGeometry(1.1, 0).translate(0.9, 2.8, 0.3), M.leaf],
    ],
    pine: [
      [g(new THREE.CylinderGeometry(0.2, 0.3, 2, 6), 1), M.woodDark],
      [g(new THREE.ConeGeometry(1.7, 2.8, 7), 3), M.pine],
      [g(new THREE.ConeGeometry(1.2, 2.4, 7), 4.7), M.pine],
    ],
    rock: [[new THREE.IcosahedronGeometry(1, 0).scale(1.25, 0.85, 1.05).translate(0, 0.45, 0), M.rock]],
    bush: [[new THREE.IcosahedronGeometry(0.85, 0).scale(1.2, 0.8, 1.2).translate(0, 0.5, 0), M.bush]],
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
  const body = mesh(new THREE.IcosahedronGeometry(0.75, 1), M.slime.clone(), 0, 0.6, 0);
  body.scale.set(1, 0.8, 1);
  root.add(body);
  [-0.22, 0.22].forEach((x) => {
    root.add(mesh(new THREE.SphereGeometry(0.13, 6, 5), M.white, x, 0.8, 0.58));
    root.add(mesh(new THREE.SphereGeometry(0.07, 6, 5), M.eye, x, 0.8, 0.69));
  });
  return { root, body };
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
  return { root, body: chest, legs, tail, head };
}

export function golem() {
  const root = new THREE.Group();
  const body = mesh(new THREE.DodecahedronGeometry(1.9, 0), M.golem.clone(), 0, 3.1, 0);
  body.scale.set(1.1, 1.15, 0.9);
  const head = mesh(new THREE.DodecahedronGeometry(0.85, 0), M.golemDark, 0, 5.4, 0.2);
  const core = mesh(new THREE.IcosahedronGeometry(0.6, 0), M.core.clone(), 0, 3.3, 1.5);
  root.add(body, head, core);
  [-0.3, 0.3].forEach((x) => root.add(mesh(new THREE.SphereGeometry(0.14, 6, 5), M.core, x, 5.5, 0.95)));
  const arm = (s) => {
    const g = new THREE.Group();
    g.position.set(s * 2.3, 4.2, 0);
    g.add(mesh(new THREE.DodecahedronGeometry(0.9, 0), M.golemDark, 0, -0.8, 0));
    g.add(mesh(new THREE.DodecahedronGeometry(1.1, 0), M.golem, 0, -2.4, 0.2));
    root.add(g);
    return g;
  };
  const leg = (s) => root.add(mesh(new THREE.DodecahedronGeometry(0.95, 0).scale(1, 1.4, 1), M.golemDark, s * 0.95, 0.95, 0));
  leg(-1);
  leg(1);
  return { root, body, core, armL: arm(-1), armR: arm(1) };
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
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    g.add(mesh(new THREE.IcosahedronGeometry(0.28, 0), M.rock, Math.cos(a) * 0.85, 0.15, Math.sin(a) * 0.85));
  }
  for (let i = 0; i < 3; i++) {
    const log = mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.2, 5), M.woodDark, 0, 0.3, 0);
    log.rotation.set(Math.PI / 2 - 0.5, (i / 3) * Math.PI * 2, 0, 'YXZ');
    g.add(log);
  }
  const flame = mesh(new THREE.ConeGeometry(0.42, 1.2, 6), M.fire, 0, 0.85, 0);
  flame.castShadow = false;
  const light = new THREE.PointLight(0xff8a3a, 30, 22, 1.6);
  light.position.y = 1.6;
  g.add(flame, light);
  g.userData = { flame, light };
  return g;
}

export function bancada() {
  const g = new THREE.Group();
  g.add(box(2.4, 0.16, 1.1, M.wood, 0, 1, 0));
  [[-1, -0.4], [1, -0.4], [-1, 0.4], [1, 0.4]].forEach(([x, z]) => g.add(box(0.16, 1, 0.16, M.woodDark, x, 0.5, z)));
  g.add(box(0.5, 0.3, 0.4, M.metal, -0.6, 1.23, 0), box(0.1, 0.1, 0.8, M.woodDark, 0.5, 1.13, 0.1), box(0.3, 0.2, 0.2, M.rock, 0.5, 1.18, -0.3));
  return g;
}

export function cabana() {
  const g = new THREE.Group();
  g.add(box(5, 2.6, 4.2, M.wood, 0, 1.3, 0));
  const roof = mesh(new THREE.ConeGeometry(4.3, 2.2, 4), M.red, 0, 3.7, 0);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1, 1, 0.85);
  g.add(roof, box(1.1, 1.9, 0.12, M.woodDark, 0, 0.95, 2.14), box(0.9, 0.8, 0.1, M.crystal, 1.6, 1.6, 2.13));
  return g;
}

/** Barco: quebrado (sem mastro, inclinado) ou consertado (com vela). */
export function barco(fixed) {
  const g = new THREE.Group();
  const hull = mesh(new THREE.CylinderGeometry(1.5, 0.9, 6, 6, 1, false, 0, Math.PI), M.wood, 0, 0.7, 0);
  hull.rotation.set(0, 0, Math.PI / 2, 'XYZ');
  hull.rotation.y = Math.PI / 2;
  g.add(hull, box(2.4, 0.14, 5.4, M.woodDark, 0, 0.95, 0));
  if (fixed) {
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 5, 6), M.woodDark, 0, 3.4, 0.3));
    const sail = mesh(new THREE.PlaneGeometry(2.8, 3), new THREE.MeshStandardMaterial({ color: 0xf4ead2, side: THREE.DoubleSide, flatShading: true }), 0, 3.9, 0.36);
    g.add(sail, mesh(new THREE.IcosahedronGeometry(0.3, 0), M.core, 0, 1.3, -1.6));
  } else {
    g.rotation.z = 0.28;
    g.position.y = -0.2;
  }
  return g;
}
