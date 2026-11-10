// Desenho da fase em canvas 2D (estilo cartum). Coordenadas lógicas 540×960.
import { CHAR_R, H, LINE_W, W } from './game.js';

export const SKINS = [
  { id: 'bolota', name: 'Bolota', price: 0, color: '#ffcf33', belly: '#fff1b0', acc: null },
  { id: 'rosa', name: 'Rosinha', price: 150, color: '#ff8fb8', belly: '#ffe0ec', acc: 'laco' },
  { id: 'menta', name: 'Menta', price: 250, color: '#6fe0b8', belly: '#dcfff1', acc: 'bone' },
  { id: 'azul', name: 'DJ Azul', price: 400, color: '#6aa8ff', belly: '#e0edff', acc: 'fone' },
  { id: 'roxo', name: 'Majestade', price: 600, color: '#b28dff', belly: '#efe6ff', acc: 'coroa' },
  { id: 'laranja', name: 'Estiloso', price: 900, color: '#ff9f43', belly: '#ffe7cc', acc: 'oculos' },
];
export const skinById = (id) => SKINS.find((s) => s.id === id) ?? SKINS[0];

const clouds = Array.from({ length: 6 }, (_, i) => ({ x: (i * 173) % 600, y: 80 + ((i * 97) % 300), s: 0.6 + ((i * 37) % 10) / 15 }));

