// Clientes do salão: geradas aleatoriamente e construídas em 3D (estilo boneca de vinil).
// Medidas em metros; a cabeça fica na origem.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Surface, rgb } from './paint.js';

export const R = 0.1; // raio da cabeça
const SCALE = new THREE.Vector3(0.92, 1.05, 0.96);
export const HAND_POS = new THREE.Vector3(0.55, -0.32, 0.12);

const SKIN = ['#f9dcc8', '#f0c4a6', '#dca683', '#bf825d', '#94603f', '#6f452c'];
const HAIR = ['#2b1b14', '#5a3825', '#a0703f', '#dcb46e', '#8a3324', '#1c1c22'];
const EYES = ['#5b3a1e', '#2f6f9f', '#3f7d4f', '#6b4f2a'];
const NAMES = ['Ana', 'Bia', 'Clara', 'Duda', 'Gabi', 'Júlia', 'Lara', 'Malu', 'Nina', 'Sofia', 'Valentina', 'Yasmin', 'Lívia', 'Helena', 'Cecília', 'Manu'];
const STYLES = ['curto', 'longo', 'coque'];

/** Cores que as clientes pedem e que aparecem para escolher. `neon` vem do pacote da loja. */
export const PALETTES = {
  blush: [
    { name: 'rosado', hex: '#f07fa0' },
    { name: 'pêssego', hex: '#f5a07a' },
    { name: 'coral', hex: '#ef6f62' },
    { name: 'lilás', hex: '#c595e0' },
  ],
  lips: [
    { name: 'vermelho', hex: '#c8102e' },
    { name: 'rosa', hex: '#e75d8f' },
    { name: 'nude', hex: '#c08676' },
    { name: 'vinho', hex: '#7a1f3d' },
    { name: 'coral', hex: '#ff6f61' },
  ],
  nails: [
    { name: 'vermelho', hex: '#d0142c' },
    { name: 'rosa bebê', hex: '#f7a8c4' },
    { name: 'lilás', hex: '#b28dde' },
    { name: 'azul', hex: '#3d7fe0' },
    { name: 'preto', hex: '#1b1b1f' },
    { name: 'menta', hex: '#7fd8be' },
  ],
  hair: [
    { name: 'rosa', hex: '#ff5fa2' },
    { name: 'roxo', hex: '#8e44ad' },
    { name: 'azul', hex: '#2f80ed' },
    { name: 'ruivo', hex: '#c0392b' },
    { name: 'loiro', hex: '#f2c94c' },
    { name: 'verde', hex: '#27ae60' },
  ],
};
export const NEON = [
  { name: 'neon verde', hex: '#39ff14' },
  { name: 'neon pink', hex: '#ff00d4' },
  { name: 'neon azul', hex: '#00e5ff' },
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function randomClient(n) {
  return {
    name: pick(NAMES),
    skin: pick(SKIN),
    hair: pick(HAIR),
    eyes: pick(EYES),
    style: pick(STYLES),
    cape: pick(['#f8a5c2', '#ffffff', '#c3aed6', '#9ad0ec']),
    // a cada cliente o rosto vem um pouco mais "trabalhoso"
    blackheads: Math.min(14, 5 + Math.floor(n / 2)),
    pimples: Math.min(6, 2 + Math.floor(n / 3)),
    strays: Math.min(10, 4 + Math.floor(n / 2)),
    want: {
      blush: pick(PALETTES.blush),
      lips: pick(PALETTES.lips),
      nails: pick(PALETTES.nails),
      hair: pick(PALETTES.hair),
    },
  };
}

// ---------- utilidades de posição na cabeça ----------

/** Direção a partir do centro: yaw (para os lados, 0 = frente) e pitch (para cima). */
export function dir(yaw, pitch) {
  return new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
}

/** Ponto na superfície da cabeça numa direção, com um deslocamento opcional para fora. */
export function onHead(d, out = 0) {
  const p = new THREE.Vector3(d.x * SCALE.x, d.y * SCALE.y, d.z * SCALE.z).multiplyScalar(R);
  return p.addScaledVector(d, out);
}

/** UV da esfera do three.js para uma direção (u = 0,25 é a frente). */
export function dirToUV(d) {
  const theta = Math.acos(THREE.MathUtils.clamp(d.y, -1, 1));
  let phi = Math.atan2(d.z, -d.x);
  if (phi < 0) phi += Math.PI * 2;
  return new THREE.Vector2(phi / (Math.PI * 2), 1 - theta / Math.PI);
}

export function uvToDir(u, v) {
  const phi = u * Math.PI * 2;
  const theta = (1 - v) * Math.PI;
  return new THREE.Vector3(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
}

const EYE_YAW = 0.36;
const EYE_PITCH = 0.08;
export const CHEEK = { yaw: 0.5, pitch: -0.16 };
const MOUTH_PITCH = -0.43;

/** Região do rosto (para medir máscara, base, limpeza): frente da cabeça, sem olhos e boca. */
export function inFace(d) {
  if (d.z < 0.42 || d.y > 0.6 || d.y < -0.74) return false;
  for (const s of [-1, 1]) if (d.distanceTo(dir(s * EYE_YAW, EYE_PITCH)) < 0.16) return false;
  if (d.distanceTo(dir(0, MOUTH_PITCH)) < 0.13) return false;
  return true;
}

export function inCheek(d) {
  return [-1, 1].some((s) => d.distanceTo(dir(s * CHEEK.yaw, CHEEK.pitch)) < 0.2);
}

// ---------- materiais ----------

function skinMat(color, map) {
  return new THREE.MeshPhysicalMaterial({
    color: map ? 0xffffff : color,
    map,
    roughness: 0.5,
    sheen: 0.6,
    sheenColor: new THREE.Color('#ffc9c9'),
    sheenRoughness: 0.6,
    clearcoat: 0.08,
  });
}

function fabricTex(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.12)';
    g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 4);
  return t;
}

