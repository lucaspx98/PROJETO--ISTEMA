// Todos os gráficos são desenhados por código: não há arquivos de imagem para licenciar.
import { GAME_HEIGHT, GAME_WIDTH } from './config.js';
import { viewById } from './views.js';

export const DROP_TEX_R = 32;

export function createTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(8, 8, 8);
  g.generateTexture('dot', 16, 16);
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, 12, 7);
  g.generateTexture('confetti', 12, 7);
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillPoints([{ x: 12, y: 0 }, { x: 15, y: 9 }, { x: 24, y: 12 }, { x: 15, y: 15 }, { x: 12, y: 24 }, { x: 9, y: 15 }, { x: 0, y: 12 }, { x: 9, y: 9 }], true);
  g.generateTexture('sparkle', 24, 24);
  g.clear();
  g.fillStyle(0xb8860b, 1);
  g.fillCircle(14, 14, 14);
  g.fillStyle(0xffd23f, 1);
  g.fillCircle(14, 13, 12);
  g.fillStyle(0xfff3b0, 1);
  g.fillRect(12, 6, 4, 14);
  g.generateTexture('coin', 28, 28);
  g.destroy();

  drawDrop(scene);
}

/** Gota em duas camadas: corpo branco (recebe a cor com tint) e brilho/sombra por cima. */
function drawDrop(scene) {
  const R = DROP_TEX_R;
  const size = R * 2 + 4;
  const c = size / 2;

  const body = scene.textures.createCanvas('drop-body', size, size);
  let ctx = body.getContext();
  const g = ctx.createRadialGradient(c - R * 0.2, c - R * 0.25, R * 0.1, c, c, R);
  g.addColorStop(0, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.95)');
  g.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, R, 0, Math.PI * 2);
  ctx.fill();
  body.refresh();

  const shine = scene.textures.createCanvas('drop-shine', size, size);
  ctx = shine.getContext();
  // Borda mais escura embaixo (refração) e reflexo claro em cima
  const rim = ctx.createRadialGradient(c, c - R * 0.25, R * 0.55, c, c, R);
  rim.addColorStop(0, 'rgba(0,0,0,0)');
  rim.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(c, c, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.ellipse(c - R * 0.32, c - R * 0.38, R * 0.3, R * 0.17, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(c + R * 0.3, c + R * 0.45, R * 0.22, R * 0.08, -0.4, 0, Math.PI * 2);
  ctx.fill();
  shine.refresh();
}

/** Paisagem desfocada atrás do vidro. Criada sob demanda para cada vista. */
export function viewKey(scene, viewId) {
  const key = `view-${viewId}`;
  if (scene.textures.exists(key)) return key;
  const v = viewById(viewId);
  const tex = scene.textures.createCanvas(key, GAME_WIDTH, GAME_HEIGHT);
  const ctx = tex.getContext();
  let seed = viewId.length * 131 + 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  const sky = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  v.sky.forEach((c, i) => sky.addColorStop(i / (v.sky.length - 1) * 0.75, c));
  sky.addColorStop(1, v.ground);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.filter = 'blur(5px)';
  if (viewId === 'aurora') {
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = k === 1 ? 'rgba(195,139,255,0.35)' : 'rgba(127,255,212,0.4)';
      ctx.lineWidth = 60 - k * 12;
      ctx.beginPath();
      for (let x = -20; x <= GAME_WIDTH + 20; x += 20) ctx.lineTo(x, 200 + k * 70 + Math.sin(x / 70 + k) * 40);
      ctx.stroke();
    }
  }
  if (viewId === 'por-do-sol') {
    const sun = ctx.createRadialGradient(270, 520, 0, 270, 520, 120);
    sun.addColorStop(0, 'rgba(255,240,180,1)');
    sun.addColorStop(1, 'rgba(255,180,100,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 380, GAME_WIDTH, 300);
  }
  // Silhueta: prédios, morros ou árvores
  ctx.fillStyle = v.ground;
  ctx.beginPath();
  ctx.moveTo(0, GAME_HEIGHT);
  let x = 0;
  while (x < GAME_WIDTH + 40) {
    if (viewId === 'cidade') {
      const w = 30 + r() * 50;
      const h = 520 + r() * 220;
      ctx.lineTo(x, h);
      ctx.lineTo(x + w, h);
      x += w;
    } else if (viewId === 'floresta') {
      const h = 560 + r() * 120;
      ctx.lineTo(x, h + 60);
      ctx.lineTo(x + 18, h);
      ctx.lineTo(x + 36, h + 60);
      x += 30;
    } else {
      ctx.lineTo(x, 620 + Math.sin(x / 90) * 40 + r() * 10);
      x += 20;
    }
  }
  ctx.lineTo(GAME_WIDTH, GAME_HEIGHT);
  ctx.fill();

  // Luzes desfocadas (bokeh)
  ctx.filter = 'blur(3px)';
  for (let i = 0; i < 70; i++) {
    const lx = r() * GAME_WIDTH;
    const ly = viewId === 'cidade' ? 520 + r() * 400 : 150 + r() * 700;
    const rad = 3 + r() * 14;
    const col = v.lights[Math.floor(r() * v.lights.length)];
    ctx.globalAlpha = 0.25 + r() * 0.5;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(lx, ly, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
  tex.refresh();
  return key;
}
