// Todos os gráficos são desenhados por código: não há arquivos de imagem para licenciar.
import { GAME_HEIGHT, GAME_WIDTH } from './config.js';
import { THEMES, themeById } from './themes.js';

export const BALL = 46;

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
  // Brilho em forma de estrela de 4 pontas
  g.fillStyle(0xffffff, 1);
  g.fillPoints([{ x: 12, y: 0 }, { x: 15, y: 9 }, { x: 24, y: 12 }, { x: 15, y: 15 }, { x: 12, y: 24 }, { x: 9, y: 15 }, { x: 0, y: 12 }, { x: 9, y: 9 }], true);
  g.generateTexture('sparkle', 24, 24);
  g.clear();
  // Moeda
  g.fillStyle(0xb8860b, 1);
  g.fillCircle(14, 14, 14);
  g.fillStyle(0xffd23f, 1);
  g.fillCircle(14, 13, 12);
  g.fillStyle(0xfff3b0, 1);
  g.fillRect(12, 6, 4, 14);
  g.generateTexture('coin', 28, 28);
  g.destroy();

  THEMES.forEach((t) => t.colors.forEach((c, i) => drawBall(scene, ballKey(t.id, i), t.style, c)));
}

export const ballKey = (themeId, color) => `ball-${themeId}-${color}`;

/** Fundo em degradê do tema, com círculos desfocados (efeito bokeh). Criado sob demanda. */
export function backgroundKey(scene, themeId) {
  const key = `bg-${themeId}`;
  if (scene.textures.exists(key)) return key;
  const t = themeById(themeId);
  const tex = scene.textures.createCanvas(key, GAME_WIDTH, GAME_HEIGHT);
  const ctx = tex.getContext();
  const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  t.bg.forEach((c, i) => grad.addColorStop(i / (t.bg.length - 1), c));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  let seed = themeId.length * 97;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 18; i++) {
    const x = r() * GAME_WIDTH;
    const y = r() * GAME_HEIGHT;
    const rad = 30 + r() * 110;
    const c = t.colors[Math.floor(r() * t.colors.length)];
    const rg = ctx.createRadialGradient(x, y, 0, x, y, rad);
    rg.addColorStop(0, hexA(c, 0.16));
    rg.addColorStop(1, hexA(c, 0));
    ctx.fillStyle = rg;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  tex.refresh();
  return key;
}

function drawBall(scene, key, style, color) {
  const size = BALL + 8;
  const tex = scene.textures.createCanvas(key, size, size);
  const ctx = tex.getContext();
  const c = size / 2;
  const r = BALL / 2;

  // Sombra suave embaixo
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(c, c + r - 2, r * 0.7, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.clip();

  if (style === 'glossy') {
    const g = ctx.createRadialGradient(c - r * 0.35, c - r * 0.4, r * 0.1, c, c, r);
    g.addColorStop(0, shade(color, 0.55));
    g.addColorStop(0.45, color);
    g.addColorStop(1, shade(color, -0.45));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  } else if (style === 'candy') {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    // Listras em espiral de bala
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 5;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(c + r * 0.9, c - r * 0.9 + k * 14, r * 1.1, Math.PI * 0.55, Math.PI * 1.05);
      ctx.stroke();
    }
    const g = ctx.createRadialGradient(c, c, r * 0.5, c, c, r);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(90,30,60,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  } else if (style === 'neon') {
    const g = ctx.createRadialGradient(c, c, 0, c, c, r);
    g.addColorStop(0, '#0a0614');
    g.addColorStop(0.55, hexA(color, 0.35));
    g.addColorStop(1, color);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = shade(color, 0.6);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(c, c, r - 3, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Gema lapidada: faces triangulares claras e escuras alternadas
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    const n = 8;
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((k + 1) / n) * Math.PI * 2 - Math.PI / 2;
      ctx.fillStyle = k % 2 ? shade(color, -0.3) : shade(color, 0.25);
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.lineTo(c + Math.cos(a0) * r * 1.2, c + Math.sin(a0) * r * 1.2);
      ctx.lineTo(c + Math.cos(a1) * r * 1.2, c + Math.sin(a1) * r * 1.2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = shade(color, 0.15);
    ctx.beginPath();
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 - Math.PI / 2 + Math.PI / n;
      ctx.lineTo(c + Math.cos(a) * r * 0.5, c + Math.sin(a) * r * 0.5);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Reflexo de luz
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(c - r * 0.35, c - r * 0.45, r * 0.28, r * 0.16, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(c + r * 0.05, c - r * 0.62, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
  tex.refresh();
}

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hexA(hex, a) {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Clareia (amt > 0) ou escurece (amt < 0) uma cor. */
function shade(hex, amt) {
  const [r, g, b] = rgb(hex).map((v) => Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt)));
  return `rgb(${r},${g},${b})`;
}

export const colorInt = (hex) => parseInt(hex.slice(1), 16);