function mesh(geo, mat, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

function shade(hex, k) {
  return '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
}

// ---------- texturas pintáveis ----------

function faceSurface(client) {
  const s = new Surface(1024, (g, size) => {
    g.fillStyle = client.skin;
    g.fillRect(0, 0, size, size);
    // leve rosado natural nas bochechas e no nariz
    [-1, 1].forEach((sd) => {
      const uv = dirToUV(dir(sd * CHEEK.yaw, CHEEK.pitch));
      const gr = g.createRadialGradient(uv.x * size, (1 - uv.y) * size, 0, uv.x * size, (1 - uv.y) * size, size * 0.05);
      gr.addColorStop(0, 'rgba(240,120,120,0.18)');
      gr.addColorStop(1, 'rgba(240,120,120,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, size, size);
    });
  });
  // Vermelhidões (a base cobre)
  s.add('redness');
  for (let i = 0; i < 18; i++) {
    const d = dir((Math.random() - 0.5) * 1.1, -0.5 + Math.random() * 0.9);
    if (!inFace(d)) continue;
    const uv = dirToUV(d);
    s.dab('redness', uv.x, uv.y, 0.008 + Math.random() * 0.012, '214,90,90', 0.35);
  }
  s.add('foundation', 'source-over', 0.92);
  s.add('blush', 'source-over', 0.55);
  // Sujeira/oleosidade para o algodão limpar
  s.add('dirt');
  for (let i = 0; i < 70; i++) {
    const d = dir((Math.random() - 0.5) * 1.3, -0.65 + Math.random() * 1.2);
    if (d.z < 0.4) continue;
    const uv = dirToUV(d);
    s.dab('dirt', uv.x, uv.y, 0.015 + Math.random() * 0.02, Math.random() < 0.5 ? '120,98,80' : '150,130,105', 0.55);
  }
  s.add('mask', 'source-over', 0.95);
  s.update();
  return s;
}

function lipsSurface(skin) {
  return new Surface(128, (g, size) => {
    g.fillStyle = shade('#d98a8a', 0.6 + 0.4 * new THREE.Color(skin).getHSL({}).l);
    g.fillRect(0, 0, size, size);
    g.strokeStyle = 'rgba(120,40,50,0.25)';
    for (let x = 4; x < size; x += 6) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + 2, size);
      g.stroke();
    }
  });
}

