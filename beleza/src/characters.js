// Clientes do salão: geradas aleatoriamente e construídas em 3D (estilo boneca de vinil).
// Medidas em metros; a cabeça fica na origem.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Surface, rgb } from './paint.js';

export const R = 0.1; // raio da cabeça
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
    cape: pick(['#ffffff', '#ffe4ef', '#efe6ff', '#e3f4ff']),
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

/**
 * Molda a esfera num rosto de boneca: queixo afinado em V, bochechas cheias,
 * testa redonda e frente levemente achatada. Recebe uma direção, devolve o ponto (m).
 */
export function shapeHead(v) {
  const p = v.clone();
  if (p.y < 0) {
    const t = -p.y;
    p.x *= 1 - 0.24 * Math.pow(t, 1.5);
    p.z *= 1 - 0.1 * Math.pow(t, 2);
    p.y *= 1 + 0.05 * t;
    if (t > 0.7) p.z += 0.06 * (t - 0.7) * Math.max(0, v.z);
  }
  // bochechas
  const front = Math.max(0, v.z);
  p.z += 0.045 * Math.exp(-((v.y + 0.22) ** 2) / 0.03) * Math.exp(-((Math.abs(v.x) - 0.45) ** 2) / 0.05) * front;
  if (p.z > 0) p.z *= 0.95;
  return new THREE.Vector3(p.x * 0.86, p.y * 1.0, p.z * 0.97).multiplyScalar(R);
}

/** Ponto na superfície da cabeça numa direção, com um deslocamento opcional para fora. */
export function onHead(d, out = 0) {
  return shapeHead(d).addScaledVector(d, out);
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

const EYE_YAW = 0.33;
const EYE_PITCH = -0.04;
export const CHEEK = { yaw: 0.5, pitch: -0.24 };
const MOUTH_PITCH = -0.45;
const NOSE_PITCH = -0.2;

/** Região do rosto (para medir máscara, base, limpeza): frente da cabeça, sem olhos e boca. */
export function inFace(d) {
  if (d.z < 0.42 || d.y > 0.58 || d.y < -0.78) return false;
  for (const s of [-1, 1]) if (d.distanceTo(dir(s * EYE_YAW, EYE_PITCH)) < 0.17) return false;
  if (d.distanceTo(dir(0, MOUTH_PITCH)) < 0.12) return false;
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
    roughness: 0.48,
    sheen: 0.5,
    sheenColor: new THREE.Color('#ffc4c4'),
    sheenRoughness: 0.5,
    clearcoat: 0.06,
    emissive: new THREE.Color(color).multiplyScalar(0.06),
  });
}

function fabricTex(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.12)';
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

/** Desenha um brilho radial suave no canvas na direção d da cabeça. */
function glow(g, size, d, radius, color, alpha) {
  const uv = dirToUV(d);
  const x = uv.x * size;
  const y = (1 - uv.y) * size;
  const gr = g.createRadialGradient(x, y, 0, x, y, size * radius);
  gr.addColorStop(0, `rgba(${color},${alpha})`);
  gr.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = gr;
  g.fillRect(x - size * radius, y - size * radius, size * radius * 2, size * radius * 2);
}

// ---------- texturas pintáveis ----------

