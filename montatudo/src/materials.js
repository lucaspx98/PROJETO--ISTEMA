// Materiais PBR com texturas desenhadas por código (nada de imagens de terceiros para licenciar).
import * as THREE from 'three';

let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function canvasTex(w, h, draw, repeat = [1, 1], color = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 4;
  return t;
}

/** Veios de madeira: linhas onduladas claras e escuras sobre a cor base. */
function grain(g, x0, y0, w, h, base, dark, light, lines = 120) {
  g.fillStyle = base;
  g.fillRect(x0, y0, w, h);
  for (let i = 0; i < lines; i++) {
    const y = y0 + rnd() * h;
    const amp = 1 + rnd() * 5;
    const f = 0.003 + rnd() * 0.012;
    const ph = rnd() * 10;
    g.strokeStyle = rnd() < 0.65 ? dark : light;
    g.globalAlpha = 0.06 + rnd() * 0.2;
    g.lineWidth = 0.5 + rnd() * 2.5;
    g.beginPath();
    for (let x = 0; x <= w; x += 6) {
      const yy = y + Math.sin(x * f + ph) * amp + Math.sin(x * f * 3.1) * amp * 0.3;
      if (x === 0) g.moveTo(x0 + x, yy);
      else g.lineTo(x0 + x, yy);
    }
    g.stroke();
  }
  // nós da madeira
  for (let k = 0; k < 2; k++) {
    const cx = x0 + rnd() * w;
    const cy = y0 + rnd() * h;
    for (let r = 14; r > 2; r -= 3) {
      g.globalAlpha = 0.12;
      g.strokeStyle = dark;
      g.beginPath();
      g.ellipse(cx, cy, r * 2.4, r * 0.7, 0, 0, Math.PI * 2);
      g.stroke();
    }
  }
  g.globalAlpha = 1;
}

const woodTex = (base, dark, light) => canvasTex(1024, 512, (g, w, h) => grain(g, 0, 0, w, h, base, dark, light));

const floorTex = canvasTex(1024, 1024, (g, w, h) => {
  const rows = 8;
  const ph = h / rows;
  const tones = ['#a07650', '#946b47', '#ab8159', '#8e6542', '#a57a52'];
  for (let r = 0; r < rows; r++) {
    let x = -rnd() * 400;
    while (x < w) {
      const len = 300 + rnd() * 380;
      grain(g, x, r * ph, len, ph, tones[Math.floor(rnd() * tones.length)], '#5e3f26', '#c9a27a', 18);
      g.fillStyle = 'rgba(40,25,15,0.55)';
      g.fillRect(x, r * ph, 2, ph);
      x += len;
    }
    g.fillStyle = 'rgba(40,25,15,0.6)';
    g.fillRect(0, r * ph, w, 2);
  }
}, [5, 5]);

const pcbTex = (base) =>
  canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    // trilhas
    g.lineCap = 'round';
    for (let i = 0; i < 160; i++) {
      g.strokeStyle = rnd() < 0.8 ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.14)';
      g.lineWidth = 1 + rnd() * 2;
      let x = rnd() * w;
      let y = rnd() * h;
      g.beginPath();
      g.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        if (rnd() < 0.5) x += (rnd() - 0.5) * 160;
        else y += (rnd() - 0.5) * 160;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    // componentes SMD e pads dourados
    for (let i = 0; i < 180; i++) {
      g.fillStyle = rnd() < 0.5 ? '#c9a646' : '#2a2a2a';
      g.fillRect(rnd() * w, rnd() * h, 3 + rnd() * 6, 2 + rnd() * 4);
    }
    // serigrafia
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.font = '10px monospace';
    for (let i = 0; i < 25; i++) g.fillText(['C', 'R', 'U', 'Q', 'L'][i % 5] + Math.floor(rnd() * 300), rnd() * w, rnd() * h);
  });

const fabricTex = (base) =>
  canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const v = rnd();
        if (v < 0.3) {
          g.fillStyle = v < 0.15 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.06)';
          g.fillRect(x, y, 2, 2);
        }
      }
    }
  }, [3, 3]);

const meshTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#16171a';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#050506';
  for (let y = 0; y < h; y += 12) {
    for (let x = (y / 12) % 2 ? 6 : 0; x < w; x += 12) {
      g.beginPath();
      g.arc(x, y, 4, 0, Math.PI * 2);
      g.fill();
    }
  }
}, [4, 4]);

const screenTex = canvasTex(1024, 600, (g, w, h) => {
  const bg = g.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#2b1055');
  bg.addColorStop(0.55, '#7597de');
  bg.addColorStop(1, '#ffb88c');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  // sol e montanhas
  g.fillStyle = 'rgba(255,230,180,0.9)';
  g.beginPath();
  g.arc(w * 0.7, h * 0.55, 70, 0, Math.PI * 2);
  g.fill();
  [['#3a2463', 0.62], ['#24173f', 0.72]].forEach(([c, base]) => {
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += 40) g.lineTo(x, h * base - Math.abs(Math.sin(x * 0.007 + base * 9)) * 120 - rnd() * 20);
    g.lineTo(w, h);
    g.fill();
  });
  // barra de tarefas
  g.fillStyle = 'rgba(15,15,25,0.85)';
  g.fillRect(0, h - 36, w, 36);
  for (let i = 0; i < 6; i++) {
    g.fillStyle = ['#4dabf7', '#ffd43b', '#69db7c', '#ff8787', '#b197fc', '#ffffff'][i];
    g.fillRect(w / 2 - 120 + i * 42, h - 28, 24, 20);
  }
});

