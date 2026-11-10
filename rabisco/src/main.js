// Controlador do app: tela, toque (desenho), telas de menu/roupinhas/vitória/derrota, sons e anúncios.
import { H, Level, W, hintPath } from './game.js';
import { levelAt } from './levels.js';
import { Fx, SKINS, drawBolota, drawLevel, drawSky, skinById } from './render.js';
import { Save } from './storage.js';
import { Sfx, loop } from './audio.js';
import { Music } from './music.js';
import { Ads } from './ads.js';
import { HINT_PRICE } from './config.js';

const $ = (id) => document.getElementById(id);
const canvas = $('c');
const ctx = canvas.getContext('2d');
const fx = new Fx();
let view = { s: 1, ox: 0, oy: 0 };
let lv = null;
let levelIndex = Save.get('level');
let showHint = false;
let drawing = null;
let buzz = null;
let t = 0;
let lastReward = 0;
let menuScene = null;

Ads.init();

// ---------- tela ----------

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  // A fase (540×960) ocupa a largura toda; sobra de altura vira céu em cima
  const s = Math.min(innerWidth / W, innerHeight / (H * 0.82));
  view = { s, ox: (innerWidth - W * s) / 2, oy: innerHeight - H * s, dpr };
}
window.addEventListener('resize', resize);
resize();

const toWorld = (e) => ({ x: (e.clientX - view.ox) / view.s, y: (e.clientY - view.oy) / view.s });

