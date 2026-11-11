// Controlador do app: laço do jogo, controles (joystick, câmera, botões, teclado), HUD, sons, salvar e anúncios.
import { World, BUILDS, CAMP, HALF, NPC } from './world.js';
import { QUESTS } from './quests.js';
import { View } from './render.js';
import { Save } from './storage.js';
import { Sfx, seaLoop } from './audio.js';
import { Music } from './music.js';
import { Ads } from './ads.js';

const $ = (id) => document.getElementById(id);
const canvas = $('c');
let world = new World(7);
let view = new View(canvas, world);
let mapImg = view.minimap();
let playing = false;
let paused = false;
let sea = null;
let saveT = 0;
const input = { mx: 0, mz: 0, attack: false, roll: false, interact: false, eat: false };
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const look = { id: null, x: 0, y: 0 };
const keys = new Set();
const ICONS = { wood: '🪵', stone: '🪨', berry: '🫐', crystal: '💎', coin: '🪙', potion: '🧪', relic: '🏺', core: '🔥' };

Ads.init();

// ---------- controles ----------

canvas.addEventListener('pointerdown', (e) => {
  if (!playing || paused) return;
  canvas.setPointerCapture(e.pointerId);
  if (e.clientX < innerWidth * 0.5 && stick.id === null) {
    Object.assign(stick, { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 });
    const el = $('stick');
    el.style.left = `${e.clientX}px`;
    el.style.top = `${e.clientY}px`;
    el.classList.remove('hidden');
  } else if (look.id === null) {
    Object.assign(look, { id: e.pointerId, x: e.clientX, y: e.clientY });
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId === stick.id) {
    const dx = e.clientX - stick.ox;
    const dy = e.clientY - stick.oy;
    const d = Math.hypot(dx, dy);
    const k = d > 50 ? 50 / d : 1;
    stick.x = (dx * k) / 50;
    stick.y = (dy * k) / 50;
    $('stick').firstElementChild.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
  } else if (e.pointerId === look.id) {
    view.camYaw -= (e.clientX - look.x) * 0.006;
    view.camPitch = Math.max(0.15, Math.min(1.25, view.camPitch + (e.clientY - look.y) * 0.004));
    look.x = e.clientX;
    look.y = e.clientY;
  }
});
const release = (e) => {
  if (e.pointerId === stick.id) {
    stick.id = null;
    stick.x = stick.y = 0;
    $('stick').classList.add('hidden');
    $('stick').firstElementChild.style.transform = '';
  } else if (e.pointerId === look.id) look.id = null;
};
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);

function hold(id, key) {
  const el = $(id);
  const on = (e) => {
    e.preventDefault();
    input[key] = true;
    el.classList.add('down');
  };
  const off = () => {
    if (key === 'attack') input.attack = false;
    el.classList.remove('down');
  };
  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off);
  el.addEventListener('pointerleave', off);
  el.addEventListener('pointercancel', off);
}
hold('btn-atk', 'attack');
hold('btn-roll', 'roll');
hold('btn-eat', 'eat');
hold('btn-use', 'interact');

window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'KeyK' || e.code === 'ShiftLeft') input.roll = true;
  if (e.code === 'KeyE') input.interact = true;
  if (e.code === 'KeyF') input.eat = true;
  if (e.code === 'Escape' && playing) togglePause();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));

function readInput(dt) {
  let jx = stick.x;
  let jy = stick.y;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) jx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) jx += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) jy -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) jy += 1;
  if (keys.has('KeyQ')) view.camYaw += dt * 2;
  if (keys.has('KeyR')) view.camYaw -= dt * 2;
  if (keys.has('KeyJ') || keys.has('Space')) input.attack = true;
  else if (!$('btn-atk').classList.contains('down')) input.attack = false;
  // direção da tela → direção do mundo, conforme a câmera
  const fx = Math.sin(view.camYaw);
  const fz = Math.cos(view.camYaw);
  input.mx = -fz * jx + fx * -jy;
  input.mz = fx * jx + fz * -jy;
}

