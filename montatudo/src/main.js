// Controlador do app: telas (menu, fases, oficina, jogo, vitória), bandeja, ferramentas e anúncios.
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Engine } from './engine.js';
import { Play, showcase } from './game.js';
import { LEVELS } from './levels/index.js';
import { Save } from './storage.js';
import { Sfx } from './audio.js';
import { Music } from './music.js';
import { Ads } from './ads.js';
import { HINT_PRICE } from './config.js';
import { TOOLS, nextPrice, toolLevel, upgradeTool } from './tools.js';

const $ = (id) => document.getElementById(id);
const engine = new Engine($('c'));
let screen = 'menu';
let play = null;
let levelIndex = 0;
let stopShowcase = null;
let lastReward = 0;
let tool = 'mao';
let ring = null; // { pos, progress, until }

Ads.init();

// ---------- utilidades de interface ----------

function show(id) {
  screen = id;
  ['menu', 'levels', 'shop', 'hud', 'done'].forEach((s) => $(s).classList.toggle('hidden', s !== id && !(id === 'done' && s === 'hud')));
}

function updateCoins() {
  document.querySelectorAll('.coin-val').forEach((el) => (el.textContent = Save.get('coins')));
  $('btn-hint').innerHTML = `💡<i>${Save.get('coins') >= HINT_PRICE ? `${HINT_PRICE}🪙` : 'anúncio'}</i>`;
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
    getTool: () => tool,
    onRing: (r) => (ring = r ? { ...r, until: r.hold ? performance.now() + r.hold : 0 } : null),
  });
  selectTool('mao');
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
  lastReward = 60 + stars * 30;
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

function renderTray(items, current) {
  const tray = $('tray');
  tray.innerHTML = '';
  if (!items.length) {
    const pending = current.fasteners.some((f) => f.state !== 'done') || current.parts.some((p) => !p.seated);
    tray.innerHTML = `<div class="tray-empty">${pending ? 'Tudo na bandeja já foi usado. Termine de prender com as ferramentas 🔧' : 'Tudo montado! 🎉'}</div>`;
    return;
  }
  items.forEach((it) => {
    const el = document.createElement('div');
    el.className = 'part' + (it.blocked ? ' blocked' : '');
    el.dataset.id = it.id;
    el.innerHTML = `<img src="${it.thumb}" alt=""><span>${it.name}</span>${it.count ? `<b class="count">×${it.count}</b>` : ''}`;
    el.addEventListener('pointerdown', (ev) => trayDown(ev, it, el));
    tray.appendChild(el);
  });
}