export function drawSky(ctx, w, h, t) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#7cc8ff');
  g.addColorStop(0.7, '#cdeeff');
  g.addColorStop(1, '#eaf8ff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function cloud(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  [[0, 0, 34], [30, -14, 30], [60, 0, 28], [28, 10, 30]].forEach(([dx, dy, r]) => {
    ctx.moveTo(x + dx * s + r * s, y + dy * s);
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
  });
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawGround(ctx, g) {
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.rotate(g.angle ?? 0);
  const x = -g.w / 2;
  const y = -g.h / 2;
  if (g.kind === 'spike') {
    ctx.fillStyle = '#5b5f6b';
    roundRect(ctx, x, y + g.h * 0.45, g.w, g.h * 0.55, 6);
    ctx.fill();
    ctx.fillStyle = '#c9ced8';
    ctx.strokeStyle = '#7a808c';
    ctx.lineWidth = 2;
    for (let sx = x; sx < x + g.w; sx += 26) {
      ctx.beginPath();
      ctx.moveTo(sx, y + g.h * 0.5);
      ctx.lineTo(sx + 13, y - 4);
      ctx.lineTo(sx + 26, y + g.h * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else {
    const dirt = ctx.createLinearGradient(0, y, 0, y + g.h);
    dirt.addColorStop(0, '#b77b4a');
    dirt.addColorStop(1, '#8a5530');
    ctx.fillStyle = dirt;
    roundRect(ctx, x, y, g.w, g.h, Math.min(14, g.w / 2, g.h / 2));
    ctx.fill();
    // pedrinhas na terra
    ctx.fillStyle = 'rgba(70,40,20,0.25)';
    for (let i = 0; i < g.w * g.h / 2500; i++) {
      const px = x + 10 + ((i * 53) % Math.max(1, g.w - 20));
      const py = y + 20 + ((i * 37) % Math.max(1, g.h - 26));
      ctx.beginPath();
      ctx.ellipse(px, py, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // grama em cima
    ctx.fillStyle = '#5ccf4a';
    roundRect(ctx, x - 2, y - 4, g.w + 4, Math.min(18, g.h * 0.6), 9);
    ctx.fill();
    ctx.fillStyle = '#7de36a';
    for (let gx = x + 6; gx < x + g.w - 4; gx += 14) {
      ctx.beginPath();
      ctx.arc(gx, y + 4, 5, Math.PI, 0);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawHive(ctx, h, t) {
  ctx.strokeStyle = '#6b4a2b';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(h.x - 50, h.y - 52);
  ctx.lineTo(h.x + 50, h.y - 58);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(h.x, h.y - 55);
  ctx.lineTo(h.x, h.y - 38);
  ctx.stroke();
  const rows = [[0, -28, 22], [0, -12, 32], [0, 6, 36], [0, 22, 30]];
  rows.forEach(([dx, dy, r], i) => {
    ctx.fillStyle = i % 2 ? '#e9a93a' : '#f4bf4f';
    ctx.beginPath();
    ctx.ellipse(h.x + dx, h.y + dy, r, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#4a2f18';
  ctx.beginPath();
  ctx.ellipse(h.x, h.y + 12, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  void t;
}

function drawCannon(ctx, cn, t) {
  const a = cn.aim ?? (cn.dir > 0 ? 0 : Math.PI);
  ctx.save();
  ctx.translate(cn.x, cn.y);
  ctx.rotate(a);
  const kick = (cn.flash ?? 0) * 40;
  ctx.fillStyle = '#3d4250';
  roundRect(ctx, -10 - kick, -14, 58, 28, 10);
  ctx.fill();
  ctx.fillStyle = '#2a2e38';
  roundRect(ctx, 38 - kick, -17, 14, 34, 5);
  ctx.fill();
  if (cn.flash > 0.08) {
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath();
    ctx.arc(60, 0, 14, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#6b4a2b';
  ctx.beginPath();
  ctx.arc(cn.x, cn.y + 10, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a6440';
  ctx.beginPath();
  ctx.arc(cn.x, cn.y + 10, 8, 0, Math.PI * 2);
  ctx.fill();
  void t;
}

export function drawStroke(ctx, pts, color = '#2b2d42', alpha = 1, dash = null) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = LINE_W + 3;
  ctx.translate(0, 3);
  ctx.stroke();
  ctx.translate(0, -3);
  ctx.strokeStyle = color;
  ctx.lineWidth = LINE_W;
  ctx.stroke();
  if (!dash) {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 3;
    ctx.translate(-1.5, -2.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBee(ctx, b, t) {
  const v = b.velocity;
  const ang = Math.atan2(v.y, v.x);
  const flip = Math.cos(ang) < 0 ? -1 : 1;
  ctx.save();
  ctx.translate(b.position.x, b.position.y);
  ctx.scale(flip, 1);
  ctx.rotate(flip > 0 ? ang * 0.4 : (Math.PI - ang) * -0.4);
  const flap = Math.sin(t * 60 + b.id) * 0.5 + 0.5;
  ctx.fillStyle = 'rgba(230,245,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(-2, -9, 6, 9 * (0.5 + flap * 0.5), -0.4, 0, Math.PI * 2);
  ctx.ellipse(4, -9, 5, 8 * (0.5 + flap * 0.5), 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b2d42';
  ctx.fillRect(-5, -8, 4, 16);
  ctx.fillRect(2, -8, 4, 16);
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(-17, -2);
  ctx.lineTo(-12, 3);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(8, -2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(9, -2, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRock(ctx, r) {
  ctx.fillStyle = r.label === 'ball' ? '#2d3038' : '#9aa0aa';
  ctx.strokeStyle = r.label === 'ball' ? '#15171c' : '#6d737d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  r.vertices.forEach((v, i) => (i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y)));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(r.position.x - 5, r.position.y - 6, r.label === 'ball' ? 4 : 6, 0, Math.PI * 2);
  ctx.fill();
}

/** O Bolota. mood: calm | scared | happy | hurt; look = ponto para onde olha. */
export function drawBolota(ctx, x, y, skin, mood, look, t, scale = 1) {
  const r = CHAR_R * scale;
  ctx.save();
  ctx.translate(x, y);
  const squish = mood === 'scared' ? 1 + Math.sin(t * 40) * 0.03 : 1 + Math.sin(t * 3) * 0.015;
  ctx.scale(1 / squish, squish);
  // sombra
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.95, r * 0.8, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  // corpo
  const body = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.2, 0, 0, r);
  body.addColorStop(0, '#ffffff');
  body.addColorStop(0.15, skin.color);
  body.addColorStop(1, shade(skin.color, -30));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skin.belly;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.42, r * 0.55, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // olhos
  const lx = look ? Math.max(-1, Math.min(1, (look.x - x) / 120)) * r * 0.08 : 0;
  const ly = look ? Math.max(-1, Math.min(1, (look.y - y) / 120)) * r * 0.08 : 0;
  [-1, 1].forEach((s) => {
    const ex = s * r * 0.34;
    const ey = -r * 0.12;
    if (mood === 'happy') {
      ctx.strokeStyle = '#2b2d42';
      ctx.lineWidth = 3.5 * scale;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(ex, ey + r * 0.06, r * 0.14, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (mood === 'hurt') {
      ctx.strokeStyle = '#2b2d42';
      ctx.lineWidth = 3.5 * scale;
      const k = r * 0.11;
      ctx.beginPath();
      ctx.moveTo(ex - k, ey - k);
      ctx.lineTo(ex + k, ey + k);
      ctx.moveTo(ex + k, ey - k);
      ctx.lineTo(ex - k, ey + k);
      ctx.stroke();
    } else {
      const blink = mood === 'calm' && t % 3.5 < 0.12;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(ex, ey, r * 0.2, blink ? r * 0.03 : r * (mood === 'scared' ? 0.26 : 0.23), 0, 0, Math.PI * 2);
      ctx.fill();
      if (!blink) {
        ctx.fillStyle = '#2b2d42';
        ctx.beginPath();
        ctx.arc(ex + lx, ey + ly, r * (mood === 'scared' ? 0.08 : 0.11), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ex + lx + r * 0.04, ey + ly - r * 0.04, r * 0.035, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  // bochechas
  ctx.fillStyle = 'rgba(255,110,130,0.45)';
  [-1, 1].forEach((s) => {
    ctx.beginPath();
    ctx.ellipse(s * r * 0.58, r * 0.12, r * 0.13, r * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  // boca
  ctx.strokeStyle = '#2b2d42';
  ctx.fillStyle = '#7a2533';
  ctx.lineWidth = 3 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (mood === 'scared') {
    ctx.ellipse(0, r * 0.2, r * 0.1, r * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (mood === 'happy') {
    ctx.arc(0, r * 0.12, r * 0.2, 0.1, Math.PI - 0.1);
    ctx.fill();
  } else if (mood === 'hurt') {
    ctx.arc(0, r * 0.32, r * 0.15, Math.PI + 0.3, -0.3);
    ctx.stroke();
  } else {
    ctx.arc(0, r * 0.1, r * 0.13, 0.3, Math.PI - 0.3);
    ctx.stroke();
  }
  if (mood === 'scared') {
    ctx.fillStyle = 'rgba(120,200,255,0.9)';
    ctx.beginPath();
    ctx.ellipse(r * 0.75, -r * 0.45, r * 0.07, r * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  drawAccessory(ctx, skin.acc, r);
  ctx.restore();
}

function drawAccessory(ctx, acc, r) {
  if (!acc) return;
  ctx.lineWidth = 3;
  if (acc === 'laco') {
    ctx.fillStyle = '#ff3d7f';
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.ellipse(r * 0.35 + s * r * 0.2, -r * 0.82, r * 0.22, r * 0.14, s * 0.4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.beginPath();
    ctx.arc(r * 0.35, -r * 0.82, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
  } else if (acc === 'bone') {
    ctx.fillStyle = '#e63946';
    ctx.beginPath();
    ctx.arc(0, -r * 0.55, r * 0.62, Math.PI * 1.08, Math.PI * 1.92);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.55, -r * 0.62, r * 0.42, r * 0.1, 0.15, 0, Math.PI * 2);
    ctx.fill();
  } else if (acc === 'fone') {
    ctx.strokeStyle = '#2b2d42';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, -r * 0.05, r * 1.02, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.fillStyle = '#ff4d6d';
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.ellipse(s * r * 0.95, -r * 0.05, r * 0.18, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (acc === 'coroa') {
    ctx.fillStyle = '#ffd23f';
    ctx.strokeStyle = '#d99a00';
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.78);
    ctx.lineTo(-r * 0.45, -r * 1.25);
    ctx.lineTo(-r * 0.2, -r * 1.02);
    ctx.lineTo(0, -r * 1.32);
    ctx.lineTo(r * 0.2, -r * 1.02);
    ctx.lineTo(r * 0.45, -r * 1.25);
    ctx.lineTo(r * 0.4, -r * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (acc === 'oculos') {
    ctx.fillStyle = '#1b1b22';
    [-1, 1].forEach((s) => {
      roundRect(ctx, s * r * 0.34 - r * 0.25, -r * 0.3, r * 0.5, r * 0.3, r * 0.1);
      ctx.fill();
    });
    ctx.strokeStyle = '#1b1b22';
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, -r * 0.2);
    ctx.lineTo(r * 0.1, -r * 0.2);
    ctx.stroke();
  }
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, v + amt));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

/** Desenha a fase inteira. extra: { t, skin, hint (pontos), fx (partículas) } */
export function drawLevel(ctx, lv, extra) {
  const { t, skin } = extra;
  clouds.forEach((c, i) => cloud(ctx, ((c.x + t * (6 + i)) % 700) - 80, c.y, c.s));
  lv.def.ground.forEach((g) => drawGround(ctx, g));
  (lv.def.hives ?? []).forEach((h) => drawHive(ctx, h, t));
  // abelhas "de enfeite" rodando a colmeia antes de começar
  if (lv.state === 'draw') {
    (lv.def.hives ?? []).forEach((h, k) => {
      for (let i = 0; i < 3; i++) {
        const a = t * 2.5 + i * 2.1 + k;
        drawBee(ctx, { position: { x: h.x + Math.cos(a) * 46, y: h.y + Math.sin(a) * 26 }, velocity: { x: -Math.sin(a), y: Math.cos(a) }, id: i }, t);
      }
    });
  }
  (lv.def.cannons ?? []).forEach((cn) => drawCannon(ctx, cn, t));
  if (extra.hint) drawStroke(ctx, extra.hint, '#ff8a00', 0.55, [2, 18]);
  lv.hazards.forEach((h) => drawRock(ctx, h));
  drawStroke(ctx, lv.linePoints());
  if (lv.state === 'draw' && lv.blocked && lv.points.length) {
    const p = lv.points[lv.points.length - 1];
    ctx.fillStyle = 'rgba(255,60,60,0.85)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  const threat = lv.nearestThreat();
  const mood = lv.state === 'win' ? 'happy' : lv.state === 'lose' ? 'hurt' : threat && threat.d < 160 ? 'scared' : 'calm';
  const c = lv.char.position;
  drawBolota(ctx, c.x, c.y, skin, mood, threat, t);
  lv.bees.forEach((b) => drawBee(ctx, b, t));
  extra.fx?.draw(ctx);
}

/** Partículas simples (estrelinhas de impacto, confete). */
export class Fx {
  constructor() {
    this.list = [];
  }

  burst(x, y, colors, n = 14, speed = 6) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random());
      this.list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, life: 1, color: colors[i % colors.length], r: 3 + Math.random() * 4 });
    }
  }

  update(dt) {
    this.list.forEach((p) => {
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.vy += 0.25 * dt * 60;
      p.life -= dt * 1.2;
    });
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(ctx) {
    this.list.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
}

export { W, H };