function faceSurface(client) {
  const s = new Surface(1024, (g, size) => {
    g.fillStyle = client.skin;
    g.fillRect(0, 0, size, size);
    // bochechas rosadas, ponta do nariz, pálpebras e sombra suave sob o queixo
    [-1, 1].forEach((sd) => {
      glow(g, size, dir(sd * CHEEK.yaw, CHEEK.pitch), 0.045, '245,120,130', 0.28);
      glow(g, size, dir(sd * EYE_YAW, EYE_PITCH + 0.06), 0.03, '200,120,140', 0.18);
    });
    glow(g, size, dir(0, NOSE_PITCH - 0.02), 0.012, '245,130,130', 0.25);
    glow(g, size, dir(0, 0.35), 0.06, '255,255,255', 0.1);
    for (let i = -6; i <= 6; i++) glow(g, size, dir(i * 0.18, -0.95), 0.05, '120,60,60', 0.12);
  });
  // Vermelhidões (a base cobre)
  s.add('redness');
  for (let i = 0; i < 18; i++) {
    const d = dir((Math.random() - 0.5) * 1.1, -0.55 + Math.random() * 0.9);
    if (!inFace(d)) continue;
    const uv = dirToUV(d);
    s.dab('redness', uv.x, uv.y, 0.008 + Math.random() * 0.012, '214,90,90', 0.35);
  }
  s.add('foundation', 'source-over', 0.92);
  s.add('blush', 'source-over', 0.55);
  // Sujeira/oleosidade para o algodão limpar
  s.add('dirt');
  for (let i = 0; i < 70; i++) {
    const d = dir((Math.random() - 0.5) * 1.3, -0.7 + Math.random() * 1.2);
    if (d.z < 0.4 || d.y > 0.6) continue;
    const uv = dirToUV(d);
    s.dab('dirt', uv.x, uv.y, 0.015 + Math.random() * 0.02, Math.random() < 0.5 ? '120,98,80' : '150,130,105', 0.55);
  }
  s.add('mask', 'source-over', 0.95);
  s.update();
  return s;
}

function lipsSurface(skin) {
  return new Surface(128, (g, size) => {
    const base = new THREE.Color('#e08a90').lerp(new THREE.Color(skin), 0.25);
    g.fillStyle = '#' + base.getHexString();
    g.fillRect(0, 0, size, size);
    // brilho no meio e linhas finas verticais
    const gr = g.createRadialGradient(size / 2, size * 0.45, 0, size / 2, size * 0.45, size * 0.5);
    gr.addColorStop(0, 'rgba(255,255,255,0.28)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    g.strokeStyle = 'rgba(120,40,50,0.12)';
    for (let x = 3; x < size; x += 5) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + 1, size);
      g.stroke();
    }
  });
}

function hairSurface(color) {
  const s = new Surface(256, (g, size) => {
    g.fillStyle = color;
    g.fillRect(0, 0, size, size);
    // faixa de brilho (como nos desenhos)
    const gr = g.createLinearGradient(0, size * 0.15, 0, size * 0.45);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.22)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
  });
  s.add('dye', 'source-over', 0.88);
  // fios desenhados por cima da tinta, para o cabelo pintado continuar com textura
  const strands = s.add('strands');
  for (let i = 0; i < 1100; i++) {
    const x = Math.random() * s.size;
    strands.strokeStyle = Math.random() < 0.6 ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.14)';
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

