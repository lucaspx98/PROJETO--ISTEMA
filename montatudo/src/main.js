// Controlador do app: telas (menu, fases, jogo, vitória), bandeja de peças e anúncios.
import { Engine } from './engine.js';
import { Play, showcase } from './game.js';
import { LEVELS } from './levels/index.js';
import { Save } from './storage.js';
import { Sfx } from './audio.js';
import { Music } from './music.js';
import { Ads } from './ads.js';
import { HINT_PRICE } from './config.js';

const $ = (id) => document.getElementById(id);
const engine = new Engine($('c'));
let play = null;
let levelIndex = 0;
let stopShowcase = null;
let lastReward = 0;

Ads.init();

// ---------- utilidades de interface ----------

function show(id) {
  ['menu', 'levels', 'hud', 'done'].forEach((s) => $(s).classList.toggle('hidden', s !== id && !(id === 'done' && s === 'hud')));
}

function updateCoins() {
  document.querySelectorAll('.coin-val').forEach((el) => (el.textContent = Save.get('coins')));
  $('btn-hint').textContent = Save.get('coins') >= HINT_PRICE ? `💡 Dica · ${HINT_PRICE} 🪙` : '💡 Dica (anúncio)';
}

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1900);
}

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const starsHtml = (n) => [1, 2, 3].map((i) => (i <= n ? '★' : '<span class="off">★</span>')).join('');
const unlocked = (i) => i === 0 || Save.starsOf(LEVELS[i - 1].id) > 0;

function sfxLabels() {
  $('btn-sfx').textContent = Save.get('muted') ? '🔇 Efeitos' : '🔊 Efeitos';
  $('btn-music').textContent = Save.get('musicOff') ? '🎵 Música: não' : '🎵 Música: sim';
}

function bindTap(id, fn) {
  $(id).addEventListener('click', () => {
    Sfx.click();
    fn();
  });
}

// ---------- telas ----------

function startShowcase() {
  stopShowcase?.();
  stopShowcase = showcase(engine, LEVELS.find((l) => l.id === 'computador'));
}

function openMenu() {
  startShowcase();
  show('menu');
  updateCoins();
  sfxLabels();
  Ads.showBanner();
}

function openLevels() {
  if (!stopShowcase) startShowcase();
  show('levels');
  updateCoins();
  Ads.showBanner();
  const list = $('level-list');
  list.innerHTML = '';
  LEVELS.forEach((lvl, i) => {
    const open = unlocked(i);
    const b = document.createElement('button');
    b.className = 'level' + (open ? '' : ' locked');
    b.innerHTML = `<div class="emoji">${open ? lvl.icon : '🔒'}</div><div class="num">FASE ${i + 1}</div>
      <div class="name">${lvl.name}</div><div class="st">${open ? starsHtml(Save.starsOf(lvl.id)) : '&nbsp;'}</div>`;
    b.addEventListener('click', () => {
      Sfx.click();
      if (!open) return toast('Termine a fase anterior para liberar');
      startLevel(i);
    });
    list.appendChild(b);
  });
}