function frame(now) {
  if (frame.last === Infinity) return;
  const dt = Math.min(0.05, (now - (frame.last ?? now)) / 1000);
  frame.last = now;
  t += dt;
  const { s, ox, oy, dpr } = view;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawSky(ctx, innerWidth, innerHeight, t);
  ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
  const scene = lv ?? menuScene;
  if (scene) {
    if (lv) {
      lv.update(dt);
      updateHud();
    }
    fx.update(dt);
    drawLevel(ctx, scene, { t, skin: skinById(Save.get('skin')), hint: showHint && lv?.state === 'draw' ? hintPath(lv.def) : null, fx });
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- desenho com o dedo ----------

canvas.addEventListener('pointerdown', (e) => {
  if (!lv || lv.state !== 'draw') return;
  canvas.setPointerCapture(e.pointerId);
  const p = toWorld(e);
  if (lv.beginStroke(p.x, p.y)) {
    drawing = { sound: loop('risco'), last: p, lastT: performance.now() };
    $('draw-tip').classList.add('hidden');
  } else {
    toast('Comece num espaço livre');
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (!drawing || !lv) return;
  const p = toWorld(e);
  const now = performance.now();
  const speed = Math.hypot(p.x - drawing.last.x, p.y - drawing.last.y) / Math.max(1, now - drawing.lastT);
  drawing.last = p;
  drawing.lastT = now;
  const wasBlocked = lv.blocked;
  lv.extendStroke(p.x, p.y);
  drawing.sound.set(lv.blocked ? 0 : Math.min(1, speed * 1.5));
  if (lv.blocked && !wasBlocked && lv.inkLeft > 0.01) Sfx.tick();
});

function endDraw() {
  if (!drawing || !lv) return;
  drawing.sound.stop();
  drawing = null;
  if (lv.endStroke()) {
    showHint = false;
    Sfx.thud();
    $('timer').classList.remove('hidden');
    $('btn-hint').classList.add('hidden');
    if ((lv.def.hives ?? []).length) {
      buzz = loop('zumbido');
    }
  } else {
    $('draw-tip').classList.remove('hidden');
    toast('Desenhe um traço maior');
  }
}
canvas.addEventListener('pointerup', endDraw);
canvas.addEventListener('pointercancel', endDraw);

// ---------- fases ----------

function startLevel(i) {
  levelIndex = i;
  buzz?.stop();
  buzz = null;
  showHint = false;
  menuScene = null;
  fx.list = [];
  lv = new Level(levelAt(i), {
    onWin: () => setTimeout(win, 350),
    onLose: (reason) => {
      Sfx.hurt();
      buzz?.stop();
      buzz = null;
      setTimeout(() => lose(reason), 500);
    },
    onHit: (x, y) => fx.burst(x, y, ['#ff4d6d', '#ffd23f', '#ffffff'], 16, 7),
    onSpawn: (kind) => {
      if (kind === 'ball') Sfx.boom();
    },
  });
  Ads.hideBanner();
  Music.start();
  show('hud');
  $('lvl-name').textContent = `Fase ${i + 1} · ${lv.def.name}`;
  $('timer').classList.add('hidden');
  $('btn-hint').classList.remove('hidden');
  $('draw-tip').classList.remove('hidden');
}

function updateHud() {
  $('ink-bar').style.width = `${Math.round(lv.inkLeft * 100)}%`;
  if (lv.state === 'run' || lv.state === 'win') {
    const n = Math.ceil(lv.timeLeft);
    const el = $('timer');
    if (el.textContent !== String(n)) {
      el.textContent = n;
      if (lv.state === 'run' && n <= 3 && n > 0) Sfx.tick();
    }
  }
  if (buzz) {
    const near = lv.bees.filter((b) => Math.hypot(b.position.x - lv.char.position.x, b.position.y - lv.char.position.y) < 220).length;
    buzz.set(lv.state === 'run' ? 0.25 + Math.min(1, near / 10) : 0);
  }
}

function win() {
  if (!lv || lv.state !== 'win') return;
  buzz?.stop();
  buzz = null;
  const stars = lv.stars;
  Save.setStars(levelIndex, stars);
  if (levelIndex + 1 > Save.get('level')) Save.set('level', levelIndex + 1);
  lastReward = 10 + stars * 10;
  Save.addCoins(lastReward);
  fx.burst(lv.char.position.x, lv.char.position.y - 40, ['#ffd23f', '#2fbf71', '#6aa8ff', '#ff8fb8'], 40, 9);
  Sfx.win();
  $('win-stars').innerHTML = [1, 2, 3].map((k) => (k <= stars ? '★' : '<span class="off">★</span>')).join('');
  for (let k = 0; k < stars; k++) setTimeout(() => Sfx.star(k), 300 + k * 200);
  $('win-coins').textContent = lastReward;
  $('btn-double').classList.remove('hidden');
  show('win');
  updateCoins();
  Ads.showBanner();
}

function lose(reason) {
  $('lose-title').textContent = reason;
  show('lose');
  Ads.showBanner();
}

async function afterLevel(fn) {
  await Ads.maybeShowInterstitial();
  fn();
}

// ---------- menus ----------

function show(id) {
  ['menu', 'skins', 'hud', 'win', 'lose'].forEach((s) => $(s).classList.toggle('hidden', s !== id && !(['win', 'lose'].includes(id) && s === 'hud')));
}

function updateCoins() {
  document.querySelectorAll('.coin-val').forEach((el) => (el.textContent = Save.get('coins')));
  $('btn-hint').title = Save.get('coins') >= HINT_PRICE ? `Dica · ${HINT_PRICE} moedas` : 'Dica (anúncio)';
}

let toastTimer;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
}

function openMenu() {
  buzz?.stop();
  buzz = null;
  lv = null;
  // cenário do menu: o Bolota no chão com uma colmeia
  menuScene = new Level({ ground: [{ x: 270, y: 860, w: 600, h: 600 }], char: { x: 270, y: 526 }, hives: [{ x: 440, y: 330, count: 0 }], ink: 1 });
  show('menu');
  $('btn-play').textContent = `▶ Fase ${Save.get('level') + 1}`;
  sfxLabels();
  updateCoins();
  Ads.showBanner();
}

function sfxLabels() {
  $('btn-sfx').textContent = Save.get('muted') ? '🔇 Sons' : '🔊 Sons';
  $('btn-music').textContent = Save.get('musicOff') ? '🎵 Música: não' : '🎵 Música: sim';
}

function openSkins() {
  show('skins');
  updateCoins();
  const list = $('skin-list');
  list.innerHTML = '';
  SKINS.forEach((sk) => {
    const card = document.createElement('div');
    const on = Save.get('skin') === sk.id;
    card.className = 'skin' + (on ? ' on' : '');
    const cv = document.createElement('canvas');
    cv.width = cv.height = 220;
    const c2 = cv.getContext('2d');
    c2.scale(2, 2);
    drawBolota(c2, 55, 60, sk, 'calm', null, 1, 1.25);
    const owned = Save.owns(sk.id);
    const b = document.createElement('button');
    b.className = 'btn' + (owned ? (on ? '' : ' lilac') : ' orange');
    b.textContent = on ? 'Usando' : owned ? 'Usar' : `${sk.price} 🪙`;
    b.addEventListener('click', () => {
      Sfx.click();
      if (owned) Save.set('skin', sk.id);
      else if (Save.buySkin(sk.id, sk.price)) Sfx.coin();
      else return toast(`Faltam ${sk.price - Save.get('coins')} moedas`);
      openSkins();
    });
    card.append(cv);
    card.insertAdjacentHTML('beforeend', `<b>${sk.name}</b>`);
    card.append(b);
    list.append(card);
  });
}

async function useHint() {
  if (!lv || lv.state !== 'draw') return;
  if (showHint) return;
  if (!Save.spend(HINT_PRICE)) {
    const ok = await Ads.showRewarded();
    if (!ok) return toast('Anúncio indisponível agora');
  }
  updateCoins();
  showHint = true;
  toast('Siga o traço laranja!');
}

function bind(id, fn) {
  $(id).addEventListener('click', () => {
    Sfx.click();
    fn();
  });
}

bind('btn-play', () => {
  Sfx.unlock();
  startLevel(Save.get('level'));
});
bind('btn-skins', openSkins);
bind('btn-skins-back', openMenu);
bind('btn-sfx', () => {
  Save.set('muted', !Save.get('muted'));
  sfxLabels();
});
bind('btn-music', () => {
  Music.toggle();
  sfxLabels();
});
bind('btn-home', openMenu);
bind('btn-retry', () => startLevel(levelIndex));
bind('btn-hint', useHint);
bind('btn-next', () => afterLevel(() => startLevel(levelIndex + 1)));
bind('btn-double', async () => {
  const ok = await Ads.showRewarded();
  if (!ok) return toast('Anúncio indisponível agora');
  Save.addCoins(lastReward);
  $('win-coins').textContent = lastReward * 2;
  $('btn-double').classList.add('hidden');
  Sfx.coin();
  updateCoins();
});
bind('btn-again', () => afterLevel(() => startLevel(levelIndex)));
bind('btn-lose-hint', () =>
  afterLevel(async () => {
    startLevel(levelIndex);
    await useHint();
  }),
);
bind('btn-skip', async () => {
  const ok = await Ads.showRewarded();
  if (!ok) return toast('Anúncio indisponível agora');
  if (levelIndex + 1 > Save.get('level')) Save.set('level', levelIndex + 1);
  startLevel(levelIndex + 1);
});

openMenu();
// ?icone: desenha só o ícone do app (usado para gerar as imagens da loja)
if (new URLSearchParams(location.search).has('icone')) {
  document.querySelectorAll('.screen, #hud').forEach((el) => el.classList.add('hidden'));
  lv = null;
  menuScene = null;
  const draw = () => {
    const S = Math.min(innerWidth, innerHeight);
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, '#7cc8ff');
    g.addColorStop(1, '#d9f2ff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    ctx.setTransform((view.dpr * S) / 512, 0, 0, (view.dpr * S) / 512, 0, 0);
    ctx.fillStyle = '#b77b4a';
    ctx.fillRect(0, 400, 512, 112);
    ctx.fillStyle = '#5ccf4a';
    ctx.fillRect(0, 392, 512, 22);
    const arc = [];
    for (let a = Math.PI; a <= Math.PI * 2 + 1e-6; a += Math.PI / 30) arc.push({ x: 256 + Math.cos(a) * 165, y: 400 + Math.sin(a) * 175 });
    ctx.save();
    ctx.scale(1, 1);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2b2d42';
    ctx.lineWidth = 26;
    ctx.beginPath();
    arc.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
    drawBolota(ctx, 256, 318, skinById('bolota'), 'scared', { x: 120, y: 120 }, 0.5, 2.3);
    [[95, 150, 1], [420, 120, -1], [455, 250, -1]].forEach(([x, y, d]) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(2.2 * d, 2.2);
      ctx.fillStyle = 'rgba(230,245,255,0.9)';
      ctx.beginPath();
      ctx.ellipse(-2, -9, 6, 8, -0.4, 0, Math.PI * 2);
      ctx.ellipse(4, -9, 5, 7, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b2d42';
      ctx.fillRect(-5, -8, 4, 16);
      ctx.fillRect(2, -8, 4, 16);
      ctx.restore();
    });
  };
  const loopIcon = () => {
    draw();
    requestAnimationFrame(loopIcon);
  };
  frame.last = Infinity;
  requestAnimationFrame(loopIcon);
}
window.__app = { get lv() { return lv; }, startLevel };