function hairSurface(color) {
  const s = new Surface(256, (g, size) => {
    g.fillStyle = color;
    g.fillRect(0, 0, size, size);
  });
  s.add('dye', 'source-over', 0.88);
  // fios desenhados por cima da tinta, para o cabelo pintado continuar com textura
  const strands = s.add('strands');
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * s.size;
    strands.strokeStyle = Math.random() < 0.6 ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.13)';
    strands.lineWidth = 0.5 + Math.random() * 1.2;
    strands.beginPath();
    strands.moveTo(x, 0);
    strands.bezierCurveTo(x + (Math.random() - 0.5) * 12, 90, x + (Math.random() - 0.5) * 12, 170, x + (Math.random() - 0.5) * 8, s.size);
    strands.stroke();
  }
  s.add('wet', 'multiply', 0.85);
  s.update();
  return s;
}

function nailSurface() {
  const s = new Surface(128, (g, size) => {
    g.fillStyle = '#f3c9c4';
    g.fillRect(0, 0, size, size);
    // lúnula (meia-lua clara na base da unha)
    g.fillStyle = 'rgba(255,255,255,0.45)';
    g.beginPath();
    g.ellipse(size / 2, size, size * 0.35, size * 0.22, 0, Math.PI, 0);
    g.fill();
  });
  // Esmalte velho descascado
  const old = s.add('old');
  old.fillStyle = 'rgb(150,20,40)';
  old.fillRect(0, 0, 128, 128);
  old.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 6; i++) {
    old.beginPath();
    old.ellipse(Math.random() * 128, Math.random() * 50, 10 + Math.random() * 18, 6 + Math.random() * 10, Math.random() * 3, 0, Math.PI * 2);
    old.fill();
  }
  old.globalCompositeOperation = 'source-over';
  s.add('polish');
  s.update();
  return s;
}

// ---------- montagem da cliente ----------