// ---------- HUD ----------

let toastTimer;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

let dialogTimer;
function dialog(who, text) {
  $('dlg-who').textContent = who;
  $('dlg-text').textContent = text;
  $('dialog').classList.remove('hidden');
  clearTimeout(dialogTimer);
  dialogTimer = setTimeout(() => $('dialog').classList.add('hidden'), 9000);
}
$('dialog').addEventListener('click', () => $('dialog').classList.add('hidden'));

function floater(x, y, z, text, color = '#fff') {
  const s = view.project(x, y, z);
  if (s.behind) return;
  const el = document.createElement('div');
  el.className = 'fl';
  el.textContent = text;
  el.style.cssText = `left:${s.x}px;top:${s.y}px;color:${color}`;
  $('floaters').appendChild(el);
  setTimeout(() => el.remove(), 800);
}

const hudCache = {};
function setText(id, text) {
  if (hudCache[id] === text) return;
  hudCache[id] = text;
  $(id).textContent = text;
}

function updateHud() {
  const p = world.player;
  $('hp-bar').style.width = `${(p.hp / p.maxHp) * 100}%`;
  setText('hp-text', `${Math.ceil(p.hp)} / ${p.maxHp}`);
  $('xp-bar').style.width = `${(p.xp / world.xpNeed()) * 100}%`;
  setText('lvl-text', `Nível ${p.level}`);
  const inv = Object.entries(p.inv)
    .filter(([k, v]) => v > 0 || ['wood', 'stone'].includes(k))
    .map(([k, v]) => `${k}:${v}`)
    .join(',');
  if (hudCache.inv !== inv) {
    const old = Object.fromEntries((hudCache.inv ?? '').split(',').map((s) => s.split(':')));
    hudCache.inv = inv;
    $('inv').innerHTML = inv
      .split(',')
      .filter(Boolean)
      .map((s) => {
        const [k, v] = s.split(':');
        return `<span class="${old[k] !== undefined && Number(old[k]) < Number(v) ? 'pop' : ''}">${ICONS[k]} ${v}</span>`;
      })
      .join('');
  }
  setText('eat-n', String(p.inv.berry + p.inv.potion));
  // missão e bússola
  const q = QUESTS[world.quest];
  const obj = world.objective();
  setText('quest-title', q ? q.title : 'Ilha livre: explore à vontade!');
  if (obj) {
    const dx = obj.x - p.x;
    const dz = obj.z - p.z;
    const d = Math.hypot(dx, dz);
    setText('quest-dist', d < 4 ? 'é aqui!' : `${Math.round(d)} m`);
    const fx = Math.sin(view.camYaw);
    const fz = Math.cos(view.camYaw);
    const ang = Math.atan2(-fz * dx + fx * dz, fx * dx + fz * dz);
    $('arrow').style.transform = `rotate(${ang}rad)`;
    $('arrow').style.opacity = d < 4 ? 0.3 : 1;
  } else {
    setText('quest-dist', '');
    $('arrow').style.opacity = 0;
  }
  // botão de interagir
  const ctx = world.context();
  const use = $('btn-use');
  if (ctx) {
    const cost = ctx.cost ? ` (${world.costText(ctx.cost)})` : '';
    const label = ctx.label + cost;
    if (hudCache.use !== label) {
      hudCache.use = label;
      use.textContent = label;
      use.style.background = ctx.cost && !world.has(ctx.cost) ? '#5c6773' : '#2f9e44';
    }
    use.classList.remove('hidden');
  } else {
    use.classList.add('hidden');
    hudCache.use = null;
  }
  // chefão
  const boss = world.enemies.find((e) => e.type === 'golem' && e.state !== 'idle');
  $('boss').classList.toggle('hidden', !boss);
  if (boss) $('boss-bar').style.width = `${(boss.hp / boss.maxHp) * 100}%`;
  drawMap(obj);
}