/** Textura da íris: no topo do canvas fica o centro (pupila), embaixo a borda. */
function irisTexture(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const base = new THREE.Color(color);
  const light = '#' + base.clone().lerp(new THREE.Color('#ffffff'), 0.45).getHexString();
  const dark = '#' + base.clone().multiplyScalar(0.45).getHexString();
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, '#0b0b10');
  gr.addColorStop(0.3, '#0b0b10');
  gr.addColorStop(0.36, dark);
  gr.addColorStop(0.55, '#' + base.getHexString());
  gr.addColorStop(0.78, light);
  gr.addColorStop(0.9, dark);
  gr.addColorStop(1, '#1a1214');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  // estrias da íris
  for (let x = 0; x < 128; x += 3) {
    g.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
    g.beginPath();
    g.moveTo(x, 40);
    g.lineTo(x + (Math.random() - 0.5) * 3, 112);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Remapeia o UV de uma geometria para 0..1 pela caixa XY (lábios extrudados). */
function normalizeUV(geo) {
  geo.computeBoundingBox();
  const b = geo.boundingBox;
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - b.min.x) / (b.max.x - b.min.x);
    uv[i * 2 + 1] = (pos.getY(i) - b.min.y) / (b.max.y - b.min.y);
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

function lipShapes() {
  const W = 0.0148;
  const up = new THREE.Shape();
  up.moveTo(-W, 0);
  up.bezierCurveTo(-W * 0.62, 0.0026, -W * 0.45, 0.0056, -W * 0.2, 0.0056);
  up.bezierCurveTo(-W * 0.08, 0.0056, -W * 0.04, 0.0042, 0, 0.0037);
  up.bezierCurveTo(W * 0.04, 0.0042, W * 0.08, 0.0056, W * 0.2, 0.0056);
  up.bezierCurveTo(W * 0.45, 0.0056, W * 0.62, 0.0026, W, 0);
  up.bezierCurveTo(W * 0.5, -0.0007, -W * 0.5, -0.0007, -W, 0);
  const low = new THREE.Shape();
  low.moveTo(-W * 0.93, -0.0004);
  low.bezierCurveTo(-W * 0.5, -0.001, W * 0.5, -0.001, W * 0.93, -0.0004);
  low.bezierCurveTo(W * 0.72, -0.0075, -W * 0.72, -0.0075, -W * 0.93, -0.0004);
  const opts = { depth: 0.0012, bevelEnabled: true, bevelThickness: 0.0017, bevelSize: 0.0012, bevelSegments: 5, curveSegments: 24 };
  return [up, low].map((sh) => normalizeUV(new THREE.ExtrudeGeometry(sh, opts)));
}

// ---------- montagem da cliente ----------

const OPEN = -0.68; // pálpebra aberta
const CLOSED = 1.35; // pálpebra fechada

export function buildClient(client) {
  const root = new THREE.Group();
  const face = faceSurface(client);
  const lips = lipsSurface(client.skin);
  const skin = skinMat(client.skin);
  const out = { root, face, lips, client, eyes: [], lids: [], blackheads: [], pimples: [], strays: [], hair: [], gems: [] };

  // Cabeça: esfera moldada
  const geo = new THREE.SphereGeometry(1, 128, 96);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const q = shapeHead(v);
    pos.setXYZ(i, q.x, q.y, q.z);
  }
  geo.computeVertexNormals();
  const head = mesh(geo, skinMat(client.skin, face.tex));
  root.add(head);
  out.head = head;

  // Orelhas, pescoço, nariz
  [-1, 1].forEach((s) => {
    const ear = mesh(new THREE.SphereGeometry(0.016, 24, 16), skin);
    ear.scale.set(0.45, 1, 0.75);
    ear.position.copy(onHead(dir(s * 1.45, -0.05), -0.004));
    root.add(ear);
  });
  const neck = mesh(new THREE.CylinderGeometry(0.029, 0.035, 0.06, 32), skin);
  neck.position.y = -0.1;
  root.add(neck);
  const nose = mesh(new THREE.SphereGeometry(0.0062, 24, 16), skinMat(shade(client.skin, 1.0)));
  nose.scale.set(0.7, 0.55, 0.85);
  nose.position.copy(onHead(dir(0, NOSE_PITCH), -0.0026));
  root.add(nose);

  // Olhos amendoados: globo, íris com textura, brilhos, pálpebras que piscam e cílios
  const re = 0.0182;
  const white = new THREE.MeshPhysicalMaterial({ color: 0xfdfbff, roughness: 0.12, clearcoat: 1 });
  const irisMat = new THREE.MeshPhysicalMaterial({ map: irisTexture(client.eyes), roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05 });
  const lashMat = new THREE.MeshStandardMaterial({ color: 0x1a1216, roughness: 0.5 });
  const glint = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lidMat = skinMat(shade(client.skin, 0.97));
  [-1, 1].forEach((s) => {
    const d = dir(s * EYE_YAW, EYE_PITCH);
    const g = new THREE.Group();
    g.position.copy(onHead(d, -re * 0.6));
    g.lookAt(g.position.clone().add(new THREE.Vector3(d.x * 0.35, 0.02, 1).normalize()));
    g.scale.set(1.2, 0.95, 0.9);
    const ball = mesh(new THREE.SphereGeometry(re, 40, 28), white, false);
    const iris = mesh(new THREE.SphereGeometry(re * 1.004, 48, 16, 0, Math.PI * 2, 0, Math.PI * 0.34), irisMat, false);
    iris.rotation.x = Math.PI / 2;
    iris.rotation.y = -s * 0.08;
    const gl1 = new THREE.Mesh(new THREE.SphereGeometry(re * 0.17, 12, 8), glint);
    gl1.position.set(re * 0.25, re * 0.32, re * 0.98);
    const gl2 = new THREE.Mesh(new THREE.SphereGeometry(re * 0.08, 10, 6), glint);
    gl2.position.set(-re * 0.22, -re * 0.2, re * 1.0);
    // pálpebra de cima gira em volta do olho para piscar; os cílios vão junto
    const lidPivot = new THREE.Group();
    const lid = mesh(new THREE.SphereGeometry(re * 1.07, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), lidMat, false);
    const lash = mesh(new THREE.TorusGeometry(re * 1.08, 0.0012, 8, 48, Math.PI), lashMat, false);
    lash.rotation.x = Math.PI / 2;
    lash.scale.set(1, 1, 1.6);
    const wing = mesh(new THREE.ConeGeometry(0.0013, 0.0075, 8), lashMat, false);
    wing.position.set(s * re * 1.12, 0.0018, re * 0.15);
    wing.rotation.z = -s * 1.05;
    lidPivot.add(lid, lash, wing);
    lidPivot.rotation.x = OPEN;
    const lower = mesh(new THREE.SphereGeometry(re * 1.05, 48, 12, 0, Math.PI * 2, Math.PI * 0.7, Math.PI * 0.3), lidMat, false);
    const lowLash = mesh(new THREE.TorusGeometry(re * 0.99, 0.0005, 6, 40, Math.PI * 0.8), lashMat, false);
    lowLash.rotation.set(-Math.PI / 2 - 0.62, 0, Math.PI * 0.1);
    g.add(ball, iris, gl1, gl2, lidPivot, lower, lowLash);
    root.add(g);
    out.eyes.push(g);
    out.lids.push(lidPivot);

    // Sobrancelha fina e arqueada (tubo seguindo a testa)
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      pts.push(onHead(dir(s * (0.14 + t * 0.4), 0.2 + 0.075 * Math.sin(t * Math.PI * 0.85) - 0.03 * t), 0.0012));
    }
    const brow = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.0017, 6), new THREE.MeshStandardMaterial({ color: shade(client.hair, 0.8), roughness: 0.8 }), false);
    root.add(brow);
  });
  out.blink = (k) => out.lids.forEach((l) => (l.rotation.x = OPEN + (CLOSED - OPEN) * k));

  // Pelinhos soltos perto das sobrancelhas (pinça)
  const hairDark = new THREE.MeshStandardMaterial({ color: shade(client.hair, 0.7), roughness: 0.8 });
  for (let i = 0; i < client.strays; i++) {
    const s = i % 2 ? 1 : -1;
    const d = dir(s * (0.14 + Math.random() * 0.4), 0.13 + Math.random() * 0.2);
    const h = mesh(new THREE.CylinderGeometry(0.00045, 0.0003, 0.005, 4), hairDark, false);
    h.position.copy(onHead(d, 0.002));
    h.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.2, 0)).normalize());
    root.add(h);
    out.strays.push({ mesh: h, dir: d, done: false });
  }

  // Boca com arco do cupido
  const lipMat = new THREE.MeshPhysicalMaterial({ map: lips.tex, roughness: 0.28, clearcoat: 0.7, clearcoatRoughness: 0.2 });
  const mouthD = dir(0, MOUTH_PITCH);
  const mouth = new THREE.Group();
  mouth.position.copy(onHead(mouthD, -0.0012));
  mouth.lookAt(mouth.position.clone().add(new THREE.Vector3(0, -0.25, 1).normalize()));
  const [upGeo, lowGeo] = lipShapes();
  const upper = mesh(upGeo, lipMat, false);
  upper.position.set(0, 0.0004, -0.0008);
  const lower = mesh(lowGeo, lipMat, false);
  lower.position.set(0, -0.0003, -0.0006);
  mouth.add(upper, lower);
  root.add(mouth);
  out.lipMeshes = [upper, lower];
  out.mouth = mouth;

  // Cravos (pontinhos escuros) e espinhas (bolinhas vermelhas com ponta branca)
  const bhMat = new THREE.MeshStandardMaterial({ color: 0x3b2a20, roughness: 0.6 });
  for (let i = 0; i < client.blackheads; i++) {
    const zone = i % 3;
    const side = Math.random() < 0.5 ? -1 : 1;
    const d =
      zone === 0
        ? dir(side * (0.07 + Math.random() * 0.06), NOSE_PITCH + (Math.random() - 0.5) * 0.08) // lados do nariz
        : zone === 1
          ? dir((Math.random() - 0.5) * 0.45, 0.4 + Math.random() * 0.12) // testa
          : dir((Math.random() - 0.5) * 0.25, -0.72 - Math.random() * 0.06); // queixo
    const b = mesh(new THREE.SphereGeometry(0.0014, 10, 8), bhMat, false);
    b.position.copy(onHead(d, 0.0002));
    root.add(b);
    out.blackheads.push({ mesh: b, dir: d, done: false });
  }
  const pimpleMat = new THREE.MeshStandardMaterial({ color: 0xe0606a, roughness: 0.5 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6d8, roughness: 0.4 });
  for (let i = 0; i < client.pimples; i++) {
    let d;
    do d = dir((Math.random() - 0.5) * 1.1, -0.55 + Math.random() * 0.9);
    while (!inFace(d) || d.distanceTo(dir(0, NOSE_PITCH)) < 0.15);
    const p = new THREE.Group();
    p.position.copy(onHead(d, -0.0005));
    p.lookAt(p.position.clone().add(d));
    const bump = mesh(new THREE.SphereGeometry(0.003, 16, 12), pimpleMat, false);
    bump.scale.z = 0.6;
    const top = mesh(new THREE.SphereGeometry(0.0011, 10, 8), headMat, false);
    top.position.z = 0.0019;
    p.add(bump, top);
    root.add(p);
    out.pimples.push({ mesh: p, dir: d, done: false });
  }

  // Cabelo preso para trás (a faixa sai na estação de cabelo)
  const hairMat = (srf) => new THREE.MeshPhysicalMaterial({ map: srf.tex, roughness: 0.5, sheen: 1, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.3 });
  const hairGroup = new THREE.Group();
  const HS = new THREE.Vector3(0.93, 1.03, 0.99);
  const addHair = (g, setup) => {
    const srf = hairSurface(client.hair);
    const m = mesh(g, hairMat(srf));
    setup(m);
    hairGroup.add(m);
    out.hair.push({ mesh: m, surface: srf });
  };
  addHair(new THREE.SphereGeometry(R * 1.06, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.28), (m) => m.scale.copy(HS));
  addHair(new THREE.SphereGeometry(R * 1.055, 64, 32, Math.PI / 2 + 1.05, Math.PI * 2 - 2.1, Math.PI * 0.22, Math.PI * 0.4), (m) => m.scale.copy(HS));
  if (client.style === 'longo') {
    addHair(new THREE.CapsuleGeometry(0.07, 0.13, 12, 32), (m) => {
      m.scale.set(1.3, 1, 0.5);
      m.position.set(0, -0.085, -0.07);
    });
  } else if (client.style === 'coque') {
    addHair(new THREE.SphereGeometry(0.042, 32, 24), (m) => m.position.set(0, 0.085, -0.075));
  }
  // Franja com pontas: aparece quando a faixa sai (menu, cabelo e visual final)
  const fringe = new THREE.SphereGeometry(R * 1.068, 48, 12, Math.PI / 2 - 1.15, 2.3, Math.PI * 0.22, Math.PI * 0.17);
  const fp = fringe.attributes.position;
  const fuv = fringe.attributes.uv;
  for (let i = 0; i < fp.count; i++) {
    // borda de baixo em zigue-zague (mechas)
    if (fuv.getY(i) < 0.01) {
      const tip = 0.5 + 0.5 * Math.sin(fuv.getX(i) * Math.PI * 14);
      fp.setY(i, fp.getY(i) - tip * 0.006);
    }
  }
  fringe.computeVertexNormals();
  addHair(fringe, (m) => {
    m.scale.copy(HS);
    m.rotation.z = 0.06;
  });
  const bangs = out.hair[out.hair.length - 1].mesh;
  bangs.visible = false;
  root.add(hairGroup);
  out.hairGroup = hairGroup;

  // Faixa de spa com laço (rosto e unhas)
  const bandColor = pick(['#ffc2d9', '#d9c7ff', '#bfe8ff', '#ffe1b8']);
  const bandMat = new THREE.MeshStandardMaterial({ map: fabricTex(bandColor), roughness: 0.95 });
  const towel = new THREE.Group();
  const tilt = new THREE.Group();
  tilt.rotation.x = -0.36;
  tilt.position.set(0, 0.034, -0.004);
  const band = mesh(new THREE.TorusGeometry(R * 0.93, 0.0072, 16, 96), bandMat);
  band.rotation.x = Math.PI / 2;
  band.scale.set(0.95, 1.06, 1.15);
  tilt.add(band);
  const bow = new THREE.Group();
  [-1, 1].forEach((sd) => {
    const lobe = mesh(new THREE.SphereGeometry(0.016, 24, 16), bandMat);
    lobe.scale.set(1.35, 0.85, 0.45);
    lobe.position.set(sd * 0.016, 0, 0);
    lobe.rotation.z = sd * 0.35;
    bow.add(lobe);
  });
  bow.add(mesh(new THREE.SphereGeometry(0.0065, 16, 12), bandMat));
  bow.position.set(0.042, 0.004, 0.072);
  bow.rotation.set(-0.5, 0.5, -0.25);
  tilt.add(bow);
  towel.add(tilt);
  root.add(towel);
  out.towel = towel;
  /** Modo spa (faixa no cabelo) ou cabelo solto com franja. */
  out.setSpa = (on) => {
    towel.visible = on;
    bangs.visible = !on;
  };

  // Roupão do spa com gola e encosto da cadeira
  const profile = [
    [0.0, -0.122],
    [0.04, -0.122],
    [0.056, -0.135],
    [0.15, -0.162],
    [0.2, -0.198],
    [0.215, -0.26],
    [0.22, -0.44],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const robeMat = new THREE.MeshStandardMaterial({ map: fabricTex(client.cape), roughness: 0.9, side: THREE.DoubleSide });
  const cape = mesh(new THREE.LatheGeometry(profile, 64), robeMat);
  cape.scale.set(1, 1, 0.62);
  root.add(cape);
  const collar = mesh(new THREE.TorusGeometry(0.047, 0.008, 12, 48), new THREE.MeshStandardMaterial({ map: fabricTex('#ffffff'), roughness: 1 }));
  collar.rotation.x = Math.PI / 2;
  collar.scale.set(1, 0.7, 1);
  collar.position.y = -0.126;
  root.add(collar);
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
  const tipMat = new THREE.MeshPhysicalMaterial({ color: 0xfbf3ee, roughness: 0.4, clearcoat: 0.3, envMapIntensity: 0.35 });
  FINGERS.forEach((f) => {
    const fg = new THREE.Group();
    fg.position.set(f.x, 0.002, 0.036 + f.z);
    fg.rotation.y = f.yaw;
    const finger = mesh(new THREE.CapsuleGeometry(f.r, f.len, 8, 20), skin);
    finger.rotation.x = Math.PI / 2;
    finger.position.z = f.len / 2;
    fg.add(finger);
    const srf = nailSurface();
    // verniz discreto: com a câmera de cima, brilho forte deixava a unha toda branca
    const plateMat = new THREE.MeshPhysicalMaterial({ map: srf.tex, roughness: 0.35, clearcoat: 0.35, clearcoatRoughness: 0.35, envMapIntensity: 0.35 });
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
