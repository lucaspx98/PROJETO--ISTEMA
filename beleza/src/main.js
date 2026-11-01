// Controlador do app: telas (menu, loja, atendimento, resultado), painel da etapa e anúncios.
import { Engine } from './engine.js';
import { Session, showcaseClient } from './game.js';
import { STATIONS } from './steps.js';
import { Save } from './storage.js';
import { Sfx } from './audio.js';
import { Music } from './music.js';
import { Ads } from './ads.js';
import { SKIP_PRICE } from './config.js';
import { UPGRADES, buy, priceOf } from './shop.js';

const $ = (id) => document.getElementById(id);
const engine = new Engine($('c'));
let session = null;
let stopShowcase = null;
let lastReward = 0;

Ads.init();

const WANT_LABEL = { blush: '🌸', lips: '💄', nails: '💅', hair: '💇' };
const WANT_NAME = { blush: 'Blush', lips: 'Batom', nails: 'Unhas', hair: 'Cabelo' };

// ---------- utilidades ----------

function show(id) {
  ['menu', 'shop', 'hud', 'done'].forEach((s) => $(s).classList.toggle('hidden', s !== id && !(id === 'done' && s === 'hud')));
}

function updateCoins() {
  document.querySelectorAll('.coin-val').forEach((el) => (el.textContent = Save.get('coins')));
  $('stat-clients').textContent = Save.get('clients');
  $('btn-skip').textContent = Save.get('coins') >= SKIP_PRICE ? `Pular · ${SKIP_PRICE} 🪙` : 'Pular (anúncio)';
}

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
}

function banner(text) {
  const b = $('banner');
  b.textContent = text;
  b.classList.remove('hidden');
  void b.offsetWidth;
  setTimeout(() => b.classList.add('hidden'), 1300);
}

const starsHtml = (n) => [1, 2, 3].map((i) => (i <= n ? '★' : '<span class="off">★</span>')).join('');

function bindTap(id, fn) {
  $(id).addEventListener('click', () => {
    Sfx.click();
    fn();
  });
}

function sfxLabels() {
  $('btn-sfx').textContent = Save.get('muted') ? '🔇 Sons ASMR' : '🔊 Sons ASMR';
  $('btn-music').textContent = Save.get('musicOff') ? '🎵 Música: não' : '🎵 Música: sim';
}

// ---------- telas ----------

function openMenu() {
  session?.dispose();
  session = null;
  stopShowcase?.();
  stopShowcase = showcaseClient(engine);
  show('menu');
  updateCoins();
  sfxLabels();
  Ads.showBanner();
}

function openShop() {
  show('shop');
  updateCoins();
  Ads.showBanner();
  const list = $('shop-list');
  list.innerHTML = '';
  UPGRADES.forEach((u) => {
    const lv = Save.level(u.id);
    const max = u.costs.length;
    const price = priceOf(u.id);
    const card = document.createElement('div');
    card.className = 'up-card';
    const next = price != null && max > 1 && lv > 0 ? `<br>Próximo: ${u.desc(u.value[lv + 1])}` : '';
    card.innerHTML = `<div class="big">${u.icon}</div><h3>${u.name}</h3>
      <div class="lv">${max > 1 ? '★'.repeat(lv) + `<span class="off">${'★'.repeat(max - lv)}</span>` : lv ? '✓ Comprado' : ''}</div>
      <p>${lv || max === 1 ? u.desc(u.value[lv]) : u.desc(u.value[1])}${next}</p>`;
    const b = document.createElement('button');
    b.className = 'btn small';
    b.textContent = price == null ? (max > 1 ? 'Nível máximo' : 'Comprado') : `${lv || max === 1 ? (max === 1 ? 'Comprar' : 'Melhorar') : 'Comprar'} · ${price} 🪙`;
    b.disabled = price == null;
    b.addEventListener('click', () => {
      if (buy(u.id)) {
        Sfx.coin();
        toast(`${u.name}: comprado!`);
        openShop();
      } else {
        Sfx.click();
        toast(`Faltam ${price - Save.get('coins')} moedas. Atenda mais clientes!`);
      }
    });
    card.appendChild(b);
    list.appendChild(card);
  });
}