function startLevel(i) {
  stopShowcase?.();
  stopShowcase = null;
  play?.dispose();
  levelIndex = i;
  const level = LEVELS[i];
  Ads.hideBanner();
  Music.start();
  show('hud');
  $('lvl-name').textContent = `${i + 1}. ${level.name}`;
  updateCoins();
  play = new Play(engine, level, {
    onTray: renderTray,
    onProgress: (done, total) => ($('lvl-bar').style.width = `${(done / total) * 100}%`),
    onToast: toast,
    onHighlight: (id) => {
      const el = document.querySelector(`.part[data-id="${id}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      el.classList.remove('glow');
      void el.offsetWidth;
      el.classList.add('glow');
    },
    onComplete: complete,
  });
  toast('Arraste as peças até o contorno azul');
}

function quitLevel() {
  play?.dispose();
  play = null;
  openLevels();
}

function complete({ stars, time, mistakes }) {
  const level = LEVELS[levelIndex];
  Save.setStars(level.id, stars);
  lastReward = 40 + stars * 20;
  Save.addCoins(lastReward);
  Sfx.coin();
  updateCoins();
  $('done-stars').innerHTML = starsHtml(stars);
  $('done-info').textContent = `Tempo ${fmtTime(time)} · ${mistakes} ${mistakes === 1 ? 'erro' : 'erros'}`;
  $('done-coins').textContent = lastReward;
  $('btn-double').classList.remove('hidden');
  $('btn-next').classList.toggle('hidden', levelIndex >= LEVELS.length - 1);
  show('done');
  Ads.showBanner();
}

async function leaveDone(next) {
  await Ads.maybeShowInterstitial();
  if (next && levelIndex < LEVELS.length - 1) startLevel(levelIndex + 1);
  else quitLevel();
}

// ---------- bandeja de peças (arrastar para cima para pegar) ----------

function renderTray(parts) {
  const tray = $('tray');
  tray.innerHTML = '';
  if (!parts.length) {
    tray.innerHTML = '<div class="tray-empty">Todas as peças no lugar! Toque nos parafusos laranja 🔩</div>';
    return;
  }
  parts.forEach((p) => {
    const el = document.createElement('div');
    el.className = 'part' + (play && play.missing(p).length ? ' blocked' : '');
    el.dataset.id = p.def.id;
    el.innerHTML = `<img src="${p.thumb}" alt=""><span>${p.def.name}</span>`;
    el.addEventListener('pointerdown', (ev) => trayDown(ev, p.def.id, el));
    tray.appendChild(el);
  });
}

function trayDown(ev, id, el) {
  const sx = ev.clientX;
  const sy = ev.clientY;
  const touch = ev.pointerType !== 'mouse';
  let dragging = false;
  let aborted = false;
  const move = (e) => {
    if (e.pointerId !== ev.pointerId || aborted) return;
    if (!dragging) {
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (-dy > 12 && -dy > Math.abs(dx)) {
        dragging = play.beginDrag(id, e.clientX, e.clientY, touch);
        if (!dragging) aborted = true;
        else el.classList.add('dragging');
      }
      return;
    }
    e.preventDefault();
    play.moveDrag(e.clientX, e.clientY);
  };
  const up = (e) => {
    if (e.pointerId !== ev.pointerId) return;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    if (dragging) {
      el.classList.remove('dragging');
      play.endDrag();
    } else if (!aborted && e.type === 'pointerup' && Math.hypot(e.clientX - sx, e.clientY - sy) < 10) {
      play.peek(id);
    }
  };
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

// ---------- botões ----------

bindTap('btn-play', () => {
  Sfx.unlock();
  Music.start();
  openLevels();
});
bindTap('btn-levels-back', openMenu);
bindTap('btn-sfx', () => {
  Save.set('muted', !Save.get('muted'));
  sfxLabels();
});
bindTap('btn-music', () => {
  Music.toggle();
  sfxLabels();
});
bindTap('btn-quit', quitLevel);
bindTap('btn-hint', async () => {
  if (!play || play.done) return;
  if (Save.spend(HINT_PRICE)) {
    updateCoins();
    return play.hint();
  }
  const ok = await Ads.showRewarded();
  if (ok) play.hint();
  else toast('Anúncio indisponível agora');
});
bindTap('btn-double', async () => {
  const ok = await Ads.showRewarded();
  if (!ok) return toast('Anúncio indisponível agora');
  Save.addCoins(lastReward);
  $('done-coins').textContent = lastReward * 2;
  $('btn-double').classList.add('hidden');
  Sfx.coin();
  updateCoins();
});
bindTap('btn-next', () => leaveDone(true));
bindTap('btn-done-levels', () => leaveDone(false));

setInterval(() => play && !play.done && ($('lvl-time').textContent = fmtTime(play.time)), 250);

openMenu();
// ?foto: só a cena 3D, sem interface (usado para gerar o ícone e imagens da loja)
if (new URLSearchParams(location.search).has('foto')) {
  document.body.classList.add('foto');
  engine.controls.autoRotate = false;
}
window.__app = { engine, get play() { return play; }, startLevel };