const labelTex = (lines, bg = '#1b1c1f', fg = '#e9ecef') =>
  canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.textAlign = 'center';
    lines.forEach(([txt, size, y]) => {
      g.font = `bold ${size}px sans-serif`;
      g.fillText(txt, w / 2, y);
    });
  });

const std = (o) => new THREE.MeshStandardMaterial(o);

export const M = {
  floor: std({ map: floorTex, roughness: 0.6, metalness: 0 }),
  wall: std({ color: 0xe8e2d8, roughness: 0.95 }),
  baseboard: std({ color: 0xf5f3ef, roughness: 0.6 }),
  oak: std({ map: woodTex('#c8996a', '#7a5230', '#e3c09a'), roughness: 0.5 }),
  walnut: std({ map: woodTex('#6b4429', '#3a2314', '#946446'), roughness: 0.48 }),
  melamine: std({ color: 0xf3f1ec, roughness: 0.42 }),
  hardboard: std({ color: 0xe0dbd2, roughness: 0.8 }),
  metalBlack: std({ color: 0x1c1d21, metalness: 0.75, roughness: 0.38 }),
  metalGray: std({ color: 0x5a5e66, metalness: 0.6, roughness: 0.42 }),
  aluminum: std({ color: 0xbfc4ca, metalness: 1, roughness: 0.3 }),
  chrome: std({ color: 0xf2f3f5, metalness: 1, roughness: 0.07 }),
  copper: std({ color: 0xc8734a, metalness: 1, roughness: 0.28 }),
  gold: std({ color: 0xd4a640, metalness: 1, roughness: 0.3 }),
  plasticBlack: std({ color: 0x15161a, roughness: 0.42 }),
  plasticDark: std({ color: 0x26282d, roughness: 0.5 }),
  plasticWhite: std({ color: 0xf1f3f5, roughness: 0.35 }),
  rubber: std({ color: 0x0c0c0d, roughness: 0.95 }),
  fabric: std({ map: fabricTex('#33363c'), roughness: 0.95 }),
  fabricBlue: std({ map: fabricTex('#244a7a'), roughness: 0.95 }),
  deskMat: std({ map: fabricTex('#1e2024'), roughness: 0.9 }),
  pcbBlack: std({ map: pcbTex('#15191c'), roughness: 0.55, metalness: 0.1 }),
  pcbGreen: std({ map: pcbTex('#0f4d38'), roughness: 0.55, metalness: 0.1 }),
  frontMesh: std({ map: meshTex, roughness: 0.7, metalness: 0.4 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.04,
    transparent: true,
    opacity: 0.16,
    envMapIntensity: 2.5,
    depthWrite: false,
  }),
  screen: std({ color: 0x000000, emissive: 0xffffff, emissiveMap: screenTex, emissiveIntensity: 1, roughness: 0.15 }),
  screenOff: std({ color: 0x050608, roughness: 0.1, metalness: 0.3 }),
  rgbCyan: std({ color: 0x0b2a33, emissive: 0x22d3ee, emissiveIntensity: 2.2 }),
  rgbPink: std({ color: 0x33091d, emissive: 0xf472b6, emissiveIntensity: 2.2 }),
  rgbPurple: std({ color: 0x1e0b33, emissive: 0xa78bfa, emissiveIntensity: 2.2 }),
  ledWhite: std({ color: 0xffffff, emissive: 0xfff4d6, emissiveIntensity: 2 }),
  psuLabel: std({ map: labelTex([['850W', 110, 120], ['MODULAR • SILENCIOSA', 34, 190]]), roughness: 0.5 }),
  cpuLabel: std({ map: labelTex([['CPU', 120, 150], ['8 NÚCLEOS', 40, 210]], '#c9ccd1', '#55595f'), metalness: 0.8, roughness: 0.3 }),
  ramLabel: std({ map: labelTex([['DDR5 16GB', 80, 150]], '#2b2d33', '#ced4da'), metalness: 0.6, roughness: 0.35 }),
  ghost: new THREE.MeshBasicMaterial({ color: 0x4dabf7, transparent: true, opacity: 0.28, depthWrite: false }),
  ghostOk: new THREE.MeshBasicMaterial({ color: 0x51cf66, transparent: true, opacity: 0.45, depthWrite: false }),
};

/** Paleta para livros e objetos decorativos. */
export const bookMaterials = ['#9b2c2c', '#2b6cb0', '#2f855a', '#b7791f', '#553c9a', '#1a202c', '#c05621', '#e2e8f0'].map((c) =>
  std({ color: c, roughness: 0.75 }),
);