function startClient() {
  stopShowcase?.();
  stopShowcase = null;
  session?.dispose();
  Ads.hideBanner();
  Music.start();
  show('hud');
  updateCoins();
  let station = null;
  session = new Session(engine, Save.get('clients'), {
    onStep(step, i, total, palette) {
      if (step.station !== station) {
        station = step.station;
        const st = STATIONS.find((s) => s.id === station);
        banner(`${st.icon} ${st.name}`);
      }
      renderStations(step.station);
      $('step-icon').textContent = step.icon;
      $('step-title').textContent = step.title;
      $('step-hint').textContent = step.hint;
      $('step-count').textContent = `${i + 1}/${total}`;
      $('step-bar').style.width = '0%';
      $('btn-ready').disabled = true;
      renderSwatches(step, palette);
    },
    onProgress(p) {
      $('step-bar').style.width = `${Math.round(p * 100)}%`;
      $('btn-ready').disabled = p < 0.75;
    },
    onStepDone() {
      $('step-bar').style.width = '100%';
      renderWants();
    },
    onToast: toast,
    onComplete: complete,
  });
  $('client-name').textContent = `${session.client.name} quer:`;
  renderWants();
  toast(`${session.client.name} chegou! Veja o pedido dela lá em cima`);
}

function renderWants() {
  const want = session.client.want;
  $('wants').innerHTML = Object.keys(WANT_LABEL)
    .map((k) => {
      const ok = session.chosen[k] === want[k].name && session.steps.findIndex((s) => s.colors === k) < session.i;
      return `<span class="want${ok ? ' ok' : ''}">${WANT_LABEL[k]}<i style="background:${want[k].hex}"></i>${want[k].name}</span>`;
    })
    .join('');
}

function renderStations(current) {
  const idx = STATIONS.findIndex((s) => s.id === current);
  $('stations').innerHTML = STATIONS.map((s, i) => `<span class="st${i === idx ? ' on' : i < idx ? ' ok' : ''}">${s.icon} ${s.name}</span>`).join('');
}

function renderSwatches(step, palette) {
  const box = $('swatches');
  box.innerHTML = '';
  if (!palette) return;
  const wanted = session.client.want[step.colors].name;
  palette.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'sw' + (c.hex === step.color ? ' on' : '') + (c.name === wanted ? ' want' : '');
    b.style.background = c.hex;
    b.title = c.name;
    b.addEventListener('click', () => {
      session.chooseColor(c);
      box.querySelectorAll('.sw').forEach((s) => s.classList.toggle('on', s === b));
      toast(c.name[0].toUpperCase() + c.name.slice(1));
    });
    box.appendChild(b);
  });
}

function complete({ stars, quality, tip, client, chosen }) {
  Save.set('clients', Save.get('clients') + 1);
  Save.set('stars', Save.get('stars') + stars);
  lastReward = 30 + stars * 25 + tip;
  Save.addCoins(lastReward);
  Sfx.coin();
  updateCoins();
  $('done-title').textContent = stars === 3 ? `${client.name} amou! 😍` : stars === 2 ? `${client.name} gostou! 😊` : `${client.name} achou ok 🙂`;
  $('done-stars').innerHTML = starsHtml(stars);
  $('done-list').innerHTML =
    Object.keys(WANT_NAME)
      .map((k) => {
        const ok = chosen[k] === client.want[k].name;
        return `<div>${ok ? '✅' : '❌'} ${WANT_NAME[k]}: <span>pediu ${client.want[k].name}${ok ? '' : `, ficou ${chosen[k] ?? '—'}`}</span></div>`;
      })
      .join('') + `<div>✨ Capricho: <span>${Math.round(quality * 100)}%</span></div>`;
  $('done-coins').textContent = lastReward;
  $('done-tip').textContent = `(gorjeta ${tip})`;
  $('btn-double').classList.remove('hidden');
  show('done');
  Ads.showBanner();
}

async function leaveDone(next) {
  await Ads.maybeShowInterstitial();
  if (next) startClient();
  else openMenu();
}

// ---------- botões ----------

bindTap('btn-play', () => {
  Sfx.unlock();
  Music.start();
  startClient();
});
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
bindTap('btn-quit', openMenu);
bindTap('btn-ready', () => session?.finishEarly());
bindTap('btn-skip', async () => {
  if (!session || session.completed) return;
  if (Save.spend(SKIP_PRICE)) {
    updateCoins();
    return session.skip();
  }
  const ok = await Ads.showRewarded();
  if (ok) session.skip();
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
bindTap('btn-done-menu', () => leaveDone(false));

openMenu();
if (new URLSearchParams(location.search).has('foto')) {
  document.body.classList.add('foto');
  engine.controls.autoRotate = false;
}
window.__app = { engine, get session() { return session; }, startClient };