/** Arrastar da bandeja para cima: peças vão em 3D; parafusos e pregos seguem o dedo como figura. */
function trayDown(ev, item, el) {
  const sx = ev.clientX;
  const sy = ev.clientY;
  const touch = ev.pointerType !== 'mouse';
  const lift = touch ? 60 : 0;
  const isPart = item.kind === 'part';
  const float = $('drag-float');
  let dragging = false;
  let aborted = false;
  const moveFloat = (x, y) => {
    float.style.left = `${x}px`;
    float.style.top = `${y - lift}px`;
  };
  const move = (e) => {
    if (e.pointerId !== ev.pointerId || aborted || !play) return;
    if (!dragging) {
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (-dy > 12 && -dy > Math.abs(dx)) {
        if (isPart) {
          dragging = play.beginDrag(item.id, e.clientX, e.clientY, touch);
          if (!dragging) aborted = true;
        } else {
          dragging = true;
          float.src = item.thumb;
          float.classList.remove('hidden');
          Sfx.pick();
        }
        if (dragging) el.classList.add('dragging');
      }
      if (!dragging) return;
    }
    e.preventDefault();
    if (isPart) play.moveDrag(e.clientX, e.clientY);
    else moveFloat(e.clientX, e.clientY);
  };
  const up = (e) => {
    if (e.pointerId !== ev.pointerId) return;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    el.classList.remove('dragging');
    // O botão Voltar pode encerrar a fase com a peça ainda na mão
    if (!play) return float.classList.add('hidden');
    if (dragging && isPart) play.endDrag();
    else if (dragging) {
      float.classList.add('hidden');
      play.insertAt(item.kind, e.clientX, e.clientY - lift);
    } else if (!aborted && e.type === 'pointerup' && Math.hypot(e.clientX - sx, e.clientY - sy) < 10) {
      play.peek(item.id);
    }
  };
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

// ---------- ferramentas ----------

function selectTool(id) {
  tool = id;
  const bar = $('toolbar');
  bar.innerHTML = '';
  Object.entries(TOOLS).forEach(([tid, t]) => {
    const lv = toolLevel(tid);
    if (!lv) return; // parafusadeira ainda não comprada
    const b = document.createElement('button');
    b.className = 'tool' + (tid === tool ? ' on' : '');
    b.title = t.name;
    b.innerHTML = `${t.icon}${t.max > 1 ? `<i>Nv${lv}</i>` : ''}`;
    b.addEventListener('click', () => {
      Sfx.click();
      selectTool(tid);
      toast(t.name);
    });
    bar.appendChild(b);
  });
}

function drawRing() {
  const el = $('ring');
  const now = performance.now();
  if (play && ring && (!ring.until || now < ring.until)) {
    const s = play.screenOf(ring.pos);
    el.style.left = `${s.x}px`;
    el.style.top = `${s.y}px`;
    el.style.setProperty('--p', Math.round(ring.progress * 100));
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
  requestAnimationFrame(drawRing);
}
requestAnimationFrame(drawRing);

// ---------- oficina ----------

function openShop() {
  if (!stopShowcase) startShowcase();
  show('shop');
  updateCoins();
  Ads.showBanner();
  const list = $('shop-list');
  list.innerHTML = '';
  Object.entries(TOOLS).forEach(([id, t]) => {
    if (t.max <= 1) return;
    const lv = toolLevel(id);
    const price = nextPrice(id);
    const card = document.createElement('div');
    card.className = 'tool-card';
    const now = lv ? t.desc(lv) : t.desc(0);
    const next = price != null && lv ? `Próximo nível: ${t.desc(lv + 1)}` : '';
    const label = price == null ? 'Nível máximo' : lv ? `Melhorar · ${price} 🪙` : `Comprar · ${price} 🪙`;
    card.innerHTML = `<div class="big">${t.icon}</div><h3>${t.name}</h3>
      <div class="lv">${'★'.repeat(lv)}<span class="off">${'★'.repeat(t.max - lv)}</span></div>
      <p>${now}${next ? `<br>${next}` : ''}</p>`;
    const b = document.createElement('button');
    b.className = 'btn green';
    b.textContent = label;
    b.disabled = price == null;
    b.addEventListener('click', () => {
      if (upgradeTool(id)) {
        Sfx.coin();
        toast(`${t.name} melhorada!`);
        openShop();
      } else {
        Sfx.wrong();
        toast(`Faltam ${price - Save.get('coins')} moedas. Monte mais coisas!`);
      }
    });
    card.appendChild(b);
    list.appendChild(card);
  });
}

// ---------- botões ----------

bindTap('btn-play', () => {
  Sfx.unlock();
  Music.start();
  openLevels();
});
bindTap('btn-levels-back', openMenu);
bindTap('btn-shop', openShop);
bindTap('btn-shop-back', openMenu);
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

// Botão Voltar do Android: faz o mesmo que o botão de voltar de cada tela; só fecha o jogo a partir do menu.
function goBack() {
  if (screen === 'menu') return App.exitApp();
  Sfx.click();
  if (screen === 'hud') quitLevel();
  else if (screen === 'done') leaveDone(false);
  else openMenu();
}
if (Capacitor.getPlatform() === 'android') App.addListener('backButton', goBack);

setInterval(() => play && !play.done && ($('lvl-time').textContent = fmtTime(play.time)), 250);

openMenu();
// ?foto: só a cena 3D, sem interface (usado para gerar o ícone e imagens da loja)
if (new URLSearchParams(location.search).has('foto')) {
  document.body.classList.add('foto');
  engine.controls.autoRotate = false;
}
window.__app = { engine, get play() { return play; }, startLevel };