export function buildClient(client) {
  const root = new THREE.Group();
  const face = faceSurface(client);
  const lips = lipsSurface(client.skin);
  const skin = skinMat(client.skin);
  const out = { root, face, lips, client, eyes: [], blackheads: [], pimples: [], strays: [], hair: [], gems: [] };

  // Cabeça
  const head = mesh(new THREE.SphereGeometry(R, 96, 64), skinMat(client.skin, face.tex));
  head.scale.copy(SCALE);
  root.add(head);
  out.head = head;

  // Orelhas, pescoço, nariz
  [-1, 1].forEach((s) => {
    const ear = mesh(new THREE.SphereGeometry(0.019, 24, 16), skin);
    ear.scale.set(0.5, 1, 0.8);
    ear.position.copy(onHead(dir(s * 1.5, 0.02), -0.004));
    root.add(ear);
  });
  const neck = mesh(new THREE.CylinderGeometry(0.038, 0.044, 0.09, 32), skin);
  neck.position.y = -0.125;
  root.add(neck);
  const nose = mesh(new THREE.SphereGeometry(0.0095, 24, 16), skinMat(shade(client.skin, 0.98)));
  nose.scale.set(1.05, 0.85, 0.9);
  nose.position.copy(onHead(dir(0, -0.14), 0.001));
  root.add(nose);

  // Olhos com íris, brilho e cílios (piscam)
  const white = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.15, clearcoat: 1 });
  const iris = new THREE.MeshPhysicalMaterial({ color: client.eyes, roughness: 0.2, clearcoat: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });
  const glint = new THREE.MeshBasicMaterial({ color: 0xffffff });
  [-1, 1].forEach((s) => {
    const d = dir(s * EYE_YAW, EYE_PITCH);
    const g = new THREE.Group();
    g.position.copy(onHead(d, -0.007));
    g.lookAt(g.position.clone().add(new THREE.Vector3(d.x * 0.4, d.y * 0.3, 1)));
    const ball = mesh(new THREE.SphereGeometry(0.0175, 32, 24), white, false);
    const ir = mesh(new THREE.SphereGeometry(0.011, 32, 24), iris, false);
    ir.scale.z = 0.45;
    ir.position.z = 0.0135;
    const pu = mesh(new THREE.SphereGeometry(0.0055, 24, 16), dark, false);
    pu.scale.z = 0.4;
    pu.position.z = 0.0172;
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.0024, 12, 8), glint);
    gl.position.set(0.004, 0.004, 0.0182);
    const lash = mesh(new THREE.TorusGeometry(0.0176, 0.0013, 6, 24, Math.PI * 0.9), dark, false);
    lash.rotation.z = Math.PI * 0.05;
    lash.position.z = 0.004;
    lash.scale.set(1.05, 1.0, 1);
    g.add(ball, ir, pu, gl, lash);
    root.add(g);
    out.eyes.push(g);

    // Sobrancelha + pelinhos soltos para a pinça
    const browD = dir(s * EYE_YAW, EYE_PITCH + 0.27);
    // arco de toro: o grupo fica na pele virado para fora, o arco centrado no topo do círculo
    const browG = new THREE.Group();
    browG.position.copy(onHead(browD, 0.001));
    browG.lookAt(browG.position.clone().add(browD));
    const brow = mesh(new THREE.TorusGeometry(0.028, 0.0026, 8, 24, 0.9), new THREE.MeshStandardMaterial({ color: shade(client.hair, 0.75), roughness: 0.8 }), false);
    brow.rotation.z = Math.PI / 2 - 0.45 + s * 0.12;
    brow.position.set(-s * 0.002, -0.028, -0.002);
    brow.scale.set(1, 0.8, 1);
    browG.add(brow);
    root.add(browG);
  });
  const hairDark = new THREE.MeshStandardMaterial({ color: shade(client.hair, 0.7), roughness: 0.8 });
  for (let i = 0; i < client.strays; i++) {
    const s = i % 2 ? 1 : -1;
    const d = dir(s * (EYE_YAW + (Math.random() - 0.5) * 0.35), EYE_PITCH + 0.18 + Math.random() * 0.2);
    const h = mesh(new THREE.CylinderGeometry(0.0005, 0.0004, 0.006, 4), hairDark, false);
    h.position.copy(onHead(d, 0.0025));
    h.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.2, 0)).normalize());
    root.add(h);
    out.strays.push({ mesh: h, dir: d, done: false });
  }

  // Boca
  const lipMat = new THREE.MeshPhysicalMaterial({ map: lips.tex, roughness: 0.3, clearcoat: 0.6 });
  const mouthD = dir(0, MOUTH_PITCH);
  const mouth = new THREE.Group();
  mouth.position.copy(onHead(mouthD, -0.0035));
  mouth.lookAt(mouth.position.clone().add(mouthD));
  const upper = mesh(new THREE.CapsuleGeometry(0.0062, 0.02, 8, 16), lipMat, false);
  upper.rotation.z = Math.PI / 2;
  upper.position.y = 0.0052;
  upper.scale.set(1, 1, 0.75);
  const lower = mesh(new THREE.CapsuleGeometry(0.0068, 0.017, 8, 16), lipMat, false);
  lower.rotation.z = Math.PI / 2;
  lower.position.y = -0.0055;
  lower.scale.set(1, 1, 0.8);
  mouth.add(upper, lower);
  root.add(mouth);
  out.lipMeshes = [upper, lower];
  out.mouth = mouth;

  // Cravos (pontinhos escuros) e espinhas (bolinhas vermelhas com ponta branca)
  const bhMat = new THREE.MeshStandardMaterial({ color: 0x3b2a20, roughness: 0.6 });
  for (let i = 0; i < client.blackheads; i++) {
    const zone = i % 3;
    const d =
      zone === 0
        ? dir((Math.random() - 0.5) * 0.22, -0.2 + Math.random() * 0.12) // nariz
        : zone === 1
          ? dir((Math.random() - 0.5) * 0.4, 0.42 + Math.random() * 0.12) // testa
          : dir((Math.random() - 0.5) * 0.3, -0.62 - Math.random() * 0.08); // queixo
    const b = mesh(new THREE.SphereGeometry(0.0016, 10, 8), bhMat, false);
    b.position.copy(onHead(d, zone === 0 ? 0.0075 : 0.0003));
    root.add(b);
    out.blackheads.push({ mesh: b, dir: d, done: false });
  }
  const pimpleMat = new THREE.MeshStandardMaterial({ color: 0xe0606a, roughness: 0.5 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6d8, roughness: 0.4 });
  for (let i = 0; i < client.pimples; i++) {
    let d;
    do d = dir((Math.random() - 0.5) * 1.1, -0.5 + Math.random() * 0.9);
    while (!inFace(d) || d.distanceTo(dir(0, -0.14)) < 0.15);
    const p = new THREE.Group();
    p.position.copy(onHead(d, -0.0005));
    p.lookAt(p.position.clone().add(d));
    const bump = mesh(new THREE.SphereGeometry(0.0034, 16, 12), pimpleMat, false);
    bump.scale.z = 0.6;
    const top = mesh(new THREE.SphereGeometry(0.0013, 10, 8), headMat, false);
    top.position.z = 0.0021;
    p.add(bump, top);
    root.add(p);
    out.pimples.push({ mesh: p, dir: d, done: false });
  }

  // Cabelo (só aparece na estação de cabelo; antes fica a toalha turbante)
  const hairMat = (srf) => new THREE.MeshPhysicalMaterial({ map: srf.tex, roughness: 0.55, sheen: 1, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.35 });
  const hairGroup = new THREE.Group();
  const addHair = (geo, setup) => {
    const srf = hairSurface(client.hair);
    const m = mesh(geo, hairMat(srf));
    setup(m);
    hairGroup.add(m);
    out.hair.push({ mesh: m, surface: srf });
  };
  addHair(new THREE.SphereGeometry(R * 1.07, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.37), (m) => m.scale.copy(SCALE));
  addHair(new THREE.SphereGeometry(R * 1.065, 64, 32, Math.PI / 2 + 1.0, Math.PI * 2 - 2.0, Math.PI * 0.3, Math.PI * 0.36), (m) => m.scale.copy(SCALE));
  if (client.style === 'longo') {
    addHair(new THREE.CapsuleGeometry(0.075, 0.13, 12, 32), (m) => {
      m.scale.set(1.3, 1, 0.5);
      m.position.set(0, -0.09, -0.065);
    });
  } else if (client.style === 'coque') {
    addHair(new THREE.SphereGeometry(0.045, 32, 24), (m) => m.position.set(0, 0.07, -0.085));
  }
  hairGroup.visible = false;
  root.add(hairGroup);
  out.hairGroup = hairGroup;

  // Toalha turbante (rosto e unhas)
  const towelMat = new THREE.MeshStandardMaterial({ map: fabricTex('#ffffff'), roughness: 1 });
  const towel = new THREE.Group();
  const cap = mesh(new THREE.SphereGeometry(R * 1.12, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.42), towelMat);
  cap.scale.set(SCALE.x, SCALE.y * 1.1, SCALE.z);
  const band = mesh(new THREE.TorusGeometry(R * 0.98, 0.016, 16, 64), towelMat);
  band.rotation.x = Math.PI / 2 + 0.28;
  band.position.y = 0.045;
  band.scale.set(SCALE.x, SCALE.z, 1);
  const knot = mesh(new THREE.SphereGeometry(0.035, 24, 16), towelMat);
  knot.position.set(0, 0.105, 0.03);
  knot.scale.set(1.3, 0.8, 1);
  towel.add(cap, band, knot);
  root.add(towel);
  out.towel = towel;

  // Capa do salão e encosto da cadeira
  // Capa: perfil girado (pescoço -> ombros -> peito), achatada na frente/atrás
  const profile = [
    [0.0, -0.165],
    [0.047, -0.165],
    [0.06, -0.18],
    [0.15, -0.205],
    [0.2, -0.24],
    [0.215, -0.3],
    [0.22, -0.48],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const cape = mesh(new THREE.LatheGeometry(profile, 64), new THREE.MeshStandardMaterial({ map: fabricTex(client.cape), roughness: 0.85, side: THREE.DoubleSide }));
  cape.scale.set(1, 1, 0.62);
  root.add(cape);
  const chair = mesh(new RoundedBoxGeometry(0.42, 0.5, 0.08, 4, 0.04), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 }));
  chair.position.set(0, -0.3, -0.2);
  root.add(chair);

  out.hand = buildHand(client, skin);
  return out;
}