function drawMap(obj) {
  const g = $('map').getContext('2d');
  const S = 192;
  const p = world.player;
  const zoom = 2.2; // mostra a região em volta do jogador
  g.save();
  g.clearRect(0, 0, S, S);
  g.beginPath();
  g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
  g.clip();
  const px = ((p.x + HALF) / (HALF * 2)) * S;
  const pz = ((p.z + HALF) / (HALF * 2)) * S;
  g.translate(S / 2, S / 2);
  g.scale(zoom, zoom);
  g.translate(-px, -pz);
  g.imageSmoothingEnabled = true;
  g.fillStyle = '#2aa7d8';
  g.fillRect(-S, -S, S * 3, S * 3);
  g.drawImage(mapImg, 0, 0, S, S);
  const dot = (x, z, color, r = 3) => {
    g.fillStyle = color;
    g.beginPath();
    g.arc(((x + HALF) / (HALF * 2)) * S, ((z + HALF) / (HALF * 2)) * S, r, 0, Math.PI * 2);
    g.fill();
  };
  dot(CAMP.x, CAMP.z, '#fff', 3.5);
  world.enemies.forEach((e) => dot(e.x, e.z, e.type === 'golem' ? '#ff7a00' : '#e03131', e.type === 'golem' ? 4 : 2));
  g.restore();
  // objetivo (preso na borda se estiver longe) e jogador
  if (obj) {
    let ox = ((obj.x - p.x) / (HALF * 2)) * S * zoom;
    let oz = ((obj.z - p.z) / (HALF * 2)) * S * zoom;
    const d = Math.hypot(ox, oz);
    const max = S / 2 - 10;
    if (d > max) {
      ox *= max / d;
      oz *= max / d;
    }
    g.fillStyle = '#ffd23f';
    g.strokeStyle = '#000';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(S / 2 + ox, S / 2 + oz, 7, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  g.save();
  g.translate(S / 2, S / 2);
  g.rotate(-p.yaw + Math.PI);
  g.fillStyle = '#fff';
  g.strokeStyle = '#000';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, -11);
  g.lineTo(8, 9);
  g.lineTo(0, 4);
  g.lineTo(-8, 9);
  g.closePath();
  g.fill();
  g.stroke();
  g.restore();
}

// ---------- eventos do mundo ----------

function handleEvents() {
  const p = world.player;
  for (const ev of world.events) {
    view.handle(ev);
    switch (ev.type) {
      case 'toast':
        toast(ev.msg);
        break;
      case 'dialog':
        dialog(ev.who, ev.text);
        break;
      case 'swing':
        Sfx.swing();
        break;
      case 'hit':
        Sfx.hit();
        floater(ev.x, ev.y + 2, ev.z, `${ev.dmg}`, '#ffd23f');
        break;
      case 'chop':
      case 'clank':
        Sfx.chop(ev.kind ?? 'rock');
        break;
      case 'nodeDown':
        Sfx.fall();
        break;
      case 'pickup':
        Sfx.pickup();
        floater(p.x, p.y + 2.6, p.z, `+${ev.n} ${ICONS[ev.item]}`, '#b2f2bb');
        break;
      case 'enemyDie':
        floater(ev.x, ev.y + 1.5, ev.z, `+${ev.coins} 🪙`, '#ffe066');
        break;
      case 'hurt':
        Sfx.hurt();
        floater(p.x, p.y + 2.4, p.z, `-${ev.dmg}`, '#ff6b6b');
        break;
      case 'roll':
        Sfx.roll();
        break;
      case 'eat':
        Sfx.eat();
        break;
      case 'windup':
        if (ev.kind !== 'bite') Sfx.growl();
        break;
      case 'strike':
        if (ev.kind === 'slam') Sfx.slam();
        break;
      case 'boom':
        Sfx.slam();
        break;
      case 'levelup':
        Sfx.levelup();
        break;
      case 'questDone':
        Sfx.quest();
        save();
        break;
      case 'build':
      case 'upgrade':
        Sfx.build();
        save();
        break;
      case 'sleep':
        save();
        break;
      case 'death':
        Sfx.death();
        setTimeout(() => $('death').classList.remove('hidden'), 900);
        break;
      case 'ending':
        $('end-info').textContent = `Tempo de jogo: ${Math.round(world.stats.time / 60)} min\nNível ${p.level} · ${world.stats.deaths} quedas`;
        $('ending').classList.remove('hidden');
        Sfx.quest();
        save();
        break;
      default:
    }
  }
  world.events.length = 0;
}

// ---------- laço ----------

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (playing && !paused) {
    readInput(dt);
    world.update(dt, input);
    input.roll = input.interact = input.eat = false;
    handleEvents();
    updateHud();
    const h = world.player.y;
    sea?.set(Math.max(0, 1 - h / 9));
    saveT += dt;
    if (saveT > 8) save();
  } else if (!playing) {
    view.camYaw += dt * 0.08; // menu: câmera girando devagar
  }
  view.frame(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function save() {
  saveT = 0;
  Save.saveGame(world.serialize());
}

// ---------- telas ----------

function start(fresh) {
  if (fresh) Save.clearGame();
  const data = fresh ? null : Save.loadGame();
  world = new World(data?.seed ?? 7, data);
  view.renderer.dispose();
  view = new View(canvas, world);
  mapImg = view.minimap();
  view.camYaw = Math.PI;
  playing = true;
  paused = false;
  $('menu').classList.add('hidden');
  $('hud').classList.remove('hidden');
  Ads.hideBanner();
  Sfx.unlock();
  Music.start();
  sea?.stop();
  sea = seaLoop();
  if (!data) dialog(NPC.name, 'Ei, você aí! Venha cá, náufrago! (Use o joystick à esquerda para andar e siga a seta amarela.)');
}

function openMenu() {
  playing = false;
  if (world.stats.time > 1) save();
  sea?.stop();
  sea = null;
  ['hud', 'pause', 'death', 'ending'].forEach((id) => $(id).classList.add('hidden'));
  $('menu').classList.remove('hidden');
  $('btn-continue').classList.toggle('hidden', !Save.loadGame());
  labels();
  Ads.showBanner();
}

function togglePause() {
  paused = !paused;
  $('pause').classList.toggle('hidden', !paused);
  const p = world.player;
  $('pause-info').textContent = `Nível ${p.level} · Arma: ${p.weapon}/4\nMissão ${Math.min(world.quest + 1, QUESTS.length)} de ${QUESTS.length}`;
  if (paused) save();
}

function labels() {
  $('btn-sfx').textContent = Save.get('muted') ? '🔇 Sons' : '🔊 Sons';
  $('btn-music').textContent = Save.get('musicOff') ? '🎵 Música: não' : '🎵 Música: sim';
}

const bind = (id, fn) =>
  $(id).addEventListener('click', () => {
    Sfx.click();
    fn();
  });
bind('btn-new', () => start(true));
bind('btn-continue', () => start(false));
bind('btn-sfx', () => {
  Save.set('muted', !Save.get('muted'));
  labels();
});
bind('btn-music', () => {
  Music.toggle();
  labels();
});
bind('btn-pause', togglePause);
bind('btn-resume', togglePause);
bind('btn-menu', async () => {
  await Ads.maybeShowInterstitial();
  openMenu();
});
bind('btn-respawn', async () => {
  $('death').classList.add('hidden');
  await Ads.maybeShowInterstitial();
  world.respawn(false);
  save();
});
bind('btn-revive', async () => {
  const ok = await Ads.showRewarded();
  if (!ok) return toast('Anúncio indisponível agora');
  $('death').classList.add('hidden');
  world.respawn(true);
});
bind('btn-stay', () => $('ending').classList.add('hidden'));

document.addEventListener('visibilitychange', () => {
  if (document.hidden && playing) {
    save();
    if (!paused) togglePause();
  }
});

openMenu();
if (new URLSearchParams(location.search).has('foto')) document.body.classList.add('foto');
window.__app = {
  get world() { return world; },
  get view() { return view; },
  start,
  BUILDS,
};