// ---------- mão com unhas ----------

const FINGERS = [
  { x: -0.05, r: 0.0105, len: 0.035, yaw: -0.75, z: -0.03 },
  { x: -0.03, r: 0.0092, len: 0.05, yaw: -0.08, z: 0 },
  { x: -0.0095, r: 0.0096, len: 0.056, yaw: -0.02, z: 0.002 },
  { x: 0.011, r: 0.0092, len: 0.052, yaw: 0.04, z: 0 },
  { x: 0.031, r: 0.0082, len: 0.042, yaw: 0.12, z: -0.004 },
];
export const TIP_START = 0.0065;
export const TIP_TARGET = 0.0018;

function buildHand(client, skin) {
  const g = new THREE.Group();
  g.position.copy(HAND_POS);
  const palm = mesh(new RoundedBoxGeometry(0.085, 0.024, 0.08, 4, 0.011), skin);
  g.add(palm);
  const cushion = mesh(new RoundedBoxGeometry(0.2, 0.03, 0.2, 4, 0.014), new THREE.MeshStandardMaterial({ map: fabricTex('#ffd1dc'), roughness: 1 }));
  cushion.position.set(0.005, -0.03, 0.03);
  g.add(cushion);
  const nails = [];
  const tipMat = new THREE.MeshPhysicalMaterial({ color: 0xfbf3ee, roughness: 0.3, transmission: 0, clearcoat: 0.5 });
  FINGERS.forEach((f) => {
    const fg = new THREE.Group();
    fg.position.set(f.x, 0.002, 0.036 + f.z);
    fg.rotation.y = f.yaw;
    const finger = mesh(new THREE.CapsuleGeometry(f.r, f.len, 8, 20), skin);
    finger.rotation.x = Math.PI / 2;
    finger.position.z = f.len / 2;
    fg.add(finger);
    const srf = nailSurface();
    const plateMat = new THREE.MeshPhysicalMaterial({ map: srf.tex, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });
    const plate = mesh(new RoundedBoxGeometry(f.r * 1.45, 0.0018, 0.014, 2, 0.0008), plateMat, false);
    const zPlate = f.len / 2 + f.r - 0.009;
    plate.position.set(0, f.r * 0.92, zPlate);
    fg.add(plate);
    const tip = mesh(new RoundedBoxGeometry(f.r * 1.38, 0.0014, 1, 2, 0.0006), tipMat.clone(), false);
    tip.userData.front = zPlate + 0.007;
    tip.position.set(0, f.r * 0.9, tip.userData.front + TIP_START / 2);
    tip.scale.z = TIP_START;
    fg.add(tip);
    g.add(fg);
    nails.push({ group: fg, plate, tip, surface: srf, tipLen: TIP_START, finger: f });
  });
  return { root: g, nails };
}

export function setTip(nail, len) {
  nail.tipLen = len;
  nail.tip.scale.z = Math.max(0.0001, len);
  nail.tip.position.z = nail.tip.userData.front + len / 2;
}

export { rgb };
